import { Redis } from "@upstash/redis";
import type { LiteratureResult } from "@/types/literature";

const TTL_SECONDS = 24 * 60 * 60;
const PREFIX = "classic-lit-helper:cache:";

let cached: Redis | null = null;

function getRedis(): Redis {
  if (cached) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Upstash Redis credentials are not configured.");
  }
  cached = new Redis({ url, token });
  return cached;
}

function keyOf(title: string): string {
  return PREFIX + title.trim().toLowerCase().normalize("NFC").replace(/\s+/g, " ");
}

export async function getCachedResult(title: string): Promise<LiteratureResult | null> {
  try {
    const v = await getRedis().get<LiteratureResult>(keyOf(title));
    return v ?? null;
  } catch (err) {
    console.error("cache read error", err);
    return null;
  }
}

export async function setCachedResult(title: string, data: LiteratureResult): Promise<void> {
  try {
    const r = getRedis();
    const primary = keyOf(title);
    await r.set(primary, data, { ex: TTL_SECONDS });
    if (data.title) {
      const titleKey = keyOf(data.title);
      if (titleKey !== primary) {
        await r.set(titleKey, data, { ex: TTL_SECONDS });
      }
    }
  } catch (err) {
    console.error("cache write error", err);
  }
}
