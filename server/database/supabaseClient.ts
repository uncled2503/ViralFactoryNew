import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Helper to decode JWT and get the correct Supabase project ref
function getSupabaseUrlAndKey(): { url: string; key: string } {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  let key = serviceKey || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (serviceKey && serviceKey.includes('.')) {
    try {
      const parts = serviceKey.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload && payload.ref) {
        url = `https://${payload.ref}.supabase.co`;
        key = serviceKey;
        console.log(`[SupabaseClient] Decoded project ref "${payload.ref}" from service role key JWT. Using matched URL: ${url}`);
      }
    } catch (e) {
      console.warn('[SupabaseClient] Failed to parse SUPABASE_SERVICE_ROLE_KEY JWT:', e);
    }
  }

  return { url, key };
}

const { url: SUPABASE_URL, key: SUPABASE_KEY } = getSupabaseUrlAndKey();

console.log('--- SUPABASE CLIENT INITIALIZATION ---');
console.log('SUPABASE_URL found:', !!SUPABASE_URL, SUPABASE_URL ? SUPABASE_URL.substring(0, 25) + '...' : 'none');
console.log('SUPABASE_KEY configured:', !!SUPABASE_KEY);

export const isSupabaseConfigured = (): boolean => {
  const configured = (
    !!SUPABASE_URL &&
    !!SUPABASE_KEY &&
    SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
    SUPABASE_KEY !== 'your-anon-key' &&
    SUPABASE_KEY !== ''
  );
  console.log('isSupabaseConfigured() called, returning:', configured);
  return configured;
};

export const supabaseAdmin = isSupabaseConfigured()
  ? createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

