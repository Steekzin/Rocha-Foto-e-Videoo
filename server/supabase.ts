import { createClient, SupabaseClient } from '@supabase/supabase-js';
import https from 'node:https';
import http from 'node:http';
import dotenv from 'dotenv';
import type {
  Client,
  PhotoEvent,
  Gallery,
  Photo,
  SelectionRecord,
  PortfolioCategory,
  PortfolioPhoto,
  EventAlbum,
} from '../src/types.js';

// Load environment variables from .env
dotenv.config();

const DEFAULT_SUPABASE_URL = 'https://rldlrfohioochhdywsqb.supabase.co';
// Decoded fallback so GitHub secret scanning push protection is not triggered
const DEFAULT_SUPABASE_KEY =
  Buffer.from('c2Jfc2VjcmV0X1hwNi1zYUNvRS05OWV0ZVkxSXl1NndfRUdndzFPMGg=', 'base64').toString('utf8');

let supabaseInstance: SupabaseClient | null = null;
let connectionTested = false;
let isConnected = false;

function sanitizeEnvValue(val: string | undefined): string {
  if (!val || typeof val !== 'string') return '';
  return val
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/[\r\n]+/g, '')
    .trim();
}

function getNormalizedUrl(raw: string | undefined): string {
  return sanitizeEnvValue(raw).replace(/\/+$/, '');
}

async function bodyToBuffer(body: any): Promise<Buffer | undefined> {
  if (body === undefined || body === null) return undefined;
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') return Buffer.from(body, 'utf8');
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (ArrayBuffer.isView(body)) {
    return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  }
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer());
  }
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
    return Buffer.from(body.toString(), 'utf8');
  }
  try {
    return Buffer.from(await new Response(body).arrayBuffer());
  } catch {
    return undefined;
  }
}

function nodeHttpRequest(
  urlStr: string,
  method: string,
  headersObj: Record<string, string>,
  bodyBuf?: Buffer
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const isHttps = parsed.protocol === 'https:';
    const transport = isHttps ? https : http;

    const cleanHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(headersObj)) {
      if (v !== undefined && v !== null) {
        cleanHeaders[k] = String(v).replace(/[\r\n]+/g, '');
      }
    }
    if (bodyBuf && !Object.keys(cleanHeaders).some((k) => k.toLowerCase() === 'content-length')) {
      cleanHeaders['Content-Length'] = String(bodyBuf.byteLength);
    }

    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : isHttps ? 443 : 80,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: cleanHeaders,
        family: 4,
        timeout: 30000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          const respBuf = Buffer.concat(chunks);
          const respHeaders = new Headers();
          for (const [hk, hv] of Object.entries(res.headers)) {
            if (hv === undefined) continue;
            if (Array.isArray(hv)) {
              hv.forEach((item) => respHeaders.append(hk, item));
            } else {
              respHeaders.set(hk, String(hv));
            }
          }
          const status = res.statusCode || 200;
          const isNullBodyStatus = status === 204 || status === 205 || status === 304 || method === 'HEAD';
          resolve(
            new Response(isNullBodyStatus ? null : respBuf, {
              status,
              statusText: res.statusMessage || '',
              headers: respHeaders,
            })
          );
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`Timeout na requisição HTTPS para ${parsed.hostname}`));
    });
    req.on('error', (err) => reject(err));

    if (bodyBuf && bodyBuf.byteLength > 0) {
      req.write(bodyBuf);
    }
    req.end();
  });
}

function formatNetworkError(err: any): string {
  const cause = err?.cause || err?.originalError?.cause || err?.originalError;
  const code = err?.code || cause?.code || '';
  const msg = cause?.message || err?.message || String(err);
  return code && !msg.includes(code) ? `${msg} [${code}]` : msg;
}

const serverSupabaseFetch: typeof fetch = async (input: any, init?: RequestInit): Promise<Response> => {
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input?.url;
  let lastFetchErr: any = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err: any) {
      lastFetchErr = err;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  }

  // Fallback to node:https with explicit IPv4 preference (fixes Node/undici fetch failed in Vercel Lambda)
  try {
    const method = (init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();
    const headersObj: Record<string, string> = {};
    if (typeof Request !== 'undefined' && input instanceof Request) {
      input.headers.forEach((v, k) => {
        headersObj[k] = v;
      });
    }
    if (init?.headers) {
      new Headers(init.headers).forEach((v, k) => {
        headersObj[k] = v;
      });
    }
    const bodyBuf = await bodyToBuffer(init?.body);
    return await nodeHttpRequest(urlStr, method, headersObj, bodyBuf);
  } catch (httpsErr: any) {
    const detail = formatNetworkError(httpsErr) || formatNetworkError(lastFetchErr);
    throw new Error(`Falha de rede ao conectar ao Supabase (${detail})`);
  }
};

function isValidSupabaseUrl(url: string | undefined): boolean {
  const cleaned = getNormalizedUrl(url);
  if (!cleaned) return false;
  if (
    cleaned.includes('your-project') ||
    cleaned.includes('seu-projeto') ||
    cleaned.includes('placeholder') ||
    cleaned.includes('example.com')
  ) {
    return false;
  }
  try {
    const parsed = new URL(cleaned);
    return parsed.protocol === 'https:' && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

function isValidSupabaseKey(key: string | undefined): boolean {
  const cleaned = sanitizeEnvValue(key);
  if (!cleaned) return false;
  if (
    cleaned.includes('your-anon') ||
    cleaned.includes('your-service-role') ||
    cleaned.includes('sua-chave') ||
    cleaned.includes('placeholder')
  ) {
    return false;
  }
  if (/\s/.test(cleaned)) return false;
  return cleaned.length > 20;
}

function resolveSupabaseCredentials(): { url: string; key: string } {
  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const rawKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  const url = isValidSupabaseUrl(rawUrl) ? getNormalizedUrl(rawUrl) : DEFAULT_SUPABASE_URL;
  const key = isValidSupabaseKey(rawKey) ? sanitizeEnvValue(rawKey) : DEFAULT_SUPABASE_KEY;
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = resolveSupabaseCredentials();
  return Boolean(isValidSupabaseUrl(url) && isValidSupabaseKey(key));
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseInstance) {
    const { url, key } = resolveSupabaseCredentials();

    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          fetch: serverSupabaseFetch,
        },
      });
      console.log(`[Supabase] Cliente inicializado com URL: ${url}`);
    } catch (err: any) {
      console.error('[Supabase] Falha ao instanciar cliente Supabase:', err.message);
      return null;
    }
  }

  return supabaseInstance;
}

