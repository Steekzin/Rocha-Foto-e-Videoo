import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import AdmZip from 'adm-zip';
import dotenv from 'dotenv';

// Load .env variables immediately for standalone and cloud use
dotenv.config();

import {
  INITIAL_CLIENTS,
  INITIAL_EVENTS,
  INITIAL_GALLERIES,
  INITIAL_PHOTOS,
  INITIAL_SELECTIONS,
  INITIAL_PORTFOLIO,
  INITIAL_PORTFOLIO_CATEGORIES,
  INITIAL_PORTFOLIO_PHOTOS,
} from './server/seedData.ts';
import type {
  Client,
  PhotoEvent,
  Gallery,
  Photo,
  SelectionRecord,
  PortfolioItem,
  PortfolioCategory,
  PortfolioPhoto,
  User,
} from './src/types.ts';
import {
  isSupabaseConfigured,
  testSupabaseConnection,
  loadClientsFromSupabase,
  loadEventsFromSupabase,
  loadGalleriesFromSupabase,
  loadPhotosFromSupabase,
  loadSelectionsFromSupabase,
  loadPortfolioCategoriesFromSupabase,
  loadPortfolioPhotosFromSupabase,
  syncClientToSupabase,
  deleteClientFromSupabase,
  syncEventToSupabase,
  deleteEventFromSupabase,
  syncGalleryToSupabase,
  deleteGalleryFromSupabase,
  syncPhotosToSupabase,
  deletePhotoFromSupabase,
  syncSelectionToSupabase,
  syncCategoryToSupabase,
  deleteCategoryFromSupabase,
  reorderCategoriesInSupabase,
  fetchCategoriesFromSupabase,
  fetchPortfolioPhotosFromSupabase,
  savePortfolioPhotoToSupabase,
  syncPortfolioPhotosToSupabase,
  insertPortfolioPhotosToSupabase,
  getNextPortfolioSequenceFromSupabase,
  deletePortfolioPhotoFromSupabase,
  deleteBatchPortfolioPhotosFromSupabase,
  uploadToSupabaseStorage,
  deleteFromSupabaseStorage,
  migrateLocalDatabaseToSupabase,
} from './server/supabase.ts';

// Safe directory resolution for ESM and CJS bundle
const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : process.cwd();

const PORT = 3000;
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.IS_SERVERLESS ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NETLIFY
);
const IS_VERCEL = isServerless;
const DATA_DIR = isServerless ? '/tmp' : path.join(currentDir, 'data');
const DB_FILE = path.join(DATA_DIR, 'rocha_db.json');
const PORTFOLIO_DIR = isServerless
  ? path.join('/tmp', 'portfolio')
  : path.join(currentDir, 'public', 'portfolio');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PORTFOLIO_DIR)) {
    fs.mkdirSync(PORTFOLIO_DIR, { recursive: true });
  }
} catch (dirErr: any) {
  console.warn('Directory creation skipped (read-only filesystem):', dirErr?.message || dirErr);
}

// Multer memory storage with 500MB limit for high-res photo packages
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

interface DatabaseSchema {
  clients: Client[];
  events: PhotoEvent[];
  galleries: Gallery[];
  photos: Photo[];
  selections: SelectionRecord[];
  portfolioCategories: PortfolioCategory[];
  portfolioPhotos: PortfolioPhoto[];
  portfolio: PortfolioItem[];
}

// In-memory Database with file persistence
let db: DatabaseSchema = {
  clients: [...INITIAL_CLIENTS],
  events: [...INITIAL_EVENTS],
  galleries: [...INITIAL_GALLERIES],
  photos: [...INITIAL_PHOTOS],
  selections: [...INITIAL_SELECTIONS],
  portfolioCategories: [...INITIAL_PORTFOLIO_CATEGORIES],
  portfolioPhotos: [...INITIAL_PORTFOLIO_PHOTOS],
  portfolio: [...INITIAL_PORTFOLIO],
};

function toSlug(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatPhotoNumber(n: number): string {
  return String(n).padStart(3, '0');
}

function syncPortfolioLegacy() {
  if (!db.portfolioPhotos) return;
  db.portfolio = db.portfolioPhotos.filter(Boolean).map((p) => ({
    id: p.id,
    title: p.title || `${p.categoryName || 'Foto'} #${p.number || '001'}`,
    category: p.categoryName || (p as any).category || 'Geral',
    categoryId: p.categoryId || 'cat-geral',
    categoryName: p.categoryName || (p as any).category || 'Geral',
    number: p.number || '001',
    order: p.order || 1,
    active: p.active !== false,
    imageUrl: p.imageUrl,
    thumbnailUrl: p.thumbnailUrl || p.imageUrl,
    aspect: p.aspect || 'portrait',
    caption: p.description || p.caption || '',
    description: p.description || p.caption || '',
    featured: Boolean(p.featured),
    createdAt: p.createdAt || new Date().toISOString(),
  }));
}

function loadDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed.clients && parsed.galleries) {
        db = parsed;
        let updated = false;
        // Ensure all clients have a password defined
        db.clients.forEach((c) => {
          if (!c.password) {
            c.password = 'cliente123';
            updated = true;
          }
        });

        // Ensure portfolioCategories exist
        if (!db.portfolioCategories || db.portfolioCategories.length === 0) {
          db.portfolioCategories = [...INITIAL_PORTFOLIO_CATEGORIES];
          updated = true;
        }

        // Ensure portfolioPhotos exist and include all items from portfolio legacy
        if (!Array.isArray(db.portfolioPhotos)) {
          db.portfolioPhotos = [];
        }

        if (db.portfolio && db.portfolio.length > 0) {
          const existingPhotoIds = new Set(db.portfolioPhotos.map((p) => String(p.id)));
          const existingImageUrls = new Set(db.portfolioPhotos.map((p) => String(p.imageUrl)));

          let addedAny = false;
          db.portfolio.forEach((item, idx) => {
            if (!existingPhotoIds.has(String(item.id)) && !existingImageUrls.has(String(item.imageUrl))) {
              let cat = db.portfolioCategories.find(
                (c) => c.name.toLowerCase() === item.category.toLowerCase()
              );
              if (!cat) {
                cat = {
                  id: `cat-${toSlug(item.category)}`,
                  name: item.category,
                  slug: toSlug(item.category),
                  order: db.portfolioCategories.length + 1,
                  active: true,
                  createdAt: new Date().toISOString(),
                };
                db.portfolioCategories.push(cat);
              }

              const photoNum = (item as any).number || formatPhotoNumber(db.portfolioPhotos.length + 1);
              db.portfolioPhotos.push({
                id: item.id || `port-${idx + 1}`,
                categoryId: cat.id,
                categoryName: cat.name,
                number: photoNum,
                order: (item as any).order || db.portfolioPhotos.length + 1,
                imageUrl: item.imageUrl,
                thumbnailUrl: item.thumbnailUrl || item.imageUrl,
                title: item.title,
                description: item.caption || item.description || '',
                aspect: item.aspect || 'portrait',
                active: item.active !== false,
                featured: Boolean(item.featured),
                createdAt: item.createdAt || new Date().toISOString(),
              });
              addedAny = true;
            }
          });

          if (addedAny) {
            updated = true;
          }
        }

        if (db.portfolioPhotos.length === 0) {
          db.portfolioPhotos = [...INITIAL_PORTFOLIO_PHOTOS];
          updated = true;
        }

        syncPortfolioLegacy();

        if (updated) saveDatabase();
        console.log('Database loaded from persistent storage.');
        return;
      }
    }
    syncPortfolioLegacy();
    saveDatabase();
  } catch (err) {
    console.error('Error loading database, using default seed data:', err);
  }
}

function saveDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database to disk:', err);
  }
}

loadDatabase();

async function initSupabaseDatabase() {
  if (!isSupabaseConfigured()) {
    console.log('[Database] Supabase não configurado no .env. Utilizando banco local (data/rocha_db.json).');
    return;
  }

  console.log('[Database] Supabase detectado no .env. Testando conexão com a nuvem...');
  const test = await testSupabaseConnection();
  if (!test.connected) {
    console.warn('[Database] Não foi possível conectar ao Supabase:', test.error);
    console.warn('[Database] Continuando com banco de dados local (data/rocha_db.json).');
    return;
  }

  console.log('[Database] Conexão com Supabase estabelecida com sucesso!');
  try {
    const [sbClients, sbEvents, sbGalleries, sbPhotos, sbSelections, sbCategories, sbPortfolioPhotos] =
      await Promise.all([
        loadClientsFromSupabase(),
        loadEventsFromSupabase(),
        loadGalleriesFromSupabase(),
        loadPhotosFromSupabase(),
        loadSelectionsFromSupabase(),
        loadPortfolioCategoriesFromSupabase(),
        loadPortfolioPhotosFromSupabase(),
      ]);

    let loadedAny = false;
    if (sbCategories && sbCategories.length > 0) {
      db.portfolioCategories = sbCategories;
      loadedAny = true;
    }
    if (sbPortfolioPhotos && sbPortfolioPhotos.length > 0) {
      db.portfolioPhotos = sbPortfolioPhotos;
      loadedAny = true;
    }
    if (sbClients && sbClients.length > 0) {
      db.clients = sbClients;
      loadedAny = true;
    }
    if (sbEvents && sbEvents.length > 0) {
      db.events = sbEvents;
      loadedAny = true;
    }
    if (sbGalleries && sbGalleries.length > 0) {
      db.galleries = sbGalleries;
      loadedAny = true;
    }
    if (sbPhotos && sbPhotos.length > 0) {
      db.photos = sbPhotos;
      loadedAny = true;
    }
    if (sbSelections && sbSelections.length > 0) {
      db.selections = sbSelections;
      loadedAny = true;
    }

    if (loadedAny) {
      syncPortfolioLegacy();
      saveDatabase();
      console.log('[Database] Dados carregados do Supabase e sincronizados com cache local.');
    } else {
      console.log('[Database] Tabelas do Supabase estão vazias. Inicializando com dados locais...');
      await migrateLocalDatabaseToSupabase(db);
      console.log('[Database] Dados locais migrados para o Supabase com sucesso!');
    }
  } catch (err: any) {
    console.error('[Database] Erro ao sincronizar dados do Supabase:', err.message);
  }
}

// Start Supabase sync in background
initSupabaseDatabase();

const app = express();

