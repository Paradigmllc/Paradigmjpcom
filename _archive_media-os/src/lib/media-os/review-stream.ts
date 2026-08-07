import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

export type ByteRange = { start: number; end: number };

export function parseByteRange(value: string | null, size: number): ByteRange | null | "invalid" {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2]) || size <= 0) return "invalid";
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return "invalid";
    return { start: Math.max(0, size - suffixLength), end: size - 1 };
  }
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0 || start >= size || requestedEnd < start) {
    return "invalid";
  }
  return { start, end: Math.min(requestedEnd, size - 1) };
}

export async function streamReviewFile(
  path: string,
  filename: string,
  rangeHeader: string | null,
  headOnly: boolean,
): Promise<Response> {
  const file = await stat(path);
  if (!file.isFile()) return Response.json({ ok: false, error: "Review video not found" }, { status: 404 });
  const range = parseByteRange(rangeHeader, file.size);
  if (range === "invalid") return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${file.size}` } });
  const start = range?.start ?? 0;
  const end = range?.end ?? file.size - 1;
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": `inline; filename="${filename}"`,
    "Content-Length": String(end - start + 1),
    "Content-Type": "video/mp4",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });
  if (range) headers.set("Content-Range", `bytes ${start}-${end}/${file.size}`);
  if (headOnly) return new Response(null, { status: range ? 206 : 200, headers });
  const body = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream<Uint8Array>;
  return new Response(body, { status: range ? 206 : 200, headers });
}
