interface ManualWorkReasonRule {
  patterns: readonly string[]
  copy: string
}

const REASON_RULES: readonly ManualWorkReasonRule[] = [
  {
    patterns: ["country is unconfirmed", "country remains unconfirmed"],
    copy: "企業の所在国を公開情報から確定できませんでした。",
  },
  {
    patterns: ["japanese companies are excluded", "japanese companies are outside"],
    copy: "日本企業のため、海外SMB向けJapan Entry Packageの対象外です。",
  },
  {
    patterns: ["outside the overseas smb scope"],
    copy: "公開情報から海外SMBの対象条件を満たす企業と確認できませんでした。",
  },
  {
    patterns: ["smb classification needs review"],
    copy: "企業規模を海外SMBと判断する公開根拠が不足しています。",
  },
  {
    patterns: ["outside the current japan entry offer scope"],
    copy: "現在のJapan Entry Packageで支援できる事業条件の対象外です。",
  },
  {
    patterns: ["japan entry fit needs review"],
    copy: "日本進出との適合性を判断する公開根拠が不足しています。",
  },
  {
    patterns: [
      "a high-confidence public form was not verified",
      "a verified public form was not found",
      "verified public form was not found",
    ],
    copy: "入力・本文・送信操作を備えた有効な公開問い合わせフォームを確認できませんでした。",
  },
  {
    patterns: [
      "the initial message did not pass the production quality gate",
      "initial message generation failed",
      "no draft passed the production quality gate",
      "unsupported causal inference",
      "grounded product evidence is missing",
    ],
    copy: "初回文面が事実確認・企業固有性・安全性の品質基準を通過しませんでした。",
  },
  {
    patterns: ["saved analysis artifacts require operator review"],
    copy: "保存済み解析に、人による対象判定または送信可否の確認が必要です。",
  },
  {
    patterns: ["no public pages were available", "homepage evidence could not be reused"],
    copy: "企業サイトの公開ページを取得できず、企業情報の監査を完了できませんでした。",
  },
  {
    patterns: ["homepage returned http"],
    copy: "企業サイトのトップページが正常なHTMLを返しませんでした。",
  },
  {
    patterns: ["timed out", "fetch failed", "temporarily unavailable"],
    copy: "企業サイトまたは連携先から時間内に応答がなく、自動処理を完了できませんでした。",
  },
  {
    patterns: ["twenty", "owned twenty company", "read-back"],
    copy: "自動再試行後もTwentyへの保存または保存内容の読み戻し確認を完了できませんでした。",
  },
] as const

function unique(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) === index)
}

function safeJapaneseRejectionReason(value: string): string | null {
  const match = value.trim().match(/^対象外:\s*(.+)$/u)
  if (!match?.[1] || /https?:\/\//iu.test(match[1])) return null
  return `${match[1].trim().slice(0, 240)}。`.replace(/。。$/u, "。")
}

export function manualWorkReasonCopies(
  input: string | null | undefined | readonly string[],
): string[] {
  const values = Array.isArray(input) ? input : input ? [input] : []
  const copies = values.flatMap((value) => {
    const normalized = value.toLowerCase()
    const matched = REASON_RULES
      .filter((rule) => rule.patterns.some((pattern) => normalized.includes(pattern)))
      .map((rule) => rule.copy)
    const rejectionReason = safeJapaneseRejectionReason(value)
    return rejectionReason ? [rejectionReason, ...matched] : matched
  })
  return unique(copies)
}

export function manualWorkReviewReasonCopies(reasons: readonly string[]): string[] {
  const localized = manualWorkReasonCopies(reasons)
  if (localized.length > 0) return localized
  return reasons.length > 0
    ? ["解析結果に追加確認が必要ですが、安全に表示できる詳細理由を取得できませんでした。"]
    : []
}