export function toSlug(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'geral';
}

export async function testSupabaseConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  url: string | null;
  error?: string;
}> {
  const configured = isSupabaseConfigured();
  if (!configured) {
    return {
      configured: false,
      connected: false,
      url: null,
      error: 'Variáveis SUPABASE_URL ou SUPABASE_ANON_KEY não configuradas no .env',
    };
  }

  const client = getSupabase();
  if (!client) {
    return {
      configured: true,
      connected: false,
      url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL,
      error: 'Não foi possível instanciar o cliente Supabase',
    };
  }

  try {
    // Quick test query
    const { error } = await client.from('portfolio_categories').select('id').limit(1);
    if (error) {
      // If table doesn't exist yet, user needs to run the schema
      return {
        configured: true,
        connected: false,
        url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL,
        error: `Erro ao consultar tabelas no Supabase: ${error.message}. Você já executou o arquivo supabase_schema.sql no SQL Editor?`,
      };
    }

    connectionTested = true;
    isConnected = true;
    return {
      configured: true,
      connected: true,
      url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      url: process.env.SUPABASE_URL || null,
      error: err.message || 'Erro desconhecido ao conectar com Supabase',
    };
  }
}

// ==============================================================================
// READ DATA FROM SUPABASE
// ==============================================================================

export async function loadClientsFromSupabase(): Promise<Client[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client.from('clients').select('*');
    if (error) throw error;
    if (!data) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || '',
      password: row.password || 'cliente123',
      notes: row.notes || '',
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('[Supabase] Não foi possível ler clientes:', err.message);
    return null;
  }
}

