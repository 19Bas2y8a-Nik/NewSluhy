/**
 * Извлечение и нормализация текста:
 * - прямой текст из сообщения;
 * - текст по ссылке на Telegram-пост (t.me/...).
 */

const T_ME_LINK = /^https?:\/\/(www\.)?t\.me\/[^\s]+/i;

function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Пытается получить описание/текст со страницы t.me (og:description или meta).
 * t.me отдаёт HTML с meta-тегами — парсим их.
 */
export async function fetchTelegramPostText(url: string): Promise<string | null> {
  if (!T_ME_LINK.test(url.trim())) return null;
  try {
    const res = await fetch(url.trim(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewSluhyBot/1.0)" },
    });
    const html = await res.text();
    const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
    if (ogDesc?.[1]) return normalizeText(decodeHtmlEntities(ogDesc[1]));
    const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    if (desc?.[1]) return normalizeText(decodeHtmlEntities(desc[1]));
    const title = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
    if (title?.[1]) return normalizeText(decodeHtmlEntities(title[1]));
    return null;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Возвращает текст для обработки:
 * - если input — ссылка на t.me, пробуем достать текст поста, иначе используем URL как контекст;
 * - иначе — нормализованный введённый текст.
 */
export async function getInputText(rawInput: string): Promise<string> {
  const trimmed = rawInput.trim();
  if (!trimmed) return "";

  if (T_ME_LINK.test(trimmed)) {
    const postText = await fetchTelegramPostText(trimmed);
    if (postText) return postText;
    return normalizeText(trimmed);
  }

  return normalizeText(trimmed);
}
