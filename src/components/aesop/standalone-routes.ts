/** Routes that own their complete presentation and must not inherit marketing chrome. */
export function isStandaloneRoute(pathname: string): boolean {
  if (/^\/[a-z]{2}\/report\//.test(pathname)) return true
  if (/^\/[a-z]{2}\/work-report\//.test(pathname)) return true
  if (/^\/[a-z]{2}\/opportunity\//.test(pathname)) return true
  if (/^\/[a-z]{2}\/d\//.test(pathname)) return true
  if (/^\/[a-z]{2}\/demo\//.test(pathname)) return true
  if (/^\/[a-z]{2}\/admin(\/|$)/.test(pathname)) return true
  if (/^\/[a-z]{2}\/quote-recovery(\/|$)/.test(pathname)) return true
  if (/^\/p\//.test(pathname)) return true
  return false
}
