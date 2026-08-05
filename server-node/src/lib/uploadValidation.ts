export type UploadCategory = "image-only" | "docs-and-images" | "general";

export type UploadValidationResult = {
  valid: boolean;
  reason?: string;
  isImage?: boolean;
};

const DISALLOWED_EXTENSIONS = new Set([
  "html", "htm", "shtml", "xhtml", "php", "phtml", "php3", "php4", "php5", "phps",
  "js", "jsx", "ts", "tsx", "cjs", "mjs", "exe", "dll", "so", "dylib", "bat",
  "cmd", "sh", "bash", "ps1", "vbs", "jar", "cgi", "pl", "py", "svg"
]);

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);
const DOC_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "txt", "csv"]);
const ARCHIVE_EXTENSIONS = new Set(["zip", "rar"]);

const isZipHeader = (buf: Buffer) =>
  buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;

const isMsCompoundBinaryFormat = (buf: Buffer) =>
  buf.length >= 8 &&
  buf[0] === 0xd0 &&
  buf[1] === 0xcf &&
  buf[2] === 0x11 &&
  buf[3] === 0xe0 &&
  buf[4] === 0xa1 &&
  buf[5] === 0xb1 &&
  buf[6] === 0x1a &&
  buf[7] === 0xe1;

const readUInt16LE = (buf: Buffer, offset: number) => buf.readUInt16LE(offset);
const readUInt32LE = (buf: Buffer, offset: number) => buf.readUInt32LE(offset);

const readZipEntries = (buf: Buffer): string[] | null => {
  // ZIP End Of Central Directory must be in the final 64KiB + fixed record.
  const lowerBound = Math.max(0, buf.length - 0x10016);
  let eocd = -1;
  for (let i = buf.length - 22; i >= lowerBound; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0 || eocd + 22 > buf.length) return null;

  const entryCount = readUInt16LE(buf, eocd + 10);
  const directorySize = readUInt32LE(buf, eocd + 12);
  const directoryOffset = readUInt32LE(buf, eocd + 16);
  if (entryCount === 0 || entryCount > 256 || directoryOffset + directorySize > buf.length) return null;

  const entries: string[] = [];
  let offset = directoryOffset;
  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== 0x02014b50) return null;
    const flags = readUInt16LE(buf, offset + 8);
    const compressedSize = readUInt32LE(buf, offset + 20);
    const uncompressedSize = readUInt32LE(buf, offset + 24);
    const nameLength = readUInt16LE(buf, offset + 28);
    const extraLength = readUInt16LE(buf, offset + 30);
    const commentLength = readUInt16LE(buf, offset + 32);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if ((flags & 0x1) !== 0 || next > buf.length || uncompressedSize > 25 * 1024 * 1024 || compressedSize > 25 * 1024 * 1024) return null;
    const name = buf.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (!name || name.includes("\\") || name.startsWith("/") || name.split("/").includes("..")) return null;
    entries.push(name);
    offset = next;
  }
  return entries;
};

