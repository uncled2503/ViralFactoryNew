import { Request } from 'express';
import { LocalDbMutex } from '../database/LocalDbMutex';
import { supabaseAdmin, isSupabaseConfigured } from '../database/supabaseClient';

export interface AuthenticatedUser {
  userId: string;
  email: string | null;
}

/**
 * Extracts the authenticated user from a verified Authorization Bearer token (Supabase Auth JWT).
 * SECURITY: this must never trust a client-supplied userId/email from headers, query or body —
 * doing so lets anyone impersonate any account (or bootstrap as an admin) just by sending an
 * id/email, defeating every ownership/authorization check built on top of this helper. The only
 * fallback is for fully offline/local dev setups where Supabase isn't configured at all (never
 * true in production, since the render worker and frontend both point at a live Supabase project).
 */
export async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    if (isSupabaseConfigured() && supabaseAdmin) {
      const token = authHeader.substring(7).trim();
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && user) {
          return { userId: user.id, email: user.email || null };
        }
      } catch (e: any) {
        console.error('[Auth Helper] Supabase JWT verification failed:', e.message);
      }
    }
    // A Bearer token was presented but could not be verified — reject rather than falling
    // through to an insecure client-supplied-id path below.
    return null;
  }

  // No Authorization header at all. Only trust a client-supplied userId when Supabase auth
  // isn't configured in this deployment (offline/local dev) — never reachable in production.
  if (isSupabaseConfigured()) {
    return null;
  }

  const userId = (req.query.userId || req.body?.userId || req.headers['x-user-id']) as string;
  if (!userId || userId === 'undefined' || userId === 'null') return null;

  try {
    const dbData = await LocalDbMutex.loadDb();
    const users = dbData.saas_users || dbData.users || [];
    const userObj = users.find((u: any) => u.id === userId);
    return { userId, email: userObj?.email || null };
  } catch {
    return { userId, email: null };
  }
}
