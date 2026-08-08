/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabaseClient } from '../services/dbClient';

/**
 * Universal authenticated fetch helper for frontend API requests.
 * Automatically injects:
 * - Authorization: Bearer <supabase_access_token> (if available)
 * - x-user-id: <user_id>
 * - x-user-email: <user_email>
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // 1. Try to extract token & user info from active Supabase session
  if (supabaseClient) {
    try {
      const { data } = await supabaseClient.auth.getSession();
      if (data?.session?.access_token) {
        headers['Authorization'] = `Bearer ${data.session.access_token}`;
      }
      if (data?.session?.user) {
        headers['x-user-id'] = data.session.user.id;
        headers['x-user-email'] = data.session.user.email || '';
      }
    } catch (e) {
      console.warn('[authenticatedFetch] Failed to retrieve Supabase session:', e);
    }
  }

  // 2. Fallback to sessionStorage / localStorage cached user if x-user-id is still missing
  if (!headers['x-user-id']) {
    try {
      const savedUserStr =
        sessionStorage.getItem('vf_user') ||
        sessionStorage.getItem('saas_user') ||
        localStorage.getItem('vf_user') ||
        localStorage.getItem('saas_user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser?.id) headers['x-user-id'] = savedUser.id;
        if (savedUser?.email) headers['x-user-email'] = savedUser.email;
      }
    } catch (e) {
      // ignore
    }
  }

  return fetch(url, { ...options, headers });
}

export const adminFetch = authenticatedFetch;
