// Simple in-memory rate limiter for serverless API routes
// Uses Map<ip, {count, resetAt}> — resets every 60 seconds per IP

interface RateEntry { count: number; resetAt: number }
const store = new Map<string, RateEntry>()

export function rateLimit(ip: string, maxPerMinute = 20): boolean {
  const now = Date.now()
  const entry = store.get(ip)
  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + 60_000 })
    return true // allowed
  }
  if (entry.count >= maxPerMinute) return false // blocked
  entry.count++
  return true // allowed
}

export function getRateLimitHeaders(ip: string, maxPerMinute = 20) {
  const entry = store.get(ip)
  const remaining = entry ? Math.max(0, maxPerMinute - entry.count) : maxPerMinute
  const reset = entry ? Math.ceil(entry.resetAt / 1000) : Math.ceil((Date.now() + 60_000) / 1000)
  return {
    'X-RateLimit-Limit': String(maxPerMinute),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(reset),
  }
}
