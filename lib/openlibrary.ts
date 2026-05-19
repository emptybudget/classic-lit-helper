const UA = "classic-lit-helper/0.1 (https://github.com/emptybudget/classic-lit-helper)";

interface SearchResponse {
  docs?: { cover_i?: number }[];
}

async function searchOnce(title: string): Promise<number | null> {
  if (!title.trim()) return null;
  try {
    const url = new URL("https://openlibrary.org/search.json");
    url.searchParams.set("title", title);
    url.searchParams.set("limit", "1");
    url.searchParams.set("fields", "cover_i");
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as SearchResponse;
    return data.docs?.[0]?.cover_i ?? null;
  } catch {
    return null;
  }
}

export async function fetchCoverUrl(
  englishTitle: string,
  koreanTitle: string,
): Promise<string | null> {
  let coverId = await searchOnce(englishTitle);
  if (!coverId && koreanTitle && koreanTitle !== englishTitle) {
    coverId = await searchOnce(koreanTitle);
  }
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
}
