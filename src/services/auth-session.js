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

/** Optional remembered session. Never persist passwords or enable offline privilege. */
export const REMEMBER_DAYS = 30;
const REMEMBER_MS = REMEMBER_DAYS * 24 * 60 * 60 * 1000;
const RENEW_MS = 24 * 60 * 60 * 1000;
const rememberFlag = (namespace) => `khtn8:remember-admin:${namespace}`;
const keyFor = (namespace) => `khtn8:remember-token:${namespace}`;

export function createRememberedAuthOptions(
  namespace,
  {
    local = () => globalThis.localStorage,
    tab = () => globalThis.sessionStorage,
    now = () => Date.now(),
  } = {},
) {
  const fallback = createTabAuthOptions(namespace, tab);
  let persistent;
  try {
    persistent = local();
    if (!persistent)
      return { options: fallback, remember: () => false, renew: () => false, select: () => false };
    const probe = `khtn8:storage-probe:${namespace}`;
    persistent.setItem(probe, '1');
    persistent.removeItem(probe);
  } catch {
    return { options: fallback, remember: () => false, renew: () => false, select: () => false };
  }
  const marker = rememberFlag(namespace);
  const tokenKey = keyFor(namespace);
  const read = () => {
    try {
      const value = JSON.parse(persistent.getItem(marker) || 'null');
      if (
        !value ||
        !Number.isFinite(value.lastVerified) ||
        value.lastVerified > now() + 60000 ||
        now() - value.lastVerified >= REMEMBER_MS
      ) {
        persistent.removeItem(marker);
        persistent.removeItem(tokenKey);
        return null;
      }
      return value;
    } catch {
      persistent.removeItem(marker);
      persistent.removeItem(tokenKey);
      return null;
    }
  };
  const storage = {
    getItem(key) {
      if (read()) return persistent.getItem(tokenKey);
      return fallback.storage?.getItem(key) ?? null;
    },
    setItem(key, value) {
      if (read()) persistent.setItem(tokenKey, value);
      else fallback.storage?.setItem(key, value);
    },
    removeItem(key) {
      // SDK sign-out must clear the remembered opt-in as well as both token copies.
      persistent.removeItem(marker);
      persistent.removeItem(tokenKey);
      fallback.storage?.removeItem(key);
    },
  };
  const select = (enabled) => {
    try {
      if (enabled) {
        const existing = fallback.storage?.getItem(fallback.storageKey);
        persistent.setItem(marker, JSON.stringify({ lastVerified: now() }));
        if (existing) persistent.setItem(tokenKey, existing);
        // A remembered token must have one owner: no expired tab fallback.
        fallback.storage?.removeItem(fallback.storageKey);
      } else {
        const previous = read() ? persistent.getItem(tokenKey) : null;
        if (previous && fallback.storage) fallback.storage.setItem(fallback.storageKey, previous);
        persistent.removeItem(marker);
        persistent.removeItem(tokenKey);
      }
      return true;
    } catch {
      return false;
    }
  };
  const renew = () => {
    const state = read();
    if (!state) return false;
    if (now() - state.lastVerified < RENEW_MS) return true;
    try {
      persistent.setItem(marker, JSON.stringify({ lastVerified: now() }));
      return true;
    } catch {
      return false;
    }
  };
  return {
    options: {
      ...fallback,
      persistSession: true,
      storageKey: fallback.storageKey || `khtn8:auth:${namespace}`,
      storage,
    },
    remember: () => !!read(),
    select,
    renew,
  };
}
