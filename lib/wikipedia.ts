export interface WikipediaPage {
  lang: "ko" | "en";
  title: string;
  description: string | null;
  extract: string;
  url: string;
}

export interface WikipediaBundle {
  ko: (WikipediaPage & { fullText: string | null }) | null;
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

function stripHtml(html: string): string {
  const noScript = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<table[\s\S]*?<\/table>/gi, " ")
    .replace(/<sup[\s\S]*?<\/sup>/gi, " ");
  const text = noScript
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

async function getFullText(lang: "ko" | "en", title: string): Promise<string | null> {
  const encoded = encodeURIComponent(title.replace(/\s+/g, "_"));
  const html = await fetchText(`https://${lang}.wikipedia.org/api/rest_v1/page/html/${encoded}`);
  if (!html) return null;
  const text = stripHtml(html);
  return text.length > 12000 ? text.slice(0, 12000) : text;
}

export async function fetchWikipedia(query: string): Promise<WikipediaBundle> {
  const [ko, en] = await Promise.all([resolvePage("ko", query), resolvePage("en", query)]);

  let koFullText: string | null = null;
  if (ko) {
    koFullText = await getFullText("ko", ko.title);
  }

  return {
    ko: ko ? { ...ko, fullText: koFullText } : null,
    en: en ?? null,
  };
}
