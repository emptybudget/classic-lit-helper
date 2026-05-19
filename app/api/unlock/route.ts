import { NextResponse } from "next/server";
import {
  getClientIp,
  getSearchRemaining,
  getUnlockDailyLimiter,
  getUnlockLimiter,
  resetSearchCounter,
  setAdmin,
} from "@/lib/ratelimit";

export const runtime = "nodejs";

const NORMAL_PASSWORD = "mjzzang";
const ADMIN_PASSWORD = "grz";

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

  const pwd = password.trim();

  if (pwd === ADMIN_PASSWORD) {
    try {
      await setAdmin(ip);
      await resetSearchCounter(ip);
      return NextResponse.json({ ok: true, admin: true, remaining: -1, limit: -1 });
    } catch (err) {
      console.error("unlock admin error", err);
      return NextResponse.json({ ok: false, error: "관리자 모드 설정에 실패했어요." }, { status: 500 });
    }
  }

  if (pwd === NORMAL_PASSWORD) {
    try {
      const { success } = await getUnlockDailyLimiter().limit(ip);
      if (!success) {
        return NextResponse.json(
          { ok: false, error: "오늘은 이미 충전했어요. 내일 다시 시도해 주세요." },
          { status: 429 },
        );
      }
    } catch (err) {
      console.error("unlock daily error", err);
      return NextResponse.json({ ok: false, error: "잠시 후 다시 시도해 주세요." }, { status: 500 });
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

  return NextResponse.json({ ok: false, error: "비밀번호가 달라요." }, { status: 401 });
}
