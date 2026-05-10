# ElizaOS Deferred Decision (B36-P7B 結論)

> **状態**: 🟡 **DEFERRED — 当面 Persona-as-Data layer で同等価値を達成済**
> **作成**: 2026-05-10
> **背景**: 5 layer agent stack の **Persona** 層を ElizaOS で実装する案を検討した結果、研究で誤マッチ判定 → Persona-as-Data approach に pivot し既に稼働中.

---

## なぜ ElizaOS を採用しなかったのか

**研究 (`github.com/elizaOS/eliza` 直接検証 2026-05-10)**:

| 検証項目 | 結果 | 影響 |
|---------|------|------|
| 公式 Docker compose | ❌ なし (`.dockerignore` のみ) | 自前 build 必要・upstream support なし |
| 公式 deploy path | Eliza Cloud (SaaS) / AWS ECS のみ | self-host Coolify は community DIY |
| character file API | `GET /api/agents/{id}` は metadata のみ・bio/system 不返却 | 我々の use case (persona 取得) を満たせない |
| LLM 不要モード | **不在** — agent runtime は LLM 必須 | 「persona registry only」運用不可 |
| RAM 要求 | 1.5-4 GB (Bun + Node 24 + agent loop) | Droplet 8 GB ・現在 mem_avail 3.4 GB で 80%+ 占有リスク |

---

## 真の制約 (Droplet 555590454 / 4vCPU/8GB SGP1)

| Resource | 状態 | ElizaOS deploy への影響 |
|----------|------|----------------------|
| **RAM** | 3.4 GB available (8 GB 中 4.6 GB used) | ⚠️ ElizaOS 1.5-4 GB 占有で残 0-1.9 GB → 既存 28+ サービスの OOM 連鎖リスク |
| **Disk** | 47.7 GB free (154.9 GB 中 107 GB used) | ✅ 余裕 (5 exited 削除で更に回収) |
| **Load_1** | 11.77 (4 vCPU 飽和) | ⚠️ deploy 中の競合・既に飽和気味 |

→ **Disk ではなく RAM + CPU が真の制約**. ユーザー指示「ディスク圧迫する場合は不要なものを削除して OK」に対し、disk 自体は問題なし → 5 exited services は disk 余地確保のため削除済 (将来 ElizaOS 導入時 prep) だが、RAM 制約で今すぐは deploy しない.

---

## 代替: Persona-as-Data Architecture (実装済 2026-05-10)

ElizaOS で得たかった「全 customer-facing LLM output で一貫した Paradigm シニアアドバイザー persona」を **ゼロ RAM で同等達成**:

```
Memory  = Supabase paradigm_personas table (slug PK + system_prompt + tone + vocab_allowed + vocab_banned + style_examples)
Brain   = Dify Cloud workflow + DeepSeek V4 cache
Persona = /api/persona/[slug] endpoint  +  src/lib/mvp/persona-injection.ts::withPersonaPrefix()
          (Caller fetches persona row → prepends payload to system_prompt → DeepSeek 構造的に persona 強制)
Tool-use = Hermes Agent (Phase 1 deployed)
Execute = n8n + Playwright + Crawlee/Crawl4AI
```

**ElizaOS との比較**:

| 軸 | ElizaOS | Persona-as-Data | 勝者 |
|----|---------|----------------|------|
| RAM 占有 | 1.5-4 GB | 0 (Supabase row read) | ✅ Persona-as-Data |
| 起動時間 | 30-60s container startup | 0 (HTTP cache hit 60s) | ✅ Persona-as-Data |
| 編集 UX | character file json 編集 → 再起動 | Supabase admin UI (CMS) で即時反映 | ✅ Persona-as-Data |
| 多言語 | character file 言語別重複 | locale 列で 12 region native | ✅ Persona-as-Data |
| 監査ログ | ElizaOS 内部 | Supabase audit log + git seed migration | ✅ Persona-as-Data |
| **将来 chat agent** | ✅ Discord/Telegram/Farcaster 即対応 | ❌ chat agent 不可 | ✅ ElizaOS |

→ **現用途は完全に Persona-as-Data 優位**. ElizaOS 検討は **「Discord/Telegram で paradigm 営業 bot 作る」場面が出た時** に再開.

---

## ElizaOS 復活の発火条件 (将来再着手するトリガー)

以下のいずれかが発生した時に本決定を覆す:

1. Paradigm として Discord / Telegram / Farcaster でリアルタイム会話 bot 運用が必要になった
2. Droplet を 16GB 以上にスケール (Hetzner 移行等) し RAM 余裕 8GB+ 確保
3. ElizaOS 公式 Docker compose + persona-only モードが upstream で提供される
4. Eliza Cloud SaaS の価格が paradigm の月次予算 ($163 上限) に収まる

---

## 削除した exited service (ElizaOS 導入余地確保 2026-05-10)

Coolify API DELETE で以下 5 service を削除. 全て 「running:exited」 状態で運用中ではなく、将来 ElizaOS / 別 service の disk 余地確保のため:

| サービス | UUID | 削除理由 |
|---------|------|---------|
| Authentik | `lgw4gg84wows08wws804s4sc` | OIDC 統合は Phase 2 (Q3) で再構築予定・現在 Basic Auth で運用中 |
| LiteLLM | `p116i5fzu0qqmeqsfyijs5pw` | OpenRouter 統合に置き換え済 (Appexxme src/lib/llm.ts) |
| Stirling PDF & Media | `iuqx7eod3arrfbb07to51am3` | exited・PDF 機能は Gotenberg n8n workflow で代替 |
| Umami | `kpjwad1h4115zgc3qv852stg` | exited・analytics は paradigmjp.com 内で再起動予定 (Phase 8) |
| Formbricks | `lmuut2a1qk7mj63ss11crnlp` | exited・survey 機能は Typebot で代替 |

復活が必要な場合は github 履歴から docker-compose を復元可能.

---

## 関連文書

- 5 layer architecture spec → `docs/refactor/b36-p7b-template-matrix-spec.md`
- Persona seed (paradigm-advisor-ja) → Supabase `paradigm_personas` table
- Persona endpoint → `src/app/api/persona/[slug]/route.ts`
- Persona injection helper → `src/lib/mvp/persona-injection.ts`
- 研究レポート (Agent SDK) → 2026-05-10 セッションログ参照
