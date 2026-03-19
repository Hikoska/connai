// In-memory rate limiter — supports named buckets for per-route isolation
// Each bucket tracks separately: store key = `${ip}:${bucket}`
// Compatible with Vercel serverless (Map lives in function instance)

interface RateEntry { count: number; resetAt: number }
const store = new Map<string, RateEntry>()

/**
 * Returns true if request is allowed, false if rate-limited.
 * @param ip             Client IP address
 * @param bucket         Named bucket for isolation (e.g. 'interviews-message', 'report-generate')
 * @param maxPerWindow   Max requests allowed per window (default: 20)
 * @param windowMs       Window in milliseconds (default: 60_000 = 1 minute)
 */
export function rateLimit(
  ip: string,
  bucket = 'default',
  maxPerWindow = 20,
  windowMs = 60_000,
): boolean {
  const key = `${ip}:${bucket}`
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= maxPerWindow) return false
  entry.count++
  return true
}

export function getRateLimitHeaders(
  ip: string,
  bucket = 'default',
  maxPerWindow = 20,
) {
  const key = `${ip}:${bucket}`
  const entry = store.get(key)
  const remaining = entry ? Math.max(0, maxPerWindow - entry.count) : maxPerWindow
  const reset = entry
    ? Math.ceil(entry.resetAt / 1000)
    : Math.ceil((Date.now() + 60_000) / 1000)
  return {
    'X-RateLimit-Limit': String(maxPerWindow),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(reset),
  }
}
