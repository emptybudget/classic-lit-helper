import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LiteratureResult } from "@/types/literature";
import type { WikipediaBundle } from "@/lib/wikipedia";
import type { GuardianArticle } from "@/lib/guardian";

const MODEL = "gemini-3.1-flash-lite";

const TRANSLATE_PROMPT = `당신은 작품 제목 번역기입니다. 사용자가 입력한 작품 제목을 영문 위키백과에서 실제 사용되는 정확한 영어 표제어로 변환해 그 표제어만 반환하세요. 따옴표·구두점·설명·주석·여러 줄 금지. 이미 영어/라틴 알파벳이면 그대로 반환.`;

const SYSTEM_PROMPT = `당신은 한국어 고전문학 연구 보조자입니다. 사용자가 제공한 Wikipedia 발췌와 (있다면) The Guardian 기사 발췌만을 근거로, 정해진 JSON 스키마에 정확히 맞는 응답 한 개를 반환하세요. 영문 발췌는 자연스러운 한국어로 번역해 채우세요.

[엄격한 규칙]
- 출력은 오직 하나의 JSON 객체. 마크다운, 코드펜스, 설명 문장, 인사말 금지.
- 모든 텍스트 필드는 한국어. 작품 인용(quotes 섹션의 text)에 한해 원문 보존이 의미 있을 때 원어 유지가 허용되며, 그 외 영문 발췌(평론·위키 본문·Guardian 기사 등)는 반드시 자연스러운 한국어로 번역해서 채울 것. 인명·작품명·지명 같은 고유명사만 원어 유지 가능.
- 제공된 발췌에 명시되지 않은 정보는 절대 지어내지 말 것. 모르면 null 또는 빈 배열.
- sources에는 제공된 발췌의 URL만 포함. 다른 도메인 금지.
- characters는 작품의 주요 등장인물 3~8명. name은 원어 유지 허용, role은 한국어 라벨(예: 주인공/조연/적대자/서술자/조력자), description은 평이한 한국어 1~3문장.
- symbols는 발췌에서 근거를 찾을 수 있는 핵심 상징·모티프 0~6개.
- quotes는 작품 자체의 인상적인 문장 인용 3~5개. text는 원문 또는 자연스러운 한국어 번역, context는 누가/언제 한 말인지 또는 어떤 의미인지 1문장.
- recommendations는 같은 작가/시대/주제로 함께 읽을 만한 다른 작품 3~5개. title은 한국어 표제어(원어 병기 가능), why는 한 줄(40자 내외)로 왜 추천하는지 평이한 한국어. 발췌에서 근거를 찾기 어려우면 빈 배열.
- reading_tips는 발췌 내용을 종합한 2~4문장의 한국어 산문. 근거가 부족하면 null.

[평론(criticism) 작성 규칙 — 매우 중요]
- 영문 위키 본문의 "Themes / Analysis / Critical reception / Reception / Legacy / Influence / Adaptation" 섹션과 The Guardian 기사 발췌를 먼저 살펴 평론·해석을 추출하세요.
- 기명 비평가가 있으면 그 이름을 critic 필드에 쓰고, 없을 때는 출처 매체(예: "The Guardian", "위키백과 평론 섹션", 작품의 비평사 흐름을 가리키는 일반 표현 "후대 비평")를 쓰세요. 가공의 인명 금지.
- perspective 필드는 어려운 학술 용어 없이, 친구에게 설명하듯 평이한 한국어 1~2문장(40자 내외)으로 핵심을 짚으세요.
- quote 필드는 비평가/매체가 한 말 또는 발췌의 평론 문장을 반드시 자연스러운 한국어로 번역해서 넣을 것. 영문 그대로 두는 것 금지. 원문을 함께 보여 주고 싶으면 한국어 번역 뒤 괄호로 짧게 첨부. 인용 부호 없이 본문만.
- source 필드는 가능한 한 발췌에 포함된 URL(Wikipedia/Guardian). URL이 없으면 매체·섹션 이름.
- criticism은 최소 0개, 가급적 2~5개. 발췌에 평론적 단서가 약해도 작품 수용·각색·영향에 대한 기록이 있다면 그것을 평이한 평론 항목으로 정리하세요.
- 학술지·저널 이름의 나열식 인용 금지. 한 항목은 한 사람/매체의 시각으로 응축.

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
  "characters": [{ "name": string, "role": string, "description": string }],
  "symbols": [{ "symbol": string, "meaning": string, "example": string }],
  "quotes": [{ "text": string, "context": string }],
  "criticism": [{ "critic": string, "perspective": string, "quote": string, "source": string }],
  "recommendations": [{ "title": string, "why": string }],
  "reading_tips": string | null
}`;

