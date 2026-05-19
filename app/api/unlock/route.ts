import { NextResponse } from "next/server";
import {
  getClientIp,
  getSearchRemaining,
  getUnlockLimiter,
  resetSearchCounter,
} from "@/lib/ratelimit";

export const runtime = "nodejs";

const UNLOCK_PASSWORD = "민재짱";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청 형식이에요." }, { status: 400 });
  }

  const password = (body as { password?: unknown })?.password;
  if (typeof password !== "string" || password.length === 0 || password.length > 100) {
    return NextResponse.json({ ok: false, error: "비밀번호를 입력해 주세요." }, { status: 400 });
  }

  const ip = getClientIp(req);

  try {
    const { success } = await getUnlockLimiter().limit(ip);
    if (!success) {
      return NextResponse.json(
        { ok: false, error: "시도가 너무 많아요. 잠시 후 다시 시도해 주세요." },
        { status: 429 },
      );
    }
  } catch (err) {
    console.error("unlock ratelimit error", err);
    return NextResponse.json({ ok: false, error: "잠시 후 다시 시도해 주세요." }, { status: 500 });
  }

  if (password.trim() !== UNLOCK_PASSWORD) {
    return NextResponse.json({ ok: false, error: "비밀번호가 달라요." }, { status: 401 });
  }

  try {
    await resetSearchCounter(ip);
    const q = await getSearchRemaining(ip);
    return NextResponse.json({ ok: true, remaining: q.remaining, limit: q.limit });
  } catch (err) {
    console.error("unlock reset error", err);
    return NextResponse.json({ ok: false, error: "초기화에 실패했어요." }, { status: 500 });
  }
}
