const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

function getProjectRefFromUrl(url?: string) {
  if (!url) return null;

  try {
    return new URL(url).hostname.split('.')[0] ?? null;
  } catch {
    return null;
  }
}

export function getCurrentSupabaseProjectRef() {
  return SUPABASE_PROJECT_ID || getProjectRefFromUrl(SUPABASE_URL);
}

function isSupabaseAuthStorageKey(key: string) {
  return key.startsWith('sb-') && (
    key.includes('-auth-token') ||
    key.includes('code-verifier') ||
    key.includes('pkce')
  );
}

export function getSupabaseAuthStorageKeys(storage: Storage = window.localStorage) {
  const currentRef = getCurrentSupabaseProjectRef();
  const allKeys = Object.keys(storage).filter(isSupabaseAuthStorageKey);
  const currentKeys = currentRef
    ? allKeys.filter((key) => key.startsWith(`sb-${currentRef}-`))
    : [];
  const legacyKeys = currentRef
    ? allKeys.filter((key) => !key.startsWith(`sb-${currentRef}-`))
    : allKeys;

  return { allKeys, currentKeys, legacyKeys };
}

export function hasCurrentSupabaseSession(storage: Storage = window.localStorage) {
  try {
    const { currentKeys } = getSupabaseAuthStorageKeys(storage);
    return currentKeys.some((key) => {
      const value = storage.getItem(key);
      return Boolean(value && value !== 'null');
    });
  } catch {
    return false;
  }
}

export function hasAnyCurrentSupabaseSession() {
  if (typeof window === 'undefined') return false;

  return (
    hasCurrentSupabaseSession(window.localStorage) ||
    hasCurrentSupabaseSession(window.sessionStorage)
  );
}

export function clearLegacySupabaseAuthStorage(storage: Storage = window.localStorage) {
  try {
    const { legacyKeys } = getSupabaseAuthStorageKeys(storage);
    legacyKeys.forEach((key) => storage.removeItem(key));
    return legacyKeys.length;
  } catch {
    return 0;
  }
}

export function clearCurrentSupabaseAuthStorage(storage: Storage = window.localStorage) {
  try {
    const { currentKeys } = getSupabaseAuthStorageKeys(storage);
    currentKeys.forEach((key) => storage.removeItem(key));
    return currentKeys.length;
  } catch {
    return 0;
  }
}

export function clearAllSupabaseAuthStorage() {
  if (typeof window === 'undefined') return 0;

  const storages = [window.localStorage, window.sessionStorage];
  return storages.reduce((total, storage) => {
    return total + clearLegacySupabaseAuthStorage(storage) + clearCurrentSupabaseAuthStorage(storage);
  }, 0);
}

export function shouldResetOAuthState(url: URL) {
  const error = url.searchParams.get('error') ?? '';
  const errorDescription = url.searchParams.get('error_description') ?? '';
  const hash = url.hash ?? '';

  if (hash === '#') return true;
  if (!error && !errorDescription) return false;

  const message = `${error} ${errorDescription}`.toLowerCase();
  return (
    message.includes('server_error') ||
    message.includes('unable to fetch records') ||
    message.includes('scan error') ||
    message.includes('unsupported')
  );
}
