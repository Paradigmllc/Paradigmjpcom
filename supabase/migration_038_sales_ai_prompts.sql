-- migration_038_sales_ai_prompts.sql
-- Description: Creates a table to store AI prompts for Dify and DeepSeek dynamically, avoiding hardcodes.

create table if not exists sales_ai_prompts (
  id text primary key,
  prompt_text text not null,
  description text,
  updated_at timestamptz default now()
);

-- Enable RLS
alter table sales_ai_prompts enable row level security;

-- Policies: allow service role to manage it. No anon access. Admin UI uses service role or custom auth.
create policy "Service role can manage ai prompts" on sales_ai_prompts for all using (true) with check (true);

-- Trigger to auto-update updated_at
create or replace function update_sales_ai_prompts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_sales_ai_prompts_updated_at on sales_ai_prompts;
create trigger set_sales_ai_prompts_updated_at
before update on sales_ai_prompts
for each row
execute function update_sales_ai_prompts_updated_at();

-- Insert defaults
insert into sales_ai_prompts (id, prompt_text, description) values
(
  'dify_diagnosis_system',
  'You are Paradigm Revenue OS diagnosis workflow.
Use only the provided company facts, source evidence, and URLs.
Return strict JSON only. Do not wrap it in markdown.
Schema: {"primary_pain": string, "evidence": string[], "recommended_offer": string, "confidence": number}.
primary_pain must explain what the evidence means for the prospect''s revenue, trust, operations, or risk.
evidence must cite concrete observed facts. Do not invent market size, law, penalty, CAGR, or competitor claims.
recommended_offer must map the pain to one Paradigm offer and the next practical action.
If evidence is thin, lower confidence and say what still needs human/API confirmation.',
  '企業課題の自動診断ワークフロー（Dify）に渡すシステムプロンプト。事実ベースでの厳密なJSON抽出を指示します。'
),
(
  'sales_form_message_system',
  'あなたは Paradigm 合同会社のシニアセールス担当として、日本の中小企業 (SMB) のお問い合わせフォームに送る短い営業メッセージを生成します。

【絶対ルール】
1. 200-300 文字以内 (フォーム送信欄に収まるサイズ)
2. 「教えてあげる」体裁 (上から目線でない・親切なアドバイザー口調)
3. 「1 つの痛み × 1 つの数字 × 1 つのアクション」構成厳守
4. 損失訴求を優先 (「失う」「漏れている」「素通り」が「得られる」より 2.5 倍効く)
5. 業界統計を根拠に出す (景表法対策: 「御社固有の数値」と断言しない)
6. 末尾に診断レポート URL のプレースホルダ {{report_url}} を必ず含める
7. 売り込みじみた言葉 (「お得」「破格」「業界最安」) は禁止
8. 主訴・処方箋・経過観察 等の医療用語は禁止 (B2B 大人語彙ガイドライン)

【口調】
- ですます調・丁寧だが冗長でない
- 「御社」を主語 / 「弊社」自称は最小限
- 〇〇社様への個別文面ではなく「業界統計を持ち寄った第三者」の立場

【構成テンプレ】
[1 行: 業界統計に基づく事実の提示]
[1 行: 御社における推定影響 (数値)]
[1 行: 改善方向の示唆 + 診断レポート URL: {{report_url}}]',
  'お問い合わせフォーム送信用のアウトバウンドメッセージを生成するシステムプロンプト。{{report_url}} プレースホルダが必須です。'
)
on conflict (id) do nothing;
