export const TRACKING_SCRIPT = (trackingSlug: string) => `
  let scrolled50 = false;
  window.addEventListener('scroll', function() {
    if (!scrolled50 && window.scrollY > document.body.scrollHeight * 0.5) {
      scrolled50 = true;
      new Image().src = '/api/sales/track-view?slug=${encodeURIComponent(trackingSlug || "")}&event=scroll';
    }
  });
  setTimeout(function() {
    new Image().src = '/api/sales/track-view?slug=${encodeURIComponent(trackingSlug || "")}&event=stay';
  }, 30000);
  document.querySelectorAll('a[href*="cal.com"], a[href*="demo"]').forEach(function(el) {
    el.addEventListener('click', function() {
      new Image().src = '/api/sales/track-view?slug=${encodeURIComponent(trackingSlug || "")}&event=cta';
    });
  });
  const sectionObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting && entry.target.id) {
        new Image().src = '/api/sales/track-view?slug=${encodeURIComponent(trackingSlug || "")}&event=section&section=' + entry.target.id;
      }
    });
  }, { threshold: 0.3 });
  setTimeout(function() {
    document.querySelectorAll('section[id], div[id]').forEach(function(el) {
      if (el.id && el.id.length > 2) sectionObserver.observe(el);
    });
  }, 1000);
`

export const PRINT_CSS = `@media print{@page{margin:12mm}body{font-size:10pt;color:#000!important;background:#fff!important}.sticky,.fixed,canvas,.particles,.vignette,button:not(.print-keep),nav{display:none!important}section,div[class*=py-]{padding:5mm 0!important;page-break-inside:avoid}h1{font-size:16pt;color:#000!important}h2{font-size:13pt}h3{font-size:11pt}p,li,span{color:#333!important}a{color:#00e;text-decoration:underline}.rounded-xl,.rounded-2xl,.rounded-lg{border:1px solid #ddd!important;box-shadow:none!important;background:#fff!important}.bg-zinc-900,.bg-zinc-950{background:#f5f5f5!important;color:#000!important}.text-white{color:#000!important}}`
