import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth/identity";
import { getOpenAI } from "@/lib/openai";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import { requestExceedsBytes, requireSameOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  if (requestExceedsBytes(request, 8 * 1024)) {
    return NextResponse.json({ error: "Speech request is too large." }, { status: 413 });
  }
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Speech is not configured." }, { status: 503 });

  let text: unknown;
  try {
    ({ text } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid speech request." }, { status: 400 });
  }
  if (typeof text !== "string" || text.trim().length === 0 || text.length > 1800) {
    return NextResponse.json({ error: "Speech text must be between 1 and 1,800 characters." }, { status: 400 });
  }

  try {
    await enforceRateLimit("speech:" + identity.userId, 20);
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    throw error;
  }

  const speech = await getOpenAI().audio.speech.create({
    model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
    voice: process.env.OPENAI_TTS_VOICE || "marin",
    input: text.trim(),
    response_format: "wav",
    instructions: "Speak clearly and naturally at a measured pace. Read currency and dates in a way that is easy to understand.",
  });
  return new Response(speech.body, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
