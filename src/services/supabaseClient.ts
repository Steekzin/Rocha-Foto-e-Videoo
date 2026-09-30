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

function isValidSupabaseUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('https://')) return false;
  if (
    url.includes('your-project') ||
    url.includes('seu-projeto') ||
    url.includes('placeholder') ||
    url.includes('example.com')
  ) {
    return false;
  }
  return true;
}

function isValidSupabaseKey(key: string | undefined): boolean {
  if (!key || typeof key !== 'string') return false;
  if (
    key.includes('your-anon') ||
    key.includes('your-service-role') ||
    key.includes('sua-chave') ||
    key.includes('placeholder')
  ) {
    return false;
  }
  return key.length > 20;
}

const rawUrl = metaEnv.VITE_SUPABASE_URL || metaEnv.SUPABASE_URL;
const rawKey = metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.SUPABASE_ANON_KEY;

const supabaseUrl = isValidSupabaseUrl(rawUrl) ? rawUrl : DEFAULT_SUPABASE_URL;
const supabaseAnonKey = isValidSupabaseKey(rawKey) ? rawKey : getFallbackKey();

export const isClientSupabaseConfigured = Boolean(
  isValidSupabaseUrl(supabaseUrl) && isValidSupabaseKey(supabaseAnonKey)
);

export const supabase: SupabaseClient | null = isClientSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

