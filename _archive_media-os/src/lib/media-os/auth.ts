import { timingSafeEqual } from "node:crypto";

export function isStudioEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.MEDIA_OS_STUDIO_ENABLED?.trim() === "true";
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function decodeBasicCredentials(value: string): { username: string; password: string } | null {
  if (!/^Basic\s+/i.test(value)) return null;
  try {
    const decoded = Buffer.from(value.replace(/^Basic\s+/i, "").trim(), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 1) return null;
    return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch (error) {
    console.error("[media-os-auth] invalid Basic authorization header", error);
    return null;
  }
}

export function isAuthorizationHeaderValid(value: string | null): boolean {
  if (!value) return false;

  const bearerToken = process.env.MEDIA_OS_ADMIN_TOKEN?.trim();
  if (/^Bearer\s+/i.test(value) && bearerToken) {
    return safeEqual(value.replace(/^Bearer\s+/i, "").trim(), bearerToken);
  }

  const username = process.env.MEDIA_OS_BASIC_AUTH_USER?.trim();
  const password = process.env.MEDIA_OS_BASIC_AUTH_PASSWORD?.trim();
  const provided = decodeBasicCredentials(value);
  if (!username || !password || !provided) return false;
  return safeEqual(provided.username, username) && safeEqual(provided.password, password);
}

export function isProductionAuthConfigured(): boolean {
  const bearerConfigured = Boolean(process.env.MEDIA_OS_ADMIN_TOKEN?.trim());
  const basicConfigured = Boolean(
    process.env.MEDIA_OS_BASIC_AUTH_USER?.trim()
    && process.env.MEDIA_OS_BASIC_AUTH_PASSWORD?.trim(),
  );
  return bearerConfigured || basicConfigured;
}

export function isAuthorizedRequest(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return isProductionAuthConfigured()
    && isAuthorizationHeaderValid(request.headers.get("authorization"));
}
