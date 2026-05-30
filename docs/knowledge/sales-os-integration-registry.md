# Sales OS API / OSS 接続台帳

この台帳は `src/lib/sales/integration-registry.ts` が正本です。環境変数の実値は表示せず、設定済みの変数名、不足している変数名、残量確認方式だけを `/api/sales/integration-status` と営業ダッシュボードの「統合」タブに出します。

## 優先接続

- Dify Cloud: 文面生成、痛み診断、テンプレート選定。クラウド版を使う。
- DataForSEO: SEO、SERP、OnPage、Lighthouse系の有料分析。`live=1` で user_data 取得を試みる。
- Google Places: MEO、所在地、口コミ、カテゴリ情報。
- Apollo / Fumadata / BIZMap / gBizInfo / 法人番号 / jGrants: リスト収集と企業正規化。
- Browserless / Crawlee / Crawl4AI / Playwright Stealth / Camoufox: フォーム探索とブラウザ検証。ただしCAPTCHAやCloudflare Challengeの回避目的には使わない。
- Wappalyzer / webanalyze: 技術スタック検出。内蔵検出に加え、必要ならworker側でCLI化する。
- Slidev / Gotenberg / Astro / Remotion / HyperFrames / ComfyUI / R2: 診断レポート、資料、デモサイト、営業動画の生成。
- Cal.com / Docuseal: 商談予約と契約。成約後ハンドオフに接続する。
- DataImpulse / IPRoyal: クロール用プロキシ。残量は管理画面または各社APIで確認する。

## 残量確認

本番で残量を見たい場合:

```bash
GET /api/sales/integration-status?live=1
```

このAPIは管理者認証または `x-webhook-secret` が必要です。DataForSEOとBrowserlessは自動チェックを試み、それ以外は管理画面確認として `manual` 表示にします。

## フォーム自動化ガード

フォーム営業は、送信前に必ず分類とpreflightを通します。次の検出が出たら自動送信しません。

- Google reCAPTCHA
- hCaptcha
- Cloudflare Turnstile
- Cloudflare Challenge / `cdn-cgi/challenge-platform`
- DataDome / PerimeterX / Arkose / FunCaptcha / BotDetect
- ログイン必須フォーム
- 決済フォーム

これらは `risky_captcha` または unsafe classification として扱い、Appsmith向けの `sales_operator_queue_items` に入り、人間主導の確認へ切り替えます。プロキシやCamoufoxは検証補助であり、CAPTCHA回避や規約回避には使いません。
