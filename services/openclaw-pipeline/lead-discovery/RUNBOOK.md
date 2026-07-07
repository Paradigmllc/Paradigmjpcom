# RUNBOOK — Lead Discovery Pipeline v2

> 運用手順書。異常時対応、定期メンテナンス、デプロイ手順を網羅。

---

## 目次

1. [アーキテクチャ概要](#1-アーキテクチャ概要)
2. [日常運用コマンド](#2-日常運用コマンド)
3. [デプロイ手順](#3-デプロイ手順)
4. [監視とヘルスチェック](#4-監視とヘルスチェック)
5. [トラブルシューティング](#5-トラブルシューティング)
6. [データ管理](#6-データ管理)
7. [障害対応](#7-障害対応)
8. [参考リンク](#8-参考リンク)

---

## 1. アーキテクチャ概要

```
Host (paradigm-prod-01)
└── Docker: outbound-webhook (コンテナ)
    ├── パイプライン: /app/openclaw-pipeline/lead-discovery-v2
    │   ├── scripts/mega-orchestrator-v3.js  ← メイン実行エントリ
    │   ├── lib/scanner-v3.js                 ← Wappalyzer統合スキャナ
    │   ├── lib/urlscan.js                    ← urlscan.io連携
    │   ├── lib/diagnosis-report.js           ← 診断レポート生成
    │   └── lib/crawl4ai-proxy.js             ← Crawl4AI連携
    ├── 環境変数: DEEPSEEK_API_KEY, TWENTY_API_KEY, SUPABASE_SERVICE_ROLE_KEY
    └── ポート: 3100 (webhook)
```

**データフロー**:
```
リード発掘 → スキャン(scanner-v3) → urlscan.io(スクリーンショット)
  → 診断レポート生成(diagnosis-report + template) → ファイル保存
  → (オプション) Crawl4AI詳細解析 → CRM同期
```

**データ保存先**:
- レポート: `data/reports/` (自己完結型HTML)
- スクリーンショット: `data/screenshots/`
- urlscan.ioキャッシュ: `data/urlscan/`
- Wappalyzerキャッシュ: `data/wappalyzer-cache/`

---

## 2. 日常運用コマンド

### 2.1 パイプライン実行

**v3パイプライン（推奨）:**
```bash
docker exec -w /app/openclaw-pipeline/lead-discovery-v2 outbound-webhook \
  node scripts/mega-orchestrator-v3.js \
  --country JP --industry construction --limit 3 --diagnose
```

**v2互換パイプライン:**
```bash
docker exec -w /app/openclaw-pipeline/lead-discovery-v2 outbound-webhook \
  node scripts/mega-orchestrator.js \
  --industry construction --limit 3 --diagnose --crm-sync
```

**パラメータ一覧:**

| パラメータ | 値 | 説明 |
|-----------|-----|------|
| `--country` | JP / US / TR | ターゲット国 |
| `--industry` | construction / restaurant / salon / clinic / retail | 業種 |
| `--limit` | 数字 (1-50) | 取得リード数 |
| `--diagnose` | (フラグ) | 診断レポート生成を有効化 |
| `--crm-sync` | (フラグ) | Twenty CRM同期を有効化 |
| `--quick` | (フラグ) | クイックモード（スキャン簡略化） |
| `--resume` | (フラグ) | 中断から再開 |
| `--dry-run` | (フラグ) | ドライラン（実行せず出力確認） |
| `--test` | (フラグ) | テストモード |

### 2.2 npm scripts (コンテナ内)

```bash
# 全チェーン実行
npm run orchestrator:v3            # mega-orchestrator-v3.js (デフォルト)
npm run orchestrator:v3:test       # テストモード実行
npm run verify                     # モジュール検証
npm run health                     # ヘルスチェック
npm run deploy                     # デプロイ同期
```

### 2.3 レポート確認

**レポート一覧:**
```bash
ls -la /app/openclaw-pipeline/lead-discovery-v2/data/reports/
```

**レポートサーバー起動（開発用）:**
```bash
node scripts/report-server.js --port 3101
```

---

## 3. デプロイ手順

### 3.1 コード更新 → コンテナ反映

**通常デプロイ（コードのみ）:**
```bash
# ホストから実行
bash /app/openclaw-pipeline/lead-discovery-v2/scripts/deploy.sh
```

**フルデプロイ（npm install含む）:**
```bash
bash /app/openclaw-pipeline/lead-discovery-v2/scripts/deploy.sh --full
```

**処理内容:**
1. `lib/` 全ファイル → コンテナ内に tar 転送
2. `scripts/` 全ファイル → コンテナ内に tar 転送
3. `sources/` 全ファイル → コンテナ内に tar 転送
4. `package.json` → docker cp
5. （--full時）`npm install` 実行
6. モジュール検証（全v3モジュールのロード確認）

### 3.2 初回セットアップ

```bash
# コンテナ内で依存関係インストール
docker exec outbound-webhook pip3 install crawl4ai --break-system-packages
docker exec -w /app/openclaw-pipeline/lead-discovery-v2 outbound-webhook npm install

# データディレクトリ作成
mkdir -p /app/openclaw-pipeline/lead-discovery-v2/data/{reports,screenshots,urlscan,scan-cache,wappalyzer-cache,crawl4ai,czds,nic-tr-cache,pipeline}
```

### 3.3 コンテナ再起動後

コンテナ再起動後は以下の再インストールが必要:
```bash
docker exec outbound-webhook bash -c "
  pip3 install crawl4ai --break-system-packages
  cd /app/openclaw-pipeline/lead-discovery-v2 && npm install
"
```

---

## 4. 監視とヘルスチェック

### 4.1 ヘルスチェック

```bash
# コンテナ内で実行
docker exec -w /app/openclaw-pipeline/lead-discovery-v2 outbound-webhook \
  node scripts/health-check.js

# JSON出力
docker exec -w /app/openclaw-pipeline/lead-discovery-v2 outbound-webhook \
  node scripts/health-check.js --json

# クイックチェック（外部呼び出しなし）
docker exec -w /app/openclaw-pipeline/lead-discovery-v2 outbound-webhook \
  node scripts/health-check.js --quick
```

**チェック項目:**
- Node.js バージョン
- データディレクトリ存在確認
- レポート数/スクリーンショット数
- npm依存パッケージ（wappalyzer, node-fetch等）
- Python/Crawl4AI バージョン
- urlscan.io API到達性
- DEEPSEEK/TWENTY/SUPABASE 環境変数

### 4.2 モニタリング指標

| 指標 | 正常範囲 | アラート条件 |
|------|---------|------------|
| パイプライン実行時間 | < 5分 | > 10分 |
| urlscan.io API応答 | < 3秒 | タイムアウト/5xx |
| レポート生成時間 | < 30秒/件 | > 2分/件 |
| Wappalyzer可用性 | true | フォールバック検出 |
| ディスク使用量(data/) | < 1GB | > 5GB |

---

## 5. トラブルシューティング

### 5.1 Wappalyzerが動かない

**症状**: scanner-v3.js がWappalyzerを使わずHTML正規表現にフォールバック

**原因1**: Wappalyzer未インストール
```bash
# 確認
docker exec -w /app/openclaw-pipeline/lead-discovery-v2 outbound-webhook \
  node -e "try{require('wappalyzer');console.log('OK')}catch(e){console.log('MISSING')}"

# 対処
docker exec -w /app/openclaw-pipeline/lead-discovery-v2 outbound-webhook npm install
```

**原因2**: Wappalyzer v7非推奨警告
```
This package is no longer being maintained. Please use the API at https://www.wappalyzer.com/api instead.
```
→ 上記は警告メッセージのみ。機能自体は継続利用可能。
→ 将来対応: Wappalyzer Cloud APIに移行

### 5.2 urlscan.ioタイムアウト

**症状**: スキャンが完了しない / 429制限

**原因**: レート制限 (無料枠: 1req/sec)
```bash
# キャッシュクリア
rm -rf /app/openclaw-pipeline/lead-discovery-v2/data/urlscan/
```

**対処**: scanner-v3.js は自動的に1req/secのレート制限を守る設計になっている。
キャッシュ(`data/urlscan/`)が24時間有効なので、同じドメインの再スキャンはキャッシュから返す。

### 5.3 Crawl4AIが動かない

**症状**: `crawl4ai: ❌ not installed`

```bash
# 再インストール
docker exec outbound-webhook python3 -m pip install crawl4ai --break-system-packages
```

Crawl4AI未インストール時はscanner-v3.jsが自動的にフォールバックするので、
パイプライン自体は停止しない。

### 5.4 業種フィルターの偽陽性

**既知の問題**: ドメイン名キーワードマッチのみのため、Webexが建設業、IMDBが飲食店にヒットする

**暫定対処**: 手動で結果を確認し、誤検出を除外

**恒久対応（未実装）**: WebサイトのHTMLコンテンツ分析ベースに移行

### 5.5 Twenty CRM同期エラー

**症状**: `--crm-sync` 実行時にTwenty APIエラー

```bash
# 環境変数確認
docker exec outbound-webhook env | grep TWENTY

# トークン有効期限確認 (現在の有効期限: 4935349511 = 2126年まで有効)
```

---

## 6. データ管理

### 6.1 レポートクリーンアップ

```bash
# 古いレポートを削除（7日以上前）
find /app/openclaw-pipeline/lead-discovery-v2/data/reports/ -name '*.html' -mtime +7 -delete

# 全キャッシュクリア
rm -rf /app/openclaw-pipeline/lead-discovery-v2/data/urlscan/*
rm -rf /app/openclaw-pipeline/lead-discovery-v2/data/wappalyzer-cache/*
rm -rf /app/openclaw-pipeline/lead-discovery-v2/data/scan-cache/*
```

### 6.2 バックアップ

レポートは自己完結型HTML（外部依存ゼロ）で保存されるため、
ファイル自体を保存すれば完全なバックアップになる。

```bash
# レポートをバックアップ
tar czf /tmp/reports-backup-$(date +%Y%m%d).tar.gz \
  -C /app/openclaw-pipeline/lead-discovery-v2/data/reports/ .
```

### 6.3 ディスク使用量監視

```bash
du -sh /app/openclaw-pipeline/lead-discovery-v2/data/
```

---

## 7. 障害対応

### 7.1 コンテナダウン

```bash
# コンテナ状態確認
docker ps | grep outbound-webhook

# 再起動
docker restart outbound-webhook

# ログ確認
docker logs outbound-webhook --tail 100

# 復旧後、依存関係再インストール
docker exec -w /app/openclaw-pipeline/lead-discovery-v2 outbound-webhook npm install
docker exec outbound-webhook python3 -m pip install crawl4ai --break-system-packages
```

### 7.2 パイプラインが途中で止まった

```bash
# 再開（--resume フラグ）
docker exec -w /app/openclaw-pipeline/lead-discovery-v2 outbound-webhook \
  node scripts/mega-orchestrator-v3.js --resume

# パイプライン状態確認
cat /app/openclaw-pipeline/lead-discovery-v2/data/pipeline/*.json 2>/dev/null
```

### 7.3 ホストのディスク容量不足

```bash
# レポート以外のキャッシュをクリア
rm -rf /app/openclaw-pipeline/lead-discovery-v2/data/urlscan/*
rm -rf /app/openclaw-pipeline/lead-discovery-v2/data/crawl4ai/*
rm -rf /app/openclaw-pipeline/lead-discovery-v2/data/scan-cache/*

# 古いリードデータ削除（JSON/CSV）
find /app/openclaw-pipeline/lead-discovery-v2/data/ -name 'leads-*.json' -mtime +3 -delete
find /app/openclaw-pipeline/lead-discovery-v2/data/ -name 'leads-*.csv' -mtime +3 -delete
```

---

## 8. 参考リンク

| リソース | 場所 |
|---------|------|
| コード | `/app/openclaw-pipeline/lead-discovery-v2/` |
| アーキテクチャ | `ARCHITECTURE.md` |
| スキル定義 | `~/.openclaw/workspace/skills/pipeline-executor/SKILL.md` |
| ラーニング | `memory/learnings.md` |
| デイリーログ | `memory/YYYY-MM-DD.md` |
| 長期記憶 | `MEMORY.md` |
| urlscan.io | https://urlscan.io |
| Twenty CRM | https://twenty.paradigmjp.com |
| DeepSeek | https://platform.deepseek.com |
| Wappalyzer | https://www.wappalyzer.com |

---

## Appendix: Quick Reference Card

```bash
# 🚀 パイプライン実行（v3）
deploy && docker exec -w /app/openclaw-pipeline/lead-discovery-v2 outbound-webhook \
  node scripts/mega-orchestrator-v3.js --country JP --industry construction --limit 5 --diagnose

# 🔄 コード更新
bash /app/openclaw-pipeline/lead-discovery-v2/scripts/deploy.sh --full

# 🩺 ヘルスチェック
docker exec -w /app/openclaw-pipeline/lead-discovery-v2 outbound-webhook \
  node scripts/health-check.js

# 📋 レポート一覧
ls -la /app/openclaw-pipeline/lead-discovery-v2/data/reports/

# 🗑️ キャッシュクリア
rm -rf /app/openclaw-pipeline/lead-discovery-v2/data/urlscan/*

# 🐳 コンテナログ
docker logs outbound-webhook --tail 50 -f
```
