import { describe, expect, it } from "vitest";
import { normalizeDocumentText, splitIntoChunks } from "./chunking";

describe("document chunking", () => {
  it("normalizes line endings and repeated whitespace", () => {
    expect(normalizeDocumentText("  rent\r\n  report\u0000\n\n\nvalue  ")).toBe("rent\n report\n\nvalue");
  });

  it("returns no chunks for empty input", () => {
    expect(splitIntoChunks(" \n  ")).toEqual([]);
  });

  it("keeps chunks within their word limit and overlaps neighboring chunks", () => {
    const words = Array.from({ length: 500 }, (_, index) => "word" + index);
    const chunks = splitIntoChunks(words.join(" "), 100, 20);
    expect(chunks).toHaveLength(6);
    expect(chunks.every((chunk) => chunk.content.split(" ").length <= 100)).toBe(true);
    expect(chunks[0].content.split(" ").slice(-20)).toEqual(chunks[1].content.split(" ").slice(0, 20));
    expect(chunks[0].count).toBe(6);
  });
});
