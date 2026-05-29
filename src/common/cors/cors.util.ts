export function parseCorsOrigins(
  value: string | undefined,
): boolean | string[] {
  if (!value || value.trim() === '*') {
    return true;
  }

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : true;
}

/**
 * Socket.IO CORS origin delegate. Evaluated per-connection at runtime, so
 * CORS_ORIGIN is read after env is loaded (unlike a value captured at import).
 */
export function corsOriginDelegate(
  requestOrigin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  const allowed = parseCorsOrigins(process.env.CORS_ORIGIN);
  if (!Array.isArray(allowed) || !requestOrigin) {
    callback(null, true);
    return;
  }
  callback(null, allowed.includes(requestOrigin));
}
