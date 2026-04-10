const CACHE_PREFIX = "ip543:v2:bootstrap:";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readBootstrapCache<T>(key: string): T | undefined {
  if (!canUseStorage()) return undefined;
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function writeBootstrapCache<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Ignore quota / serialization failures
  }
}

export function clearBootstrapCache(key: string) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch {
    // Ignore storage failures
  }
}