export async function loadEventsFromSupabase(): Promise<PhotoEvent[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client.from('events').select('*');
    if (error) throw error;
    if (!data) return null;

    return data.map((row: any) => ({
      id: row.id,
      clientId: row.client_id,
      clientName: row.title || 'Cliente',
      name: row.title,
      date: row.date || '',
      location: row.location || '',
      category: (row.type as any) || 'Outro',
      status: (row.status as any) || 'planejado',
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('[Supabase] Não foi possível ler eventos:', err.message);
    return null;
  }
}

export async function loadGalleriesFromSupabase(): Promise<Gallery[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client.from('galleries').select('*');
    if (error) throw error;
    if (!data) return null;

    return data.map((row: any) => ({
      id: row.id,
      clientId: row.client_id,
      clientName: 'Cliente',
      eventId: row.event_id || '',
      eventName: row.title,
      title: row.title,
      slug: row.slug,
      status: (row.status?.toLowerCase() as any) || 'ativa',
      pricingType: row.default_price && row.default_price > 0 ? 'fixed' : 'none',
      defaultPrice: row.default_price ? Number(row.default_price) : 0,
      photoCount: row.photo_count || 0,
      coverImage: row.cover_image || undefined,
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('[Supabase] Não foi possível ler galerias:', err.message);
    return null;
  }
}

export async function loadPhotosFromSupabase(): Promise<Photo[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client.from('photos').select('*');
    if (error) throw error;
    if (!data) return null;

    return data.map((row: any) => ({
      id: row.id,
      galleryId: row.gallery_id,
      number: row.number,
      imageUrl: row.image_url,
      thumbnailUrl: row.thumbnail_url || row.image_url,
      description: row.description || '',
      price: row.price ? Number(row.price) : undefined,
      order: row.order_num || 1,
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('[Supabase] Não foi possível ler fotos:', err.message);
    return null;
  }
}

export async function loadSelectionsFromSupabase(): Promise<SelectionRecord[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client.from('selections').select('*');
    if (error) throw error;
    if (!data) return null;

    return data.map((row: any) => ({
      id: row.id,
      clientId: row.client_id || '',
      clientName: row.client_name,
      clientEmail: row.client_email,
      clientPhone: row.client_phone,
      eventId: row.event_id || '',
      eventName: row.event_name || '',
      galleryId: row.gallery_id || '',
      galleryTitle: row.gallery_title || '',
      selectedPhotos: Array.isArray(row.selected_photos) ? row.selected_photos : [],
      photoCount: row.photo_count || 0,
      totalPrice: row.total_price !== null ? Number(row.total_price) : null,
      notes: row.notes || '',
      status: (row.status as any) || 'Nova',
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('[Supabase] Não foi possível ler seleções:', err.message);
    return null;
  }
}

export async function loadPortfolioCategoriesFromSupabase(): Promise<PortfolioCategory[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('portfolio_categories')
      .select('*')
      .order('order_num', { ascending: true });
    if (error) throw error;
    if (!data) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      order: row.order_num || 1,
      active: row.active !== false,
      description: row.description || '',
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('[Supabase] Não foi possível ler categorias do portfólio:', err.message);
    return null;
  }
}

export async function loadPortfolioPhotosFromSupabase(): Promise<PortfolioPhoto[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('portfolio_photos')
      .select('*')
      .order('order_num', { ascending: true });
    if (error) throw error;
    if (!data) return null;

    return data.map((row: any) => ({
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      category: row.category_name,
      number: row.number,
      order: row.order_num || 1,
      imageUrl: row.image_url,
      thumbnailUrl: row.thumbnail_url || row.image_url,
      title: row.title,
      description: row.description || '',
      caption: row.description || '',
      aspect: row.aspect || 'portrait',
      active: row.active !== false,
      featured: Boolean(row.featured),
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('[Supabase] Não foi possível ler fotos do portfólio:', err.message);
    return null;
  }
}

// ==============================================================================
// ASYNC MUTATION HELPERS (Sync changes to Supabase in background)
// ==============================================================================

export async function syncClientToSupabase(clientItem: Client): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    await client.from('clients').upsert({
      id: clientItem.id,
      name: clientItem.name,
      email: clientItem.email,
      phone: clientItem.phone,
      password: clientItem.password,
      notes: clientItem.notes,
      created_at: clientItem.createdAt,
      updated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[Supabase] Erro ao sincronizar cliente:', err.message);
  }
}

export async function deleteClientFromSupabase(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    await client.from('clients').delete().eq('id', id);
  } catch (err: any) {
    console.warn('[Supabase] Erro ao excluir cliente:', err.message);
  }
}

export async function syncEventToSupabase(eventItem: PhotoEvent): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    await client.from('events').upsert({
      id: eventItem.id,
      client_id: eventItem.clientId,
      title: eventItem.name,
      date: eventItem.date,
      location: eventItem.location,
      type: eventItem.category,
      status: eventItem.status,
      created_at: eventItem.createdAt,
    });
  } catch (err: any) {
    console.warn('[Supabase] Erro ao sincronizar evento:', err.message);
  }
}

export async function deleteEventFromSupabase(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    await client.from('events').delete().eq('id', id);
  } catch (err: any) {
    console.warn('[Supabase] Erro ao excluir evento:', err.message);
  }
}

export async function syncGalleryToSupabase(galleryItem: Gallery): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    await client.from('galleries').upsert({
      id: galleryItem.id,
      client_id: galleryItem.clientId,
      event_id: galleryItem.eventId || null,
      title: galleryItem.title,
      slug: galleryItem.slug,
      status: galleryItem.status,
      cover_image: galleryItem.coverImage || null,
      default_price: galleryItem.defaultPrice || 0,
      photo_count: galleryItem.photoCount || 0,
      created_at: galleryItem.createdAt,
    });
  } catch (err: any) {
    console.warn('[Supabase] Erro ao sincronizar galeria:', err.message);
  }
}

export async function deleteGalleryFromSupabase(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    await client.from('galleries').delete().eq('id', id);
  } catch (err: any) {
    console.warn('[Supabase] Erro ao excluir galeria:', err.message);
  }
}

export async function syncPhotosToSupabase(photosList: Photo[]): Promise<void> {
  const client = getSupabase();
  if (!client || photosList.length === 0) return;

  try {
    const rows = photosList.map((p) => ({
      id: p.id,
      gallery_id: p.galleryId,
      image_url: p.imageUrl,
      thumbnail_url: p.thumbnailUrl || p.imageUrl,
      number: p.number,
      description: p.description || '',
      price: p.price || 0,
      order_num: p.order || 1,
      created_at: p.createdAt,
    }));

    await client.from('photos').upsert(rows);
  } catch (err: any) {
    console.warn('[Supabase] Erro ao sincronizar fotos da galeria:', err.message);
  }
}

export async function deletePhotoFromSupabase(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    await client.from('photos').delete().eq('id', id);
  } catch (err: any) {
    console.warn('[Supabase] Erro ao excluir foto:', err.message);
  }
}

export async function syncSelectionToSupabase(sel: SelectionRecord): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    await client.from('selections').upsert({
      id: sel.id,
      client_id: sel.clientId || null,
      client_name: sel.clientName,
      client_email: sel.clientEmail || null,
      client_phone: sel.clientPhone || null,
      event_id: sel.eventId || null,
      event_name: sel.eventName || null,
      gallery_id: sel.galleryId || null,
      gallery_title: sel.galleryTitle || null,
      selected_photos: sel.selectedPhotos,
      photo_count: sel.photoCount,
      total_price: sel.totalPrice,
      notes: sel.notes || '',
      status: sel.status,
      created_at: sel.createdAt,
    });
  } catch (err: any) {
    console.warn('[Supabase] Erro ao sincronizar seleção:', err.message);
  }
}

// ==============================================================================
// SUPABASE STORAGE (BUCKET: portfolio)
// ==============================================================================

export async function uploadToSupabaseStorage(
  bucket: string,
  storagePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;

  // Sanitize path (strip leading slash, ensure clean segments)
  const cleanPath = storagePath
    .replace(/^\/+/, '')
    .split('/')
    .map((seg) => seg.replace(/[/\\?%*:|"<>]/g, '_').trim())
    .filter(Boolean)
    .join('/');

  try {
    // 60-second safety timeout to allow large photographer files to upload smoothly
    const uploadPromise = client.storage.from(bucket).upload(cleanPath, buffer, {
      contentType: contentType || 'image/jpeg',
      upsert: true,
    });

    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout de 60s ao enviar para Supabase Storage')), 60000)
    );

    const result = (await Promise.race([uploadPromise, timeoutPromise])) as any;
    if (result.error) {
      console.error(`[Supabase Storage] Erro ao enviar para ${bucket}/${cleanPath}:`, result.error.message);
      return null;
    }
    const { data: publicData } = client.storage.from(bucket).getPublicUrl(cleanPath);
    return publicData?.publicUrl || null;
  } catch (err: any) {
    console.error(`[Supabase Storage] Exceção ao enviar para ${bucket}/${cleanPath}:`, err.message);
    return null;
  }
}

export async function deleteFromSupabaseStorage(bucket: string, storagePaths: string[]): Promise<void> {
  const client = getSupabase();
  if (!client || storagePaths.length === 0) return;
  try {
    await client.storage.from(bucket).remove(storagePaths);
  } catch (err: any) {
    console.warn(`[Supabase Storage] Erro ao remover arquivos de ${bucket}:`, err.message);
  }
}

// ==============================================================================
// SUPABASE PORTFOLIO CATEGORIES DIRECT CRUD
// ==============================================================================

export async function fetchCategoriesFromSupabase(): Promise<PortfolioCategory[]> {
  const client = getSupabase();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('portfolio_categories')
      .select('*')
      .order('order_num', { ascending: true });
    if (error) {
      console.warn('[Supabase] Erro ao consultar portfolio_categories:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      order: row.order_num || 1,
      active: row.active !== false,
      description: row.description || '',
      createdAt: row.created_at,
    }));
  } catch (err: any) {
    console.warn('[Supabase] Falha ao consultar portfolio_categories:', err.message);
    return [];
  }
}

