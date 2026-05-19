import { NextResponse } from "next/server";
import { fetchWikipedia } from "@/lib/wikipedia";
import { fetchGuardianReviews } from "@/lib/guardian";
import { summarizeLiterature, translateToEnglishTitle } from "@/lib/gemini";
import { getClientIp, getRatelimit, isAdmin, SEARCH_LIMIT } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  let remainingAfter = 0;
  let admin = false;
  try {
    admin = await isAdmin(ip);
    if (!admin) {
      const limiter = getRatelimit();
      const { success, remaining, reset } = await limiter.limit(ip);
      remainingAfter = remaining;
      if (!success) {
        const resetIn = Math.max(0, reset - Date.now());
        return NextResponse.json(
          {
            error: "오늘 검색 횟수(5회)를 모두 사용했어요.",
            rate_limited: true,
            reset,
            resetIn,
          },
          { status: 429 },
        );
      }
    }
  } catch (err) {
    console.error("ratelimit error", err);
    return NextResponse.json({ error: "요청 한도 검사에 실패했어요." }, { status: 500 });
  }

  let englishTitle = query;
  try {
    englishTitle = await translateToEnglishTitle(query);
  } catch (err) {
    console.error("translate error", err);
  }

  const [wiki, guardian] = await Promise.all([
    fetchWikipedia(query, englishTitle),
    fetchGuardianReviews(englishTitle).catch(() => []),
  ]);

  if (!wiki.ko && !wiki.en) {
    return NextResponse.json(
      { error: "한국어/영어 위키백과 모두에서 해당 작품을 찾지 못했어요." },
      { status: 404 },
    );
  }

  try {
    const data = await summarizeLiterature(query, wiki, guardian);
    return NextResponse.json({
      data,
      quota: admin
        ? { remaining: -1, limit: -1, admin: true }
        : { remaining: remainingAfter, limit: SEARCH_LIMIT },
    });
  } catch (err) {
    console.error("gemini error", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
