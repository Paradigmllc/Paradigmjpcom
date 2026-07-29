document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".nav")
  if (!nav || nav.querySelector('[data-registry-link]')) return
  const link = document.createElement("a")
  link.className = "nav-item"
  link.href = "/console/registry.html"
  link.dataset.registryLink = "true"
  link.innerHTML = "<span>05</span>Models &amp; Workflows"
  nav.append(link)
})
