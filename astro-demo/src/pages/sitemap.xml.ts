import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = site?.href || 'https://paradigm.co.jp';
  const companies = ['paradigm', 'sampletech', 'tokyocommerce'];
  const blogSlugs = [
    'seo-trends-2025',
    'web-design-trends',
    'meo-google-maps-guide',
    'nextjs-vs-astro',
    'sns-marketing-2025',
    'accessibility-guide',
    'ai-content-marketing',
    'woocommerce-seo',
    'responsive-design-tips',
  ];

  const staticPages = [
    { loc: '/', lastmod: '2025-06-18', changefreq: 'weekly', priority: '1.0' },
    { loc: '/blog', lastmod: '2025-06-15', changefreq: 'daily', priority: '0.9' },
  ];

  const companyPages: { loc: string; lastmod: string; changefreq: string; priority: string }[] = [];
  for (const company of companies) {
    companyPages.push(
      { loc: `/about/${company}`, lastmod: '2025-06-01', changefreq: 'monthly', priority: '0.7' },
      { loc: `/services/${company}`, lastmod: '2025-06-01', changefreq: 'monthly', priority: '0.8' },
      { loc: `/pricing/${company}`, lastmod: '2025-06-01', changefreq: 'monthly', priority: '0.8' },
      { loc: `/cases/${company}`, lastmod: '2025-06-01', changefreq: 'monthly', priority: '0.7' },
      { loc: `/contact/${company}`, lastmod: '2025-06-01', changefreq: 'monthly', priority: '0.6' },
      { loc: `/faq/${company}`, lastmod: '2025-06-01', changefreq: 'monthly', priority: '0.5' },
      { loc: `/terms/${company}`, lastmod: '2025-06-01', changefreq: 'yearly', priority: '0.3' },
      { loc: `/privacy/${company}`, lastmod: '2025-05-15', changefreq: 'yearly', priority: '0.3' },
      { loc: `/tokushoho/${company}`, lastmod: '2025-06-01', changefreq: 'yearly', priority: '0.4' },
    );
  }

  const blogPages = blogSlugs.map((slug) => ({
    loc: `/blog/${slug}`,
    lastmod: '2025-06-15',
    changefreq: 'monthly' as const,
    priority: '0.6',
  }));

  const allPages = [...staticPages, ...companyPages, ...blogPages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${allPages
  .map(
    (page) => `  <url>
    <loc>${baseUrl.replace(/\/$/, '')}${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
