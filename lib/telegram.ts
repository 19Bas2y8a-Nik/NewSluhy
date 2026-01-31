const TELEGRAM_API = "https://api.telegram.org/bot";

export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  options?: { parse_mode?: "HTML" | "Markdown"; disable_web_page_preview?: boolean }
): Promise<boolean> {
  const url = `${TELEGRAM_API}${token}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    ...(options?.disable_web_page_preview && { disable_web_page_preview: true }),
    ...(options?.parse_mode && { parse_mode: options.parse_mode }),
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Telegram sendMessage error:", res.status, err);
    return false;
  }
  return true;
}
