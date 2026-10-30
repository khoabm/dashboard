/** Shares the browser Supabase client and unwraps service responses. */

import { createClient } from '@supabase/supabase-js';
import { config, configured } from '../config/public.js';
import { createRememberedAuthOptions } from './auth-session.js';

const rememberedAuth = createRememberedAuthOptions(config.url);
const authOptions = rememberedAuth.options;
export const rememberAdminSession = rememberedAuth;
export const sessionPersistent = authOptions.persistSession;
// SDK tokens use sessionStorage only; drafts and localStorage never receive them.
export const client = configured
  ? createClient(config.url, config.key, {
      auth: authOptions,
    })
  : null;

/**
 * Returns the configured browser client or fails before a request is attempted.
 *
 * @returns {object} The shared Supabase client.
 * @throws {Error} When public client settings are missing.
 */
export function requireClient() {
  if (!client) throw Error('Hệ thống chưa được thiết lập đầy đủ. Vui lòng liên hệ người quản lý.');
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
