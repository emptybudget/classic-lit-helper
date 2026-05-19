import { ImageResponse } from "next/og";
import { getCachedResult } from "@/lib/cache";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "고전문학 도우미";

async function loadKoreanFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const family = "Noto+Serif+KR:wght@700";
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`;
    const css = await fetch(cssUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then((r) => r.text());
    const match = css.match(/src:\s*url\((https:\/\/[^)]+)\)\s*format/);
    if (!match) return null;
    const buf = await fetch(match[1]).then((r) => r.arrayBuffer());
    return buf;
  } catch {
    return null;
  }
}

interface Props {
  params: { slug: string };
}

export default async function OpengraphImage({ params }: Props) {
  let title = params.slug;
  try {
    title = decodeURIComponent(params.slug);
  } catch {}

  const data = await getCachedResult(title).catch(() => null);
  const displayTitle = data?.title ?? title;
  const author = data?.author ?? "";
  const era = data?.background?.era ?? "";

  const textPayload = `${displayTitle} ${author} ${era} 고전문학 도우미 사전지식 작가 등장인물 상징 평론`;
  const fontData = await loadKoreanFont(textPayload);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FBF7EF",
          display: "flex",
          flexDirection: "column",
          padding: "70px 90px",
          color: "#3F2E1F",
          fontFamily: "NotoSerifKR, serif",
        }}
      >
        <div
          style={{
            fontSize: 24,
            color: "#8B5E3C",
            letterSpacing: 6,
            textTransform: "uppercase",
            fontStyle: "italic",
          }}
        >
          Classic Literature Helper
        </div>

        <div
          style={{
            marginTop: 80,
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 1.1,
            display: "flex",
          }}
        >
          {displayTitle}
        </div>

        {author && (
          <div style={{ marginTop: 28, fontSize: 38, color: "#5C4632", display: "flex" }}>
            {author}
          </div>
        )}

        {era && (
          <div
            style={{
              marginTop: 14,
              fontSize: 30,
              color: "#8B5E3C",
              fontStyle: "italic",
              display: "flex",
            }}
          >
            {era}
          </div>
        )}

        <div
          style={{
            marginTop: "auto",
            fontSize: 26,
            color: "#5C4632",
            display: "flex",
          }}
        >
          사전지식 · 작가 · 등장인물 · 상징 · 평론
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [{ name: "NotoSerifKR", data: fontData, style: "normal", weight: 700 }]
        : undefined,
    },
  );
}
