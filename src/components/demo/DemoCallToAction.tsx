"use client"

import type { DemoCtaProps } from "@/lib/sales/demo-site-types"

export function DemoCallToAction(props: DemoCtaProps & { isJa: boolean }) {
  const { title, subtitle, buttonText, buttonHref, accentColor, accentColorDark } = props

  return (
    <section id="contact" className="px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <div
          className="rounded-3xl p-12 shadow-2xl"
          style={{
            background: `linear-gradient(to bottom right, ${accentColor}, ${accentColorDark})`,
          }}
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
            <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="mb-4 text-3xl font-black text-white md:text-4xl">{title}</h2>
          <p className="mx-auto mb-8 max-w-md text-white/70">{subtitle}</p>
          <a
            href={buttonHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-black shadow-xl transition-all hover:bg-zinc-100"
          >
            {buttonText}
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M12 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}