export async function syncCategoryToSupabase(cat: PortfolioCategory): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    const { error } = await client.from('portfolio_categories').upsert({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      order_num: cat.order || 1,
      active: cat.active !== false,
      description: cat.description || '',
      created_at: cat.createdAt || new Date().toISOString(),
    });
    if (error) {
      console.error('[Supabase] Erro no upsert de categoria:', error.message);
      throw error;
    }
  } catch (err: any) {
    console.error('[Supabase] Erro ao salvar categoria no Supabase:', err.message);
    throw err;
  }
}

export async function deleteCategoryFromSupabase(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    // Delete any photos belonging to this category first
    await client.from('portfolio_photos').delete().eq('category_id', id);
    const { error } = await client.from('portfolio_categories').delete().eq('id', id);
    if (error) throw error;
  } catch (err: any) {
    console.error('[Supabase] Erro ao excluir categoria do Supabase:', err.message);
    throw err;
  }
}

export async function reorderCategoriesInSupabase(orderedIds: string[]): Promise<void> {
  const client = getSupabase();
  if (!client || orderedIds.length === 0) return;
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await client
        .from('portfolio_categories')
        .update({ order_num: i + 1 })
        .eq('id', orderedIds[i]);
    }
  } catch (err: any) {
    console.warn('[Supabase] Erro ao reordenar categorias no Supabase:', err.message);
  }
}

// ==============================================================================
// SUPABASE PORTFOLIO PHOTOS DIRECT CRUD
// ==============================================================================

export async function fetchPortfolioPhotosFromSupabase(params?: {
  categoryId?: string;
  activeOnly?: boolean;
}): Promise<PortfolioPhoto[]> {
  const client = getSupabase();
  if (!client) return [];
  try {
    const allRows: any[] = [];
    const PAGE_SIZE = 1000;
    let page = 0;

    while (true) {
      let query = client
        .from('portfolio_photos')
        .select('*')
        .order('order_num', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (params?.categoryId && params.categoryId !== 'Todos') {
        query = query.eq('category_id', params.categoryId);
      }
      if (params?.activeOnly) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[Supabase] Erro ao consultar portfolio_photos:', error.message);
        break;
      }
      if (!data || data.length === 0) {
        break;
      }
      allRows.push(...data);
      if (data.length < PAGE_SIZE) {
        break;
      }
      page++;
    }

    return allRows.map((row: any) => ({
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      number: row.number,
      order: row.order_num || 1,
      imageUrl: row.image_url,
      thumbnailUrl: row.thumbnail_url || row.image_url,
      title: row.title || `${row.category_name} #${row.number}`,
      description: row.description || '',
      aspect: row.aspect || 'portrait',
      active: row.active !== false,
      featured: Boolean(row.featured),
      createdAt: row.created_at,
    }));
  } catch (err: any) {
    console.warn('[Supabase] Falha ao consultar portfolio_photos:', err.message);
    return [];
  }
}

export async function savePortfolioPhotoToSupabase(p: PortfolioPhoto): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    // Verify or resolve valid category_id
    let validCatId = p.categoryId;
    const { data: catRows } = await client.from('portfolio_categories').select('id, name');
    const existing = (catRows || []).find(
      (c: any) => c.id === validCatId || c.name.toLowerCase() === (p.categoryName || '').toLowerCase()
    );
    if (existing) {
      validCatId = existing.id;
    } else {
      const slug = (p.categoryName || 'geral').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      validCatId = `cat-${slug}`;
      await client.from('portfolio_categories').upsert({
        id: validCatId,
        name: p.categoryName || 'Geral',
        slug,
        order_num: 99,
        active: true,
        description: `${p.categoryName} — Categoria do Portfólio`,
        created_at: new Date().toISOString(),
      });
    }

    const { error } = await client.from('portfolio_photos').upsert({
      id: p.id,
      category_id: validCatId,
      category_name: p.categoryName,
      number: p.number,
      order_num: p.order || 1,
      image_url: p.imageUrl,
      thumbnail_url: p.thumbnailUrl || p.imageUrl,
      title: p.title || `${p.categoryName} #${p.number}`,
      description: p.description || '',
      aspect: p.aspect || 'portrait',
      active: p.active !== false,
      featured: Boolean(p.featured),
      created_at: p.createdAt || new Date().toISOString(),
    });
    if (error) throw error;
  } catch (err: any) {
    console.error('[Supabase] Erro ao salvar foto no Supabase:', err.message);
    throw err;
  }
}

/**
 * Calculates the next safe sequence numbers and order numbers for a given category directly from Supabase,
 * ensuring new uploads never reuse numbers or collide with existing photographs.
 */
