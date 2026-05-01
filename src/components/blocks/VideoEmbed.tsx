// ─── VideoEmbed Block ──────────────────────────────────────────
import type { VideoEmbedProps } from "./types"

function toEmbedUrl(url: string): string {
  // YouTube watch URL → embed
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?#]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  // Vimeo
  const vmMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`
  return url
}

export function VideoEmbedBlock({ url, caption, aspectRatio = "16:9" }: VideoEmbedProps) {
  const padding = aspectRatio === "4:3" ? "75%" : aspectRatio === "1:1" ? "100%" : "56.25%"
  return (
    <section className="py-12 px-6">
      <figure className="max-w-4xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden bg-black" style={{ paddingBottom: padding }}>
          <iframe
            src={toEmbedUrl(url)}
            className="absolute inset-0 w-full h-full"
            title={caption ?? "Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {caption && <figcaption className="mt-3 text-sm text-text-muted text-center">{caption}</figcaption>}
      </figure>
    </section>
  )
}
