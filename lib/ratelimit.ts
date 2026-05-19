import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const SEARCH_LIMIT = 5;

const ADMIN_TTL_SECONDS = 7 * 24 * 60 * 60;
const ADMIN_KEY_PREFIX = "classic-lit-helper:admin:";

let redisCached: Redis | null = null;
let searchCached: Ratelimit | null = null;
let unlockCached: Ratelimit | null = null;
let unlockDailyCached: Ratelimit | null = null;

function getRedis(): Redis {
  if (redisCached) return redisCached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Upstash Redis credentials are not configured.");
  }
  redisCached = new Redis({ url, token });
  return redisCached;
}

export function getRatelimit(): Ratelimit {
  if (searchCached) return searchCached;
  searchCached = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.fixedWindow(SEARCH_LIMIT, "1 d"),
    analytics: false,
    prefix: "classic-lit-helper:rl",
  });
  return searchCached;
}

export function getUnlockLimiter(): Ratelimit {
  if (unlockCached) return unlockCached;
  unlockCached = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.fixedWindow(10, "1 h"),
    analytics: false,
    prefix: "classic-lit-helper:unlock",
  });
  return unlockCached;
}

export function getUnlockDailyLimiter(): Ratelimit {
  if (unlockDailyCached) return unlockDailyCached;
  unlockDailyCached = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.fixedWindow(1, "1 d"),
    analytics: false,
    prefix: "classic-lit-helper:unlock-daily",
  });
  return unlockDailyCached;
}

export async function isAdmin(ip: string): Promise<boolean> {
  try {
    const v = await getRedis().get(`${ADMIN_KEY_PREFIX}${ip}`);
    return v !== null;
  } catch {
    return false;
  }
}

export async function setAdmin(ip: string): Promise<void> {
  await getRedis().set(`${ADMIN_KEY_PREFIX}${ip}`, "1", { ex: ADMIN_TTL_SECONDS });
}

export async function getSearchRemaining(
  ip: string,
): Promise<{ remaining: number; reset: number; limit: number }> {
  const r = await getRatelimit().getRemaining(ip);
  return { remaining: r.remaining, reset: r.reset, limit: SEARCH_LIMIT };
}

export async function resetSearchCounter(ip: string): Promise<void> {
  await getRatelimit().resetUsedTokens(ip);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "anonymous";
}
