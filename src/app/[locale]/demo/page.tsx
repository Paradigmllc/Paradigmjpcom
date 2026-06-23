
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getDemos() {
  try {
    const { getServiceSalesSupabase } = await import("@/lib/supabase");
    const { DB_TABLES } = await import("@/lib/sales/db-tables");
    const sb = getServiceSalesSupabase();
    if (!sb) return [];

    const { data, error } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("slug, title, meta")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[demo-index] query error:", error.message);
      return [];
    }
    return (data ?? []) as Array<{ slug: string; title: string; meta: Record<string, unknown> }>;
  } catch (err) {
    console.error("[demo-index] failed:", err instanceof Error ? err.message : String(err));
    return [];
  }
}

export default async function DemoIndexPage() {
  const demos = await getDemos();

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
            <Link
              href="https://paradigmjp.com"
              className="mt-4 inline-block text-sm font-medium text-purple-600 hover:text-purple-500"
            >
              Back to Paradigm →
            </Link>
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
                  {String(demo.meta?.companyName ?? demo.title ?? demo.slug)}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {String(demo.meta?.title ?? demo.title ?? "")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
