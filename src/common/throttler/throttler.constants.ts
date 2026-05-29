/** Default REST rate limit: 100 requests per minute */
export const DEFAULT_THROTTLE = {
  default: { limit: 100, ttl: 60_000 },
} as const;

/** Auth endpoints: 10 requests per minute */
export const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } } as const;
