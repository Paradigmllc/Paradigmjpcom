import { getServiceSalesSupabase } from "@/lib/supabase";
import { DB_TABLES } from "@/lib/sales/db-tables";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 300;

interface DemoEntry {
  slug: string;
  title: string;
  company_name: string;
  industry: string;
  generated_at: string;
}

async function getPublishedDemos(): Promise<DemoEntry[]> {
  const sb = getServiceSalesSupabase();
  if (!sb) return [];

  const { data } = await sb
    .from(DB_TABLES.THEME_DEMO_PAGES)
    .select("slug, title, meta, company_id, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data) return [];

  const companyIds = [...new Set(data.map((d: { company_id: string }) => d.company_id))];
  const { data: companies } = companyIds.length > 0
    ? await sb.from(DB_TABLES.SALES_COMPANIES).select("id, company_name, industry").in("id", companyIds)
    : { data: [] };

  const companyMap = new Map((companies ?? []).map((c: { id: string; company_name: string; industry: string }) => [c.id, c]));

  return data.map((d: { slug: string; title: string; meta: Record<string, unknown>; company_id: string; created_at: string }) => {
    const company = companyMap.get(d.company_id);
    return {
      slug: d.slug,
      title: (d.meta?.title as string) ?? d.title ?? "Demo",
      company_name: (d.meta?.companyName as string) ?? company?.company_name ?? "Company",
      industry: (d.meta?.industry as string) ?? company?.industry ?? "",
      generated_at: (d.meta?.generatedAt as string) ?? d.created_at ?? "",
    };
  });
}

export default async function DemoIndexPage() {
  const demos = await getPublishedDemos();

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Web Improvement Demos
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Real-time demo sites generated from diagnostic reports.
        </p>

        {demos.length === 0 ? (
          <div className="mt-12 rounded-lg border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">No published demos yet.</p>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {demos.map((demo) => (
              <Link
                key={demo.slug}
                href={`/en/demo/${demo.slug}`}
                className="group block rounded-xl border border-gray-200 p-6 transition hover:border-purple-300 hover:shadow-md"
              >
                <h2 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600">
                  {demo.company_name}
                </h2>
                <p className="mt-1 text-sm text-gray-500">{demo.title}</p>
                {demo.industry && (
                  <span className="mt-3 inline-block rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                    {demo.industry}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
