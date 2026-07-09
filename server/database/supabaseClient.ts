import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- SUPABASE CLIENT INITIALIZATION ---');
console.log('SUPABASE_URL found:', !!SUPABASE_URL, SUPABASE_URL ? SUPABASE_URL.substring(0, 25) + '...' : 'none');
console.log('SUPABASE_ANON_KEY found:', !!SUPABASE_ANON_KEY, SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 15) + '...' : 'none');

export const isSupabaseConfigured = (): boolean => {
  const configured = (
    !!SUPABASE_URL &&
    !!SUPABASE_ANON_KEY &&
    SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
    SUPABASE_ANON_KEY !== 'your-anon-key'
  );
  console.log('isSupabaseConfigured() called, returning:', configured);
  return configured;
};

export const supabaseAdmin = isSupabaseConfigured()
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