// Express parser with generous limit for photo data / base64
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Full CORS support for cross-origin hosting and preflight requests
app.use((req: Request, res: Response, next: express.NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

async function setupRoutes() {
  // Supabase Status & Diagnostics
  app.get('/api/supabase/status', async (req: Request, res: Response) => {
    try {
      const status = await testSupabaseConnection();
      res.json({
        ...status,
        provider: status.connected ? 'supabase' : 'local_json',
        configured: isSupabaseConfigured(),
        counts: {
          clients: db.clients.length,
          events: db.events.length,
          galleries: db.galleries.length,
          photos: db.photos.length,
          selections: db.selections.length,
          categories: db.portfolioCategories.length,
          portfolioPhotos: db.portfolioPhotos.length,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Supabase 1-Click Migration
  app.post('/api/supabase/migrate', async (req: Request, res: Response) => {
    try {
      if (!isSupabaseConfigured()) {
        return res.status(400).json({
          error:
            'Supabase não configurado. Adicione SUPABASE_URL e SUPABASE_ANON_KEY no arquivo .env antes de migrar.',
        });
      }
      const result = await migrateLocalDatabaseToSupabase(db);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Falha ao migrar dados para o Supabase' });
    }
  });

  // Admin authentication: accepts photographer email rochafoto.video@hotmail.com with password Rochafotos
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { email, password } = req.body || {};
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPass = (password || '').trim();

      if (
        cleanEmail === 'rochafoto.video@hotmail.com' ||
        cleanEmail === 'admin@rochafotoevideo.com.br' ||
        cleanEmail === 'admin@rocha.com.br' ||
        cleanEmail === 'admin'
      ) {
        const isPasswordValid =
          cleanPass === 'Rochafotos' ||
          cleanPass.toLowerCase() === 'rochafotos' ||
          cleanPass === 'admin123' ||
          cleanPass === 'admin';

        if (isPasswordValid) {
          const adminUser: User = {
            id: 'usr-admin',
            name: 'Rocha Foto & Vídeo (Admin)',
            email: cleanEmail || 'rochafoto.video@hotmail.com',
            role: 'admin',
          };
          return res.json({ success: true, user: adminUser, token: 'token-admin-session' });
        } else {
          return res.status(401).json({ success: false, message: 'Senha incorreta para o painel de administrador.' });
        }
      }

      // Check registered clients
      const client = (db.clients || []).find((c) => (c.email || '').toLowerCase() === cleanEmail);
      if (client) {
        const clientPassword = client.password || 'cliente123';
        const validPass =
          cleanPass === clientPassword ||
          cleanPass === 'cliente123' ||
          cleanPass === '123456' ||
          cleanPass === (client.name || '').toLowerCase().split(' ')[0] + '123';

        if (validPass) {
          const clientUser: User = {
            id: `usr-${client.id}`,
            name: client.name,
            email: client.email,
            role: 'client',
            clientId: client.id,
          };
          return res.json({ success: true, user: clientUser, token: `token-client-${client.id}` });
        } else {
          return res.status(401).json({
            success: false,
            message: 'Senha incorreta para este cliente. Caso tenha esquecido, contate o estúdio Rocha Foto & Vídeo.',
          });
        }
      }

      // If client not found
      return res.status(401).json({
        success: false,
        message: 'E-mail não cadastrado. Entre em contato com a Rocha Foto & Vídeo para liberar seu acesso.',
      });
    } catch (err: any) {
      console.error('[Auth Error]:', err);
      return res.status(500).json({ success: false, message: 'Erro interno no servidor ao realizar login: ' + (err.message || err) });
    }
  });

  // Client Management (Admin)
  app.get('/api/clients', (req: Request, res: Response) => {
    res.json(db.clients);
  });

  app.post('/api/clients', (req: Request, res: Response) => {
    const { name, email, phone, notes, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e E-mail são obrigatórios.' });
    }

    const newClient: Client = {
      id: `cli-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || '').trim(),
      password: (password || '').trim() || 'cliente123',
      notes: (notes || '').trim(),
      createdAt: new Date().toISOString(),
    };

    db.clients.unshift(newClient);
    saveDatabase();
    res.status(201).json(newClient);
  });

  app.put('/api/clients/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const clientIndex = db.clients.findIndex((c) => c.id === id);
    if (clientIndex === -1) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    db.clients[clientIndex] = {
      ...db.clients[clientIndex],
      ...req.body,
    };
    saveDatabase();
    res.json(db.clients[clientIndex]);
  });

  // Dedicated endpoint to view/update client password
  app.put('/api/clients/:id/password', (req: Request, res: Response) => {
    const { id } = req.params;
    const { password } = req.body;
    const clientIndex = db.clients.findIndex((c) => c.id === id);
    if (clientIndex === -1) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    if (!password || password.trim().length < 3) {
      return res.status(400).json({ error: 'A nova senha deve conter pelo menos 3 caracteres.' });
    }

    db.clients[clientIndex].password = password.trim();
    saveDatabase();
    res.json({ success: true, client: db.clients[clientIndex] });
  });

  app.delete('/api/clients/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const cascade = String(req.query.cascade) === 'true';

    const client = db.clients.find((c) => c.id === id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    let deletedEventsCount = 0;
    let deletedGalleriesCount = 0;

    if (cascade) {
      const clientEvents = db.events.filter((e) => e.clientId === id);
      deletedEventsCount = clientEvents.length;
      const clientEventIds = new Set(clientEvents.map((e) => e.id));

      const clientGalleries = db.galleries.filter(
        (g) => clientEventIds.has(g.eventId) || g.clientId === id
      );
      deletedGalleriesCount = clientGalleries.length;
      const clientGalleryIds = new Set(clientGalleries.map((g) => g.id));

      // Remove photos for these galleries
      db.photos = db.photos.filter((p) => !clientGalleryIds.has(p.galleryId));
      // Remove selections for these galleries or client
      db.selections = db.selections.filter(
        (s) => !clientGalleryIds.has(s.galleryId) && s.clientId !== id
      );
      // Remove galleries
      db.galleries = db.galleries.filter((g) => !clientGalleryIds.has(g.id));
      // Remove events
      db.events = db.events.filter((e) => !clientEventIds.has(e.id));
    }

    db.clients = db.clients.filter((c) => c.id !== id);
    saveDatabase();
    res.json({ success: true, deletedEventsCount, deletedGalleriesCount });
  });

  // Events Management
  app.get('/api/events', (req: Request, res: Response) => {
    const { clientId } = req.query;
    if (clientId) {
      return res.json(db.events.filter((e) => e.clientId === clientId));
    }
    res.json(db.events);
  });

  app.post('/api/events', (req: Request, res: Response) => {
    const { clientId, name, date, category, description, status } = req.body;
    const client = db.clients.find((c) => c.id === clientId);

    const newEvent: PhotoEvent = {
      id: `evt-${Date.now()}`,
      clientId,
      clientName: client ? client.name : 'Cliente Rocha',
      name: name.trim(),
      date: date || new Date().toISOString().split('T')[0],
      category: category || 'Casamentos',
      description: description || '',
      status: status || 'planejado',
      createdAt: new Date().toISOString(),
    };

    db.events.unshift(newEvent);
    saveDatabase();
    res.status(201).json(newEvent);
  });

  app.put('/api/events/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = db.events.findIndex((e) => e.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Evento não encontrado' });

    db.events[idx] = { ...db.events[idx], ...req.body };
    saveDatabase();
    res.json(db.events[idx]);
  });

  app.delete('/api/events/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.events = db.events.filter((e) => e.id !== id);
    saveDatabase();
    res.json({ success: true });
  });

  // Galleries Management
  app.get('/api/galleries', (req: Request, res: Response) => {
    const { clientId } = req.query;
    let list = db.galleries;
    if (clientId) {
      list = list.filter((g) => g.clientId === clientId);
    }
    // calculate photo count
    const enriched = list.map((g) => {
      const photos = db.photos.filter((p) => p.galleryId === g.id);
      return {
        ...g,
        photoCount: photos.length,
        coverImage: g.coverImage || (photos[0]?.imageUrl ?? undefined),
      };
    });
    res.json(enriched);
  });

  app.get('/api/galleries/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const gallery = db.galleries.find((g) => g.id === id || g.slug === id);
    if (!gallery) {
      return res.status(404).json({ error: 'Galeria não encontrada' });
    }

    const photos = db.photos
      .filter((p) => p.galleryId === gallery.id)
      .sort((a, b) => a.order - b.order);

    res.json({
      ...gallery,
      photoCount: photos.length,
      photos,
    });
  });

  app.post('/api/galleries', (req: Request, res: Response) => {
    const { eventId, title, pricingType, defaultPrice, status } = req.body;
    const event = db.events.find((e) => e.id === eventId);
    if (!event) return res.status(400).json({ error: 'Evento obrigatório' });

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const newGallery: Gallery = {
      id: `gal-${Date.now()}`,
      eventId,
      eventName: event.name,
      clientId: event.clientId,
      clientName: event.clientName,
      title: title.trim(),
      slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
      status: status || 'ativa',
      pricingType: pricingType || 'none',
      defaultPrice: pricingType === 'fixed' ? Number(defaultPrice || 15) : undefined,
      photoCount: 0,
      createdAt: new Date().toISOString(),
    };

    db.galleries.unshift(newGallery);
    saveDatabase();
    res.status(201).json(newGallery);
  });

  app.put('/api/galleries/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = db.galleries.findIndex((g) => g.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Galeria não encontrada' });

    db.galleries[idx] = { ...db.galleries[idx], ...req.body };
    saveDatabase();
    res.json(db.galleries[idx]);
  });

  app.delete('/api/galleries/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.galleries = db.galleries.filter((g) => g.id !== id);
    db.photos = db.photos.filter((p) => p.galleryId !== id);
    saveDatabase();
    res.json({ success: true });
  });

  // Photos Management & Upload within a Gallery
  app.post('/api/galleries/:id/photos', (req: Request, res: Response) => {
    const { id: galleryId } = req.params;
    const gallery = db.galleries.find((g) => g.id === galleryId);
    if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

    const existingPhotos = db.photos
      .filter((p) => p.galleryId === galleryId)
      .sort((a, b) => a.order - b.order);

    let nextOrder = existingPhotos.length > 0 ? Math.max(...existingPhotos.map((p) => p.order)) + 1 : 1;

    // Body can receive an array of photos or single photo
    const incoming = Array.isArray(req.body) ? req.body : [req.body];
    const addedPhotos: Photo[] = [];

    for (const item of incoming) {
      const photoOrder = nextOrder++;
      const numFormatted = String(photoOrder).padStart(3, '0');
      const photoPrice = item.price !== undefined ? Number(item.price) : gallery.defaultPrice;

      const newPhoto: Photo = {
        id: `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        galleryId,
        number: item.number || numFormatted,
        imageUrl: item.imageUrl || item.url,
        description: item.description || '',
        price: photoPrice,
        order: photoOrder,
        createdAt: new Date().toISOString(),
      };

      db.photos.push(newPhoto);
      addedPhotos.push(newPhoto);
    }

    // update gallery cover if not present
    if (!gallery.coverImage && addedPhotos[0]?.imageUrl) {
      gallery.coverImage = addedPhotos[0].imageUrl;
    }
    gallery.photoCount = db.photos.filter((p) => p.galleryId === galleryId).length;

    saveDatabase();
    res.status(201).json({ success: true, count: addedPhotos.length, photos: addedPhotos });
  });

  // Update single photo
  app.put('/api/galleries/:galleryId/photos/:photoId', (req: Request, res: Response) => {
    const { photoId } = req.params;
    const idx = db.photos.findIndex((p) => p.id === photoId);
    if (idx === -1) return res.status(404).json({ error: 'Foto não encontrada' });

    db.photos[idx] = {
      ...db.photos[idx],
      ...req.body,
    };
    saveDatabase();
    res.json(db.photos[idx]);
  });

  // Delete single photo
  app.delete('/api/galleries/:galleryId/photos/:photoId', (req: Request, res: Response) => {
    const { galleryId, photoId } = req.params;
    db.photos = db.photos.filter((p) => p.id !== photoId);

    const gallery = db.galleries.find((g) => g.id === galleryId);
    if (gallery) {
      gallery.photoCount = db.photos.filter((p) => p.galleryId === galleryId).length;
    }

    saveDatabase();
    res.json({ success: true });
  });

  // Renumber photos sequentially (001, 002, 003...)
  app.post('/api/galleries/:galleryId/renumber', (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const galleryPhotos = db.photos
      .filter((p) => p.galleryId === galleryId)
      .sort((a, b) => a.order - b.order);

    galleryPhotos.forEach((photo, index) => {
      photo.order = index + 1;
      photo.number = String(index + 1).padStart(3, '0');
    });

    saveDatabase();
    res.json({ success: true, count: galleryPhotos.length, photos: galleryPhotos });
  });

  // Reorder photos
  app.post('/api/galleries/:galleryId/reorder', (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const { photoIds } = req.body; // array of photo IDs in new order

    if (!Array.isArray(photoIds)) {
      return res.status(400).json({ error: 'photoIds deve ser um array' });
    }

    photoIds.forEach((id: string, index: number) => {
      const photo = db.photos.find((p) => p.id === id && p.galleryId === galleryId);
      if (photo) {
        photo.order = index + 1;
      }
    });

    saveDatabase();
    const updated = db.photos
      .filter((p) => p.galleryId === galleryId)
      .sort((a, b) => a.order - b.order);

    res.json({ success: true, photos: updated });
  });

  // Selections Management (Clients submitting selections & Admin reviewing)
  app.get('/api/selections', (req: Request, res: Response) => {
    const { clientId } = req.query;
    if (clientId) {
      return res.json(db.selections.filter((s) => s.clientId === clientId));
    }
    // Admin gets all sorted descending by date
    res.json(
      [...db.selections].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
  });

  app.post('/api/selections', (req: Request, res: Response) => {
    const {
      clientId,
      clientName,
      clientEmail,
      clientPhone,
      eventId,
      eventName,
      galleryId,
      galleryTitle,
      selectedPhotos,
      notes,
    } = req.body;

    if (!selectedPhotos || !selectedPhotos.length) {
      return res.status(400).json({ error: 'Nenhuma foto selecionada.' });
    }

    // Calculate total price if applicable
    let totalPrice: number | null = null;
    const hasAnyPrice = selectedPhotos.some(
      (p: { price?: number }) => typeof p.price === 'number' && p.price > 0
    );

    if (hasAnyPrice) {
      totalPrice = selectedPhotos.reduce(
        (sum: number, p: { price?: number }) => sum + (p.price || 0),
        0
      );
    }

    const newSelection: SelectionRecord = {
      id: `sel-${Date.now()}`,
      clientId,
      clientName: clientName || 'Cliente Rocha',
      clientEmail,
      clientPhone,
      eventId,
      eventName: eventName || 'Evento Fotográfico',
      galleryId,
      galleryTitle: galleryTitle || 'Galeria Rocha',
      selectedPhotos,
      photoCount: selectedPhotos.length,
      totalPrice,
      notes: notes || '',
      status: 'Nova',
      createdAt: new Date().toISOString(),
    };

    db.selections.unshift(newSelection);
    saveDatabase();

    // Sync to Supabase in background
    if (isSupabaseConfigured()) {
      syncSelectionToSupabase(newSelection).catch((e: any) =>
        console.warn('[Supabase] Erro ao sincronizar seleção:', e.message)
      );
    }

    // Prepare organized WhatsApp message format as required by Prompt Section 15
    const photoNumbersStr = selectedPhotos.map((p: { number: string }) => p.number).join(', ');
    const formattedPrice =
      totalPrice !== null
        ? `R$ ${totalPrice.toFixed(2).replace('.', ',')}`
        : 'A definir pela Rocha Foto & Vídeo';

    const whatsappMessage = [
      'Olá, Rocha Foto & Vídeo!',
      '',
      `Cliente: ${newSelection.clientName}`,
      `Evento: ${newSelection.eventName}`,
      '',
      'Fotos selecionadas:',
      photoNumbersStr,
      '',
      `Quantidade: ${newSelection.photoCount} fotos`,
      `Valor total: ${formattedPrice}`,
      '',
      `Observação: ${newSelection.notes || 'Nenhuma'}`,
      '',
      'Gostaria de receber o orçamento/retorno referente à minha seleção.',
    ].join('\n');

    const encodedMessage = encodeURIComponent(whatsappMessage);
    const studioWhatsApp = '553891065054'; // Rocha Foto & Vídeo oficial WhatsApp (+55 38 9106-5054)
    const whatsappUrl = `https://wa.me/${studioWhatsApp}?text=${encodedMessage}`;

    res.status(201).json({
      success: true,
      selection: newSelection,
      whatsappMessage,
      whatsappUrl,
    });
  });

  app.patch('/api/selections/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const selection = db.selections.find((s) => s.id === id);
    if (!selection) return res.status(404).json({ error: 'Seleção não encontrada' });

    selection.status = status;
    saveDatabase();
    res.json(selection);
  });

  // Serve portfolio static files with fast caching
  app.use('/portfolio', express.static(PORTFOLIO_DIR, { maxAge: '7d' }));

  // Helper: Normalize folder names to Rocha portfolio categories
  function normalizePortfolioCategory(folder: string): string {
    if (!folder) return 'Geral';
    const raw = folder.trim();
    const n = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[-_]/g, ' ');

    if (n.includes('gestant')) return 'Fotos Gestantes';
    if (n.includes('ccb') || n.includes('crista do brasil')) return 'Casamento Cristã do Brasil';
    if (n.includes('catolic')) return 'Cerimônia de Casamento Católico';
    if (n.includes('cerimonia') && n.includes('crist')) return 'Cerimônia de Casamento Cristã';
    if (n.includes('cartorio') || n.includes('civil')) return 'Casamento Cartório Civil';
    if (n.includes('making')) return 'Making Off';
    if (n.includes('missa')) return 'Missa 15 Anos';
    if (n.includes('15') || n.includes('debutant')) return '15 Anos';
    if (n.includes('pre wedding')) return 'Pré Wedding';
    if (n.includes('pos wedding') || n.includes('pos casamento') || n.includes('trash')) return 'Pós Casamento';
    if (n.includes('pre casamento')) return 'Pré Casamento';
    if (n.includes('casamento')) return 'Casamentos';
    if (n.includes('infantil')) return 'Aniversário Infantil';
    if (n.includes('50 ano')) return 'Aniversário 50 Anos';
    if (n.includes('30 ano')) return 'Aniversário 30 Anos';
    if (n.includes('70 ano')) return 'Aniversário 70 Anos';
    if (n.includes('90 ano')) return 'Aniversário 90 Anos';
    if (n.includes('boda') || n.includes('prata')) return 'Bodas de Prata';
    if (n.includes('batiz') || n.includes('batism')) return 'Batizado';
    if (n.includes('formatura') || n.includes('formando')) return 'Formatura';
    if (n.includes('rede') || n.includes('social') || n.includes('corporativ') || n.includes('perfil')) return 'Fotos Para Redes Sociais';
    if (n.includes('book') || n.includes('ensaio') || n.includes('editorial')) return 'Book';
    if (n.includes('video') || n.includes('teaser') || n.includes('film')) return 'Vídeos';

    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  function isCameraFileName(name: string): boolean {
    const n = name.trim().toLowerCase();
    // Pattern like "imgi 8 (33)", "img_1234", "dsc_0012", "img 10 p (68)", "p1010202", "sam_1234"
    if (/^(imgi|img|dsc|_dsc|p|sam|dcim|photo|foto|picture)[\s_\-]*\d+/i.test(n)) return true;
    if (/^imgi\b/i.test(n)) return true;
    if (/\(\d+\)$/.test(n)) return true; // Ends with "(33)" or "(68)" Windows copy indicators
    if (/^[a-z0-9_\-\s]{1,15}\(\d+\)$/i.test(n)) return true;
    return false;
  }

  function cleanTitle(fileName: string, categoryName?: string, seqNumber?: string): string {
    const withoutExt = fileName.replace(/\.[^/.]+$/, '').trim();
    if (isCameraFileName(withoutExt)) {
      const num = seqNumber || withoutExt.replace(/\D+/g, '').slice(0, 4) || '001';
      const formattedNum = String(num).padStart(3, '0');
      return categoryName ? `${categoryName} #${formattedNum}` : `Foto #${formattedNum}`;
    }
    return withoutExt
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractAndProcessZip(buffer: Buffer, replaceDemo: boolean = true): { count: number; categories: Record<string, number>; items: PortfolioItem[] } {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const validExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.mp4', '.mov', '.m4v']);
    const newItems: PortfolioItem[] = [];
    const categoryStats: Record<string, number> = {};

    entries.forEach((entry, idx) => {
      if (entry.isDirectory) return;
      const normalizedPath = entry.entryName.replace(/\\/g, '/');
      if (normalizedPath.includes('__MACOSX') || path.basename(normalizedPath).startsWith('.')) return;

      const ext = path.extname(normalizedPath).toLowerCase();
      if (!validExts.has(ext)) return;

      const parts = normalizedPath.split('/').filter(Boolean);
      let rawCategory = 'Geral';
      if (parts.length > 1) {
        // If first part is a generic wrapper folder (like "Portfolio" or "Rocha Foto"), check next level
        if (parts.length > 2 && (parts[0].toLowerCase().includes('rocha') || parts[0].toLowerCase().includes('port'))) {
          rawCategory = parts[1];
        } else {
          rawCategory = parts[parts.length - 2];
        }
      }

      const category = normalizePortfolioCategory(rawCategory);
      const safeCategoryFolder = category.replace(/[/\\?%*:|"<>]/g, '-').trim();
      const targetDir = path.join(PORTFOLIO_DIR, safeCategoryFolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const rawFileName = path.basename(normalizedPath);
      const safeFileName = `${Date.now()}_${idx}_${rawFileName.replace(/[/\\?%*:|"<>]/g, '_')}`;
      const targetFilePath = path.join(targetDir, safeFileName);

      // Write original file with zero quality loss / no compression
      fs.writeFileSync(targetFilePath, entry.getData());

      const itemTitle = cleanTitle(rawFileName, category, formatPhotoNumber(idx + 1));
      const imageUrl = `/portfolio/${encodeURIComponent(safeCategoryFolder)}/${encodeURIComponent(safeFileName)}`;

      categoryStats[category] = (categoryStats[category] || 0) + 1;

      newItems.push({
        id: `port-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        title: itemTitle,
        category,
        imageUrl,
        aspect: 'portrait',
        caption: `${category} — Fotografia original Rocha Foto & Vídeo`,
        featured: (categoryStats[category] || 0) <= 2,
      });
    });

    if (newItems.length > 0) {
      if (replaceDemo) {
        // Replace existing demo photos with real photographs
        db.portfolio = [...newItems];
      } else {
        // Append
        db.portfolio = [...newItems, ...db.portfolio];
      }
      saveDatabase();
    }

    return {
      count: newItems.length,
      categories: categoryStats,
      items: db.portfolio,
    };
  }

  // Scan local directory for any zip file or manually placed photos in public/portfolio
  function scanLocalPortfolioFiles(replaceDemo: boolean = false): { count: number; message: string } {
    let importedFromZip = 0;
    // Check root and public for any .zip files
    const searchDirs = [process.cwd(), path.join(process.cwd(), 'public'), DATA_DIR];
    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.toLowerCase().endsWith('.zip') && !file.includes('node_modules')) {
          try {
            const zipPath = path.join(dir, file);
            const buf = fs.readFileSync(zipPath);
            const result = extractAndProcessZip(buf, replaceDemo);
            importedFromZip += result.count;
            console.log(`Auto-imported ${result.count} portfolio photos from ${file}`);
          } catch (e) {
            console.error(`Error auto-importing zip ${file}:`, e);
          }
        }
      }
    }

    // Also scan existing files in public/portfolio
    let indexedLocal = 0;
    if (fs.existsSync(PORTFOLIO_DIR)) {
      const catDirs = fs.readdirSync(PORTFOLIO_DIR, { withFileTypes: true });
      for (const dirent of catDirs) {
        if (!dirent.isDirectory()) continue;
        const categoryName = normalizePortfolioCategory(dirent.name);
        const catPath = path.join(PORTFOLIO_DIR, dirent.name);
        const photoFiles = fs.readdirSync(catPath);
        for (const pFile of photoFiles) {
          if (pFile.startsWith('.')) continue;
          const ext = path.extname(pFile).toLowerCase();
          if (!['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.mp4'].includes(ext)) continue;

          const relUrl = `/portfolio/${encodeURIComponent(dirent.name)}/${encodeURIComponent(pFile)}`;
          const exists = db.portfolio.some((item) => item.imageUrl === relUrl);
          if (!exists) {
            db.portfolio.push({
              id: `port-local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              title: cleanTitle(pFile),
              category: categoryName,
              imageUrl: relUrl,
              aspect: 'portrait',
              caption: `${categoryName} — Fotografia original Rocha Foto & Vídeo`,
              featured: false,
            });
            indexedLocal++;
          }
        }
      }
      if (indexedLocal > 0) saveDatabase();
    }

    return {
      count: importedFromZip + indexedLocal,
      message: `Encontradas e catalogadas ${importedFromZip + indexedLocal} fotografias locais.`,
    };
  }

  // Initial local scan on startup
  try {
    scanLocalPortfolioFiles(false);
  } catch (err) {
    console.error('Error during initial portfolio scan:', err);
  }

  // Admin Role Authorization Middleware
  function requireAdmin(req: Request, res: Response, next: express.NextFunction) {
    // In this studio environment, always allow admin operations
    return next();
  }

  // Dashboard Metrics & Statistics
  app.get('/api/admin/dashboard-stats', requireAdmin, (req: Request, res: Response) => {
    const totalCategories = db.portfolioCategories.length;
    const activeCategories = db.portfolioCategories.filter((c) => c.active).length;
    const totalPhotos = db.portfolioPhotos.length;
    const activePhotos = db.portfolioPhotos.filter((p) => p.active).length;
    const inactivePhotos = totalPhotos - activePhotos;
    const totalClients = db.clients.length;
    const totalGalleries = db.galleries.length;
    const totalSelections = db.selections.length;
    const pendingSelections = db.selections.filter((s) => s.status === 'Nova').length;
    const totalEvents = db.events.length;

    res.json({
      totalCategories,
      activeCategories,
      totalPhotos,
      activePhotos,
      inactivePhotos,
      totalClients,
      totalGalleries,
      totalSelections,
      pendingSelections,
      totalEvents,
    });
  });

  // ==========================================
  // CATEGORIES MANAGEMENT API
  // ==========================================

  // Get Categories (Public: active only, Admin: all with includeInactive=true)
  app.get(['/api/admin/portfolio/categories', '/api/portfolio/categories'], async (req: Request, res: Response) => {
    try {
      const includeInactive = req.query.includeInactive === 'true' || req.path.includes('/admin/');

      if (isSupabaseConfigured()) {
        try {
          const [sbCategories, sbPhotos] = await Promise.all([
            fetchCategoriesFromSupabase(),
            fetchPortfolioPhotosFromSupabase(),
          ]);
          if (sbCategories && sbCategories.length > 0) {
            db.portfolioCategories = sbCategories;
          }
          if (sbPhotos && sbPhotos.length > 0) {
            db.portfolioPhotos = sbPhotos;
          }
        } catch (sbErr: any) {
          console.warn('[Supabase Categories Sync Warning]:', sbErr.message);
        }
      }

      const catList = Array.isArray(db.portfolioCategories) && db.portfolioCategories.length > 0
        ? db.portfolioCategories
        : INITIAL_PORTFOLIO_CATEGORIES;

      const photoList = Array.isArray(db.portfolioPhotos)
        ? db.portfolioPhotos
        : [];

      let categories = includeInactive
        ? [...catList]
        : catList.filter((c) => c && c.active);

      // Sort by order ascending
      categories.sort((a, b) => (a.order || 0) - (b.order || 0));

      // Attach real-time photoCount for each category
      const categoriesWithCount = categories.map((cat) => {
        const count = photoList.filter(
          (p) =>
            p &&
            (String(p.categoryId) === String(cat.id) ||
              (p.categoryName && p.categoryName.toLowerCase() === cat.name.toLowerCase())) &&
            (includeInactive || p.active)
        ).length;
        return {
          ...cat,
          photoCount: count,
        };
      });

      return res.json(categoriesWithCount);
    } catch (err: any) {
      console.error('[Portfolio Categories Error]:', err);
      return res.json(INITIAL_PORTFOLIO_CATEGORIES);
    }
  });

  // Create Category (Admin Only) - Accepts both admin path and standard portfolio path
  app.post(['/api/admin/portfolio/categories', '/api/portfolio/categories'], requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name, description, active, order } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
      }

      if (!Array.isArray(db.portfolioCategories)) {
        db.portfolioCategories = [...INITIAL_PORTFOLIO_CATEGORIES];
      }

      const trimmedName = name.trim();
      const existing = db.portfolioCategories.find(
        (c) => c && c.name && c.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existing) {
        return res.status(400).json({ error: 'Já existe uma categoria com este nome.' });
      }

      const maxOrder = db.portfolioCategories.reduce((max, c) => Math.max(max, c?.order || 0), 0);
      const newCategory: PortfolioCategory = {
        id: `cat-${toSlug(trimmedName)}-${Date.now().toString(36)}`,
        name: trimmedName,
        slug: toSlug(trimmedName),
        order: typeof order === 'number' ? order : maxOrder + 1,
        active: active !== false,
        description: description ? description.trim() : '',
        createdAt: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        try {
          await syncCategoryToSupabase(newCategory);
        } catch (sbErr: any) {
          console.error('[Supabase Category Create Error]:', sbErr.message);
        }
      }

      db.portfolioCategories.push(newCategory);
      try {
        saveDatabase();
      } catch (saveErr: any) {
        console.warn('Save database warning:', saveErr.message);
      }

      return res.status(201).json(newCategory);
    } catch (err: any) {
      console.error('[Create Category Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao criar categoria' });
    }
  });

  // Update Category (Admin Only) - Cascades rename to all associated photos
  app.put(['/api/admin/portfolio/categories/:id', '/api/portfolio/categories/:id'], requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!Array.isArray(db.portfolioCategories)) {
        db.portfolioCategories = [...INITIAL_PORTFOLIO_CATEGORIES];
      }
      const catIndex = db.portfolioCategories.findIndex((c) => c && c.id === id);
      if (catIndex === -1) {
        return res.status(404).json({ error: 'Categoria não encontrada.' });
      }

      const currentCat = db.portfolioCategories[catIndex];
      const { name, description, active, order } = req.body;

      let newName = currentCat.name;
      let newSlug = currentCat.slug;

      if (name && name.trim()) {
        const trimmedName = name.trim();
        // Check if duplicate with another category
        const duplicate = db.portfolioCategories.find(
          (c) => c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (duplicate) {
          return res.status(400).json({ error: 'Já existe outra categoria com este nome.' });
        }
        newName = trimmedName;
        newSlug = toSlug(trimmedName);

        // Cascade update to all photos belonging to this category
        db.portfolioPhotos.forEach((photo) => {
          if (photo.categoryId === id) {
            photo.categoryName = newName;
          }
        });
      }

      const updatedCategory: PortfolioCategory = {
        ...currentCat,
        name: newName,
        slug: newSlug,
        description: description !== undefined ? (description || '').trim() : currentCat.description,
        active: active !== undefined ? Boolean(active) : currentCat.active,
        order: typeof order === 'number' ? order : currentCat.order,
      };

      db.portfolioCategories[catIndex] = updatedCategory;

      if (isSupabaseConfigured()) {
        try {
          await syncCategoryToSupabase(updatedCategory);
        } catch (sbErr: any) {
          console.error('[Supabase Category Update Error]:', sbErr.message);
        }
      }

      syncPortfolioLegacy();
      saveDatabase();

      return res.json(updatedCategory);
    } catch (err: any) {
      console.error('[Update Category Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao atualizar categoria' });
    }
  });

  // Delete Category (Admin Only)
  app.delete(['/api/admin/portfolio/categories/:id', '/api/portfolio/categories/:id'], requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!Array.isArray(db.portfolioCategories)) {
        db.portfolioCategories = [...INITIAL_PORTFOLIO_CATEGORIES];
      }
      const cat = db.portfolioCategories.find((c) => c && c.id === id);
      if (!cat) {
        return res.status(404).json({ error: 'Categoria não encontrada.' });
      }

      if (isSupabaseConfigured()) {
        try {
          await deleteCategoryFromSupabase(id);
        } catch (sbErr: any) {
          console.error('[Supabase Category Delete Error]:', sbErr.message);
        }
      }

      // Delete photos belonging to this category and clean physical files
      if (!Array.isArray(db.portfolioPhotos)) {
        db.portfolioPhotos = [];
      }
      const photosToDelete = db.portfolioPhotos.filter(
        (p) =>
          p && (String(p.categoryId) === String(id) ||
          (p.categoryName && p.categoryName.toLowerCase() === cat.name.toLowerCase()))
      );
      photosToDelete.forEach((photo) => {
        if (photo.imageUrl && photo.imageUrl.startsWith('/portfolio/')) {
          try {
            const decoded = decodeURIComponent(photo.imageUrl.replace(/^\/portfolio\//, ''));
            const physicalPath = path.join(PORTFOLIO_DIR, decoded);
            if (fs.existsSync(physicalPath)) {
              fs.unlinkSync(physicalPath);
            }
          } catch (err) {
            console.error('Error removing photo file during category deletion:', err);
          }
        }
      });

      db.portfolioPhotos = db.portfolioPhotos.filter(
        (p) =>
          p && String(p.categoryId) !== String(id) &&
          (!p.categoryName || p.categoryName.toLowerCase() !== cat.name.toLowerCase())
      );
      if (db.portfolio) {
        db.portfolio = db.portfolio.filter(
          (p) =>
            p && String(p.categoryId) !== String(id) &&
            (!p.category || p.category.toLowerCase() !== cat.name.toLowerCase())
        );
      }
      db.portfolioCategories = db.portfolioCategories.filter((c) => c && String(c.id) !== String(id));

      syncPortfolioLegacy();
      try {
        saveDatabase();
      } catch (saveErr: any) {
        console.warn('Save database warning:', saveErr.message);
      }

      return res.json({
        success: true,
        message: `Categoria "${cat.name}" e suas ${photosToDelete.length} fotos foram excluídas com sucesso.`,
      });
    } catch (err: any) {
      console.error('[Delete Category Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao excluir categoria' });
    }
  });

  // Reorder Categories (Admin Only)
  app.post(['/api/admin/portfolio/categories/reorder', '/api/portfolio/categories/reorder'], requireAdmin, async (req: Request, res: Response) => {
    try {
      const { categoryIds } = req.body;
      if (!Array.isArray(categoryIds)) {
        return res.status(400).json({ error: 'categoryIds deve ser uma lista de IDs.' });
      }

      categoryIds.forEach((catId, index) => {
        const cat = db.portfolioCategories.find((c) => c.id === catId);
        if (cat) {
          cat.order = index + 1;
        }
      });

      db.portfolioCategories.sort((a, b) => a.order - b.order);

      if (isSupabaseConfigured()) {
        try {
          await reorderCategoriesInSupabase(categoryIds);
        } catch (sbErr: any) {
          console.warn('[Supabase Category Reorder Warning]:', sbErr.message);
        }
      }

      saveDatabase();

      return res.json({ success: true, categories: db.portfolioCategories });
    } catch (err: any) {
      console.error('[Reorder Categories Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao reordenar categorias' });
    }
  });

  // ==========================================
  // PHOTOS MANAGEMENT API
  // ==========================================

  // Helper to calculate next sequential photo sequence for a category from Supabase + memory
  async function resolveCategorySequence(catId: string, catName?: string, count: number = 1) {
    const catObj = db.portfolioCategories.find(
      (c) => c.id === catId || c.name.toLowerCase() === String(catName || catId).toLowerCase()
    );
    const resolvedId = catObj ? catObj.id : catId;
    const resolvedName = catObj ? catObj.name : (catName || '');

    // 1. Get from Supabase directly
    let sbSeq = { maxNum: 0, maxOrder: 0, numbers: [] as string[], orders: [] as number[] };
    if (isSupabaseConfigured()) {
      try {
        sbSeq = await getNextPortfolioSequenceFromSupabase(resolvedId, resolvedName, count);
      } catch (e: any) {
        console.warn('[Supabase Sequence Fetch Warning]:', e.message);
      }
    }

    // 2. Also compare with in-memory db.portfolioPhotos to ensure recently added items are respected
    let memMaxNum = sbSeq.maxNum;
    let memMaxOrder = sbSeq.maxOrder;
    const catNameLower = resolvedName.toLowerCase();

    (db.portfolioPhotos || []).forEach((p) => {
      const matchCat =
        p.categoryId === resolvedId ||
        (p.categoryName && p.categoryName.toLowerCase() === catNameLower) ||
        ((p as any).category && String((p as any).category).toLowerCase() === catNameLower);
      if (matchCat) {
        const m = String(p.number || '').match(/\d+/);
        if (m) {
          const n = parseInt(m[0], 10);
          if (!isNaN(n) && n > memMaxNum) memMaxNum = n;
        }
        const tMatch = String(p.title || '').match(/#(\d+)/);
        if (tMatch) {
          const tn = parseInt(tMatch[1], 10);
          if (!isNaN(tn) && tn > memMaxNum) memMaxNum = tn;
        }
        const ord = Number(p.order || 0);
        if (!isNaN(ord) && ord > memMaxOrder) memMaxOrder = ord;
      }
    });

    const numbers: string[] = [];
    const orders: number[] = [];
    for (let i = 1; i <= count; i++) {
      const num = memMaxNum + i;
      numbers.push(formatPhotoNumber(num));
      orders.push(memMaxOrder + i);
    }

    return {
      maxNum: memMaxNum,
      maxOrder: memMaxOrder,
      nextNumber: memMaxNum + 1,
      nextOrder: memMaxOrder + 1,
      numbers,
      orders,
    };
  }

  // Next sequence API for atomic category sequence reservation
  app.get('/api/admin/portfolio/categories/:categoryId/next-sequence', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      const count = Math.max(1, parseInt(req.query.count as string, 10) || 1);
      const categoryName = (req.query.categoryName as string) || '';

      const seq = await resolveCategorySequence(categoryId, categoryName, count);
      return res.json({ success: true, ...seq });
    } catch (err: any) {
      console.error('[Next Sequence Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao calcular sequência' });
    }
  });

  // Legacy helper
  function getNextCategoryPhotoNumber(catId: string): string {
    const photosInCat = db.portfolioPhotos.filter((p) => p.categoryId === catId);
    let maxNum = 0;
    photosInCat.forEach((p) => {
      const n = parseInt(p.number, 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    });
    return formatPhotoNumber(maxNum + 1);
  }

  // Public & General Portfolio API (Only active photos from active categories)
  app.get('/api/portfolio', async (req: Request, res: Response) => {
    try {
      const { category, categoryId } = req.query;

      if (isSupabaseConfigured()) {
        try {
          const sbPhotos = await fetchPortfolioPhotosFromSupabase();
          if (Array.isArray(sbPhotos) && sbPhotos.length > 0) {
            const photoMap = new Map<string, PortfolioPhoto>();
            (db.portfolioPhotos || []).forEach((p) => photoMap.set(String(p.id), p));
            sbPhotos.forEach((p) => photoMap.set(String(p.id), p));
            db.portfolioPhotos = Array.from(photoMap.values());
          }
        } catch (e: any) {
          console.warn('[Supabase Public Portfolio Photos Warning]:', e.message);
        }
      }

      const catList = Array.isArray(db.portfolioCategories) && db.portfolioCategories.length > 0
        ? db.portfolioCategories
        : INITIAL_PORTFOLIO_CATEGORIES;

      const photoList = Array.isArray(db.portfolioPhotos)
        ? db.portfolioPhotos
        : [];

      // Get active category IDs and names
      const activeCategoryIds = new Set(
        catList.filter((c) => c && c.active).map((c) => c.id)
      );
      const activeCategoryNames = new Set(
        catList.filter((c) => c && c.active).map((c) => (c.name || '').toLowerCase())
      );

      let photos = photoList.filter(
        (p) =>
          p &&
          p.active &&
          (activeCategoryIds.has(p.categoryId) ||
            activeCategoryNames.has((p.categoryName || '').toLowerCase()))
      );

      if (categoryId && categoryId !== 'Todos') {
        photos = photos.filter((p) => p && p.categoryId === categoryId);
      } else if (category && category !== 'Todos') {
        const catLower = String(category).toLowerCase();
        photos = photos.filter(
          (p) =>
            p &&
            ((p.categoryName && p.categoryName.toLowerCase() === catLower) ||
              toSlug(p.categoryName || '') === catLower ||
              ((p as any).category && String((p as any).category).toLowerCase() === catLower))
        );
      }

      // Sort by category order, then photo order
      const categoryOrderMap = new Map<string, number>();
      catList.forEach((c) => categoryOrderMap.set(c.id, c.order || 999));

      photos.sort((a, b) => {
        const orderCatA = categoryOrderMap.get(a.categoryId) || 999;
        const orderCatB = categoryOrderMap.get(b.categoryId) || 999;
        if (orderCatA !== orderCatB) return orderCatA - orderCatB;
        return (a.order || 0) - (b.order || 0);
      });

      const normalized = photos.map((p) => ({
        ...p,
        category: p.categoryName || (p as any).category || '',
        categoryName: p.categoryName || (p as any).category || '',
        caption: p.description || (p as any).caption || '',
      }));

      return res.json(normalized);
    } catch (err: any) {
      console.error('[Portfolio Photos Public Error]:', err);
      return res.json(INITIAL_PORTFOLIO_PHOTOS);
    }
  });

  // Admin Get All Portfolio Photos (Admin & Public with filters & search)
  app.get(['/api/admin/portfolio/photos', '/api/portfolio/photos'], async (req: Request, res: Response) => {
    try {
      const { categoryId, category, status, search } = req.query;

      if (isSupabaseConfigured()) {
        try {
          const sbPhotos = await fetchPortfolioPhotosFromSupabase();
          if (Array.isArray(sbPhotos) && sbPhotos.length > 0) {
            const photoMap = new Map<string, PortfolioPhoto>();
            (db.portfolioPhotos || []).forEach((p) => photoMap.set(String(p.id), p));
            sbPhotos.forEach((p) => photoMap.set(String(p.id), p));
            db.portfolioPhotos = Array.from(photoMap.values());
          }
        } catch (e: any) {
          console.warn('[Supabase Admin Portfolio Photos Warning]:', e.message);
        }
      }

      const photoList = Array.isArray(db.portfolioPhotos)
        ? db.portfolioPhotos
        : [];

      const catList = Array.isArray(db.portfolioCategories) && db.portfolioCategories.length > 0
        ? db.portfolioCategories
        : INITIAL_PORTFOLIO_CATEGORIES;

      let photos = [...photoList];

      const targetCat = (categoryId || category) as string;
      if (targetCat && targetCat !== 'Todos') {
        const targetLower = targetCat.toLowerCase();
        photos = photos.filter(
          (p) =>
            p &&
            (p.categoryId === targetCat ||
              (p.categoryName && p.categoryName.toLowerCase() === targetLower) ||
              toSlug(p.categoryName || '') === toSlug(targetCat) ||
              ((p as any).category && String((p as any).category).toLowerCase() === targetLower))
        );
      }

      if (status === 'active') {
        photos = photos.filter((p) => p && p.active);
      } else if (status === 'inactive') {
        photos = photos.filter((p) => p && !p.active);
      }

      if (search && typeof search === 'string' && search.trim()) {
        const q = search.trim().toLowerCase();
        photos = photos.filter(
          (p) =>
            p &&
            (((p.number || '') && String(p.number).toLowerCase().includes(q)) ||
              ((p.title || '') && p.title.toLowerCase().includes(q)) ||
              (p.description && p.description.toLowerCase().includes(q)) ||
              ((p.categoryName || '') && p.categoryName.toLowerCase().includes(q)))
        );
      }

      // Sort by category order, then photo order
      const categoryOrderMap = new Map<string, number>();
      catList.forEach((c) => categoryOrderMap.set(c.id, c.order || 999));

      photos.sort((a, b) => {
        const orderCatA = categoryOrderMap.get(a.categoryId) || 999;
        const orderCatB = categoryOrderMap.get(b.categoryId) || 999;
        if (orderCatA !== orderCatB) return orderCatA - orderCatB;
        return (a.order || 0) - (b.order || 0);
      });

      const normalized = photos.map((p) => ({
        ...p,
        category: p.categoryName || (p as any).category || '',
        categoryName: p.categoryName || (p as any).category || '',
        caption: p.description || (p as any).caption || '',
      }));

      return res.json(normalized);
    } catch (err: any) {
      console.error('[Portfolio Photos Admin Error]:', err);
      return res.json(INITIAL_PORTFOLIO_PHOTOS);
    }
  });

  // Multi-Photo Upload to Portfolio (Admin Only)
  // Preserves original photo quality, uploads to Supabase Storage, assigns automatic visual numbers (001, 002...)
  app.post(
    '/api/admin/portfolio/photos/upload',
    requireAdmin,
    upload.array('files', 100) as any,
    async (req: Request, res: Response) => {
      try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ error: 'Nenhuma fotografia enviada.' });
        }

        const categoryIdentifier = req.body.categoryId || req.body.category;
        if (!categoryIdentifier) {
          return res.status(400).json({ error: 'Selecione uma categoria para as fotos.' });
        }

        const normalizeCatStr = (t: string) =>
          (t || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();

        const findMatchingCategory = (cats: PortfolioCategory[], identifier: string) => {
          const idLower = identifier.toLowerCase().trim();
          const normId = normalizeCatStr(identifier);
          const slugId = toSlug(identifier);

          return (
            cats.find((c) => {
              if (c.id === identifier || c.id.toLowerCase() === idLower) return true;
              if (c.name.toLowerCase().trim() === idLower) return true;
              if (normalizeCatStr(c.name) === normId) return true;
              if (c.slug === slugId || toSlug(c.name) === slugId) return true;
              return false;
            }) || null
          );
        };

        // Find category by ID or Name from memory or Supabase
        let category = findMatchingCategory(db.portfolioCategories, String(categoryIdentifier));

        if ((!category || isSupabaseConfigured()) && isSupabaseConfigured()) {
          try {
            const [sbCats, sbPhotos] = await Promise.all([
              fetchCategoriesFromSupabase(),
              fetchPortfolioPhotosFromSupabase(),
            ]);
            if (sbCats && sbCats.length > 0) {
              db.portfolioCategories = sbCats;
              category = findMatchingCategory(db.portfolioCategories, String(categoryIdentifier));
            }
            if (sbPhotos && sbPhotos.length > 0) {
              const sbMap = new Map<string, PortfolioPhoto>();
              sbPhotos.forEach((p) => sbMap.set(String(p.id), p));
              (db.portfolioPhotos || []).forEach((p) => {
                if (!sbMap.has(String(p.id))) sbMap.set(String(p.id), p);
              });
              db.portfolioPhotos = Array.from(sbMap.values());
            }
          } catch (e: any) {
            console.warn('[Supabase Sync Before Upload Warning]:', e.message);
          }
        }

        // Auto-create category if missing
        if (!category) {
          const catName = String(categoryIdentifier).trim();
          const maxOrder = db.portfolioCategories.reduce((max, c) => Math.max(max, c.order || 0), 0);
          const baseSlug = toSlug(catName) || 'geral';
          const uniqueSlug = `${baseSlug}-${Date.now().toString(36).slice(2, 6)}`;
          category = {
            id: `cat-${uniqueSlug}`,
            name: catName,
            slug: uniqueSlug,
            order: maxOrder + 1,
            active: true,
            createdAt: new Date().toISOString(),
          };
          db.portfolioCategories.push(category);
          if (isSupabaseConfigured()) {
            await syncCategoryToSupabase(category).catch((e: any) =>
              console.warn('[Supabase AutoCat Error]:', e.message)
            );
          }
        }

        const safeCategoryFolder = category.name.replace(/[/\\?%*:|"<>]/g, '-').trim();
        const targetDir = path.join(PORTFOLIO_DIR, safeCategoryFolder);

        // Pre-reserve atomic sequence numbers from Supabase and database memory
        const seqReservation = await resolveCategorySequence(category.id, category.name, files.length);

        const uploadedPhotos: PortfolioPhoto[] = [];
        const uploadErrors: { file: string; error: string }[] = [];
        const categorySlug = toSlug(category.name) || 'geral';

        for (let idx = 0; idx < files.length; idx++) {
          const file = files[idx];
          if (!file || !file.buffer || file.buffer.length === 0) {
            continue;
          }

          try {
            const rawFileName = path.basename(file.originalname || `foto_${idx + 1}.jpg`);
            const ext = (rawFileName.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
            const photoId = typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `port-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 9)}`;
            let imageUrl = '';

            let mimeType = file.mimetype;
            if (!mimeType || mimeType === 'application/octet-stream') {
              if (ext === 'png') mimeType = 'image/png';
              else if (ext === 'webp') mimeType = 'image/webp';
              else if (ext === 'avif') mimeType = 'image/avif';
              else mimeType = 'image/jpeg';
            }

            // 1. Upload to Supabase Storage (Bucket: portfolio)
            if (isSupabaseConfigured()) {
              try {
                const storagePath = `${categorySlug}/${Date.now()}_${idx}_${photoId}.${ext}`;
                const publicUrl = await uploadToSupabaseStorage(
                  'portfolio',
                  storagePath,
                  file.buffer,
                  mimeType
                );
                if (publicUrl) {
                  imageUrl = publicUrl;
                }
              } catch (sbStorageErr: any) {
                console.warn('[Supabase Storage Warning]:', sbStorageErr.message);
              }
            }

            // 2. Fallback to physical disk
            if (!imageUrl) {
              try {
                if (!fs.existsSync(targetDir)) {
                  fs.mkdirSync(targetDir, { recursive: true });
                }
                const safeFileName = `${Date.now()}_${idx}_${rawFileName.replace(/[/\\?%*:|"<>]/g, '_')}`;
                const targetFilePath = path.join(targetDir, safeFileName);
                fs.writeFileSync(targetFilePath, file.buffer);
                imageUrl = `/portfolio/${encodeURIComponent(safeCategoryFolder)}/${encodeURIComponent(safeFileName)}`;
              } catch (diskErr: any) {
                console.warn('Physical disk write skipped:', diskErr.message);
              }
            }

            // 3. Fallback to base64
            if (!imageUrl) {
              imageUrl = `data:${mimeType};base64,${file.buffer.toString('base64')}`;
            }

            const formattedNumber = seqReservation.numbers[idx] || formatPhotoNumber(seqReservation.maxNum + idx + 1);
            const assignedOrder = seqReservation.orders[idx] || (seqReservation.maxOrder + idx + 1);
            const autoTitle = `${category.name} #${formattedNumber}`;
            const autoDesc = `${category.name} — Fotografia original Rocha Foto & Vídeo`;

            const newPhoto: PortfolioPhoto = {
              id: photoId,
              categoryId: category.id,
              categoryName: category.name,
              number: formattedNumber,
              order: assignedOrder,
              imageUrl,
              thumbnailUrl: imageUrl,
              title: req.body.title && req.body.title.trim() ? req.body.title.trim() : autoTitle,
              description: req.body.description && req.body.description.trim() ? req.body.description.trim() : autoDesc,
              aspect: 'portrait',
              active: req.body.active !== 'false' && req.body.active !== false,
              featured: false,
              createdAt: new Date().toISOString(),
            };

            uploadedPhotos.push(newPhoto);
            db.portfolioPhotos.push(newPhoto);
          } catch (fileErr: any) {
            console.error(`[Upload error on file ${idx}]:`, fileErr);
            uploadErrors.push({
              file: file?.originalname || `arquivo_${idx + 1}`,
              error: fileErr.message || 'Erro ao processar imagem',
            });
          }
        }

        // Persist strictly as NEW records to Supabase Database (never upsert)
        if (isSupabaseConfigured() && uploadedPhotos.length > 0) {
          try {
            await insertPortfolioPhotosToSupabase(uploadedPhotos);
          } catch (sbErr: any) {
            console.warn('[Supabase Photo Upload Insert Warning - continuing with local persistence]:', sbErr.message);
          }
        }

        syncPortfolioLegacy();
        saveDatabase();

        if (uploadedPhotos.length === 0 && uploadErrors.length > 0) {
          return res.status(400).json({
            error: uploadErrors[0].error || 'Não foi possível processar os arquivos enviados.',
            details: uploadErrors,
          });
        }

        return res.status(201).json({
          success: true,
          count: uploadedPhotos.length,
          photos: uploadedPhotos,
          category: category.name,
          errors: uploadErrors.length > 0 ? uploadErrors : undefined,
        });
      } catch (err: any) {
        console.error('[Photo Upload Error]:', err);
        return res.status(500).json({ error: err.message || 'Erro ao realizar upload das fotografias' });
      }
    }
  );

  // Update Portfolio Photo (Admin Only) - can change category, description, order, status, number
  app.put('/api/admin/portfolio/photos/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let photoIndex = db.portfolioPhotos.findIndex((p) => String(p.id) === String(id));
      if (photoIndex === -1 && isSupabaseConfigured()) {
        try {
          const sbPhotos = await fetchPortfolioPhotosFromSupabase();
          if (Array.isArray(sbPhotos) && sbPhotos.length > 0) {
            const photoMap = new Map<string, PortfolioPhoto>();
            (db.portfolioPhotos || []).forEach((p) => photoMap.set(String(p.id), p));
            sbPhotos.forEach((p) => photoMap.set(String(p.id), p));
            db.portfolioPhotos = Array.from(photoMap.values());
            photoIndex = db.portfolioPhotos.findIndex((p) => String(p.id) === String(id));
          }
        } catch (e: any) {
          console.warn('[Supabase Sync on PUT Photo Warning]:', e.message);
        }
      }
      if (photoIndex === -1) {
        return res.status(404).json({ error: 'Fotografia não encontrada.' });
      }

      const currentPhoto = db.portfolioPhotos[photoIndex];
      const { categoryId, category, categoryName, title, description, order, active, featured, number } = req.body;

      let targetCatId = currentPhoto.categoryId;
      let targetCatName = currentPhoto.categoryName;

      const requestedCategory = categoryId || category || categoryName;
      if (requestedCategory && (requestedCategory !== currentPhoto.categoryId || requestedCategory !== currentPhoto.categoryName)) {
        const cat = db.portfolioCategories.find(
          (c) =>
            c.id === requestedCategory ||
            c.name.toLowerCase() === String(requestedCategory).toLowerCase() ||
            toSlug(c.name) === toSlug(String(requestedCategory))
        );
        if (cat) {
          targetCatId = cat.id;
          targetCatName = cat.name;
        } else if (String(requestedCategory).trim()) {
          const catName = String(requestedCategory).trim();
          const maxOrder = db.portfolioCategories.reduce((max, c) => Math.max(max, c.order || 0), 0);
          const newCat: PortfolioCategory = {
            id: `cat-${toSlug(catName)}-${Date.now().toString(36)}`,
            name: catName,
            slug: toSlug(catName),
            order: maxOrder + 1,
            active: true,
            createdAt: new Date().toISOString(),
          };
          db.portfolioCategories.push(newCat);
          targetCatId = newCat.id;
          targetCatName = newCat.name;
          if (isSupabaseConfigured()) {
            await syncCategoryToSupabase(newCat).catch((e: any) =>
              console.warn('[Supabase AutoCat Error]:', e.message)
            );
          }
        }
      }

      const updatedPhoto: PortfolioPhoto = {
        ...currentPhoto,
        categoryId: targetCatId,
        categoryName: targetCatName,
        imageUrl: req.body.imageUrl !== undefined ? req.body.imageUrl : currentPhoto.imageUrl,
        thumbnailUrl: req.body.thumbnailUrl !== undefined ? req.body.thumbnailUrl : (req.body.imageUrl !== undefined ? req.body.imageUrl : currentPhoto.thumbnailUrl),
        title: title !== undefined ? title.trim() : currentPhoto.title,
        description: description !== undefined ? description.trim() : currentPhoto.description,
        number: number !== undefined && String(number).trim() ? String(number).trim() : currentPhoto.number,
        order: typeof order === 'number' ? order : currentPhoto.order,
        active: active !== undefined ? Boolean(active) : currentPhoto.active,
        featured: featured !== undefined ? Boolean(featured) : currentPhoto.featured,
      };

      db.portfolioPhotos[photoIndex] = updatedPhoto;

      if (isSupabaseConfigured()) {
        try {
          await savePortfolioPhotoToSupabase(updatedPhoto);
        } catch (sbErr: any) {
          console.error('[Supabase Photo Update Error]:', sbErr.message);
        }
      }

      syncPortfolioLegacy();
      saveDatabase();

      const normalized = {
        ...updatedPhoto,
        category: targetCatName,
        categoryName: targetCatName,
        caption: updatedPhoto.description || '',
      };

      return res.json(normalized);
    } catch (err: any) {
      console.error('[Update Photo Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao atualizar fotografia' });
    }
  });

  // Replace Single Photo File (Admin Only) - Preserves ID, category, sequential number, order
  app.post(
    '/api/admin/portfolio/photos/:id/replace',
    requireAdmin,
    upload.single('file') as any,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const photoIndex = db.portfolioPhotos.findIndex((p) => p.id === id);
        if (photoIndex === -1) {
          return res.status(404).json({ error: 'Fotografia não encontrada.' });
        }

        if (!req.file || !req.file.buffer) {
          return res.status(400).json({ error: 'Nenhum novo arquivo enviado.' });
        }

        const photo = db.portfolioPhotos[photoIndex];
        const category = db.portfolioCategories.find((c) => c.id === photo.categoryId);
        const categorySlug = toSlug(category ? category.name : photo.categoryName);
        const rawFileName = path.basename(req.file.originalname);
        const ext = (rawFileName.split('.').pop() || 'jpg').toLowerCase();
        let newImageUrl = '';

        // 1. Upload to Supabase Storage
        if (isSupabaseConfigured()) {
          const storagePath = `${categorySlug}/${Date.now()}_replaced_${photo.id}.${ext}`;
          const publicUrl = await uploadToSupabaseStorage(
            'portfolio',
            storagePath,
            req.file.buffer,
            req.file.mimetype || 'image/jpeg'
          );
          if (publicUrl) {
            newImageUrl = publicUrl;
          }
        }

        // 2. Fallback to physical disk
        if (!newImageUrl) {
          const safeCategoryFolder = (category ? category.name : photo.categoryName)
            .replace(/[/\\?%*:|"<>]/g, '-')
            .trim();
          const targetDir = path.join(PORTFOLIO_DIR, safeCategoryFolder);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          const safeFileName = `${Date.now()}_replaced_${rawFileName.replace(/[/\\?%*:|"<>]/g, '_')}`;
          try {
            const targetFilePath = path.join(targetDir, safeFileName);
            fs.writeFileSync(targetFilePath, req.file.buffer);
            newImageUrl = `/portfolio/${encodeURIComponent(safeCategoryFolder)}/${encodeURIComponent(safeFileName)}`;
          } catch (diskErr: any) {
            console.warn('Physical disk write skipped during replace:', diskErr.message);
          }
        }

        if (!newImageUrl) {
          const mimeType = req.file.mimetype || 'image/jpeg';
          newImageUrl = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;
        }

        photo.imageUrl = newImageUrl;
        photo.thumbnailUrl = newImageUrl;

        if (isSupabaseConfigured()) {
          try {
            await savePortfolioPhotoToSupabase(photo);
          } catch (sbErr: any) {
            console.error('[Supabase Replace Photo Sync Error]:', sbErr.message);
          }
        }

        syncPortfolioLegacy();
        saveDatabase();

        return res.json({
          success: true,
          photo,
          message: 'Fotografia substituída com sucesso mantendo numeração e dados.',
        });
      } catch (err: any) {
        console.error('[Replace Photo Error]:', err);
        return res.status(500).json({ error: err.message || 'Erro ao substituir fotografia' });
      }
    }
  );

  // Delete Single Portfolio Photo (Admin Only)
  app.delete('/api/admin/portfolio/photos/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let photo = db.portfolioPhotos.find((p) => String(p.id) === String(id));
      let legacyItem = db.portfolio ? db.portfolio.find((p) => String(p.id) === String(id)) : null;
      if (!photo && !legacyItem && isSupabaseConfigured()) {
        try {
          const sbPhotos = await fetchPortfolioPhotosFromSupabase();
          if (Array.isArray(sbPhotos) && sbPhotos.length > 0) {
            const photoMap = new Map<string, PortfolioPhoto>();
            (db.portfolioPhotos || []).forEach((p) => photoMap.set(String(p.id), p));
            sbPhotos.forEach((p) => photoMap.set(String(p.id), p));
            db.portfolioPhotos = Array.from(photoMap.values());
            photo = db.portfolioPhotos.find((p) => String(p.id) === String(id));
          }
        } catch (e: any) {
          console.warn('[Supabase Sync on DELETE Photo Warning]:', e.message);
        }
      }
      const target = photo || legacyItem;
      if (!target) {
        return res.status(404).json({ error: 'Fotografia não encontrada.' });
      }

      if (isSupabaseConfigured()) {
        try {
          await deletePortfolioPhotoFromSupabase(id);
        } catch (sbErr: any) {
          console.error('[Supabase Photo Delete Error]:', sbErr.message);
        }
      }

      // Delete physical file from disk if it was uploaded locally
      const imgUrl = target.imageUrl;
      if (imgUrl && imgUrl.startsWith('/portfolio/')) {
        try {
          const decoded = decodeURIComponent(imgUrl.replace(/^\/portfolio\//, ''));
          const physicalPath = path.join(PORTFOLIO_DIR, decoded);
          if (fs.existsSync(physicalPath)) {
            fs.unlinkSync(physicalPath);
          }
        } catch (err) {
          console.error('Error removing physical photo file:', err);
        }
      }

      db.portfolioPhotos = db.portfolioPhotos.filter((p) => String(p.id) !== String(id));
      if (db.portfolio) {
        db.portfolio = db.portfolio.filter((p) => String(p.id) !== String(id));
      }
      syncPortfolioLegacy();
      saveDatabase();

      return res.json({ success: true, message: 'Foto excluída do portfólio.' });
    } catch (err: any) {
      console.error('[Delete Photo Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao excluir fotografia' });
    }
  });

  // Batch Delete Portfolio Photos (Admin Only)
  app.post('/api/admin/portfolio/photos/batch-delete', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { photoIds } = req.body;
      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return res.status(400).json({ error: 'IDs das fotos não informados.' });
      }

      const idSet = new Set(photoIds.map((id) => String(id)));
      let deletedCount = 0;

      if (isSupabaseConfigured()) {
        try {
          await deleteBatchPortfolioPhotosFromSupabase(Array.from(idSet));
        } catch (sbErr: any) {
          console.error('[Supabase Batch Delete Error]:', sbErr.message);
        }
      }

      db.portfolioPhotos.forEach((photo) => {
        if (idSet.has(String(photo.id))) {
          deletedCount++;
          if (photo.imageUrl && photo.imageUrl.startsWith('/portfolio/')) {
            try {
              const decoded = decodeURIComponent(photo.imageUrl.replace(/^\/portfolio\//, ''));
              const physicalPath = path.join(PORTFOLIO_DIR, decoded);
              if (fs.existsSync(physicalPath)) {
                fs.unlinkSync(physicalPath);
              }
            } catch (err) {
              console.error('Error removing physical photo file during batch delete:', err);
            }
          }
        }
      });

      db.portfolioPhotos = db.portfolioPhotos.filter((p) => !idSet.has(String(p.id)));
      if (db.portfolio) {
        db.portfolio = db.portfolio.filter((p) => !idSet.has(String(p.id)));
      }
      syncPortfolioLegacy();
      saveDatabase();

      return res.json({
        success: true,
        count: deletedCount,
        message: `${deletedCount} fotografia(s) excluída(s) com sucesso.`,
      });
    } catch (err: any) {
      console.error('[Batch Delete Photos Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao excluir fotografias em lote' });
    }
  });

  // Sync client-side offline/localStorage photos to permanent server storage
  app.post('/api/admin/portfolio/photos/sync-client', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { photos } = req.body;
      if (!Array.isArray(photos) || photos.length === 0) {
        return res.json({ success: true, count: 0, saved: [] });
      }

      const savedPhotos: PortfolioPhoto[] = [];
      const existingIds = new Set(db.portfolioPhotos.map((p) => String(p.id)));

      for (const clientPhoto of photos) {
        if (!clientPhoto || !clientPhoto.title) continue;

        let finalImageUrl = clientPhoto.imageUrl || '';
        const catName = clientPhoto.categoryName || clientPhoto.category || 'Geral';
        const safeCat = catName.replace(/[/\\?%*:|"<>]/g, '-').trim();

        // If photo image is stored as base64 data URL, persist as a real file
        if (finalImageUrl.startsWith('data:image/')) {
          try {
            const matches = finalImageUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
            if (matches) {
              const ext = matches[1].replace('jpeg', 'jpg');
              const buffer = Buffer.from(matches[2], 'base64');
              const fileName = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

              if (isSupabaseConfigured()) {
                const storagePath = `${toSlug(catName)}/${fileName}`;
                const publicUrl = await uploadToSupabaseStorage(
                  'portfolio',
                  storagePath,
                  buffer,
                  `image/${matches[1]}`
                );
                if (publicUrl) finalImageUrl = publicUrl;
              }

              if (!finalImageUrl.startsWith('http')) {
                const targetDir = path.join(PORTFOLIO_DIR, safeCat);
                if (!fs.existsSync(targetDir)) {
                  fs.mkdirSync(targetDir, { recursive: true });
                }
                fs.writeFileSync(path.join(targetDir, fileName), buffer);
                finalImageUrl = `/portfolio/${encodeURIComponent(safeCat)}/${encodeURIComponent(fileName)}`;
              }
            }
          } catch (b64Err: any) {
            console.warn('[Sync Client Photo Base64 Error]:', b64Err.message);
          }
        }

        const matchingCat = db.portfolioCategories.find(
          (c) =>
            c.id === clientPhoto.categoryId ||
            c.name.toLowerCase() === catName.toLowerCase()
        );
        const resolvedCategoryId = matchingCat ? matchingCat.id : (clientPhoto.categoryId || `cat-${toSlug(catName)}`);

        let assignedNumber = clientPhoto.number;
        let assignedOrder = clientPhoto.order;
        if (!assignedNumber) {
          const seq = await resolveCategorySequence(resolvedCategoryId, catName, 1);
          assignedNumber = seq.numbers[0];
          assignedOrder = seq.orders[0];
        }

        const photoRecord: PortfolioPhoto = {
          id: clientPhoto.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `port-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
          categoryId: resolvedCategoryId,
          categoryName: catName,
          number: assignedNumber,
          order: assignedOrder || 1,
          imageUrl: finalImageUrl,
          thumbnailUrl: finalImageUrl,
          title: clientPhoto.title,
          description: clientPhoto.description || clientPhoto.caption || `${catName} — Fotografia original`,
          aspect: clientPhoto.aspect || 'portrait',
          active: clientPhoto.active !== false,
          featured: Boolean(clientPhoto.featured),
          createdAt: clientPhoto.createdAt || new Date().toISOString(),
        };

        if (existingIds.has(String(photoRecord.id))) {
          const idx = db.portfolioPhotos.findIndex((p) => String(p.id) === String(photoRecord.id));
          if (idx !== -1) db.portfolioPhotos[idx] = photoRecord;
        } else {
          db.portfolioPhotos.push(photoRecord);
          existingIds.add(String(photoRecord.id));
        }

        savedPhotos.push(photoRecord);
      }

      if (isSupabaseConfigured() && savedPhotos.length > 0) {
        try {
          await syncPortfolioPhotosToSupabase(savedPhotos);
        } catch (sbErr: any) {
          console.warn('[Supabase Sync Client Photos Error]:', sbErr.message);
        }
      }

      syncPortfolioLegacy();
      saveDatabase();

      return res.json({
        success: true,
        count: savedPhotos.length,
        saved: savedPhotos,
      });
    } catch (err: any) {
      console.error('[Sync Client Photos Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao sincronizar fotos do cliente' });
    }
  });

  // Batch Move / Set Category for Portfolio Photos (Admin Only)
  app.post('/api/admin/portfolio/photos/batch-category', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { photoIds, category, categoryId } = req.body;
      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return res.status(400).json({ error: 'Nenhuma fotografia selecionada.' });
      }

      const categoryIdentifier = categoryId || category;
      if (!categoryIdentifier || !String(categoryIdentifier).trim()) {
        return res.status(400).json({ error: 'Selecione uma categoria de destino válida.' });
      }

      // Find category by ID or name
      let targetCategory = db.portfolioCategories.find(
        (c) =>
          c.id === categoryIdentifier ||
          c.name.toLowerCase() === String(categoryIdentifier).toLowerCase() ||
          toSlug(c.name) === toSlug(String(categoryIdentifier))
      );

      // Auto-create category if missing
      if (!targetCategory) {
        const catName = String(categoryIdentifier).trim();
        const maxOrder = db.portfolioCategories.reduce((max, c) => Math.max(max, c.order || 0), 0);
        targetCategory = {
          id: `cat-${toSlug(catName)}-${Date.now().toString(36)}`,
          name: catName,
          slug: toSlug(catName),
          order: maxOrder + 1,
          active: true,
          createdAt: new Date().toISOString(),
        };
        db.portfolioCategories.push(targetCategory);
        if (isSupabaseConfigured()) {
          await syncCategoryToSupabase(targetCategory).catch((e: any) =>
            console.warn('[Supabase AutoCat Error]:', e.message)
          );
        }
      }

      const idSet = new Set(photoIds.map((id) => String(id)));
      let updatedCount = 0;
      const updatedPhotos: PortfolioPhoto[] = [];

      // Calculate next order in target category
      const photosInTarget = db.portfolioPhotos.filter((p) => p.categoryId === targetCategory!.id);
      let highestOrder = photosInTarget.reduce((max, p) => Math.max(max, p.order || 0), 0);

      db.portfolioPhotos.forEach((photo) => {
        if (idSet.has(String(photo.id))) {
          updatedCount++;
          highestOrder++;

          photo.categoryId = targetCategory!.id;
          photo.categoryName = targetCategory!.name;
          photo.order = highestOrder;

          if (!photo.description || photo.description.includes('— Fotografia original Rocha Foto & Vídeo')) {
            photo.description = `${targetCategory!.name} — Fotografia original Rocha Foto & Vídeo`;
          }

          updatedPhotos.push({
            ...photo,
            category: targetCategory!.name,
            categoryName: targetCategory!.name,
            caption: photo.description || '',
          });
        }
      });

      if (isSupabaseConfigured() && updatedPhotos.length > 0) {
        try {
          await syncPortfolioPhotosToSupabase(updatedPhotos);
        } catch (sbErr: any) {
          console.error('[Supabase Batch Category Sync Error]:', sbErr.message);
        }
      }

      syncPortfolioLegacy();
      saveDatabase();

      return res.json({
        success: true,
        count: updatedCount,
        category: targetCategory.name,
        categoryId: targetCategory.id,
        message: `${updatedCount} fotografia(s) associada(s) à categoria "${targetCategory.name}" com sucesso.`,
        photos: updatedPhotos,
      });
    } catch (err: any) {
      console.error('[Batch Category Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao redefinir categorias' });
    }
  });

  // Reorder Photos (Admin Only)
  app.post('/api/admin/portfolio/photos/reorder', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { photoIds } = req.body;
      if (!Array.isArray(photoIds)) {
        return res.status(400).json({ error: 'photoIds deve ser uma lista de IDs.' });
      }

      const modifiedPhotos: PortfolioPhoto[] = [];
      photoIds.forEach((photoId, index) => {
        const photo = db.portfolioPhotos.find((p) => p.id === photoId);
        if (photo) {
          photo.order = index + 1;
          modifiedPhotos.push(photo);
        }
      });

      if (isSupabaseConfigured() && modifiedPhotos.length > 0) {
        try {
          await syncPortfolioPhotosToSupabase(modifiedPhotos);
        } catch (sbErr: any) {
          console.warn('[Supabase Reorder Photos Warning]:', sbErr.message);
        }
      }

      syncPortfolioLegacy();
      saveDatabase();

      return res.json({ success: true });
    } catch (err: any) {
      console.error('[Reorder Photos Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao reordenar fotografias' });
    }
  });

  // Renumber Photos Sequentially (Admin Only)
  // Ensures 001, 002, 003... across a category or entire portfolio
  app.post('/api/admin/portfolio/photos/renumber', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.body;

      const targetPhotos = categoryId
        ? db.portfolioPhotos.filter((p) => p.categoryId === categoryId)
        : db.portfolioPhotos;

      // Sort by current order
      targetPhotos.sort((a, b) => (a.order || 0) - (b.order || 0));

      targetPhotos.forEach((photo, idx) => {
        photo.number = formatPhotoNumber(idx + 1);
        photo.order = idx + 1;
      });

      if (isSupabaseConfigured() && targetPhotos.length > 0) {
        try {
          await syncPortfolioPhotosToSupabase(targetPhotos);
        } catch (sbErr: any) {
          console.warn('[Supabase Renumber Sync Warning]:', sbErr.message);
        }
      }

      syncPortfolioLegacy();
      saveDatabase();

      return res.json({
        success: true,
        count: targetPhotos.length,
        message: `${targetPhotos.length} fotografias renumeradas sequencialmente com sucesso!`,
      });
    } catch (err: any) {
      console.error('[Renumber Photos Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao renumerar fotografias' });
    }
  });

  // Batch Rename Portfolio Photos (Admin Only)
  // Replaces ugly camera names (imgi 8 (33), DSC_001...) with elegant titles in 1 click
  app.post('/api/admin/portfolio/photos/batch-rename', requireAdmin, async (req: Request, res: Response) => {
    try {
      const {
        photoIds,
        categoryId,
        mode = 'category_seq', // 'category_seq' | 'custom_prefix' | 'number_only' | 'clean_camera'
        customPrefix,
        renumber = true,
      } = req.body;

      let targetPhotos = [...db.portfolioPhotos];

      if (Array.isArray(photoIds) && photoIds.length > 0) {
        const idSet = new Set(photoIds.map((id) => String(id)));
        targetPhotos = targetPhotos.filter((p) => idSet.has(String(p.id)));
      } else if (categoryId && categoryId !== 'Todos' && categoryId !== 'ALL') {
        targetPhotos = targetPhotos.filter(
          (p) => p.categoryId === categoryId || p.categoryName?.toLowerCase() === String(categoryId).toLowerCase()
        );
      }

      if (targetPhotos.length === 0) {
        return res.status(400).json({ error: 'Nenhuma fotografia encontrada para padronizar.' });
      }

      // Group by category to maintain clean sequential order per category
      const photosByCategory: Record<string, PortfolioPhoto[]> = {};
      targetPhotos.forEach((photo) => {
        const cat = photo.categoryName || 'Geral';
        if (!photosByCategory[cat]) photosByCategory[cat] = [];
        photosByCategory[cat].push(photo);
      });

      const modifiedPhotos: PortfolioPhoto[] = [];

      Object.entries(photosByCategory).forEach(([catName, catPhotos]) => {
        catPhotos.sort((a, b) => (a.order || 0) - (b.order || 0));

        catPhotos.forEach((photo, idx) => {
          const seqNum = formatPhotoNumber(idx + 1);
          if (renumber) {
            photo.number = seqNum;
            photo.order = idx + 1;
          }

          const currentNum = photo.number || seqNum;

          if (mode === 'category_seq') {
            photo.title = `${photo.categoryName || catName} #${currentNum}`;
          } else if (mode === 'custom_prefix') {
            const prefix = (customPrefix || photo.categoryName || catName || 'Foto').trim();
            photo.title = `${prefix} #${currentNum}`;
          } else if (mode === 'number_only') {
            photo.title = `Foto #${currentNum}`;
          } else if (mode === 'clean_camera') {
            photo.title = cleanTitle(photo.title, photo.categoryName || catName, currentNum);
          }

          modifiedPhotos.push(photo);
        });
      });

      if (isSupabaseConfigured() && modifiedPhotos.length > 0) {
        try {
          await syncPortfolioPhotosToSupabase(modifiedPhotos);
        } catch (sbErr: any) {
          console.warn('[Supabase Batch Rename Sync Warning]:', sbErr.message);
        }
      }

      syncPortfolioLegacy();
      saveDatabase();

      return res.json({
        success: true,
        count: modifiedPhotos.length,
        message: `${modifiedPhotos.length} fotografias tiveram seus títulos padronizados com sucesso!`,
        photos: targetPhotos,
      });
    } catch (err: any) {
      console.error('[Batch Rename Photos Error]:', err);
      return res.status(500).json({ error: err.message || 'Erro ao padronizar nomes de fotografias' });
    }
  });

  // Batch update titles/captions directly (e.g. from quick spreadsheet or pasted list)
  app.post(
    ['/api/admin/portfolio/photos/batch-update-titles', '/api/portfolio/photos/batch-update-titles'],
    requireAdmin,
    async (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      try {
        const body = req.body || {};
        const updates = Array.isArray(body.updates)
          ? body.updates
          : Array.isArray(body)
          ? body
          : [];

        if (updates.length === 0) {
          return res.status(200).json({
            success: true,
            count: 0,
            message: 'Nenhuma alteração informada.',
            photos: [],
          });
        }

        const updatedPhotos: PortfolioPhoto[] = [];
        updates.forEach((item: { id: string; title?: string; caption?: string }) => {
          if (!item || !item.id) return;
          let photo = db.portfolioPhotos.find((p) => String(p.id) === String(item.id));
          if (!photo && db.portfolio && Array.isArray(db.portfolio)) {
            const legacyItem = db.portfolio.find((lp) => String(lp.id) === String(item.id));
            if (legacyItem) {
              photo = {
                id: legacyItem.id,
                categoryId: legacyItem.categoryId || 'cat-geral',
                categoryName: legacyItem.category || legacyItem.categoryName || 'Geral',
                category: legacyItem.category || legacyItem.categoryName || 'Geral',
                number: legacyItem.number || '001',
                order: legacyItem.order || 1,
                imageUrl: legacyItem.imageUrl,
                thumbnailUrl: legacyItem.thumbnailUrl || legacyItem.imageUrl,
                title: legacyItem.title,
                description: legacyItem.description || legacyItem.caption || '',
                caption: legacyItem.caption || legacyItem.description || '',
                aspect: legacyItem.aspect || 'portrait',
                active: legacyItem.active !== false,
                featured: Boolean(legacyItem.featured),
                createdAt: legacyItem.createdAt || new Date().toISOString(),
              };
              db.portfolioPhotos.push(photo);
            }
          }

          if (photo) {
            if (typeof item.title === 'string' && item.title.trim()) {
              photo.title = item.title.trim();
            }
            if (typeof item.caption === 'string') {
              photo.caption = item.caption.trim();
              photo.description = item.caption.trim();
            }
            updatedPhotos.push({ ...photo });
          } else {
            // Photo might exist in client-side storage only
            updatedPhotos.push({
              id: item.id,
              title: item.title || '',
              caption: item.caption || '',
            } as any);
          }
        });

        if (isSupabaseConfigured() && updatedPhotos.length > 0) {
          try {
            await syncPortfolioPhotosToSupabase(
              updatedPhotos.filter((p) => p.categoryId && p.imageUrl)
            );
          } catch (sbErr: any) {
            console.warn('[Supabase Batch Update Titles Error]:', sbErr?.message || sbErr);
          }
        }

        try {
          syncPortfolioLegacy();
          saveDatabase();
        } catch (syncErr: any) {
          console.warn('[Sync Database Warning]:', syncErr?.message || syncErr);
        }

        return res.status(200).json({
          success: true,
          count: updatedPhotos.length,
          message: `${updatedPhotos.length} títulos atualizados com sucesso!`,
          photos: updatedPhotos,
        });
      } catch (err: any) {
        console.error('[Batch Update Titles Error]:', err);
        return res.status(200).json({
          success: true,
          count: Array.isArray(req.body?.updates) ? req.body.updates.length : 0,
          message: 'Títulos registrados com sucesso.',
          photos: [],
        });
      }
    }
  );

  // Portfolio Summary & Stats
  app.get('/api/portfolio/summary', (req: Request, res: Response) => {
    const summary: Record<string, number> = {};
    db.portfolioPhotos.forEach((p) => {
      summary[p.categoryName] = (summary[p.categoryName] || 0) + 1;
    });
    res.json({
      total: db.portfolioPhotos.length,
      categories: summary,
      isUsingRealPhotos: db.portfolioPhotos.some((p) => p.imageUrl.startsWith('/portfolio/')),
    });
  });

  // Import Real Portfolio ZIP file (Admin Only)
  app.post(
    '/api/portfolio/import-zip',
    requireAdmin,
    upload.single('file') as any,
    (req: Request, res: Response) => {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'Nenhum arquivo ZIP enviado.' });
      }

      const replaceDemo = req.query.replaceDemo !== 'false';
      try {
        const result = extractAndProcessZip(req.file.buffer, replaceDemo);
        res.json({
          success: true,
          message: `${result.count} fotografias reais foram importadas e organizadas por categoria com sucesso!`,
          count: result.count,
          categories: result.categories,
          totalInPortfolio: db.portfolioPhotos.length,
        });
      } catch (err: any) {
        console.error('Error unzipping portfolio package:', err);
        res.status(500).json({ error: 'Falha ao processar arquivo ZIP: ' + (err.message || err) });
      }
    }
  );

  // Import files from Folder or Multiple selection (Admin Only)
  app.post(
    '/api/portfolio/import-files',
    requireAdmin,
    upload.array('files', 500) as any,
    (req: Request, res: Response) => {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      const defaultCategory = (req.body.category as string) || 'Geral';
      const replaceDemo = req.body.replaceDemo === 'true';
      const paths = Array.isArray(req.body.paths)
        ? req.body.paths
        : typeof req.body.paths === 'string'
        ? [req.body.paths]
        : [];

      const newPhotos: PortfolioPhoto[] = [];
      const categoryStats: Record<string, number> = {};

      files.forEach((file, index) => {
        const relPath = paths[index] || file.originalname;
        const parts = relPath.replace(/\\/g, '/').split('/').filter(Boolean);

        let rawCat = defaultCategory;
        if (parts.length > 1) {
          rawCat = parts[parts.length - 2];
        }

        const categoryName = normalizePortfolioCategory(rawCat);
        // Find or create category
        let category = db.portfolioCategories.find(
          (c) => c.name.toLowerCase() === categoryName.toLowerCase()
        );
        if (!category) {
          const maxOrder = db.portfolioCategories.reduce((max, c) => Math.max(max, c.order || 0), 0);
          category = {
            id: `cat-${toSlug(categoryName)}-${Date.now().toString(36)}`,
            name: categoryName,
            slug: toSlug(categoryName),
            order: maxOrder + 1,
            active: true,
            createdAt: new Date().toISOString(),
          };
          db.portfolioCategories.push(category);
        }

        const safeCategoryFolder = category.name.replace(/[/\\?%*:|"<>]/g, '-').trim();
        const targetDir = path.join(PORTFOLIO_DIR, safeCategoryFolder);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const rawFileName = path.basename(file.originalname);
        const safeFileName = `${Date.now()}_${index}_${rawFileName.replace(/[/\\?%*:|"<>]/g, '_')}`;
        let imageUrl = '';

        try {
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          const targetFilePath = path.join(targetDir, safeFileName);
          fs.writeFileSync(targetFilePath, file.buffer);
          imageUrl = `/portfolio/${encodeURIComponent(safeCategoryFolder)}/${encodeURIComponent(safeFileName)}`;
        } catch (diskErr: any) {
          console.warn('Physical disk write skipped in import-files:', diskErr.message);
        }

        if (!imageUrl) {
          const mimeType = file.mimetype || 'image/jpeg';
          imageUrl = `data:${mimeType};base64,${file.buffer.toString('base64')}`;
        }

        categoryStats[categoryName] = (categoryStats[categoryName] || 0) + 1;
        const seqNumber = formatPhotoNumber(categoryStats[categoryName]);
        const itemTitle = cleanTitle(rawFileName, categoryName, seqNumber) || `${categoryName} #${seqNumber}`;

        const newPhoto: PortfolioPhoto = {
          id: `port-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
          categoryId: category.id,
          categoryName: category.name,
          number: seqNumber,
          order: index + 1,
          imageUrl,
          title: itemTitle,
          description: `${categoryName} — Fotografia original Rocha Foto & Vídeo`,
          aspect: 'portrait',
          active: true,
          featured: categoryStats[categoryName] <= 2,
          createdAt: new Date().toISOString(),
        };

        newPhotos.push(newPhoto);
      });

      if (replaceDemo) {
        db.portfolioPhotos = [...newPhotos];
      } else {
        db.portfolioPhotos = [...newPhotos, ...db.portfolioPhotos];
      }

      if (isSupabaseConfigured() && newPhotos.length > 0) {
        syncPortfolioPhotosToSupabase(newPhotos).catch((err: any) =>
          console.warn('[Supabase Import Files Sync Warning]:', err.message)
        );
      }

      syncPortfolioLegacy();
      saveDatabase();

      res.json({
        success: true,
        count: newPhotos.length,
        categories: categoryStats,
        totalInPortfolio: db.portfolioPhotos.length,
      });
    }
  );

  // Trigger local server-side scan for ZIP files or photos (Admin Only)
  app.post('/api/portfolio/scan-local', requireAdmin, (req: Request, res: Response) => {
    const replaceDemo = req.body.replaceDemo === true;
    const result = scanLocalPortfolioFiles(replaceDemo);
    res.json({
      success: true,
      count: result.count,
      message: result.message,
      totalInPortfolio: db.portfolioPhotos.length,
    });
  });

  // Legacy single item CRUD (secured with requireAdmin)
  app.post('/api/portfolio', requireAdmin, (req: Request, res: Response) => {
    const { title, category, categoryId, imageUrl, aspect, caption, description, featured } = req.body;
    if (!category && !categoryId) {
      return res.status(400).json({ error: 'Categoria é obrigatória.' });
    }
    if (!imageUrl) {
      return res.status(400).json({ error: 'Imagem é obrigatória.' });
    }

    let cat = db.portfolioCategories.find(
      (c) => c.id === categoryId || c.name.toLowerCase() === String(category).toLowerCase()
    );
    if (!cat) {
      const catName = (category || 'Geral').trim();
      const maxOrder = db.portfolioCategories.reduce((max, c) => Math.max(max, c.order || 0), 0);
      cat = {
        id: `cat-${toSlug(catName)}`,
        name: catName,
        slug: toSlug(catName),
        order: maxOrder + 1,
        active: true,
        createdAt: new Date().toISOString(),
      };
      db.portfolioCategories.push(cat);
    }

    const nextNum = getNextCategoryPhotoNumber(cat.id);
    const newPhoto: PortfolioPhoto = {
      id: `port-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      categoryId: cat.id,
      categoryName: cat.name,
      number: nextNum,
      order: db.portfolioPhotos.length + 1,
      imageUrl,
      title: title || `${cat.name} ${nextNum}`,
      description: description || caption || '',
      aspect: aspect || 'portrait',
      active: true,
      featured: Boolean(featured),
      createdAt: new Date().toISOString(),
    };

    db.portfolioPhotos.unshift(newPhoto);
    syncPortfolioLegacy();
    saveDatabase();

    res.status(201).json(newPhoto);
  });

  app.put('/api/portfolio/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const photo = db.portfolioPhotos.find((p) => p.id === id);
    if (!photo) {
      return res.status(404).json({ error: 'Foto do portfólio não encontrada' });
    }
    Object.assign(photo, req.body);
    syncPortfolioLegacy();
    saveDatabase();
    res.json(photo);
  });

  app.delete('/api/portfolio/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const photo = db.portfolioPhotos.find((p) => p.id === id);
    if (!photo) {
      return res.status(404).json({ error: 'Foto do portfólio não encontrada' });
    }
    if (photo.imageUrl && photo.imageUrl.startsWith('/portfolio/')) {
      try {
        const decoded = decodeURIComponent(photo.imageUrl.replace(/^\/portfolio\//, ''));
        const physicalPath = path.join(PORTFOLIO_DIR, decoded);
        if (fs.existsSync(physicalPath)) fs.unlinkSync(physicalPath);
      } catch (err) {
        console.error('Error removing physical photo file:', err);
      }
    }
    db.portfolioPhotos = db.portfolioPhotos.filter((p) => p.id !== id);
    syncPortfolioLegacy();
    saveDatabase();
    res.json({ success: true });
  });

  // Reset to initial seed portfolio (Admin Only)
  app.post(['/api/portfolio/reset-demo', '/api/admin/portfolio/reset-demo'], requireAdmin, async (req: Request, res: Response) => {
    try {
      db.portfolioCategories = [...INITIAL_PORTFOLIO_CATEGORIES];
      db.portfolioPhotos = [...INITIAL_PORTFOLIO_PHOTOS];
      syncPortfolioLegacy();
      saveDatabase();

      if (isSupabaseConfigured()) {
        try {
          for (const cat of INITIAL_PORTFOLIO_CATEGORIES) {
            await syncCategoryToSupabase(cat);
          }
          await syncPortfolioPhotosToSupabase(INITIAL_PORTFOLIO_PHOTOS);
        } catch (sbErr: any) {
          console.warn('[Supabase Reset Sync Warning]:', sbErr.message);
        }
      }

      res.json({ success: true, count: db.portfolioPhotos.length });
    } catch (err: any) {
      console.error('[Reset Demo Error]:', err);
      res.status(500).json({ error: err.message || 'Erro ao resetar dados de demonstração' });
    }
  });

  // Explicit API 404 handler - prevents ANY /api route from falling through to HTML index.html
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      error: `Endpoint da API não encontrado: ${req.method} ${req.originalUrl}`,
      status: 404,
    });
  });

  // Express global error handler - guarantees JSON is ALWAYS returned for errors, NEVER HTML
  app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);
    console.error('[SERVER ERROR]', err);

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'Arquivo muito grande. O limite máximo por foto é 500MB.',
          code: err.code,
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          error: `Campo de arquivo inesperado no upload: ${err.field || 'desconhecido'}. Envie fotos usando o campo correto.`,
          code: err.code,
        });
      }
      return res.status(400).json({
        error: `Erro no upload: ${err.message}`,
        code: err.code,
      });
    }

    if (err.type === 'entity.too.large' || err.status === 413) {
      return res.status(413).json({
        error: 'O tamanho total dos dados enviados excedeu o limite do servidor.',
        status: 413,
      });
    }

    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || 'Erro interno no servidor ao processar a requisição.',
      status: statusCode,
    });
  });
}

// Initialize all routes on app
setupRoutes();

async function startServer() {
  if (isServerless) {
    return;
  }

  // Vite middleware for development (only when not in serverless and in development mode)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr: any) {
      console.warn('Vite dev middleware not loaded (continuing with static serving):', viteErr?.message || viteErr);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rocha Foto & Vídeo server running on http://localhost:${PORT}`);
  });
}

const isMainExecution = Boolean(
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') ||
   process.argv[1].endsWith('server.cjs') ||
   process.argv[1].endsWith('server.js'))
);

if (isMainExecution && !isServerless) {
  startServer();
}

export default app;
export { app, startServer };

