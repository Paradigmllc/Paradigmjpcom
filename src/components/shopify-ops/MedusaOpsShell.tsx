"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Toaster } from 'sonner';
import { MedusaCatalogPanel } from './MedusaCatalogPanel';
import { ShopifyDailyPanel } from './ShopifyDailyPanel';

export function MedusaOpsShell() {
  const [tab, setTab] = useState<'medusa' | 'daily'>('medusa');
  useEffect(() => {
    const read = () => setTab(new URLSearchParams(window.location.search).get('tab') === 'daily' ? 'daily' : 'medusa');
    read(); window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  function select(value: 'medusa' | 'daily') {
    const url = new URL(window.location.href); url.searchParams.set('tab', value);
    window.history.pushState(null, '', url); setTab(value);
  }
  return <main className="min-h-dvh bg-zinc-50 text-zinc-950">
    <Toaster richColors position="top-center" />
    <header className="border-b bg-white px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div><p className="text-xs font-semibold tracking-widest">SERICIA · MEDUSA</p><h1 className="mt-2 text-2xl font-bold">海外向けストア運営</h1></div>
        <Link href="/admin" className="rounded-lg border px-3 py-2 text-sm">CMS管理</Link>
      </div>
    </header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <p className="text-sm text-zinc-600">公開ストアはMedusaへ移行済みです。仕入先・倉庫の実接続や販売開始の確認は、商品情報の取得成功とは別です。</p>
      <nav aria-label="Medusa運営機能" className="flex gap-3">
        {(['medusa', 'daily'] as const).map(value => <button key={value} onClick={() => select(value)} aria-pressed={tab === value} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${tab === value ? 'bg-zinc-950 text-white' : 'bg-white'}`}>{value === 'medusa' ? '商品・在庫・注文' : '日々の運用・接続状況'}</button>)}
      </nav>
      {tab === 'medusa' ? <MedusaCatalogPanel /> : <ShopifyDailyPanel />}
    </div>
  </main>;
}
