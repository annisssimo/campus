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
