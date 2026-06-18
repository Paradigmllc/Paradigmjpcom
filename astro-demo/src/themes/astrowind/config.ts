// Stub config for astrowind virtual module
export const SITE = {
  name: 'Paradigm',
  site: 'https://paradigmjp.com',
  base: '/',
  trailingSlash: false,
}

export const APP_BLOG = {
  isEnabled: false,
  postsPerPage: 6,
  isRelatedPostsEnabled: false,
  relatedPostsCount: 4,
  post: { isEnabled: true, permalink: '/blog/%slug%', robots: { index: true, follow: true } },
  list: { isEnabled: true, pathname: 'blog', robots: { index: true, follow: true } },
  category: { isEnabled: true, pathname: 'category', robots: { index: true, follow: true } },
  tag: { isEnabled: true, pathname: 'tag', robots: { index: true, follow: true } },
}
