export type TextChunk = { content: string; index: number; count: number };

export function splitIntoChunks(input: string, chunkWords = 240, overlapWords = 40): TextChunk[] {
  const normalized = input.split("\u0000").join("").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const words = normalized.split(" ");
  const chunks: string[] = [];
  const stride = Math.max(1, chunkWords - overlapWords);
  for (let start = 0; start < words.length; start += stride) {
    const chunk = words.slice(start, start + chunkWords).join(" ").trim();
    if (chunk) chunks.push(chunk);
    if (start + chunkWords >= words.length) break;
  }
  return chunks.map((content, index) => ({ content, index, count: chunks.length }));
}

export function normalizeDocumentText(input: string) {
  return input.split("\u0000").join("").replace(/\r\n?/g, "\n").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
