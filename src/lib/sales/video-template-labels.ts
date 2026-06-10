export function videoLabels(locale: string) {
  const ja = locale === "ja"
  return {
    eyebrow: ja ? "公開データ診断" : "Public evidence brief",
    evidence: ja ? "見つかった根拠" : "Evidence found",
    coverage: ja ? "取得データ率" : "Data coverage",
    current: ja ? "現在" : "Current",
    target: ja ? "改善目安" : "Target",
    loss: ja ? "推定機会損失" : "Estimated leakage",
    monthly: ja ? "月間目安" : "Monthly estimate",
    annual: ja ? "年間換算" : "Annualized",
    demo: ja ? "改善後の見え方" : "Replacement demo",
    proof: ja ? "判断材料" : "Proof",
    cta: ja ? "次の一手" : "Next action",
    generated: ja ? "診断レポートから自動生成" : "Generated from the diagnostic report",
    report: ja ? "詳細レポート" : "Report",
    booking: ja ? "相談予約" : "Booking",
    scenes: ja ? ["異変", "根拠", "損失", "未来", "実行"] : ["Tension", "Evidence", "Leakage", "Future", "Action"],
    defaultHook: ja ? "訪問者が離脱する前に、どこで迷い、何を直すべきかを短く見える化します。" : "A focused view of where visitors hesitate and what to fix first.",
    defaultPain: ja ? "検索、SNS、フォーム、表示速度の公開シグナルから、予約や問い合わせの手前で摩擦が起きている箇所を特定しました。" : "Search, social, form, and speed signals show where buyers may hesitate.",
    defaultFear: ja ? "放置すると、小さな摩擦が毎月の機会損失として積み上がります。" : "Left alone, small points of friction compound into monthly leakage.",
    defaultHope: ja ? "信頼材料、導線、初回表示体験を整えると、訪問者は迷わず次の行動へ進めます。" : "Clear proof, a shorter path, and a better first view can reduce drop-off.",
    defaultCta: ja ? "詳細レポートと改善デモを見ながら、最初に直す優先順位を決めましょう。" : "Review the report and demo, then confirm the next priorities.",
  }
}
