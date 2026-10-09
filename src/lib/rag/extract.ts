import { parse as parseCsv } from "csv-parse/sync";
import { load } from "cheerio";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";
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
    const archive = unzipSync(new Uint8Array(buffer), {
      filter: (entry) => entry.name === "word/document.xml" && entry.originalSize <= 10_000_000,
    });
    const documentXml = archive["word/document.xml"];
    if (!documentXml) throw new Error("The DOCX document is invalid or its main text exceeds the 10 MB extraction limit.");
    const xml = strFromU8(documentXml);
    const validation = XMLValidator.validate(xml);
    if (validation !== true) throw new Error("The DOCX document contains invalid XML.");
    const tree = new XMLParser({
      ignoreAttributes: true,
      parseTagValue: false,
      preserveOrder: true,
      trimValues: false,
    }).parse(xml);
    text = extractXmlText(tree);
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

function extractXmlText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(extractXmlText).join("");
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, child]) => {
      if (key === "#text" || key === "__cdata") return typeof child === "string" ? child : "";
      if (key.endsWith(":br")) return "\n";
      if (key.endsWith(":tab")) return "\t";
      return extractXmlText(child);
    }).join("");
  }
  return "";
}
