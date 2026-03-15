const store = new Map<string, { count: number; resetAt: number }>();

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  ip: string,
  authenticated: boolean
): RateLimitResult {
  // Localhost gets higher limit for development
  const isLocal = ip === "127.0.0.1" || ip === "::1" || ip === "localhost";
  const limit = isLocal ? 200 : authenticated ? 60 : 20;
  const windowMs = 60_000;
  const now = Date.now();

  const entry = store.get(ip);
  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  const allowed = entry.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

// Cleanup stale entries every 5 min
setInterval(() => {
  const now = Date.now();
  store.forEach((val, key) => {
    if (now > val.resetAt) store.delete(key);
  });
}, 300_000);
