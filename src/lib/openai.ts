import OpenAI from "openai";

let instance: OpenAI | undefined;

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  instance ??= new OpenAI({ apiKey, timeout: 30_000, maxRetries: 2 });
  return instance;
}

export const chatModel = () => process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini";
export const embeddingModel = () => process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
