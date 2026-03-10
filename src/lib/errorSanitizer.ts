/**
 * Sanitizes error messages to prevent leaking internal system details.
 * Returns a generic, user-friendly message.
 */
export function getSafeErrorMessage(error: unknown): string {
  if (!error) return '發生錯誤，請稍後再試。';

  const message = typeof error === 'string'
    ? error
    : (error as any)?.message || '';
  const code = (error as any)?.code || '';

  // Database constraint violations
  if (message.includes('violates') || message.includes('constraint')) {
    return '提供的資料無效，請檢查後重試。';
  }

  // PostgreSQL error codes (23xxx = integrity constraint violations)
  if (code.startsWith('23')) {
    return '資料衝突，請檢查後重試。';
  }

  // Auth errors
  if (code === 'PGRST301' || message.includes('JWT')) {
    return '登入已過期，請重新登入。';
  }

  // Permission errors
  if (message.includes('permission denied') || message.includes('not authorized')) {
    return '權限不足，無法執行此操作。';
  }

  // Storage errors
  if (message.includes('storage') || message.includes('bucket')) {
    return '檔案操作失敗，請稍後再試。';
  }

  // Network errors
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
    return '網路連線異常，請稍後再試。';
  }

  return '發生錯誤，請稍後再試。';
}
