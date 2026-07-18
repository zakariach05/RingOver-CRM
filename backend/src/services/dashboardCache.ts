interface CacheEntry {
  data: any
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const DEFAULT_TTL_MS = 30_000

function buildKey(teamId: string, path: string): string {
  return `${teamId}:${path}`
}

export function getCached(teamId: string, path: string): any | null {
  const key = buildKey(teamId, path)
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

export function setCache(teamId: string, path: string, data: any, ttlMs = DEFAULT_TTL_MS): void {
  const key = buildKey(teamId, path)
  cache.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function invalidateTeam(teamId: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${teamId}:`)) {
      cache.delete(key)
    }
  }
}
