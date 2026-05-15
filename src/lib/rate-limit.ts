/**
 * Sliding-window in-memory rate limiter.
 * Works per process/worker (no Redis required).
 * Good for single-instance deployments and development.
 */

type Entry = { timestamps: number[] };

const store = new Map<string, Entry>();

// Prevent unbounded memory growth — prune every 500 new keys
let keyCount = 0;
function maybeCleanup() {
  if (++keyCount < 500) return;
  keyCount = 0;
  const cutoff = Date.now() - 30 * 60 * 1000; // anything older than 30 min
  for (const [key, entry] of store.entries()) {
    if (entry.timestamps.every(ts => ts < cutoff)) store.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
};

/**
 * @param key        Unique bucket key, e.g. `auth:192.168.1.1`
 * @param limit      Max requests allowed in the window
 * @param windowMs   Window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const entry = store.get(key) ?? { timestamps: [] };

  // Evict timestamps outside the current window
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

  const allowed = entry.timestamps.length < limit;
  if (allowed) entry.timestamps.push(now);

  store.set(key, entry);
  maybeCleanup();

  const oldest = entry.timestamps[0] ?? now;
  const resetInSeconds = Math.max(0, Math.ceil((oldest + windowMs - now) / 1000));

  return {
    allowed,
    remaining: Math.max(0, limit - entry.timestamps.length),
    resetInSeconds,
  };
}

/** Pre-built policy helpers */
export const policies = {
  /** Auth endpoints — 10 req / 15 min per IP */
  auth:   (ip: string) => rateLimit(`auth:${ip}`,   10, 15 * 60 * 1000),
  /** Public API — 100 req / min per IP */
  public: (ip: string) => rateLimit(`pub:${ip}`,   100,      60 * 1000),
  /** Admin API — 300 req / min per IP */
  admin:  (ip: string) => rateLimit(`adm:${ip}`,   300,      60 * 1000),
};
