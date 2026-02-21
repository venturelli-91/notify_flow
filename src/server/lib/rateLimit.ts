/**
 * In-memory sliding-window rate limiter.
 *
 * Suitable for single-process deployments (local dev, single Vercel
 * function instance). For multi-instance production, swap the store
 * for a Redis-backed implementation without changing the interface.
 *
 * Limits are keyed by an arbitrary string (e.g. client IP).
 */

interface WindowEntry {
  count: number
  resetAt: number
}

const store = new Map<string, WindowEntry>()

const MAX = Number(process.env['RATE_LIMIT_MAX'] ?? 20)
const WINDOW_MS = Number(process.env['RATE_LIMIT_WINDOW_S'] ?? 60) * 1_000

/**
 * Returns `true` when the caller has exceeded the rate limit.
 *
 * @param key  Identifies the caller (e.g. `req.headers['x-forwarded-for']`)
 */
export function isRateLimited(key: string): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  entry.count += 1

  if (entry.count > MAX) {
    return true
  }

  return false
}

/** Expose current window state — useful for tests and Retry-After headers. */
export function getRateLimitState(key: string): {
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    return { remaining: MAX, resetAt: now + WINDOW_MS }
  }

  return {
    remaining: Math.max(0, MAX - entry.count),
    resetAt: entry.resetAt,
  }
}
