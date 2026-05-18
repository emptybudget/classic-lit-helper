import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LiteratureResult } from "@/types/literature";
import type { WikipediaBundle } from "@/lib/wikipedia";

const MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `당신은 한국어 고전문학 연구 보조자입니다. 사용자가 제공한 Wikipedia 발췌만을 근거로, 정해진 JSON 스키마에 정확히 맞는 응답 한 개를 반환하세요.

[엄격한 규칙]
- 출력은 오직 하나의 JSON 객체. 마크다운, 코드펜스, 설명 문장, 인사말 금지.
- 모든 텍스트 필드는 한국어. 고유명사·원문 인용은 원어 유지 허용.
- Wikipedia 발췌에 명시되지 않은 정보는 절대 지어내지 말 것. 모르면 null 또는 빈 배열.
- 각 섹션의 sources에는 제공된 Wikipedia URL만 포함. 다른 도메인 금지.
- symbols는 발췌에서 근거를 찾을 수 있는 핵심 상징·모티프 0~6개.
- criticism은 발췌에 평론·해석이 명시되어 있을 때만 채울 것. 없으면 빈 배열.
- reading_tips는 발췌 내용을 종합한 2~4문장의 한국어 산문. 근거가 부족하면 null.

[JSON 스키마]
{
  "title": string,
  "author": string | null,
  "background": {
    "era": string | null,
    "genre": string | null,
    "context": string[],
    "sources": string[]
  },
  "author_info": {
    "life": string | null,
    "motivation": string | null,
    "literary_position": string | null,
    "sources": string[]
  },
  "symbols": [{ "symbol": string, "meaning": string, "example": string }],
  "criticism": [{ "critic": string, "perspective": string, "quote": string, "source": string }],
  "reading_tips": string | null
}`;

function stripFences(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    text = text.slice(first, last + 1);
  }
  return text.trim();
}

function buildSourceBlock(wiki: WikipediaBundle): string {
  const lines: string[] = [];
  if (wiki.ko) {
    lines.push(`[한국어 위키백과] 제목: ${wiki.ko.title}`);
    if (wiki.ko.description) lines.push(`설명: ${wiki.ko.description}`);
    lines.push(`URL: ${wiki.ko.url}`);
    lines.push("요약:");
    lines.push(wiki.ko.extract);
    if (wiki.ko.fullText) {
      lines.push("본문 발췌:");
      lines.push(wiki.ko.fullText);
    }
    lines.push("");
  }
  if (wiki.en) {
    lines.push(`[English Wikipedia] Title: ${wiki.en.title}`);
    if (wiki.en.description) lines.push(`Description: ${wiki.en.description}`);
    lines.push(`URL: ${wiki.en.url}`);
    lines.push("Extract:");
    lines.push(wiki.en.extract);
    lines.push("");
  }
  return lines.join("\n");
}

export async function summarizeLiterature(
  query: string,
  wiki: WikipediaBundle,
): Promise<LiteratureResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았어요.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
    },
  });

  const userPrompt = `사용자가 검색한 작품 제목: "${query}"

아래 Wikipedia 발췌만을 근거로, 위 JSON 스키마를 준수해 한국어 JSON 한 개를 반환하세요.

----- Wikipedia 발췌 시작 -----
${buildSourceBlock(wiki)}
----- Wikipedia 발췌 끝 -----`;

  const result = await model.generateContent(userPrompt);
  const text = result.response.text();
  if (!text) {
    throw new Error("Gemini가 응답을 반환하지 않았어요.");
  }

  const cleaned = stripFences(text);

  let parsed: LiteratureResult;
  try {
    parsed = JSON.parse(cleaned) as LiteratureResult;
  } catch {
    throw new Error("Gemini 응답이 유효한 JSON이 아니에요.");
  }

  if (!parsed || typeof parsed !== "object" || typeof parsed.title !== "string") {
    throw new Error("응답 JSON 스키마가 올바르지 않아요.");
  }

  return parsed;
}
