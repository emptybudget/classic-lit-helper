import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let cached: Ratelimit | null = null;

export function getRatelimit(): Ratelimit {
  if (cached) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Upstash Redis credentials are not configured.");
  }

  const redis = new Redis({ url, token });

  cached = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(5, "1 d"),
    analytics: false,
    prefix: "classic-lit-helper:rl",
  });

  return cached;
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
