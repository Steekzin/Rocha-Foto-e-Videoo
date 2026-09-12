import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe client-side Supabase instance
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

export const isClientSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project')
);

export const supabase: SupabaseClient | null = isClientSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
