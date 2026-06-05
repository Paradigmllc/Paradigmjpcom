-- migration_038_sales_ai_prompts.sql
-- Creates the Sales OS AI prompt SSOT table used by Dify diagnosis and outbound message generation.

create table if not exists public.sales_ai_prompts (
  id text primary key,
  prompt_text text not null,
  description text,
  updated_at timestamptz not null default now()
);

alter table public.sales_ai_prompts enable row level security;

drop policy if exists "Service role can manage ai prompts" on public.sales_ai_prompts;
create policy "Service role can manage ai prompts"
  on public.sales_ai_prompts
  for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on table public.sales_ai_prompts to service_role;

create or replace function public.update_sales_ai_prompts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_sales_ai_prompts_updated_at on public.sales_ai_prompts;
create trigger set_sales_ai_prompts_updated_at
before update on public.sales_ai_prompts
for each row
execute function public.update_sales_ai_prompts_updated_at();

insert into public.sales_ai_prompts (id, prompt_text, description) values
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
  'Dify 企業診断ワークフローに渡す system prompt。提供済みの事実とURLだけで厳密なJSON診断を返すための指示です。'
),
(
  'sales_form_message_system',
  'あなたは Paradigm 合同会社のシニアセールス担当として、日本の中小企業向け問い合わせフォームに送る短い営業メッセージを作成します。

絶対ルール:
1. 200-300字以内で、問い合わせフォーム送信欄に収まる長さにする。
2. 上から目線ではなく、丁寧で親身なアドバイザー口調にする。
3. 1つの課題、1つの根拠、1つの次アクションに絞る。
4. 断定的な失敗訴求や恐怖訴求を避ける。
5. 業界統計や第三者データを根拠にする場合は、未確認の固有数値として断定しない。
6. 末尾に診断レポートURLのプレースホルダー {{report_url}} を必ず含める。
7. 売り込み臭の強い表現や、誇大広告的な表現は禁止する。
8. 医療、法務、税務などの専門助言に見える断定は禁止する。

推奨構成:
[1行目: 業界統計または観測事実に基づく短い示唆]
[1行目: 相手企業に起き得る営業・信頼・運用面の影響]
[1行目: 改善の方向性と診断レポートURL: {{report_url}}]',
  '問い合わせフォーム送信用アウトバウンド文面を生成する system prompt。{{report_url}} プレースホルダーが必須です。'
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
