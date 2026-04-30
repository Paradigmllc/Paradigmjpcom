/**
 * JsonLd.tsx — JSON-LD 構造化データを <script type="application/ld+json"> で埋込む
 *
 * 永久ルール (CLAUDE.md s10-6 AE-PHP-3):
 *   全 page.tsx で 1 個以上の JsonLd component を render すること。
 *
 * 使い方:
 *   <JsonLd data={buildLocalBusinessSchema()} />
 *   <JsonLd data={buildBreadcrumbSchema([...])} />
 */

export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
