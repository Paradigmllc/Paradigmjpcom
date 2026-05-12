/**
 * /sales/[region]/mvp/campaigns — campaign list + create form.
 * 一斉営業の入口. Basic Auth gate で保護済 (middleware).
 */

"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  region: string;
  status: string;
  daily_send_cap: number;
  total_send_cap: number | null;
  leads_count: number;
  enqueued_count: number;
  sent_count: number;
  failed_count: number;
  replied_count: number;
  created_at: string;
}

const SECRET_HEADER_KEY = "X-MVP-Secret";

export default function CampaignsPage() {
  const params = useParams<{ region: string }>();
  const region = params.region;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    has_form_url: true,
    enrichment_complete: true,
    daily_send_cap: 500,
    priority: "normal" as "hot" | "normal" | "low",
    notes: "",
  });

  // Note: this page is browser-side; the Basic Auth header is auto-attached by browser
  // for same-origin requests (after the user authenticated to /sales/*).
  // X-MVP-Secret is NOT used from browser (server-side only).
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["campaigns", region],
    queryFn: async () => {
      const r = await fetch(`/api/mvp/campaigns?region=${region}`);
      if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
      return (await r.json()) as { ok: boolean; campaigns: Campaign[] };
    },
    refetchInterval: 10_000,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/mvp/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          region,
          industry_slug: formData.industry || undefined,
          daily_send_cap: formData.daily_send_cap,
          priority: formData.priority,
          notes: formData.notes,
          filter: {
            conditions: {
              has_form_url: formData.has_form_url,
              enrichment_complete: formData.enrichment_complete,
              industry: formData.industry || undefined,
            },
          },
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? `${r.status}`);
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns", region] });
      setShowForm(false);
      setFormData({ ...formData, name: "" });
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">キャンペーン管理 — region: {region}</h1>
        <div className="flex gap-2">
          <Link href={`/sales/${region}/mvp`} className="px-3 py-1 border rounded hover:bg-gray-50 text-sm">
            ← 監視ダッシュボード
          </Link>
          <button onClick={() => setShowForm(!showForm)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            {showForm ? "キャンセル" : "+ 新規キャンペーン"}
          </button>
        </div>
      </header>

      {showForm && (
        <section className="border rounded p-4 bg-gray-50 space-y-3">
          <h2 className="font-semibold">新規一斉営業キャンペーン</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">名前
              <input className="w-full border rounded px-2 py-1 mt-1" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="2026-05 SaaS JP campaign" />
            </label>
            <label className="text-sm">業種 (industry_slug)
              <input className="w-full border rounded px-2 py-1 mt-1" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} placeholder="saas / ec / hp / manufacturing" />
            </label>
            <label className="text-sm">日次上限
              <input type="number" className="w-full border rounded px-2 py-1 mt-1" value={formData.daily_send_cap} onChange={(e) => setFormData({ ...formData, daily_send_cap: parseInt(e.target.value, 10) || 500 })} />
            </label>
            <label className="text-sm">優先度
              <select className="w-full border rounded px-2 py-1 mt-1" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as "hot" | "normal" | "low" })}>
                <option value="hot">hot</option>
                <option value="normal">normal</option>
                <option value="low">low</option>
              </select>
            </label>
            <label className="text-sm flex items-center gap-2 mt-3">
              <input type="checkbox" checked={formData.has_form_url} onChange={(e) => setFormData({ ...formData, has_form_url: e.target.checked })} />
              フォーム URL あり lead のみ
            </label>
            <label className="text-sm flex items-center gap-2 mt-3">
              <input type="checkbox" checked={formData.enrichment_complete} onChange={(e) => setFormData({ ...formData, enrichment_complete: e.target.checked })} />
              enrichment 完了 lead のみ
            </label>
          </div>
          <label className="text-sm block">備考
            <textarea className="w-full border rounded px-2 py-1 mt-1" rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </label>
          <button
            disabled={!formData.name || createMut.isPending}
            onClick={() => createMut.mutate()}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {createMut.isPending ? "作成中..." : "作成 + 即時投入"}
          </button>
          {createMut.isError && <p className="text-red-600 text-sm">{(createMut.error as Error).message}</p>}
          {createMut.isSuccess && <p className="text-green-600 text-sm">✅ {(createMut.data as { enqueued: number }).enqueued} 件 enqueue 完了</p>}
        </section>
      )}

      <section className="border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">名前</th>
              <th className="p-2 text-left">status</th>
              <th className="p-2 text-right">leads</th>
              <th className="p-2 text-right">enqueued</th>
              <th className="p-2 text-right">sent</th>
              <th className="p-2 text-right">failed</th>
              <th className="p-2 text-right">replied</th>
              <th className="p-2 text-right">日次cap</th>
              <th className="p-2 text-left">作成</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="p-4 text-center text-gray-500">読み込み中...</td></tr>}
            {data?.campaigns.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{c.name}</td>
                <td className="p-2"><StatusBadge status={c.status} /></td>
                <td className="p-2 text-right font-mono">{c.leads_count}</td>
                <td className="p-2 text-right font-mono">{c.enqueued_count}</td>
                <td className="p-2 text-right font-mono text-green-700">{c.sent_count}</td>
                <td className="p-2 text-right font-mono text-red-700">{c.failed_count}</td>
                <td className="p-2 text-right font-mono">{c.replied_count}</td>
                <td className="p-2 text-right font-mono text-gray-600">{c.daily_send_cap}</td>
                <td className="p-2 font-mono text-xs">{new Date(c.created_at).toLocaleString("ja-JP")}</td>
              </tr>
            ))}
            {data && data.campaigns.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-gray-500">キャンペーンがありません</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "running" ? "bg-blue-100 text-blue-800"
    : status === "completed" ? "bg-green-100 text-green-800"
    : status === "paused" ? "bg-yellow-100 text-yellow-800"
    : status === "cancelled" ? "bg-gray-200 text-gray-800"
    : "bg-gray-100 text-gray-700";
  return <span className={`inline-block px-2 py-0.5 text-xs rounded ${cls}`}>{status}</span>;
}
