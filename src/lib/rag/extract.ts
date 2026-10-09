import { parse as parseCsv } from "csv-parse/sync";
import { load } from "cheerio";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { normalizeDocumentText } from "./chunking";

const allowedTypes = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["text/html", "html"],
  ["text/csv", "csv"],
  ["text/plain", "text"],
]);

export function supportedDocumentType(contentType: string, fileName: string) {
  const fromMime = allowedTypes.get(contentType.split(";")[0].trim().toLowerCase());
  if (fromMime) return fromMime;
  const extension = fileName.split(".").at(-1)?.toLowerCase();
  return extension && ["pdf", "docx", "html", "htm", "csv", "txt"].includes(extension)
    ? extension === "htm" ? "html" : extension === "txt" ? "text" : extension
    : null;
}

export async function extractDocumentText(buffer: Buffer, type: string) {
  let text: string;
  if (type === "pdf") {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      text = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  } else if (type === "docx") {
    text = (await mammoth.extractRawText({ buffer })).value;
  } else if (type === "html") {
    text = load(buffer.toString("utf8"))("body").text();
  } else if (type === "csv") {
    const rows = parseCsv(buffer.toString("utf8"), { columns: true, skip_empty_lines: true }) as Record<string, string>[];
    text = rows.map((row) => Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(" | ")).join("\n");
  } else if (type === "text") {
    text = buffer.toString("utf8");
  } else {
    throw new Error("Unsupported document type.");
  }
  const normalized = normalizeDocumentText(text);
  if (normalized.length < 20) throw new Error("No readable text was found in this file.");
  return normalized;
}