function buildSourceBlock(wiki: WikipediaBundle, guardian: GuardianArticle[]): string {
  const lines: string[] = [];
  if (wiki.en) {
    lines.push(`[PRIMARY · English Wikipedia] Title: ${wiki.en.title}`);
    if (wiki.en.description) lines.push(`Description: ${wiki.en.description}`);
    lines.push(`URL: ${wiki.en.url}`);
    lines.push("Extract:");
    lines.push(wiki.en.extract);
    if (wiki.en.fullText) {
      lines.push("Body excerpt (section headers preserved as ## / ###):");
      lines.push(wiki.en.fullText);
    }
    lines.push("");
  }
  if (wiki.ko) {
    lines.push(`[SECONDARY · 한국어 위키백과] 제목: ${wiki.ko.title}`);
    if (wiki.ko.description) lines.push(`설명: ${wiki.ko.description}`);
    lines.push(`URL: ${wiki.ko.url}`);
    lines.push("요약:");
    lines.push(wiki.ko.extract);
    if (wiki.ko.fullText) {
      lines.push("본문 발췌 (## / ### 헤더 보존):");
      lines.push(wiki.ko.fullText);
    }
    lines.push("");
  }
  if (guardian.length > 0) {
    lines.push(`[CRITICISM SOURCE · The Guardian Books] ${guardian.length}개 기사`);
    guardian.forEach((g, i) => {
      lines.push(`---`);
      lines.push(`#${i + 1} Title: ${g.title}`);
      if (g.byline) lines.push(`Byline: ${g.byline}`);
      if (g.publishedAt) lines.push(`Published: ${g.publishedAt}`);
      lines.push(`URL: ${g.url}`);
      if (g.trail) lines.push(`Lede: ${g.trail}`);
      if (g.body) lines.push(`Body excerpt: ${g.body}`);
    });
    lines.push("");
  }
  return lines.join("\n");
}

export async function translateToEnglishTitle(query: string): Promise<string> {
  if (!/[ㄱ-힝一-鿿]/.test(query)) return query;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았어요.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: TRANSLATE_PROMPT,
    generationConfig: { temperature: 0, maxOutputTokens: 64 },
  });

  const result = await model.generateContent(`작품 제목: ${query}`);
  const text = result.response.text().trim().replace(/^["'`]+|["'`]+$/g, "");
  return text || query;
}

export async function summarizeLiterature(
  query: string,
  wiki: WikipediaBundle,
  guardian: GuardianArticle[] = [],
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

아래 발췌만을 근거로, 위 JSON 스키마를 준수해 한국어 JSON 한 개를 반환하세요. 평론 섹션은 [평론(criticism) 작성 규칙]을 반드시 지키세요.

----- 발췌 시작 -----
${buildSourceBlock(wiki, guardian)}
----- 발췌 끝 -----`;

  const result = await model.generateContent(userPrompt);
  const text = result.response.text();
  if (!text) {
    throw new Error("Gemini가 응답을 반환하지 않았어요.");
  }

  let parsed: LiteratureResult;
  try {
    parsed = JSON.parse(text) as LiteratureResult;
  } catch {
    throw new Error("Gemini 응답이 유효한 JSON이 아니에요.");
  }

  if (!parsed || typeof parsed !== "object" || typeof parsed.title !== "string") {
    throw new Error("응답 JSON 스키마가 올바르지 않아요.");
  }

  return parsed;
}
