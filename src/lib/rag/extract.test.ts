import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { extractDocumentText } from "./extract";

describe("DOCX text extraction", () => {
  it("reads paragraph text from the main Word document XML", async () => {
    const xml = "<w:document xmlns:w=\"urn:word\"><w:body><w:p><w:r><w:t>Sample investment memo with enough readable text.</w:t></w:r></w:p></w:body></w:document>";
    const docx = zipSync({ "word/document.xml": strToU8(xml) });

    await expect(extractDocumentText(Buffer.from(docx), "docx"))
      .resolves.toBe("Sample investment memo with enough readable text.");
  });

  it("rejects archives without the main Word document", async () => {
    const docx = zipSync({ "word/header1.xml": strToU8("<w:hdr />") });

    await expect(extractDocumentText(Buffer.from(docx), "docx"))
      .rejects.toThrow("main text exceeds the 10 MB extraction limit");
  });
});