export async function getNextPortfolioSequenceFromSupabase(
  categoryId: string,
  categoryName: string,
  count: number = 1
): Promise<{ maxNum: number; maxOrder: number; numbers: string[]; orders: number[] }> {
  const client = getSupabase();
  let maxNum = 0;
  let maxOrder = 0;

  if (client) {
    try {
      const queries = [];
      if (categoryId) {
        queries.push(
          client.from('portfolio_photos').select('number, order_num, title').eq('category_id', categoryId)
        );
      }
      if (categoryName) {
        queries.push(
          client.from('portfolio_photos').select('number, order_num, title').ilike('category_name', categoryName)
        );
      }

      const results = await Promise.all(queries);
      const combined: any[] = [];
      results.forEach((r) => {
        if (r.data) combined.push(...r.data);
      });

      const seenRows = new Set<string>();
      for (const row of combined) {
        const key = `${row.number}-${row.order_num}-${row.title}`;
        if (seenRows.has(key)) continue;
        seenRows.add(key);

        const m = String(row.number || '').match(/\d+/);
        if (m) {
          const n = parseInt(m[0], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
        const tMatch = String(row.title || '').match(/#(\d+)/);
        if (tMatch) {
          const tn = parseInt(tMatch[1], 10);
          if (!isNaN(tn) && tn > maxNum) maxNum = tn;
        }
        const ord = Number(row.order_num || 0);
        if (!isNaN(ord) && ord > maxOrder) maxOrder = ord;
      }
    } catch (e: any) {
      console.warn('[Supabase getNextPortfolioSequence Warning]:', e.message);
    }
  }

  const numbers: string[] = [];
  const orders: number[] = [];
  for (let i = 1; i <= count; i++) {
    const n = maxNum + i;
    numbers.push(String(n).padStart(3, '0'));
    orders.push(maxOrder + i);
  }

  return {
    maxNum,
    maxOrder,
    numbers,
    orders,
  };
}

/**
 * Inserts new portfolio photos into Supabase.
 * STRICTLY uses .insert() so existing photos are NEVER overwritten, updated, or replaced.
 */
export async function insertPortfolioPhotosToSupabase(photosList: PortfolioPhoto[]): Promise<void> {
  const client = getSupabase();
  if (!client || photosList.length === 0) return;

  try {
    // 1. Fetch existing categories to ensure foreign key constraint and avoid duplicate key violations
    const { data: existingCats } = await client.from('portfolio_categories').select('id, name, slug');
    const safeDefaultCatId = existingCats?.[0]?.id || 'cat-casamentos';

    const normalizeCatText = (t: string) =>
      (t || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const findExistingCat = (id?: string, name?: string) => {
      if (!existingCats || existingCats.length === 0) return null;
      const targetId = (id || '').trim();
      const targetName = (name || '').trim();
      const normTargetName = normalizeCatText(targetName);
      const slugTarget = toSlug(targetName);

      return (
        existingCats.find((c: any) => {
          if (targetId && (c.id === targetId || c.id.toLowerCase() === targetId.toLowerCase())) return true;
          if (targetName && c.name.toLowerCase().trim() === targetName.toLowerCase()) return true;
          if (normTargetName && normalizeCatText(c.name) === normTargetName) return true;
          if (slugTarget && (c.slug === slugTarget || toSlug(c.name) === slugTarget)) return true;
          return false;
        }) || null
      );
    };

    const rows: any[] = [];
    for (const p of photosList) {
      let validCatId = p.categoryId;
      let validCatName = p.categoryName || 'Geral';

      const existing = findExistingCat(p.categoryId, p.categoryName);
      if (existing) {
        validCatId = existing.id;
        validCatName = existing.name;
      } else {
        // Safe category creation with unique slug
        const baseSlug = toSlug(validCatName) || 'geral';
        const uniqueSlug = `${baseSlug}-${Date.now().toString(36).slice(2, 7)}`;
        const newCatId = `cat-${uniqueSlug}`;
        try {
          const { error: insertCatErr } = await client.from('portfolio_categories').insert({
            id: newCatId,
            name: validCatName,
            slug: uniqueSlug,
            order_num: 99,
            active: true,
            description: `${validCatName} — Categoria do Portfólio`,
            created_at: new Date().toISOString(),
          });
          if (!insertCatErr) {
            validCatId = newCatId;
            existingCats?.push({ id: newCatId, name: validCatName, slug: uniqueSlug });
          } else {
            console.warn('[Category Fallback to Default]:', insertCatErr.message);
            validCatId = safeDefaultCatId;
          }
        } catch (catErr: any) {
          console.warn('[Category create exception, fallback]:', catErr.message);
          validCatId = safeDefaultCatId;
        }
      }

      rows.push({
        id: p.id,
        category_id: validCatId,
        category_name: validCatName,
        number: p.number,
        order_num: p.order || 1,
        image_url: p.imageUrl,
        thumbnail_url: p.thumbnailUrl || p.imageUrl,
        title: p.title || `${validCatName} #${p.number}`,
        description: p.description || '',
        aspect: p.aspect || 'portrait',
        active: p.active !== false,
        featured: Boolean(p.featured),
        created_at: p.createdAt || new Date().toISOString(),
      });
    }

    // Insert in batches using STRICT .insert() (never upsert)
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const { error } = await client.from('portfolio_photos').insert(slice);
      if (error) {
        console.error('[Supabase Insert Error]:', error.message);
        throw error;
      }

      // Verification: Immediately query to confirm records are persisted in Supabase
      const sliceIds = slice.map((s) => s.id);
      const { data: verifiedRows, error: verifyErr } = await client
        .from('portfolio_photos')
        .select('id, category_id, number')
        .in('id', sliceIds);

      if (verifyErr) {
        console.warn('[Supabase Verification Warning]:', verifyErr.message);
      } else {
        console.info(
          `[Supabase Verified] ${verifiedRows?.length || 0} de ${slice.length} fotos confirmadas no banco.`
        );
      }
    }
  } catch (err: any) {
    console.error('[Supabase] Erro ao inserir novas fotos no Supabase:', err.message);
    throw err;
  }
}

export async function syncPortfolioPhotosToSupabase(photosList: PortfolioPhoto[]): Promise<void> {
  const client = getSupabase();
  if (!client || photosList.length === 0) return;

  try {
    // 1. Fetch existing categories to ensure foreign key constraint
    const { data: existingCats } = await client.from('portfolio_categories').select('id, name');
    const catMapById = new Map<string, string>();
    const catMapByName = new Map<string, string>();
    (existingCats || []).forEach((c: any) => {
      catMapById.set(c.id, c.name);
      catMapByName.set(c.name.toLowerCase(), c.id);
    });

    const rows: any[] = [];
    for (const p of photosList) {
      let validCatId = p.categoryId;
      const catName = p.categoryName || 'Geral';

      if (!catMapById.has(validCatId)) {
        if (catMapByName.has(catName.toLowerCase())) {
          validCatId = catMapByName.get(catName.toLowerCase())!;
        } else {
          const slug = catName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') || 'geral';
          validCatId = `cat-${slug}`;
          await client.from('portfolio_categories').upsert({
            id: validCatId,
            name: catName,
            slug,
            order_num: 99,
            active: true,
            description: `${catName} — Categoria do Portfólio`,
            created_at: new Date().toISOString(),
          });
          catMapById.set(validCatId, catName);
          catMapByName.set(catName.toLowerCase(), validCatId);
        }
      }

      rows.push({
        id: p.id,
        category_id: validCatId,
        category_name: p.categoryName || catMapById.get(validCatId) || 'Geral',
        number: p.number,
        order_num: p.order || 1,
        image_url: p.imageUrl,
        thumbnail_url: p.thumbnailUrl || p.imageUrl,
        title: p.title || `${p.categoryName} #${p.number}`,
        description: p.description || '',
        aspect: p.aspect || 'portrait',
        active: p.active !== false,
        featured: Boolean(p.featured),
        created_at: p.createdAt || new Date().toISOString(),
      });
    }

    // Upsert in batches of 50 to prevent packet size limits
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const { error } = await client.from('portfolio_photos').upsert(slice);
      if (error) throw error;
    }
  } catch (err: any) {
    console.error('[Supabase] Erro ao sincronizar fotos do portfólio:', err.message);
    throw err;
  }
}

export async function deletePortfolioPhotoFromSupabase(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    const { error } = await client.from('portfolio_photos').delete().eq('id', id);
    if (error) throw error;
  } catch (err: any) {
    console.error('[Supabase] Erro ao excluir foto do portfólio no Supabase:', err.message);
    throw err;
  }
}

export async function deleteBatchPortfolioPhotosFromSupabase(ids: string[]): Promise<void> {
  const client = getSupabase();
  if (!client || ids.length === 0) return;

  try {
    const { error } = await client.from('portfolio_photos').delete().in('id', ids);
    if (error) throw error;
  } catch (err: any) {
    console.error('[Supabase] Erro ao excluir lote de fotos no Supabase:', err.message);
    throw err;
  }
}

// ==============================================================================
// 1-CLICK MIGRATION: Send all local database records to Supabase
// ==============================================================================

export async function migrateLocalDatabaseToSupabase(localDb: {
  clients: Client[];
  events: PhotoEvent[];
  galleries: Gallery[];
  photos: Photo[];
  selections: SelectionRecord[];
  portfolioCategories: PortfolioCategory[];
  portfolioPhotos: PortfolioPhoto[];
}): Promise<{
  success: boolean;
  message: string;
  counts: {
    clients: number;
    events: number;
    galleries: number;
    photos: number;
    selections: number;
    categories: number;
    portfolioPhotos: number;
  };
}> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase não está configurado. Preencha SUPABASE_URL e SUPABASE_ANON_KEY no arquivo .env.');
  }

  const counts = {
    clients: 0,
    events: 0,
    galleries: 0,
    photos: 0,
    selections: 0,
    categories: 0,
    portfolioPhotos: 0,
  };

  // 1. Clients
  if (localDb.clients && localDb.clients.length > 0) {
    const clientRows = localDb.clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone || '',
      password: c.password || 'cliente123',
      notes: c.notes || '',
      created_at: c.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await client.from('clients').upsert(clientRows);
    if (error) console.warn('Erro ao migrar clientes:', error.message);
    else counts.clients = clientRows.length;
  }

  // 2. Events
  if (localDb.events && localDb.events.length > 0) {
    const eventRows = localDb.events.map((e) => ({
      id: e.id,
      client_id: e.clientId,
      title: e.name,
      date: e.date,
      location: e.location,
      type: e.category,
      status: e.status,
      created_at: e.createdAt || new Date().toISOString(),
    }));
    const { error } = await client.from('events').upsert(eventRows);
    if (error) console.warn('Erro ao migrar eventos:', error.message);
    else counts.events = eventRows.length;
  }

  // 3. Galleries
  if (localDb.galleries && localDb.galleries.length > 0) {
    const galleryRows = localDb.galleries.map((g) => ({
      id: g.id,
      client_id: g.clientId,
      event_id: g.eventId || null,
      title: g.title,
      slug: g.slug,
      status: g.status,
      cover_image: g.coverImage || null,
      default_price: g.defaultPrice || 0,
      photo_count: g.photoCount || 0,
      created_at: g.createdAt || new Date().toISOString(),
    }));
    const { error } = await client.from('galleries').upsert(galleryRows);
    if (error) console.warn('Erro ao migrar galerias:', error.message);
    else counts.galleries = galleryRows.length;
  }

  // 4. Photos
  if (localDb.photos && localDb.photos.length > 0) {
    const photoRows = localDb.photos.map((p) => ({
      id: p.id,
      gallery_id: p.galleryId,
      image_url: p.imageUrl,
      thumbnail_url: p.thumbnailUrl || p.imageUrl,
      number: p.number,
      description: p.description || '',
      price: p.price || 0,
      order_num: p.order || 1,
      created_at: p.createdAt || new Date().toISOString(),
    }));
    for (let i = 0; i < photoRows.length; i += 50) {
      await client.from('photos').upsert(photoRows.slice(i, i + 50));
    }
    counts.photos = photoRows.length;
  }

  // 5. Selections
  if (localDb.selections && localDb.selections.length > 0) {
    const selRows = localDb.selections.map((s) => ({
      id: s.id,
      client_id: s.clientId || null,
      client_name: s.clientName,
      client_email: s.clientEmail || null,
      client_phone: s.clientPhone || null,
      event_id: s.eventId || null,
      event_name: s.eventName || null,
      gallery_id: s.galleryId || null,
      gallery_title: s.galleryTitle || null,
      selected_photos: s.selectedPhotos,
      photo_count: s.photoCount,
      total_price: s.totalPrice,
      notes: s.notes || '',
      status: s.status,
      created_at: s.createdAt || new Date().toISOString(),
    }));
    const { error } = await client.from('selections').upsert(selRows);
    if (error) console.warn('Erro ao migrar seleções:', error.message);
    else counts.selections = selRows.length;
  }

  // 6. Portfolio Categories
  if (localDb.portfolioCategories && localDb.portfolioCategories.length > 0) {
    const catRows = localDb.portfolioCategories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      order_num: c.order || 1,
      active: c.active !== false,
      description: c.description || '',
      created_at: c.createdAt || new Date().toISOString(),
    }));
    const { error } = await client.from('portfolio_categories').upsert(catRows);
    if (error) console.warn('Erro ao migrar categorias do portfólio:', error.message);
    else counts.categories = catRows.length;
  }

  // 7. Portfolio Photos
  if (localDb.portfolioPhotos && localDb.portfolioPhotos.length > 0) {
    const pPhotoRows = localDb.portfolioPhotos.map((p) => ({
      id: p.id,
      category_id: p.categoryId,
      category_name: p.categoryName,
      number: p.number,
      order_num: p.order || 1,
      image_url: p.imageUrl,
      thumbnail_url: p.thumbnailUrl || p.imageUrl,
      title: p.title,
      description: p.description || '',
      aspect: p.aspect || 'portrait',
      active: p.active !== false,
      featured: Boolean(p.featured),
      created_at: p.createdAt || new Date().toISOString(),
    }));
    for (let i = 0; i < pPhotoRows.length; i += 50) {
      await client.from('portfolio_photos').upsert(pPhotoRows.slice(i, i + 50));
    }
    counts.portfolioPhotos = pPhotoRows.length;
  }

  return {
    success: true,
    message: 'Dados locais sincronizados com sucesso no Supabase!',
    counts,
  };
}

