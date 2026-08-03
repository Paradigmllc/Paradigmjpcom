"use client"

import type { MouseEvent, ReactNode } from "react"

const SIGNUP_URL = "/ja/quote-recovery/login?mode=signup"

type Props = {
  children: ReactNode
  className: string
}

export function QuoteRecoveryContractLink({ children, className }: Props) {
  function openSignup(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    window.location.assign(SIGNUP_URL)
  }

  return (
    <a href={SIGNUP_URL} className={className} onClick={openSignup}>
      {children}
    </a>
  )
}
