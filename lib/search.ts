/**
 * Поиск кандидатов источников по запросу (Google Custom Search API).
 * Без AI-ранжирования — возвращаем топ N ссылок для следующего этапа.
 */

export interface SearchResult {
  title: string;
  link: string;
  snippet?: string;
}

const GOOGLE_CSE_URL = "https://www.googleapis.com/customsearch/v1";

/**
 * Собирает поисковый запрос из утверждений и сущностей (даты, числа, имена).
 */
export function buildSearchQuery(claims: string[], entities: { dates: string[]; numbers: string[]; names: string[] }): string {
  const parts: string[] = [];
  if (claims.length > 0) {
    const firstClaim = claims[0].slice(0, 100);
    parts.push(firstClaim);
  }
  if (entities.names.length > 0) parts.push(entities.names.slice(0, 3).join(" "));
  if (entities.dates.length > 0) parts.push(entities.dates[0]);
  if (entities.numbers.length > 0) parts.push(entities.numbers.slice(0, 2).join(" "));
  const query = parts.join(" ").trim();
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
