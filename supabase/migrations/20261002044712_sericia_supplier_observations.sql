-- Internal product-source observations. A public-page observation is never owned inventory.
create table if not exists public.shopify_supplier_observations (
  product_id uuid primary key references public.shopify_ops_products(id) on delete cascade,
  source_url text not null,
  observation jsonb,
  checked_at timestamptz,
  updated_by text not null,
  updated_at timestamptz not null default now()
);
alter table public.shopify_supplier_observations enable row level security;
revoke all on public.shopify_supplier_observations from anon, authenticated, service_role;
grant select, insert, update on public.shopify_supplier_observations to service_role;
create index if not exists shopify_supplier_check_idx on public.shopify_supplier_observations(checked_at);
-- Repair only corrupted placeholder names, never overwrite a sourced or edited listing.
update public.shopify_ops_products p set name=v.name, category=v.category
from (values
 ('TSJ-SEAL-001','名入れ・書道ギフト候補','gifts'),
 ('TSJ-NAIL-001','和柄ネイルチップ候補','accessories'),
 ('TSJ-MIZUHIKI-001','水引アクセサリー候補','accessories'),
 ('TSJ-MINI-001','ミニチュア・小さな工芸品候補','craft'),
 ('TSJ-OBI-001','帯・着物リメイク小物候補','textiles'),
 ('TSJ-ART-001','日本のアート作品候補','craft'),
 ('TSJ-ZINE-001','日本のZINE候補','stationery'),
 ('TSJ-TEA-001','日本茶候補','tea'),
 ('TSJ-WASHI-001','和紙・紙文具候補','stationery'),
 ('TSJ-WRAP-001','風呂敷・布小物候補','textiles'),
 ('TSJ-MYSTERY-001','テーマ別ギフト候補','gifts'),
 ('TSJ-STATIONERY-001','日本の文具セット候補','stationery')
) as v(sku,name,category)
where p.sku=v.sku and p.status='candidate' and p.supplier_url is null and p.name like '%?%';
