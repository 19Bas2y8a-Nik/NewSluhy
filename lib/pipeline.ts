/**
 * Асинхронный пайплайн: текст → сущности → поиск → отправка результата пользователю.
 * Выполняется после быстрого ответа 200 в webhook (без AI-анализа).
 */

import { extractEntities, type ExtractedEntities } from "./entities";
import { getInputText } from "./text";
import { buildSearchQuery, searchSources, type SearchResult } from "./search";
import { sendMessage } from "./telegram";

function formatResultsMessage(results: SearchResult[], hasSearch: boolean): string {
  if (results.length === 0) {
    return hasSearch
      ? "По запросу ничего не найдено. Проверьте GOOGLE_API_KEY и GOOGLE_CSE_ID в настройках."
      : "Для поиска источников настройте Google Custom Search: GOOGLE_API_KEY и GOOGLE_CSE_ID в .env";
  }
  const lines = results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.link}`);
  return "Возможные источники (кандидаты, без AI-ранжирования):\n\n" + lines.join("\n\n");
}

export async function runPipeline(
  chatId: number,
  rawInput: string,
  token: string,
  env: { googleApiKey?: string; googleCseId?: string }
): Promise<void> {
  try {
    const text = await getInputText(rawInput);
    if (!text) {
      await sendMessage(token, chatId, "Не удалось извлечь текст. Отправьте текст или ссылку на пост t.me/…");
      return;
    }

    const entities = extractEntities(text);
    const query = buildSearchQuery(entities.claims, {
      dates: entities.dates,
      numbers: entities.numbers,
      names: entities.names,
    });

    const apiKey = env.googleApiKey?.trim();
    const cseId = env.googleCseId?.trim();
    const results = apiKey && cseId
      ? await searchSources(query, { apiKey, cseId, maxResults: 8 })
      : [];

    const message = formatResultsMessage(results, Boolean(apiKey && cseId));
    await sendMessage(token, chatId, message, { disable_web_page_preview: true });
  } catch (e) {
    console.error("Pipeline error:", e);
    await sendMessage(
      token,
      chatId,
      "Произошла ошибка при обработке. Попробуйте позже."
    );
  }
}
