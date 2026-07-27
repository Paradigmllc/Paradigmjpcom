# Paradigmjpcom Task

## CURRENT STATUS — 2026-07-28 Video as a Service 商用運用実装中

- Video as a Serviceの商品設計を3プランに確定した。
  - Essential: USD 1,500 / month、条件を満たすショート動画を月10本まで、同時進行1本、各動画3修正ラウンド。
  - Unlimited: USD 3,500 / month、依頼キュー無制限、同時進行1本、合意ブリーフ内の修正無制限。
  - Priority: USD 5,500 / month、依頼キュー無制限、同時進行2本、合意ブリーフ内の修正無制限、優先キュー。
- Readyとなった標準依頼へ原則2営業日以内に着手する。これは完成・納品時間の保証ではない。
- 申込み、適合確認、Service Order、初回決済、オンボーディング、制作キュー、レビュー、納品、更新・解約までの運用仕様を `docs/knowledge/video-as-a-service-operating-system.md` に定義した。
- 公開用FAQ・日英利用規約、VaaS専用申込フォーム、CRM/Slack用intent・plan保存、Service Order・Client Brief・メールテンプレートを実装対象とした。
- 既存英語Contact Formが全申請をJapan Entryへ強制変換していたため、`video-as-a-service` intentだけを安全に分離し、その他の英語申請は従来どおりJapan Entryへ正規化する。

## ACTIVE HANDOFF

- Branch: `feat/video-as-a-service-operations`
- 実装後にVitest、TypeScript、ESLint、production buildを通し、PR経由でmainへ統合する。
- 本番公開後、次の運用準備を完了する。
  - Stripeの3商品・月額Priceと請求方法
  - Notion client workspace template
  - Frame.io project template
  - Google Drive folder template
  - 初回ポートフォリオ3〜6本
  - 日本法弁護士による利用規約とService Orderの最終レビュー
- 公開利用規約は事業者向け共通条件であり、案件固有の条件はService Orderを優先させる。

## RELEASE REFERENCES

- Previous Country Partner implementation PR: #565
- Previous production verification run: `30311462742`
- VaaS implementation PR: pending
- VaaS production deployment: pending
