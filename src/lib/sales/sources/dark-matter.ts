/**
 * Overpass "dark matter" — discover SMBs without websites.
 * Finds physical businesses (POIs) that lack a website tag in OSM.
 * These are businesses that exist but have no web presence — prime web dev leads.
 */
import { getProxyFetchOptions } from "../proxy-agent"

export interface DarkMatterResult {
  ok: boolean
  businesses: Array<{
    name: string
    category: string
    address: string | null
    phone: string | null
    lat: number
    lon: number
  }>
  total: number
  error?: string
}

const OVERPASS_URL = "https://overpass-api.de/api/interpreter"

// Overpass query: find POIs with NO website tag
function buildDarkMatterQuery(city: string, lat: number, lon: number, radius = 5000): string {
  return `[out:json][timeout:30];
(
  node["name"]["amenity"](around:${radius},${lat},${lon});
  node["name"]["shop"](around:${radius},${lat},${lon});
  node["name"]["office"](around:${radius},${lat},${lon});
  node["name"]["craft"](around:${radius},${lat},${lon});
  node["name"]["tourism"~"hotel|guest_house|hostel"](around:${radius},${lat},${lon});
);
out body;`
}

// Major city coordinates for quick targeting
const CITY_COORDS: Record<string, Array<{ name: string; lat: number; lon: number }>> = {
  IN: [
    { name: "Mumbai", lat: 19.0760, lon: 72.8777 },
    { name: "Delhi", lat: 28.6139, lon: 77.2090 },
    { name: "Bangalore", lat: 12.9716, lon: 77.5946 },
    { name: "Chennai", lat: 13.0827, lon: 80.2707 },
    { name: "Hyderabad", lat: 17.3850, lon: 78.4867 },
  ],
  VN: [
    { name: "Hanoi", lat: 21.0278, lon: 105.8342 },
    { name: "Ho Chi Minh", lat: 10.8231, lon: 106.6297 },
  ],
  JP: [
    { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
    { name: "Osaka", lat: 34.6937, lon: 135.5023 },
  ],
  US: [
    { name: "New York", lat: 40.7128, lon: -74.0060 },
    { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
  ],
  GB: [
    { name: "London", lat: 51.5074, lon: -0.1278 },
    { name: "Manchester", lat: 53.4808, lon: -2.2426 },
  ],
}

export async function discoverWeblessSMBs(
  countryCode: string,
  maxCities = 3,
): Promise<DarkMatterResult> {
  const cities = CITY_COORDS[countryCode]?.slice(0, maxCities)
  if (!cities || cities.length === 0) {
    return { ok: false, businesses: [], total: 0, error: "No city coords for country" }
  }

  const allBusinesses: DarkMatterResult["businesses"] = []
  const seen = new Set<string>()

  for (const city of cities) {
    try {
      const query = buildDarkMatterQuery(city.name, city.lat, city.lon, 5000)
      const res = await fetch(OVERPASS_URL, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(30_000),
        ...getProxyFetchOptions(),
      })

      if (!res.ok) {
        console.warn(`[dark-matter] Overpass failed for ${city.name}: HTTP ${res.status}`)
        continue
      }

      const data = (await res.json()) as {
        elements?: Array<{
          id: number
          tags?: Record<string, string>
          lat: number
          lon: number
        }>
      }

      for (const element of (data.elements ?? [])) {
        const tags = element.tags ?? {}
        const name = tags.name?.trim()
        if (!name || name.length < 3) continue

        // Only capture businesses WITHOUT a website
        if (tags.website || tags["contact:website"] || tags.url) continue

        // Deduplicate by name+coordinates
        const key = `${name.toLowerCase()}_${element.lat.toFixed(4)}_${element.lon.toFixed(4)}`
        if (seen.has(key)) continue
        seen.add(key)

        const category = tags.amenity || tags.shop || tags.office || tags.craft || tags.tourism || "business"
        const address = [tags["addr:street"], tags["addr:city"], tags["addr:postcode"]].filter(Boolean).join(", ") || null
        const phone = tags.phone || tags["contact:phone"] || null

        allBusinesses.push({
          name,
          category: category.replace(/_/g, " "),
          address,
          phone,
          lat: element.lat,
          lon: element.lon,
        })
      }
    } catch (e) {
      console.error(`[dark-matter] Overpass error for ${city.name}:`, e)
    }
  }

  return {
    ok: true,
    businesses: allBusinesses.slice(0, 500),
    total: allBusinesses.length,
  }
}
