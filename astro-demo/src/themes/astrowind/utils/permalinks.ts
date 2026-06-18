// Stub utilities for AstroWind theme
export function getHomePermalink(): string { return '/' }
export function getBlogPermalink(): string { return '/blog' }
export function trimSlash(s: string): string { return s.replace(/\/+$/, '') }
export function getAsset(path: string): string { return path }
