import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || (typeof process !== 'undefined' ? (process as any)?.env?.VITE_SUPABASE_URL : '');
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || (typeof process !== 'undefined' ? (process as any)?.env?.VITE_SUPABASE_ANON_KEY : '');
  return { url, anonKey };
};

export const isSupabaseConfigured = () => {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
};

export const getSupabaseClient = () => {
  if (client) return client;
  const { url, anonKey } = getSupabaseConfig();
  client = createClient(
    url || 'https://placeholder.supabase.co',
    anonKey || 'placeholder',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    }
  );
  return client;
};

export const supabase = (() => {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(
    url || 'https://placeholder.supabase.co',
    anonKey || 'placeholder',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    }
  );
})();
