/**
 * AI-ранжирование источников: OpenAI API (gpt-4o-mini) или OpenRouter (openai/gpt-4o-mini).
 * Сравнение по смыслу, выбор 1–3 источников и оценка уверенности.
 */

import type { SearchResult } from "./search";

export interface RankedSource {
  title: string;
  link: string;
  confidence: number;
  reason?: string;
}

const DEFAULT_BASE = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

function buildMessages(text: string, results: SearchResult[]): Array<{ role: "user" | "system"; content: string }> {
  const candidates = results
    .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.link}\n   ${r.snippet ?? ""}`)
    .join("\n\n");

  return [
    {
      role: "system",
      content: `Ты помогаешь найти источники информации. На вход даётся текст (утверждение или пост) и список кандидатов — результатов поиска (заголовок, URL, сниппет).
Твоя задача: выбрать от 1 до 3 источников, которые лучше всего подтверждают или раскрывают смысл исходного текста (сравнивай по смыслу, не буквально). Для каждого выбранного источника укажи оценку уверенности от 1 до 100 (целое число) и кратко — почему (одна фраза).
Ответь строго в формате JSON-массива, без markdown и без пояснений вне JSON. Каждый элемент массива:
{"title": "заголовок", "link": "url", "confidence": число, "reason": "краткая причина"}
Порядок: от самого релевантного к менее. Если ни один источник не подходит — верни пустой массив [].`,
    },
    {
      role: "user",
      content: `Исходный текст:\n\n${text.slice(0, 3000)}\n\nКандидаты источников:\n\n${candidates}`,
    },
  ];
}

export async function rankSourcesWithAI(
  text: string,
  results: SearchResult[],
  options: { apiKey: string; baseUrl?: string; model?: string }
): Promise<RankedSource[]> {
  const { apiKey, baseUrl = DEFAULT_BASE, model = DEFAULT_MODEL } = options;
  if (!apiKey?.trim() || results.length === 0) {
    return [];
  }

  const base = baseUrl?.startsWith("http") ? baseUrl : baseUrl ? `https://${baseUrl.replace(/\/$/, "")}` : DEFAULT_BASE;
  const url = base.replace(/\/$/, "") + "/chat/completions";
  const body = {
    model,
    messages: buildMessages(text, results),
    max_tokens: 800,
    temperature: 0.2,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("OpenAI/OpenRouter error:", res.status, err);
    return [];
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return [];

  try {
    const json = content.replace(/^```\w*\n?|\n?```$/g, "").trim();
    const parsed = JSON.parse(json) as RankedSource[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p?.link && typeof p.confidence === "number")
      .slice(0, 3)
      .map((p) => ({
        title: String(p.title ?? ""),
        link: String(p.link ?? ""),
        confidence: Math.min(100, Math.max(0, Number(p.confidence))),
        reason: p.reason ? String(p.reason) : undefined,
      }));
  } catch {
    console.error("AI response parse error:", content);
    return [];
  }
}
