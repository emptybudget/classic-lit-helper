import { NextResponse } from "next/server";
import type { LiteratureResult } from "@/types/literature";
import { fetchWikipedia } from "@/lib/wikipedia";
import { fetchGuardianReviews } from "@/lib/guardian";
import { fetchCoverUrl } from "@/lib/openlibrary";
import { summarizeLiterature, translateToEnglishTitle } from "@/lib/gemini";
import { getClientIp, getRatelimit, isAdmin, SEARCH_LIMIT } from "@/lib/ratelimit";
import { getCachedResult, setCachedResult } from "@/lib/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

function buildQuotaErrorResponse(err: unknown): NextResponse | null {
  const raw = err instanceof Error ? err.message : String(err);
  if (!/\b429\b|RESOURCE_EXHAUSTED|quota/i.test(raw)) return null;

  const isPerDay = /PerDay/i.test(raw);
  const retryMatch = raw.match(/retry in (\d+(?:\.\d+)?)s/i);
  const retrySeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;

  const message = isPerDay
    ? "AI 서비스(Gemini)의 오늘 무료 한도가 다 됐어요. 내일 다시 시도해 주세요. 이미 한 번 본 작품은 캐시로 바로 다시 볼 수 있어요."
    : `AI 서비스가 잠시 바빠요. ${retrySeconds ?? 30}초 뒤 다시 시도해 주세요.`;

  return NextResponse.json(
    { error: message, quota_error: true },
    { status: 429 },
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식이에요." }, { status: 400 });
  }

  const title = (body as { title?: unknown })?.title;
  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "작품 제목을 입력해 주세요." }, { status: 400 });
  }
  if (title.length > 120) {
    return NextResponse.json({ error: "제목이 너무 길어요." }, { status: 400 });
  }
  const query = title.trim();
  const ip = getClientIp(req);

  const [admin, cachedResult] = await Promise.all([
    isAdmin(ip).catch(() => false),
    getCachedResult(query),
  ]);

  if (cachedResult) {
    let quota: { remaining: number; limit: number; admin?: boolean } = {
      remaining: -1,
      limit: -1,
      admin: true,
    };
    if (!admin) {
      try {
        const r = await getRatelimit().getRemaining(ip);
        quota = { remaining: r.remaining, limit: SEARCH_LIMIT };
      } catch {
        quota = { remaining: 0, limit: SEARCH_LIMIT };
      }
    }
    return NextResponse.json({ data: cachedResult, quota, cached: true });
  }

  let resetTime = 0;
  if (!admin) {
    try {
      const r = await getRatelimit().getRemaining(ip);
      resetTime = r.reset;
      if (r.remaining <= 0) {
        const resetIn = Math.max(0, resetTime - Date.now());
        return NextResponse.json(
          {
            error: "오늘 검색 횟수(5회)를 모두 사용했어요.",
            rate_limited: true,
            reset: resetTime,
            resetIn,
          },
          { status: 429 },
        );
      }
    } catch (err) {
      console.error("ratelimit check error", err);
      return NextResponse.json({ error: "요청 한도 검사에 실패했어요." }, { status: 500 });
    }
  }

  let englishTitle = query;
  try {
    englishTitle = await translateToEnglishTitle(query);
  } catch (err) {
    console.error("translate error", err);
    const quotaResp = buildQuotaErrorResponse(err);
    if (quotaResp) return quotaResp;
  }

  const coverPromise = fetchCoverUrl(englishTitle, query).catch(() => null);

  const [wiki, guardian] = await Promise.all([
    fetchWikipedia(query, englishTitle),
    fetchGuardianReviews(englishTitle).catch(() => []),
  ]);

  if (!wiki.ko && !wiki.en) {
    if (wiki.disambiguation.length > 0) {
      return NextResponse.json({ disambiguation: wiki.disambiguation });
    }
    return NextResponse.json(
      { error: "한국어/영어 위키백과 모두에서 해당 작품을 찾지 못했어요." },
      { status: 404 },
    );
  }

  let data: LiteratureResult;
  try {
    data = await summarizeLiterature(query, wiki, guardian);
  } catch (err) {
    console.error("gemini error", err);
    const quotaResp = buildQuotaErrorResponse(err);
    if (quotaResp) return quotaResp;
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  data.cover_url = await coverPromise;

  void setCachedResult(query, data);

  let quota: { remaining: number; limit: number; admin?: boolean } = {
    remaining: -1,
    limit: -1,
    admin: true,
  };
  if (!admin) {
    try {
      const { remaining } = await getRatelimit().limit(ip);
      quota = { remaining, limit: SEARCH_LIMIT };
    } catch (err) {
      console.error("ratelimit consume error", err);
      quota = { remaining: 0, limit: SEARCH_LIMIT };
    }
  }

  return NextResponse.json({ data, quota });
}
