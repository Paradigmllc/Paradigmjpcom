#!/usr/bin/env node
/**
 * Site asset extractor — extracts real images, logo, colors, social links from company websites.
 * Used by pipeline Stage 2 and demo generator for true personalization.
 */

async function extractAssets(domain, html) {
  const baseUrl = `https://${domain}`;
  const assets = {
    logo: null,
    ogImage: null,
    images: [],
    colors: [],
    favicon: `https://${domain}/favicon.ico`,
    socialLinks: {},
    phone: null,
    email: null,
    address: null,
    fonts: [],
  };

  try {
    // ── Logo / Favicon ──
    const iconMatch = html.match(/<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i);
    const appleIcon = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
    const svgLogo = html.match(/<img[^>]*class=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i);
    const logoDiv = html.match(/<a[^>]*class=["'][^"']*logo[^"']*["'][^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/i);
    const headerImg = html.match(/<header[\s\S]*?<img[^>]*src=["']([^"']+)["']/i);

    assets.logo = resolveUrl(baseUrl, appleIcon?.[1] || iconMatch?.[1] || svgLogo?.[1] || logoDiv?.[1] || headerImg?.[1] || null);

    // ── OG Image ──
    const ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    const twImg = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    assets.ogImage = resolveUrl(baseUrl, ogImg?.[1] || twImg?.[1] || null);

    // ── Hero Images ──
    const imgRegex = /<img[^>]*src=["']([^"']+(?:jpg|jpeg|png|webp|svg)["'])/gi;
    let m;
    const seen = new Set();
    while ((m = imgRegex.exec(html)) !== null) {
      const url = resolveUrl(baseUrl, m[1].replace(/['"]$/, ''));
      if (url && !seen.has(url) && !url.includes('icon') && !url.includes('pixel') && !url.includes('tracking')) {
        seen.add(url);
        if (assets.images.length < 8) assets.images.push(url);
      }
    }

    // ── Colors ──
    const bgColor = html.match(/background(?:-color)?:\s*(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\))/i);
    const primaryColor = html.match(/--(?:primary|main|accent)(?:-color)?:\s*(#[a-fA-F0-9]{3,6})/i);
    const themeColor = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i);
    if (primaryColor?.[1]) assets.colors.push(primaryColor[1]);
    if (bgColor?.[1]) assets.colors.push(bgColor[1]);
    if (themeColor?.[1]) assets.colors.push(themeColor[1]);
    if (assets.colors.length === 0) assets.colors = ['#2563eb', '#1e40af'];

    // ── Social Links ──
    const socialPatterns = {
      twitter: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+/i,
      facebook: /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9.]+/i,
      instagram: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.]+/i,
      linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/company\/[A-Za-z0-9-]+/i,
      youtube: /https?:\/\/(?:www\.)?youtube\.com\/(?:channel\/|@|c\/)[A-Za-z0-9_-]+/i,
    };
    for (const [platform, pattern] of Object.entries(socialPatterns)) {
      const match = html.match(pattern);
      if (match) assets.socialLinks[platform] = match[0];
    }

    // ── Phone / Email ──
    const phoneMatch = html.match(/(?:tel|phone|call)[:\s]*([+\d][\d\s\-().]{6,})/i);
    if (phoneMatch) assets.phone = phoneMatch[1].trim();
    const emailMatch = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) assets.email = emailMatch[1];
    const addrMatch = html.match(/<address[^>]*>([\s\S]*?)<\/address>/i);
    if (addrMatch) assets.address = addrMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // ── Google Fonts ──
    const gfMatch = html.match(/fonts\.googleapis\.com\/css2?\?family=([^&"'\s]+)/i);
    if (gfMatch) assets.fonts = gfMatch[1].split('|').map(f => f.split(':')[0].replace(/\+/g, ' '));

  } catch (e) { /* extraction is best-effort */ }

  return assets;
}

function resolveUrl(base, url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url; // inline SVG/data URI
  try { return new URL(url, base).href; } catch { return null; }
}

module.exports = { extractAssets };
