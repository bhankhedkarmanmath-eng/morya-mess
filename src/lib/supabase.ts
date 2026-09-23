import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default project configuration for Morya Mess
const FALLBACK_URL = 'https://ylrdkekxsfvsujdpomse.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlscmRrZWt4c2Z2c3VqZHBvbXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NzEyMjIsImV4cCI6MjEwNTA0NzIyMn0.S4zCWxKc8_0jAbuV5UzEE805Bulj3QXllFjo5YQZIoo';

function isValidHttpUrl(stringUrl?: string | null): boolean {
  if (!stringUrl || typeof stringUrl !== 'string' || stringUrl.trim() === '') {
    return false;
  }
  try {
    const parsed = new URL(stringUrl.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getResolvedConfig() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  let resolvedUrl: string | null = null;
  let resolvedKey: string | null = null;

  if (isValidHttpUrl(envUrl)) {
    resolvedUrl = envUrl!;
    resolvedKey = (envKey && envKey.length > 10) ? envKey : FALLBACK_KEY;
  } else if (isValidHttpUrl(FALLBACK_URL)) {
    resolvedUrl = FALLBACK_URL;
    resolvedKey = (envKey && envKey.length > 10) ? envKey : FALLBACK_KEY;
  }

  return { url: resolvedUrl, key: resolvedKey };
}

const config = getResolvedConfig();
export const isSupabaseConfigured = Boolean(config.url && config.key);

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!config.url || !config.key) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = createClient(config.url, config.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      clientInstance = null;
    }
  }

  return clientInstance;
}

export const supabase: SupabaseClient | null = getSupabaseClient();
