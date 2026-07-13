export type UnsupportedDemoClaim =
  | "asset_provenance"
  | "operations"
  | "product_detail"

const ASSET_PROVENANCE = /(公式素材|権利確認済み|official (?:photo|image|asset)|rights[- ]cleared)/iu
const OPERATIONS = /(?:予約.{0,16}(?:不要|なし|受け付|承|可能|できます)|(?:DM|ダイレクトメッセージ).{0,24}(?:受付|承|予約|問い合わせ|返信)|(?:翌営業日|当日|24時間以内).{0,20}(?:返信|返答|対応))/u
const PRODUCT_DETAIL = /(?:外は.{0,20}(?:中は|ふわ|しっとり)|一杯ずつ|ハンドドリップ|豆本来|卵と牛乳|焼き加減|素材の配合|厳選素材|厳選した素材|自家製|香り高い|口当たり|季節の食材)/u

export function findUnsupportedDemoClaims(copy: string, verifiedFacts: string): UnsupportedDemoClaim[] {
  const claims: UnsupportedDemoClaim[] = []
  if (ASSET_PROVENANCE.test(copy) && !ASSET_PROVENANCE.test(verifiedFacts)) claims.push("asset_provenance")
  if (OPERATIONS.test(copy) && !/(予約|DM|ダイレクトメッセージ|返信|返答|翌営業日|24時間以内)/u.test(verifiedFacts)) claims.push("operations")
  if (PRODUCT_DETAIL.test(copy) && !PRODUCT_DETAIL.test(verifiedFacts)) claims.push("product_detail")
  return claims
}

export function groundDemoText(value: string | undefined, verifiedFacts: string, fallback: string): string {
  const text = value?.trim()
  if (!text || findUnsupportedDemoClaims(text, verifiedFacts).length > 0) return fallback
  return text
}