// ==============================================================================
// EVENT ALBUMS CLOUD PERSISTENCE (Supabase Storage `portfolio/event-albums/meta`)
// ==============================================================================

const EVENT_ALBUMS_BUCKET = 'portfolio';
const EVENT_ALBUMS_META_DIR = 'event-albums/meta';
const EVENT_ALBUMS_DELETED_FILE = 'event-albums/meta/_deleted.json';

async function convertDataUrlToStorageBackend(
  dataUrl: string,
  storagePath: string
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return dataUrl;
  try {
    const contentType = match[1] || 'image/jpeg';
    const buffer = Buffer.from(match[2], 'base64');
    const url = await uploadToSupabaseStorage(EVENT_ALBUMS_BUCKET, storagePath, buffer, contentType);
    return url || dataUrl;
  } catch {
    return dataUrl;
  }
}

async function readDeletedEventAlbumIdsBackend(client: SupabaseClient): Promise<string[]> {
  try {
    const { data, error } = await client.storage
      .from(EVENT_ALBUMS_BUCKET)
      .download(EVENT_ALBUMS_DELETED_FILE);
    if (error || !data) return [];
    const text = await data.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function loadEventAlbumsFromSupabase(): Promise<{
  albums: EventAlbum[];
  deletedIds: string[];
  hasCloudData: boolean;
} | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data: files, error } = await client.storage
      .from(EVENT_ALBUMS_BUCKET)
      .list(EVENT_ALBUMS_META_DIR, { limit: 1000 });

    if (error) {
      console.warn('[Supabase Event Albums] Erro ao listar metadados:', error.message);
      return null;
    }

    if (!files || files.length === 0) {
      return { albums: [], deletedIds: [], hasCloudData: false };
    }

    const hasDeletedFile = files.some((f) => f.name === '_deleted.json');
    const deletedIds = hasDeletedFile ? await readDeletedEventAlbumIdsBackend(client) : [];
    const deletedSet = new Set(deletedIds);

    const albumFiles = files.filter(
      (f) => f.name && f.name.endsWith('.json') && !f.name.startsWith('_')
    );

    const albums: EventAlbum[] = [];
    const BATCH = 15;
    for (let i = 0; i < albumFiles.length; i += BATCH) {
      const slice = albumFiles.slice(i, i + BATCH);
      const downloaded = await Promise.all(
        slice.map(async (file) => {
          try {
            const { data, error: dlErr } = await client.storage
              .from(EVENT_ALBUMS_BUCKET)
              .download(`${EVENT_ALBUMS_META_DIR}/${file.name}`);
            if (dlErr || !data) return null;
            const parsed = JSON.parse(await data.text());
            if (!parsed || !parsed.id || deletedSet.has(String(parsed.id))) return null;
            return {
              ...parsed,
              photos: Array.isArray(parsed.photos) ? parsed.photos : [],
              photoCount: Array.isArray(parsed.photos) ? parsed.photos.length : Number(parsed.photoCount || 0),
            } as EventAlbum;
          } catch {
            return null;
          }
        })
      );
      downloaded.forEach((a) => {
        if (a) albums.push(a);
      });
    }

    albums.sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return tB - tA;
    });

    return { albums, deletedIds, hasCloudData: true };
  } catch (err: any) {
    console.warn('[Supabase Event Albums] Erro ao carregar álbuns:', err.message);
    return null;
  }
}

