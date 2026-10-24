/** Shares the browser Supabase client and unwraps service responses. */

import { createClient } from '@supabase/supabase-js';
import { config, configured } from '../config/public.js';
// Sessions stay in memory: no refresh token is duplicated in browser draft storage.
export const client = configured
  ? createClient(config.url, config.key, {
      auth: { persistSession: false, detectSessionInUrl: false, autoRefreshToken: true },
    })
  : null;

/**
 * Returns the configured browser client or fails before a request is attempted.
 *
 * @returns {object} The shared Supabase client.
 * @throws {Error} When public client settings are missing.
 */
export function requireClient() {
  if (!client)
    throw Error('Chưa cấu hình Supabase. Xem README để thiết lập URL và publishable key.');
  return client;
}

/**
 * Unwraps a Supabase request and propagates service errors to callers.
 *
 * @param {PromiseLike<object>} query - The pending Supabase request.
 * @returns {Promise<*>} The request data.
 * @throws {Error} When the service returns an error.
 */
export async function result(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
