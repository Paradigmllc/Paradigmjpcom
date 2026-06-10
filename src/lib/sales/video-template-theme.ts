export interface VideoTheme {
  bg: string
  panel: string
  panelSoft: string
  ink: string
  muted: string
  accent: string
  accentSoft: string
  danger: string
  rule: string
  grid: string
}

export const SVG = {
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5m0 14h16M8 16v-4m5 4V8m5 8v-7"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>',
  radar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 21 8v8l-9 5-9-5V8l9-5Zm0 4v10m-5-7 10 6m0-6L7 16"/></svg>',
}

export function themeForVariant(variant: string): VideoTheme {
  if (variant === "meo") {
    return {
      bg: "#07130d",
      panel: "#f4fbf6",
      panelSoft: "#e6f4ea",
      ink: "#102016",
      muted: "#5d7567",
      accent: "#15803d",
      accentSoft: "#bbf7d0",
      danger: "#b42318",
      rule: "rgba(21,128,61,.24)",
      grid: "rgba(187,247,208,.12)",
    }
  }
  if (variant === "security") {
    return {
      bg: "#140707",
      panel: "#fff7f4",
      panelSoft: "#fee4dc",
      ink: "#26100d",
      muted: "#82655f",
      accent: "#dc2626",
      accentSoft: "#fecaca",
      danger: "#991b1b",
      rule: "rgba(220,38,38,.24)",
      grid: "rgba(254,202,202,.13)",
    }
  }
  if (variant === "japan_entry") {
    return {
      bg: "#07111e",
      panel: "#f4f8ff",
      panelSoft: "#dbeafe",
      ink: "#0b1b33",
      muted: "#53677f",
      accent: "#2563eb",
      accentSoft: "#bfdbfe",
      danger: "#c2410c",
      rule: "rgba(37,99,235,.24)",
      grid: "rgba(191,219,254,.13)",
    }
  }
  if (variant === "video_subscription") {
    return {
      bg: "#100b16",
      panel: "#fbf7ff",
      panelSoft: "#ede9fe",
      ink: "#1d1427",
      muted: "#6f607c",
      accent: "#7c3aed",
      accentSoft: "#ddd6fe",
      danger: "#be123c",
      rule: "rgba(124,58,237,.24)",
      grid: "rgba(221,214,254,.13)",
    }
  }
  return {
    bg: "#081018",
    panel: "#f8fafc",
    panelSoft: "#e0f2fe",
    ink: "#0d1824",
    muted: "#587084",
    accent: "#0ea5e9",
    accentSoft: "#bae6fd",
    danger: "#d04f1f",
    rule: "rgba(14,165,233,.24)",
    grid: "rgba(186,230,253,.12)",
  }
}
