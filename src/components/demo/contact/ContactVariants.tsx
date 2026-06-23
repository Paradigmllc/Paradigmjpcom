"use client"

import { motion } from "framer-motion"
import type { DemoContactPage } from "@/lib/sales/demo-site-types"
import type { DemoTemplate } from "@/lib/sales/demo-templates/registry"

/* ──────────── Contact Info Card ──────────── */

export function ContactInfoCard({
  contact, isJa, accent,
}: { contact: DemoContactPage; isJa: boolean; accent: string }) {
  return (
    <section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}10` }}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">{isJa ? "会社名" : "Company"}</p>
                <p className="text-base font-semibold text-gray-900">{contact.companyName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}10` }}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">Email</p>
                <a href={`mailto:${contact.email}`} className="text-base font-semibold transition-colors hover:underline" style={{ color: accent }}>
                  {contact.email}
                </a>
              </div>
            </div>
            {contact.phone && (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}10` }}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">{isJa ? "電話番号" : "Phone"}</p>
                  <p className="text-base font-semibold text-gray-900">{contact.phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}10` }}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">{isJa ? "所在地" : "Address"}</p>
                <p className="text-base font-semibold text-gray-900">{contact.address}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ──────────── Booking Embed ──────────── */

export function BookingEmbed({
  contact, isJa, accent,
}: { contact: DemoContactPage; isJa: boolean; accent: string }) {
  return (
    <section className="bg-gray-50/80 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <motion.div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <h3 className="mb-4 font-display text-lg font-bold text-gray-900">
            {isJa ? "オンライン相談を予約" : "Book a Consultation"}
          </h3>
          {contact.calBookingUrl ? (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <iframe
                src={contact.calBookingUrl}
                className="h-[500px] w-full border-0"
                title={isJa ? "予約カレンダー" : "Booking Calendar"}
                allow="camera; microphone; fullscreen"
              />
            </div>
          ) : null}
          {contact.calDirectUrl && (
            <div className="mt-4 text-center">
              <a href={contact.calDirectUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: accent }}>
                {isJa ? "カレンダーを別ウィンドウで開く" : "Open Calendar in New Window"}
              </a>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