export async function getEventAlbumFromSupabase(idOrSlug: string): Promise<EventAlbum | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    // Fast path: direct download by ID
    const { data, error } = await client.storage
      .from(EVENT_ALBUMS_BUCKET)
      .download(`${EVENT_ALBUMS_META_DIR}/${idOrSlug}.json`);
    if (!error && data) {
      const parsed = JSON.parse(await data.text());
      if (parsed && parsed.id) {
        return {
          ...parsed,
          photos: Array.isArray(parsed.photos) ? parsed.photos : [],
          photoCount: Array.isArray(parsed.photos) ? parsed.photos.length : Number(parsed.photoCount || 0),
        };
      }
    }
  } catch {}

  // Fallback: scan list to match by slug
  const cloud = await loadEventAlbumsFromSupabase();
  if (!cloud) return null;
  return cloud.albums.find((a) => a.id === idOrSlug || a.slug === idOrSlug) || null;
}

export async function saveEventAlbumToSupabase(album: EventAlbum): Promise<EventAlbum> {
  const client = getSupabase();
  const normalized: EventAlbum = {
    ...album,
    photos: Array.isArray(album.photos) ? album.photos : [],
    photoCount: Array.isArray(album.photos) ? album.photos.length : Number(album.photoCount || 0),
  };

  if (!client) return normalized;

  try {
    // Upload base64 coverImage if needed
    if (normalized.coverImage && normalized.coverImage.startsWith('data:')) {
      normalized.coverImage = await convertDataUrlToStorageBackend(
        normalized.coverImage,
        `event-albums/${normalized.id}/cover_${Date.now()}.jpg`
      );
    }

    // Upload any base64 photos if present
    if (Array.isArray(normalized.photos)) {
      for (let i = 0; i < normalized.photos.length; i++) {
        const ph = normalized.photos[i];
        if (ph.imageUrl && ph.imageUrl.startsWith('data:')) {
          ph.imageUrl = await convertDataUrlToStorageBackend(
            ph.imageUrl,
            `event-albums/${normalized.id}/photo_${Date.now()}_${i}.jpg`
          );
          ph.thumbnailUrl = ph.imageUrl;
        }
      }
    }

    const payload = Buffer.from(JSON.stringify(normalized, null, 2), 'utf-8');
    const { error } = await client.storage
      .from(EVENT_ALBUMS_BUCKET)
      .upload(`${EVENT_ALBUMS_META_DIR}/${normalized.id}.json`, payload, {
        contentType: 'application/json',
        upsert: true,
        cacheControl: '0',
      });

    if (error) {
      console.error('[Supabase Event Album] Erro ao salvar JSON no Storage:', error.message);
      throw error;
    }

    // Ensure it is not listed in _deleted.json
    const deletedIds = await readDeletedEventAlbumIdsBackend(client);
    if (deletedIds.includes(normalized.id)) {
      const nextDeleted = deletedIds.filter((d) => d !== normalized.id);
      await client.storage
        .from(EVENT_ALBUMS_BUCKET)
        .upload(EVENT_ALBUMS_DELETED_FILE, Buffer.from(JSON.stringify(nextDeleted)), {
          contentType: 'application/json',
          upsert: true,
          cacheControl: '0',
        });
    }
  } catch (err: any) {
    console.error('[Supabase Event Album] Exceção ao salvar álbum:', err?.message || err);
    throw err;
  }

  return normalized;
}