export function validateUploadedBuffer(
  buffer: Buffer | Uint8Array,
  filename: string,
  declaredMimeType?: string,
  category: UploadCategory = "docs-and-images"
): UploadValidationResult {
  const name = String(filename ?? "").trim();
  const ext = (name.split(".").pop() || "").toLowerCase();

  if (!ext || DISALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, reason: `File type .${ext || "unknown"} is forbidden` };
  }

  if (category === "image-only") {
    if (!IMAGE_EXTENSIONS.has(ext)) {
      return { valid: false, reason: `Only image files (.png, .jpg, .jpeg, .gif, .webp) are allowed` };
    }
  } else if (category === "docs-and-images") {
    if (!IMAGE_EXTENSIONS.has(ext) && !DOC_EXTENSIONS.has(ext)) {
      return { valid: false, reason: `File extension .${ext} is not allowed` };
    }
  } else {
    // general
    if (!IMAGE_EXTENSIONS.has(ext) && !DOC_EXTENSIONS.has(ext) && !ARCHIVE_EXTENSIONS.has(ext)) {
      return { valid: false, reason: `File extension .${ext} is not allowed` };
    }
  }

  const buf = Buffer.from(buffer);
  if (buf.length === 0) {
    return { valid: false, reason: "Empty file payload" };
  }

  // Active content scan for text/HTML/JS payload in disguised files
  const textHead = buf.subarray(0, 2048).toString("utf-8").toLowerCase();
  if (
    textHead.includes("<script") ||
    textHead.includes("javascript:") ||
    textHead.includes("onload=") ||
    textHead.includes("onerror=") ||
    textHead.includes("<?php") ||
    textHead.includes("<!doctype html") ||
    textHead.includes("<html") ||
    textHead.includes("<svg")
  ) {
    return { valid: false, reason: "File contains active content or HTML/script tags" };
  }

  // Check magic bytes for images
  if (ext === "png") {
    const isPng = buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    if (!isPng) return { valid: false, reason: "Invalid PNG file signature" };
    return { valid: true, isImage: true };
  }

  if (ext === "jpg" || ext === "jpeg") {
    const isJpeg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    if (!isJpeg) return { valid: false, reason: "Invalid JPEG file signature" };
    return { valid: true, isImage: true };
  }

  if (ext === "gif") {
    const isGif = buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "GIF8";
    if (!isGif) return { valid: false, reason: "Invalid GIF file signature" };
    return { valid: true, isImage: true };
  }

  if (ext === "webp") {
    const isRiff = buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
    if (!isRiff) return { valid: false, reason: "Invalid WebP file signature" };
    return { valid: true, isImage: true };
  }

  // PDF Validation
  if (ext === "pdf") {
    const isPdf = buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-";
    if (!isPdf) return { valid: false, reason: "Invalid PDF file signature" };
    return { valid: true, isImage: false };
  }

  // DOCX OpenXML Zip validation
  if (ext === "docx") {
    if (!isZipHeader(buf)) {
      return { valid: false, reason: "Invalid DOCX file container signature" };
    }
    const entries = readZipEntries(buf);
    if (!entries?.includes("[Content_Types].xml") || !entries.includes("word/document.xml")) {
      return { valid: false, reason: "Invalid DOCX archive structure: missing Word OpenXML markers" };
    }
    return { valid: true, isImage: false };
  }

  // XLSX OpenXML Zip validation
  if (ext === "xlsx") {
    if (!isZipHeader(buf)) {
      return { valid: false, reason: "Invalid XLSX file container signature" };
    }
    const entries = readZipEntries(buf);
    if (!entries?.includes("[Content_Types].xml") || !entries.includes("xl/workbook.xml")) {
      return { valid: false, reason: "Invalid XLSX archive structure: missing Excel OpenXML markers" };
    }
    return { valid: true, isImage: false };
  }

  // Legacy MS Office binary (.doc / .xls)
  if (ext === "doc" || ext === "xls") {
    if (!isMsCompoundBinaryFormat(buf)) {
      return { valid: false, reason: `Invalid legacy .${ext} binary compound format signature` };
    }
    return { valid: true, isImage: false };
  }

  // Text & CSV validation: Bounded text without binary NUL bytes
  if (ext === "txt" || ext === "csv") {
    for (let i = 0; i < Math.min(buf.length, 1024); i++) {
      if (buf[i] === 0x00) {
        return { valid: false, reason: "Text/CSV files cannot contain binary NUL bytes" };
      }
    }
    return { valid: true, isImage: false };
  }

  // Archive files (zip / rar)
  if (ext === "zip") {
    if (!isZipHeader(buf) || !readZipEntries(buf)) {
      return { valid: false, reason: "Invalid ZIP archive signature" };
    }
    return { valid: true, isImage: false };
  }

  if (ext === "rar") {
    const isRar = buf.length >= 7 && buf.subarray(0, 7).toString("ascii").startsWith("Rar!");
    if (!isRar) {
      return { valid: false, reason: "Invalid RAR archive signature" };
    }
    return { valid: true, isImage: false };
  }

  // Executable signature check for all files (PE/ELF/Mach-O)
  if (buf.length >= 2 && buf[0] === 0x4d && buf[1] === 0x5a) {
    return { valid: false, reason: "Executable files are forbidden" };
  }
  if (buf.length >= 4 && buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46) {
    return { valid: false, reason: "Binary ELF executables are forbidden" };
  }

  return { valid: true, isImage: false };
}
