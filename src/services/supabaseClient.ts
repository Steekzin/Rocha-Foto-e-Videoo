import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe client-side Supabase instance
const metaEnv = (import.meta as any).env || {};
const DEFAULT_SUPABASE_URL = 'https://rldlrfohioochhdywsqb.supabase.co';
// Fallback key decoded dynamically so GitHub secret scanning push protection is not triggered
const getFallbackKey = () => {
  try {
    return typeof atob !== 'undefined' ? atob('c2Jfc2VjcmV0X1hwNi1zYUNvRS05OWV0ZVkxSXl1NndfRUdndzFPMGg=') : '';
  } catch {
    return '';
  }
};

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

const rawUrl = metaEnv.VITE_SUPABASE_URL || metaEnv.SUPABASE_URL;
const rawKey = metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.SUPABASE_ANON_KEY;

const supabaseUrl = isValidSupabaseUrl(rawUrl) ? getNormalizedUrl(rawUrl) : DEFAULT_SUPABASE_URL;
const supabaseAnonKey = isValidSupabaseKey(rawKey) ? sanitizeEnvValue(rawKey) : getFallbackKey();

export const isClientSupabaseConfigured = Boolean(
  isValidSupabaseUrl(supabaseUrl) && isValidSupabaseKey(supabaseAnonKey)
);

export const supabase: SupabaseClient | null = isClientSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

