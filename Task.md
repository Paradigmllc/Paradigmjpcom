## CURRENT STATUS - 2026-06-16 PayloadCMS DB 全層再発防止硬化 完了

### Disk IO Budget 枯渇の真因 → 恒久対策 全6層適用済

**障害連鎖**:
```
push:true (起動毎134テーブルCREATE/VERIFY)
→ pool max:8 × 複数インスタンス
→ Session mode pooler 枯渇
→ 再接続ストーム (retry 5回)
→ Disk IO Budget 使い切り → HTTP 522
```

### 恒久対策 (全6層)

| # | 層 | 変更 | 効果 |
|---|-----|------|------|
| 1 | PayloadCMS | `push: true` → `push: false` | 起動毎134 CREATE/VERIFY 完全除去 |
| 2 | Pool | `max: 8→2`, `connectionTimeout: 30s→10s`, `idleTimeout: 60s→20s` | 無料枠接続数抑制 |
| 3 | PostgreSQL | `statement_timeout=30s`, `lock_timeout=10s`, `idle_in_transaction_session_timeout=20s` | 暴走クエリ遮断 |
| 4 | Circuit Breaker | `retry 3→1回`, pool枯渇/diskIO/too many clients → 即失敗 | 再試行IO増幅防止 |
| 5 | Build 時保護 | `PAYLOAD_READS_DISABLED_DURING_BUILD=1` (Coolify env) | ビルド中DB読取ゼロ |
| 6 | パスワード | `onInit` 既存ユーザー上書き禁止 | ログイン情報永続保持 |

### 現在のDB状態
- Cloud Supabase: 未復旧 (Disk IO Budget 日次リセット待ち)
- OSS Supabase (139.59.250.5:5433): 一時稼働中
- DATABASE_URI: OSS Supabase (Cloud 復旧後切戻し)

### Verified
- `npx tsc --noEmit`: 0 errors
- paradigm container → 139.59.250.5:5433 TCP REACHABLE
- OSS Supabase `paradigm` スキーマ作成済 / `push:false` につき安全

### Active handoff
- Cloud Supabase 復旧後: DATABASE_URI を port 6543 Transaction mode に切戻し
- 既に全安全設定は適用済みにつき、切戻し後即 Disk IO 安全
- SUPABASE_PAT 取得で自動復旧・監視が可能に
