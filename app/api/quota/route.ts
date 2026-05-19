import { NextResponse } from "next/server";
import {
  SEARCH_LIMIT,
  getClientIp,
  getSearchRemaining,
  isAdmin,
} from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  try {
    if (await isAdmin(ip)) {
      return NextResponse.json({ remaining: -1, limit: -1, admin: true });
    }
    const q = await getSearchRemaining(ip);
    return NextResponse.json(q);
  } catch (err) {
    console.error("quota error", err);
    return NextResponse.json(
      { remaining: SEARCH_LIMIT, limit: SEARCH_LIMIT, reset: 0, error: "쿼터 조회 실패" },
      { status: 500 },
    );
  }
}
