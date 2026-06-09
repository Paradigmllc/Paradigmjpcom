# Task.md

## CODEX UPDATE - 2026-06-09 動画リッチ化 + レポート強化

### 日本参入レポート テンプレート強化
- Japan Entry template: dark navy gradient + 4 metric cards (Cloudflare Radar/SimilarWeb/etc) + 6-item checklist + 3-phase roadmap with time estimates
- **Bug fix**: variant-specific sections (japan_market/meo_map/security_scorecard 等) が exclusion filter でレンダリング除外されていた → 修正
- 全8 variant × 6 業種でセクション表示確認

### 動画埋め込み（60秒診断動画）
- **iframe → 直接inline埋め込み**: レポート開くだけで動画自動再生（GSAP auto-play）
- **スライドショー→Bento Grid + Glassmorphism**: 3シーンのBentoグリッド（カードUI + SVGアイコン + バーチャート + KPIカウントアップ + グラスモーフィズム背景）
- **空間移動型カメラ**: 300vw×300vh の巨大キャンバス上に全Bentoグリッドを事前配置、GSAPでカメラ（universe transform）が移動
- **レスポンシブ**: 固定1920×1080→全要素vw単位、`width=device-width` viewport、iframeサイズに自動適応
- video route (`route.ts`): React VideoPlayer → 直接HyperFrames HTML返却。demo slugs は `buildDemoData()` + `fallbackScript()` でDB/API不要

### Difyチャットボット
- レポートページの旧Dify埋め込みスクリプト+独自ボタンを削除
- サイト共通 `DifyChatbot`（i18n `messages/{ja,en}.json` chatbot.* 10 keys）がレポートページにも出現
- `DifyChatbot.tsx` の `/report/` 除外条件を削除

### デプロイパイプライン
- 最終手段: SSH → Docker container 停止 → tar pipe で `.next` 差し替え → restart → health check
- `deploy5.sh`: extract to `/app/.next-new` → mv swap → restart（symlink衝突回避）

### ファイル肥大化状態
| File | Lines | 制限 |
|------|-------|------|
| DiagnosticReport.tsx | 1539 | 500 ⚠️ |
| video-templates.ts | 206 | OK |
| demo-data.ts | 273 | OK |
| DifyChatbot.tsx | 428 | OK |
| Task.md | 163→ | →120 ✅ |

## ACTIVE HANDOFF
- DiagnosticReport.tsx 1539行（制限3倍超）→ 要分割
- 動画はBento Grid + Glassmorphism + データ可視化に改善済み（デプロイ待ち）
- 日本参入レポート全3セクション（market / checklist / roadmap）レンダリング確認済み

## NEXT ACTIONS
- DiagnosticReport.tsx 分割（1539行 → 各~300行に）
- HyperFrames MP4レンダリングパイプライン（Chrome+FFmpeg Docker環境）
- 動画品質のブラウザ実確認（Bento Grid表示 + カメラ移動 + データ可視化アニメーション）

## RISKS
- DiagnosticReport.tsx 肥大化によりコンパイル遅延・メンテナンス困難
- Droplet OOM警戒（8GB, Next.jsビルドが3GB消費）
- 動画のブラウザ実確認が未実施（真っ暗問題は universe centering 修正で対処済みだが要確認）
