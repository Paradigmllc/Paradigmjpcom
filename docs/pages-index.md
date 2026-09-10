# Pages Index — paradigmjp.com

> Generated: 2026-05-14 | 12 locales (`ja`|`en`|`ko`|`zh`|`de`|`fr`|`es`|`pt`|`ru`|`ar`|`vi`|`id`) | `localePrefix: always`

## Active pages

| URL path | source file | i18n status | notes |
|---|---|---|---|
| `/{locale}` | `src/app/[locale]/page.tsx` | no | Home. PayloadCMS Pages (`isHomepage=true`) → BlockRenderer, fallback `HomeClient` (8-section legacy) |
| `/{locale}/about` | `src/app/[locale]/about/page.tsx` | yes | Mission / values / company info. `getTranslations({ namespace: "aboutPage" })` |
| `/{locale}/services` | `src/app/[locale]/services/page.tsx` | yes | Dynamic from PayloadCMS Services collection |
| `/{locale}/services/web` | `src/app/[locale]/services/web/page.tsx` | yes | Web 制作 detail |
| `/{locale}/services/meo` | `src/app/[locale]/services/meo/page.tsx` | yes | MEO 対策 detail |
| `/{locale}/services/seo` | `src/app/[locale]/services/seo/page.tsx` | yes | SEO / GEO 対策 detail |
| `/{locale}/services/ai` | `src/app/[locale]/services/ai/page.tsx` | yes | AI 導入支援 detail |
| `/{locale}/works` | `src/app/[locale]/works/page.tsx` | yes | Dynamic from PayloadCMS Works collection |
| `/{locale}/pricing` | `src/app/[locale]/pricing/page.tsx` | yes | Dynamic from PayloadCMS Pricing collection. PPP adjusted display |
| `/{locale}/blog` | `src/app/[locale]/blog/page.tsx` | yes | Post grid from PayloadCMS Posts collection |
| `/{locale}/blog/[slug]` | `src/app/[locale]/blog/[slug]/page.tsx` | yes | Post detail. Markdown renderer |
| `/{locale}/faq` | `src/app/[locale]/faq/page.tsx` | yes | Dynamic from PayloadCMS FAQs collection |
| `/{locale}/contact` | `src/app/[locale]/contact/page.tsx` | yes | Contact form + Cal.com booking. `getTranslations({ namespace: "contactPage" })` |
| `/{locale}/legal` | `src/app/[locale]/legal/page.tsx` | yes | 特定商取引法に基づく表記 |
| `/{locale}/privacy` | `src/app/[locale]/privacy/page.tsx` | yes | プライバシーポリシー |
| `/{locale}/lp/web` | `src/app/[locale]/lp/web/page.tsx` | yes | Web 制作 LP |
| `/{locale}/lp/meo` | `src/app/[locale]/lp/meo/page.tsx` | yes | MEO 対策 LP |
| `/{locale}/lp/seo` | `src/app/[locale]/lp/seo/page.tsx` | yes | SEO / GEO LP |
| `/{locale}/lp/ai` | `src/app/[locale]/lp/ai/page.tsx` | yes | AI 導入 LP |
| `/{locale}/video` | `src/app/[locale]/video/page.tsx` | yes | Video subscription LP. 3-tier pricing, comparison table |
| `/{locale}/agency` | `src/app/[locale]/agency/page.tsx` | no | Agency white-label LP. ROI calculator, 2 WL plans, FAQ |
| `/{locale}/report/[slug]` | `src/app/[locale]/report/[slug]/page.tsx` | no | Diagnostic report LP. **noindex**. Dynamic content from Supabase. No site chrome |
| `/{locale}/report/[slug]/video` | `src/app/[locale]/report/[slug]/video/page.tsx` | no | 60s diagnostic video preview. **noindex**. No site chrome |
| `/{locale}/cms/[[...slug]]` | `src/app/[locale]/cms/[[...slug]]/page.tsx` | no | PayloadCMS Pages collection renderer. Block-based dynamic content |
| `/{locale}/d/[slug]` | `src/app/[locale]/d/[slug]/page.tsx` | no | Customer-facing demo pages. Supabase `web_demos` table. iframe render |
| `/{locale}/themes-showcase` | `src/app/[locale]/themes-showcase/page.tsx` | no | Internal QA only. **noindex** |

## Archived pages (build-excluded via `_` prefix)

| URL path | source file | i18n status | notes |
|---|---|---|---|
| `/_archive_optout` | `src/app/[locale]/_archive_optout/page.tsx` | no | Old MVP opt-out completion page (2026-05-12) |
| `/_archive_diagnostic/[slug]` | `src/app/[locale]/_archive_diagnostic/[slug]/page.tsx` | no | Old diagnostic report LP (pre-Sprint 13 URL refactor) |
| `/_archive_report/[slug]` | `src/app/[locale]/_archive_report/[slug]/page.tsx` | no | Old ProposalRenderer-based report page (2026-05-12) |
| `/admin/_archive_sales` | `src/app/[locale]/admin/_archive_sales/page.tsx` | no | Sprint 11 sales admin dashboard (2026-05-13) |
| `/docs/admin/_archive_mvp-operations` | `src/app/[locale]/docs/admin/_archive_mvp-operations/page.tsx` | no | Old MVP ops reference (2026-05-12) |
