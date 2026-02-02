import { NextRequest, NextResponse } from "next/server";
import { runPipelineForAPI } from "@/lib/pipeline";

export async function POST(request: NextRequest) {
  let body: { input?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const input = typeof body.input === "string" ? body.input.trim() : "";
  if (!input) {
    return NextResponse.json({ ok: false, error: "Поле input обязательно" }, { status: 400 });
  }

  const result = await runPipelineForAPI(input, {
    googleApiKey: process.env.GOOGLE_API_KEY,
    googleCseId: process.env.GOOGLE_CSE_ID,
    openaiApiKey: process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY,
    openaiBaseUrl: process.env.OPENAI_BASE_URL,
    openaiModel: process.env.OPENAI_MODEL,
  });

  return NextResponse.json(result);
}
