import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import {
  CONTACT_CHALLENGE_MAX_AGE_MS,
  isValidContactSubmissionIdentity,
  issueContactChallenge,
} from "./contact-challenge"

export function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const isJapanese = (
    req.headers.get("x-contact-locale") ||
    req.headers.get("accept-language") ||
    "en"
  )
    .trim()
    .toLowerCase()
    .startsWith("ja")
  const submissionIdentity =
    req.headers.get("x-contact-submission-id")?.trim() ?? ""
  if (!isValidContactSubmissionIdentity(submissionIdentity)) {
    return NextResponse.json(
      {
        error: isJapanese
          ? "フォーム認証情報がありません。ページを再読み込みしてください。"
          : "A valid form submission identity is required. Reload the page.",
      },
      { status: 400 },
    )
  }
  const rateLimit = checkRateLimit({
    ip,
    key: "contact-challenge",
    max: 30,
    windowMs: 60_000,
  })
  if (!rateLimit.ok) {
    return NextResponse.json(
      {
        error: isJapanese
          ? "フォーム認証のリクエストが多すぎます。しばらくお待ちください。"
          : "Too many form verification requests. Please wait a moment.",
      },
      { status: 429, headers: { "Retry-After": "60" } },
    )
  }

  try {
    return NextResponse.json(
      {
        challenge: issueContactChallenge({
          clientIp: ip,
          submissionIdentity,
        }),
        expiresInMs: CONTACT_CHALLENGE_MAX_AGE_MS,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    )
  } catch (error) {
    console.error("[contact] Unable to issue form challenge:", error)
    return NextResponse.json(
      {
        error: isJapanese
          ? "フォーム認証を一時的に利用できません。"
          : "Form verification is temporarily unavailable.",
      },
      { status: 503 },
    )
  }
}
