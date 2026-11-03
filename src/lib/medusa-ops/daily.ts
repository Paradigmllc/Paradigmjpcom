import { getMedusaCatalog } from './catalog';
import type { JobKind } from '@/lib/shopify-ops/daily/model';

export async function performMedusaDailyTask(kind: JobKind, cursor: string | null) {
  if (kind === 'suppliers' || kind === 'social') return {
    state: 'blocked' as const, cursor: null, summary: { platform: 'medusa', processed: 0 },
    message: kind === 'suppliers' ? '仕入先の在庫API利用許可・認証情報が未取得です。数量同期・自動発注は未実行です。' : 'Medusa商品に対するSNS接続・公開設定が未完了です。旧Shopify向け投稿は実行しません。',
  };
  // A Shopify cursor cannot resume Medusa paging; restart this read-only audit.
  let offset = cursor && /^medusa:\d+$/.test(cursor) ? Number(cursor.slice(7)) : 0;
  if (!Number.isSafeInteger(offset) || offset > 1_000_000) throw new Error('Medusaの取得位置が不正です');
  let processed = 0;
  let count = 0;
  for (let page = 0; page < 5; page++) {
    const result = await getMedusaCatalog({ kind, offset });
    if (!result.configured) throw new Error('Medusa管理APIが未接続です');
    processed += result.rows.length; count = result.count;
    if (result.nextOffset === null) return { state: 'succeeded' as const, cursor: null,
      summary: { platform: 'medusa', processed, count, cycleComplete: true, readOnly: true }, message: null };
    offset = result.nextOffset;
  }
  return { state: 'succeeded' as const, cursor: `medusa:${offset}`,
    summary: { platform: 'medusa', processed, count, cycleComplete: false, readOnly: true }, message: null };
}
