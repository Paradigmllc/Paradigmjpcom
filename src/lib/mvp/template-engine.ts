/**
 * 決定論的 placeholder substitution (mustache 風).
 *
 * B36-P3 致命問題 B-fix: LLM に placeholder 注入を任せるのではなく、
 * caller 側で {{var}} を deterministic に置換 → LLM は文体磨き専門にする.
 *
 * Hallucinated placeholder ({{company_name}} を生のまま出す) を構造的に防ぐ.
 */

export function renderTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>
): { rendered: string; missingKeys: string[] } {
  const missingKeys: string[] = [];
  const rendered = template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
    const val = vars[key as keyof typeof vars];
    if (val == null || val === "") {
      missingKeys.push(key);
      return "";
    }
    return String(val);
  });
  return { rendered, missingKeys };
}

/**
 * 法務 footer 強制 inject (特定電子メール法 / 個人情報保護法 最低線).
 */
export function appendLegalFooter(
  body: string,
  opts: {
    senderName: string;
    senderAddress: string;
    optoutUrl: string;
    privacyUrl: string;
    language: string;
  }
): string {
  const sep = "\n\n────────────────────\n";
  const footer = (() => {
    switch (opts.language) {
      case "ja":
        return `${sep}送信者: ${opts.senderName}\n所在地: ${opts.senderAddress}\n配信停止: ${opts.optoutUrl}\nプライバシーポリシー: ${opts.privacyUrl}\n本メッセージは弊社の自動診断システムによる情報提供のみを目的としており、購入意思の確認を行うものではございません。`;
      case "ko":
        return `${sep}발신자: ${opts.senderName}\n주소: ${opts.senderAddress}\n수신거부: ${opts.optoutUrl}\n프라이버시: ${opts.privacyUrl}`;
      case "zh":
        return `${sep}发送方: ${opts.senderName}\n地址: ${opts.senderAddress}\n退订: ${opts.optoutUrl}\n隐私政策: ${opts.privacyUrl}`;
      default:
        return `${sep}Sender: ${opts.senderName}\nAddress: ${opts.senderAddress}\nUnsubscribe: ${opts.optoutUrl}\nPrivacy: ${opts.privacyUrl}\nThis is an informational message from our automated diagnostic system, not a solicitation.`;
    }
  })();
  return body.trimEnd() + footer;
}
