import { createHmac, timingSafeEqual } from "node:crypto";
export function verifyShopifySignature(
  body: Buffer,
  signature: string | null,
  secret: string,
): boolean {
  if (!secret || !signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature))
    return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  const actual = Buffer.from(signature, "base64");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function readBoundedBody(
  request: Request,
  maximum = 2_000_000,
): Promise<Buffer> {
  if (Number(request.headers.get("content-length")) > maximum)
    throw new Error("body_too_large");
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximum) {
        await reader.cancel();
        throw new Error("body_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
