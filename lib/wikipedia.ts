export interface WikipediaPage {
  lang: "ko" | "en";
  title: string;
  description: string | null;
  extract: string;
  fullText: string | null;
  url: string;
}

export interface WikipediaBundle {
  ko: WikipediaPage | null;
  en: WikipediaPage | null;
}

const UA = "classic-lit-helper/0.1 (https://github.com/emptybudget/classic-lit-helper)";

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

interface SummaryResponse {
  type?: string;
  title?: string;
  description?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
}

interface SearchResponse {
  pages?: { key: string; title: string }[];
}

async function getSummary(lang: "ko" | "en", title: string): Promise<WikipediaPage | null> {
  const encoded = encodeURIComponent(title.replace(/\s+/g, "_"));
  const data = await fetchJson<SummaryResponse>(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
  );
  if (!data || !data.extract || data.type === "disambiguation") return null;
  return {
    lang,
    title: data.title ?? title,
    description: data.description ?? null,
    extract: data.extract,
    fullText: null,
    url: data.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encoded}`,
  };
}

async function searchTitle(lang: "ko" | "en", query: string): Promise<string | null> {
  const data = await fetchJson<SearchResponse>(
    `https://${lang}.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(query)}&limit=1`,
  );
  return data?.pages?.[0]?.title ?? null;
}

async function resolvePage(lang: "ko" | "en", query: string): Promise<WikipediaPage | null> {
  const direct = await getSummary(lang, query);
  if (direct) return direct;
  const matched = await searchTitle(lang, query);
  if (!matched) return null;
  return await getSummary(lang, matched);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function htmlToSectionedText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<table[\s\S]*?<\/table>/gi, " ")
    .replace(/<sup[\s\S]*?<\/sup>/gi, " ")
    .replace(/<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, lvl, inner) => {
      const heading = decodeEntities(inner.replace(/<[^>]+>/g, "")).trim();
      return `\n\n${"#".repeat(Number(lvl))} ${heading}\n\n`;
    })
    .replace(/<[^>]+>/g, " ");
  text = decodeEntities(text)
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

const CRITICISM_KEYWORDS_EN = [
  "theme", "themes", "analysis", "interpretation", "critical", "criticism",
  "reception", "legacy", "influence", "adaptation", "in popular culture",
  "scholarship", "review",
];
const CRITICISM_KEYWORDS_KO = [
  "주제", "평가", "평론", "비평", "수용", "해석", "분석", "의의", "영향", "각색",
];

function extractRelevantSections(sectioned: string, lang: "ko" | "en", limit: number): string {
  const parts = sectioned.split(/\n(?=#{2,4} )/);
  const intro = parts[0] ?? "";
  const headed = parts.slice(1);
  const keywords = lang === "en" ? CRITICISM_KEYWORDS_EN : CRITICISM_KEYWORDS_KO;

  const matched: string[] = [];
  const rest: string[] = [];
  for (const section of headed) {
    const firstLine = section.split("\n")[0]?.toLowerCase() ?? "";
    if (keywords.some((k) => firstLine.includes(k))) {
      matched.push(section.trim());
    } else {
      rest.push(section.trim());
    }
  }

  const introSlice = intro.trim().slice(0, Math.min(6000, limit));
  const pieces = [introSlice, ...matched, ...rest];
  let out = "";
  for (const p of pieces) {
    if (out.length + p.length + 2 > limit) {
      const remaining = limit - out.length;
      if (remaining > 200) out += "\n\n" + p.slice(0, remaining);
      break;
    }
    out += (out ? "\n\n" : "") + p;
  }
  return out;
}

async function getFullText(lang: "ko" | "en", title: string): Promise<string | null> {
  const encoded = encodeURIComponent(title.replace(/\s+/g, "_"));
  const html = await fetchText(`https://${lang}.wikipedia.org/api/rest_v1/page/html/${encoded}`);
  if (!html) return null;
  const sectioned = htmlToSectionedText(html);
  return extractRelevantSections(sectioned, lang, 18000);
}

export async function fetchWikipedia(
  koQuery: string,
  enQuery: string,
): Promise<WikipediaBundle> {
  const [ko, en] = await Promise.all([
    resolvePage("ko", koQuery),
    resolvePage("en", enQuery),
  ]);

  const [koFullText, enFullText] = await Promise.all([
    ko ? getFullText("ko", ko.title) : Promise.resolve(null),
    en ? getFullText("en", en.title) : Promise.resolve(null),
  ]);

  return {
    ko: ko ? { ...ko, fullText: koFullText } : null,
    en: en ? { ...en, fullText: enFullText } : null,
  };
}
