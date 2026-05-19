export interface GuardianArticle {
  title: string;
  byline: string | null;
  publishedAt: string | null;
  url: string;
  trail: string | null;
  body: string | null;
}

const UA = "classic-lit-helper/0.1 (https://github.com/emptybudget/classic-lit-helper)";

interface GuardianResponse {
  response?: {
    results?: {
      webTitle?: string;
      webUrl?: string;
      webPublicationDate?: string;
      sectionName?: string;
      fields?: {
        trailText?: string;
        bodyText?: string;
        byline?: string;
      };
    }[];
  };
}

function stripTags(s: string | undefined | null): string {
  if (!s) return "";
  return s.replace(/<[^>]+>/g, "").trim();
}

export async function fetchGuardianReviews(
  englishTitle: string,
  limit = 4,
): Promise<GuardianArticle[]> {
  const apiKey = process.env.GUARDIAN_API_KEY;
  if (!apiKey) return [];
  if (!englishTitle || englishTitle.trim().length === 0) return [];

  const url = new URL("https://content.guardianapis.com/search");
  url.searchParams.set("q", `"${englishTitle}"`);
  url.searchParams.set("section", "books");
  url.searchParams.set("order-by", "relevance");
  url.searchParams.set("page-size", String(Math.min(limit * 2, 10)));
  url.searchParams.set("show-fields", "trailText,bodyText,byline");
  url.searchParams.set("api-key", apiKey);

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as GuardianResponse;
    const results = data.response?.results ?? [];
    return results
      .filter((r) => r.webTitle && r.webUrl)
      .slice(0, limit)
      .map((r) => {
        const fullBody = stripTags(r.fields?.bodyText);
        const body = fullBody.length > 1400 ? fullBody.slice(0, 1400) + "…" : fullBody;
        return {
          title: r.webTitle!,
          byline: stripTags(r.fields?.byline) || null,
          publishedAt: r.webPublicationDate ?? null,
          url: r.webUrl!,
          trail: stripTags(r.fields?.trailText) || null,
          body: body || null,
        };
      });
  } catch {
    return [];
  }
}
