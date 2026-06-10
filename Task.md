## ACTIVE HANDOFF — 2026-06-10 HyperFrames Modernization + Demo Video Route

### 直近完了 (2026-06-10)
- **HyperFrames report video studio 全面モダナイズ**: 全10項目修正 → push → deploy (Coolify `running:healthy`)
  - `test-video/hyperframes.json`: schema/registry URL → `hyperframes.ai`
  - `video-templates.ts`: data-hf-frameworks除去, track-index衝突解消 (0~8), クロスフェードトランジション, 最終シーンのみexit, width:100%
  - `video-template-three.ts`: Three.js背景をレスポンシブ化 (`getBoundingClientRect`)
  - `test-video/index.html`: 静的コンポジションを最新HFパターンにリライト
  - `ReportHyperFramesPlayer.tsx`: `@hyperframes/player` v0.6.88 import修正
  - `video-generator.ts`: 不要な`{{placeholder}}`置換除去, registry URL更新
  - Docker群: イメージ `0.6.87`→`0.6.88`, Node 24→22.12.0
  - `render/route.ts`, `render-video-hyperframes.mjs`: CLI引数モダナイズ
- **Demo video route 新設**: `src/app/[locale]/report/demo/[variant]/video/route.ts`
  - `/en/report/demo/video_subscription/video` → 200 OK (従来は404)
  - `?mobile=1` でポートレートフォーマット対応

### 監査ステータス
全36件修正完了。詳細: [docs/refactor/audit-2026-06-10.md](docs/refactor/audit-2026-06-10.md)

### 残る長期課題
- 🔵 CI/CD pipeline不在 (`.github/workflows/` 未作成)
- 🔵 DB自動バックアップ不在 (全PostgreSQL)
- 🔵 Docker Composeネットワーク分断 (4つに分離)
- 🔵 OSINTサービス Runtimeインストール (Dockerfile化すべき)
- 🔵 通知のベルUI未実装 (DBに書き込むのみ)
- 🔵 コードスプリッティング未導入 (全dashboard bundle一体)

### Visual Evidence / Variant Screenshots (完了)
全8 variant対応。詳細: [docs/refactor/audit-2026-06-10.md](docs/refactor/audit-2026-06-10.md)

### コンテンツ充実化 (完了)
seed-pricing/faqs/posts API, ProcessBand, 料金FAQ, 12ロケールi18n, サイトマップ, JSON-LD 10ページ

### シード実行方法
```
POST /api/admin/seed-pricing  { confirm: true }
POST /api/admin/seed-faqs     { confirm: true }
POST /api/admin/seed-posts    { confirm: true }
POST /api/admin/seed-blog     { confirm: true }
POST /api/admin/seed-services { confirm: true }
```

### 2026-06-10 Mobile Video Follow-up
- Mobile diagnostic video iframe now requests portrait `?mobile=1`, permits picture-in-picture, and passes inline playback through the HyperFrames host. TypeScript pre-check and context audit pass before deploy.
- Deploy retry exposed missing non-English i18n keys during static generation; `src/i18n/request.ts` now deep-merges English messages as the fallback. Local build reached 299/299 static pages; final Windows-only standalone mkdir path issue remains local-environment specific.
