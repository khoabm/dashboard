/** Keeps SDK sessions in tab storage and verifies admin identity against the server. */

import { newId } from '../utils/id.js';

/**
 * Selects tab-scoped SDK storage, falling back to memory when storage is unavailable.
 * A per-tab key also isolates the SDK's BroadcastChannel from unrelated tabs.
 *
 * @param {string} namespace - The public project URL used to separate projects.
 * @param {Function} [getStorage] - Returns the tab's sessionStorage or throws.
 * @returns {object} Supabase Auth options; never falls back to localStorage.
 */
export function createTabAuthOptions(namespace, getStorage = () => globalThis.sessionStorage) {
  const options = { persistSession: false, detectSessionInUrl: false, autoRefreshToken: true };
  try {
    const storage = getStorage();
    if (!storage) return options;
    const marker = `khtn8:auth-key:${namespace}`;
    const storageKey = storage.getItem(marker) || `${marker}:${newId()}`;
    // Probe writes even when a previous tab key exists; storage may now be blocked.
    storage.setItem(marker, storageKey);
    return { ...options, persistSession: true, storage, storageKey };
  } catch {
    return options;
  }
}

/**
 * Restores the SDK session, then verifies its user and active admin profile remotely.
 * Stored user metadata is never used to grant privileges. Failures propagate to the UI.
 *
 * @param {object} db - The shared Supabase client or an isolated regression client.
 * @returns {Promise<{userId: string}|null>} The verified admin, or null for a reader.
 * @throws {Error} When session recovery, identity verification, or profile lookup fails.
 */
export async function verifyAdminSession(db) {
  const { data: auth, error: sessionError } = await db.auth.getSession();
  if (sessionError) throw sessionError;
  if (!auth.session) return null;
  const { data, error: userError } = await db.auth.getUser();
  if (userError) throw userError;
  if (!data.user || data.user.id !== auth.session.user.id)
    throw Error('Không thể xác minh danh tính của phiên đăng nhập.');
  const { data: profiles, error: profileError } = await db
    .from('admin_profiles')
    .select('active,role')
    .eq('user_id', data.user.id);
  if (profileError) throw profileError;
  return profiles.some((profile) => profile.active && profile.role === 'admin')
    ? { userId: data.user.id }
    : null;
}