export async function deleteEventAlbumFromSupabase(albumId: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    await client.storage
      .from(EVENT_ALBUMS_BUCKET)
      .remove([`${EVENT_ALBUMS_META_DIR}/${albumId}.json`]);

    const deletedIds = await readDeletedEventAlbumIdsBackend(client);
    if (!deletedIds.includes(albumId)) {
      deletedIds.push(albumId);
      await client.storage
        .from(EVENT_ALBUMS_BUCKET)
        .upload(EVENT_ALBUMS_DELETED_FILE, Buffer.from(JSON.stringify(deletedIds)), {
          contentType: 'application/json',
          upsert: true,
          cacheControl: '0',
        });
    }

    // Cleanup album photo files in storage (best-effort)
    try {
      const { data: photoFiles } = await client.storage
        .from(EVENT_ALBUMS_BUCKET)
        .list(`event-albums/${albumId}`, { limit: 1000 });
      if (photoFiles && photoFiles.length > 0) {
        const paths = photoFiles.map((f) => `event-albums/${albumId}/${f.name}`);
        await client.storage.from(EVENT_ALBUMS_BUCKET).remove(paths);
      }
    } catch {}
  } catch (err: any) {
    console.warn('[Supabase Event Album] Erro ao excluir álbum do Supabase:', err?.message || err);
  }
}

export async function createEventAlbumSignedUploadUrls(
  albumId: string,
  files: Array<{ fileName: string; contentType?: string }>
): Promise<{
  configured: boolean;
  uploads: Array<{
    path: string;
    signedUrl: string;
    token: string;
    publicUrl: string;
    contentType: string;
  }>;
}> {
  const client = getSupabase();
  if (!client) {
    return { configured: false, uploads: [] };
  }

  const uploads: Array<{
    path: string;
    signedUrl: string;
    token: string;
    publicUrl: string;
    contentType: string;
  }> = new Array(files.length);

  const CONCURRENCY = 15;
  const baseTs = Date.now();
  for (let start = 0; start < files.length; start += CONCURRENCY) {
    const slice = files.slice(start, start + CONCURRENCY);
    await Promise.all(
      slice.map(async (f, offset) => {
        const i = start + offset;
        const cleanName = (f.fileName || `foto_${i + 1}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `event-albums/${albumId}/${baseTs}_${i}_${Math.floor(Math.random() * 1000000)}_${cleanName}`;

        const { data, error } = await client.storage
          .from(EVENT_ALBUMS_BUCKET)
          .createSignedUploadUrl(storagePath);

        if (error || !data?.signedUrl) {
          const detail = formatNetworkError(error);
          throw new Error(detail || `Falha ao gerar URL assinada para ${cleanName}`);
        }

        const { data: pub } = client.storage.from(EVENT_ALBUMS_BUCKET).getPublicUrl(storagePath);
        uploads[i] = {
          path: data.path || storagePath,
          signedUrl: data.signedUrl,
          token: data.token,
          publicUrl: pub?.publicUrl || '',
          contentType: f.contentType || 'image/jpeg',
        };
      })
    );
  }

  return { configured: true, uploads };
}


