/**
 * Поиск кандидатов источников по запросу (Google Custom Search API).
 */

export interface SearchResult {
  title: string;
  link: string;
  snippet?: string;
}

const GOOGLE_CSE_URL = "https://www.googleapis.com/customsearch/v1";

/**
 * Поисковый запрос из текста (без предварительного анализа сущностей).
 */
export function buildSearchQueryFromText(text: string, maxLength = 300): string {
  const query = text.replace(/\s+/g, " ").trim().slice(0, maxLength);
  return query || "новости";
}

/**
 * Вызов Google Custom Search API. Требует GOOGLE_API_KEY и GOOGLE_CSE_ID.
 */
export async function searchSources(
  query: string,
  options: { apiKey: string; cseId: string; maxResults?: number }
): Promise<SearchResult[]> {
  const { apiKey, cseId, maxResults = 8 } = options;
  if (!apiKey || !cseId) {
    return [];
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx: cseId,
    q: query.slice(0, 500),
    num: String(Math.min(maxResults, 10)),
  });

  const res = await fetch(`${GOOGLE_CSE_URL}?${params}`);
  if (!res.ok) {
    console.error("Google CSE error:", res.status, await res.text());
    return [];
  }

  const data = (await res.json()) as {
    items?: Array<{ title?: string; link?: string; snippet?: string }>;
  };
  const items = data.items ?? [];
  return items
    .filter((i) => i.link)
    .map((i) => ({
      title: i.title ?? "",
      link: i.link ?? "",
      snippet: i.snippet,
    }));
}
