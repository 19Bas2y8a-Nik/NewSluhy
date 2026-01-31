import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/telegram";
import { runPipeline } from "@/lib/pipeline";

interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string };
  date: number;
  text?: string;
  caption?: string;
  entities?: Array<{ type: string; offset: number; length: number; url?: string }>;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

function getMessageText(update: TelegramUpdate): { chatId: number; text: string } | null {
  const msg = update.message;
  if (!msg?.chat?.id) return null;

  let text = msg.text ?? msg.caption ?? "";
  if (text) {
    return { chatId: msg.chat.id, text };
  }

  const entities = msg.entities ?? [];
  const urlEntity = entities.find((e) => e.type === "url" || e.type === "text_link");
  if (urlEntity) {
    if (urlEntity.type === "text_link" && urlEntity.url) {
      return { chatId: msg.chat.id, text: urlEntity.url };
    }
    const full = msg.text ?? msg.caption ?? "";
    if (full) {
      text = full.slice(urlEntity.offset, urlEntity.offset + urlEntity.length);
      if (text) return { chatId: msg.chat.id, text };
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = getMessageText(update);
  if (!parsed) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { chatId, text } = parsed;

  await sendMessage(token, chatId, "Обрабатываю…");

  runPipeline(chatId, text, token, {
    googleApiKey: process.env.GOOGLE_API_KEY,
    googleCseId: process.env.GOOGLE_CSE_ID,
  }).catch((err) => console.error("Webhook pipeline error:", err));

  return NextResponse.json({ ok: true }, { status: 200 });
}
