/**
 * Выделение сущностей из текста:
 * ключевые утверждения (предложения), даты, числа, имена, ссылки.
 */

export interface ExtractedEntities {
  claims: string[];
  dates: string[];
  numbers: string[];
  urls: string[];
  names: string[];
}

const URL_RE =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

const DATE_PATTERNS = [
  /\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/g,
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+\d{2,4}\b/gi,
];

const NUMBER_RE = /\b\d+[\d.,]*\d*\b|\b\d+\b/g;

/** Слова, которые не считаем именами (частицы, предлоги, короткие слова). */
const STOP_WORDS = new Set(
  "и в на с по к о у за из от для при до без под над".split(" ")
);

/**
 * Простая эвристика: последовательности из 2+ слов с заглавной буквы.
 */
function extractNames(text: string): string[] {
  const words = text.split(/\s+/);
  const names: string[] = [];
  let current: string[] = [];

  for (const w of words) {
    const clean = w.replace(/[^\p{L}]/gu, "");
    if (clean.length < 2) {
      if (current.length >= 2) names.push(current.join(" "));
      current = [];
      continue;
    }
    const lower = clean.toLowerCase();
    if (STOP_WORDS.has(lower)) {
      if (current.length >= 2) names.push(current.join(" "));
      current = [];
      continue;
    }
    const isCapitalized = clean[0] === clean[0].toUpperCase() && clean[0] !== clean[0].toLowerCase();
    if (isCapitalized) {
      current.push(w);
    } else {
      if (current.length >= 2) names.push(current.join(" "));
      current = [];
    }
  }
  if (current.length >= 2) names.push(current.join(" "));

  return [...new Set(names)];
}

function extractUrls(text: string): string[] {
  const matches = text.match(URL_RE) ?? [];
  return [...new Set(matches)];
}

function extractDates(text: string): string[] {
  const out: string[] = [];
  for (const re of DATE_PATTERNS) {
    const m = text.match(re);
    if (m) out.push(...m);
  }
  return [...new Set(out)];
}

function extractNumbers(text: string): string[] {
  const m = text.match(NUMBER_RE) ?? [];
  return [...new Set(m)];
}

/**
 * Ключевые утверждения — разбиение на предложения (без пустых и слишком коротких).
 */
function extractClaims(text: string): string[] {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 15);
  return [...new Set(sentences)];
}

export function extractEntities(text: string): ExtractedEntities {
  if (!text.trim()) {
    return { claims: [], dates: [], numbers: [], urls: [], names: [] };
  }

  return {
    claims: extractClaims(text),
    dates: extractDates(text),
    numbers: extractNumbers(text),
    urls: extractUrls(text),
    names: extractNames(text),
  };
}
