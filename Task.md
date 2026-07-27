# Paradigmjpcom Task

## CURRENT STATUS — 2026-07-28 Japan Country Partner本番反映完了

- PR **#565**を`main`へ統合し、英語サイトの主軸を **Your Japan Country Partner**、初期有料契約を **Japan Market Setup**、主CTAを **Apply for a Japan Partnership — $13K**、公開キャパシティ表記を **Limited founding-partner capacity**へ変更した。
- セットアップ費 **USD 13,000**、recorded Start Dateからの14営業日納品保証、選定パートナー向け6か月運用条件、month 7以降の既存条件は維持した。契約上の売上定義が未確定のため、20% revenue shareは公開していない。
- 関連Vitest **34件**、TypeScript、production build、Quality Guard **0 errors / 84 existing warnings**を通過した。
- Coolify deployment **bm4w5btityiz1814a8bh8xf7**は`finished`。初回は固定Traefikルートが旧Docker IPを向いて一時502となったが、旧IP解放後の制御された再デプロイサイクルで公開ルートを復旧した。
- 最終検証 **GitHub Actions run 30311462742**でホームページCMS seed **HTTP 200**、`/en` **HTTP 200**、新4文言すべてPASS、旧heroなし、`/api/ready` **HTTP 200**、認証済み`/api/sales/health` **HTTP 200 / ok:true / status:degraded**をread-backした。`degraded`は`ok:true`の範囲で、任意連携の未設定も含む状態。

## ACTIVE HANDOFF

- 公開サイトとコードのCountry Partner表記は一致している。
- 次の事業工程は、Japan Country Partner向けアウトバウンドの実行、返信処理、商談、提案書・MSA・SOW・請求書の即日発行。
- D2C、SaaS・AI、Web3を同じ文面で扱わず、対象別の適格性・規制・販売チャネル・報酬方式を案件単位で確定する。
- 売上シェアを提示する場合は、`Net Revenue`の定義、税・返品・返金・送料・モール手数料・広告費の扱い、契約期間、監査権を先に書面化する。

## RELEASE REFERENCES

- Implementation PR: #565
- Merge commit: `41c3e88f97d02e0bfd9357884ae3cc5a45c736b7`
- Detailed production proof: `docs/ops/releases/2026-07-28-japan-country-partner.md`
- Final verification run: `30311462742`
- 旧長期ログはGit履歴のcommit `861a4600bb2a576d710fc94e10f6bae3ad0afb21`以前から復元可能。
