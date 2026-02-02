/**
 * Пайплайн: текст → Google Search → AI-ранжирование (OpenAI gpt-4o-mini) → отправка 1–3 источников с уверенностью.
 */

import { getInputText } from "./text";
import { buildSearchQueryFromText, searchSources, type SearchResult } from "./search";
import { rankSourcesWithAI, type RankedSource } from "./ai";
import { sendMessage } from "./telegram";

function formatRankedMessage(ranked: RankedSource[], hasSearch: boolean, hasAI: boolean): string {
  if (ranked.length === 0) {
    if (!hasSearch) {
      return "Настройте Google Custom Search: GOOGLE_API_KEY и GOOGLE_CSE_ID в .env";
    }
    if (!hasAI) {
      return "Настройте OpenAI/OpenRouter: OPENAI_API_KEY в .env для выбора лучших источников.";
    }
    return "Подходящих источников не найдено. Попробуйте другой запрос.";
  }
  const lines = ranked.map(
    (r, i) =>
      `${i + 1}. ${r.title}\n   ${r.link}\n   Уверенность: ${r.confidence}%${r.reason ? ` — ${r.reason}` : ""}`
  );
  return "Источники (по смыслу):\n\n" + lines.join("\n\n");
}

export interface PipelineEnv {
  googleApiKey?: string;
  googleCseId?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiModel?: string;
}

export async function runPipeline(
  chatId: number,
  rawInput: string,
  token: string,
  env: PipelineEnv
): Promise<void> {
  try {
    const text = await getInputText(rawInput);
    if (!text) {
      await sendMessage(token, chatId, "Не удалось извлечь текст. Отправьте текст или ссылку на пост t.me/…");
      return;
    }

    const query = buildSearchQueryFromText(text);
    const apiKey = env.googleApiKey?.trim();
    const cseId = env.googleCseId?.trim();
    let results: SearchResult[] = [];
    if (apiKey && cseId) {
      results = await searchSources(query, { apiKey, cseId, maxResults: 10 });
    }

    let ranked: RankedSource[] = [];
    const openaiKey = env.openaiApiKey?.trim();
    if (openaiKey && results.length > 0) {
      ranked = await rankSourcesWithAI(text, results, {
        apiKey: openaiKey,
        baseUrl: env.openaiBaseUrl?.trim() || undefined,
        model: env.openaiModel?.trim() || undefined,
      });
    }
    if (ranked.length === 0 && results.length > 0) {
      ranked = results.slice(0, 3).map((r) => ({ title: r.title, link: r.link, confidence: 0 }));
    }

    const message = formatRankedMessage(ranked, Boolean(apiKey && cseId), Boolean(openaiKey));
    await sendMessage(token, chatId, message, { disable_web_page_preview: true });
  } catch (e) {
    console.error("Pipeline error:", e);
    await sendMessage(token, chatId, "Произошла ошибка при обработке. Попробуйте позже.");
  }
}

/**
 * Пайплайн для API/TMA: возвращает JSON вместо отправки в чат.
 */
export type PipelineApiResult =
  | { ok: true; sources: RankedSource[] }
  | { ok: false; error: string };

export async function runPipelineForAPI(
  rawInput: string,
  env: PipelineEnv
): Promise<PipelineApiResult> {
  try {
    const text = await getInputText(rawInput);
    if (!text) {
      return { ok: false, error: "Не удалось извлечь текст. Отправьте текст или ссылку на пост t.me/…" };
    }

    const query = buildSearchQueryFromText(text);
    const apiKey = env.googleApiKey?.trim();
    const cseId = env.googleCseId?.trim();
    let results: SearchResult[] = [];
    if (apiKey && cseId) {
      results = await searchSources(query, { apiKey, cseId, maxResults: 10 });
    }

    let ranked: RankedSource[] = [];
    const openaiKey = env.openaiApiKey?.trim();
    if (openaiKey && results.length > 0) {
      ranked = await rankSourcesWithAI(text, results, {
        apiKey: openaiKey,
        baseUrl: env.openaiBaseUrl?.trim() || undefined,
        model: env.openaiModel?.trim() || undefined,
      });
    }
    if (ranked.length === 0 && results.length > 0) {
      ranked = results.slice(0, 3).map((r) => ({ title: r.title, link: r.link, confidence: 0 }));
    }

    if (ranked.length === 0) {
      if (!apiKey || !cseId) {
        return { ok: false, error: "Поиск не настроен. Добавьте GOOGLE_API_KEY и GOOGLE_CSE_ID." };
      }
      if (!openaiKey && results.length === 0) {
        return { ok: false, error: "AI не настроен. Добавьте OPENAI_API_KEY для ранжирования." };
      }
      return { ok: false, error: "Подходящих источников не найдено. Попробуйте другой запрос." };
    }

    return { ok: true, sources: ranked };
  } catch (e) {
    console.error("Pipeline API error:", e);
    return { ok: false, error: "Произошла ошибка при обработке. Попробуйте позже." };
  }
}
