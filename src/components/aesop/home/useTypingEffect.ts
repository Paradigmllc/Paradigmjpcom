"use client"

/**
 * useTypingEffect — cycles through `words[]` typing each char at `speed`,
 * pausing `pause` ms when full, then deleting and moving to the next.
 *
 * The pattern of dependent timers (one for typing, one for pause, one
 * for delete) is intentional — using a single setInterval with a state
 * machine produces visible jitter on slow browsers. The setTimeout
 * chain gives each phase its own clean cancellation point.
 *
 * AE-PHP-1: 32 lines.
 */

import { useEffect, useState } from "react"

export function useTypingEffect(words: string[], speed = 80, pause = 2000) {
  const [text, setText] = useState("")
  const [wordIdx, setWordIdx] = useState(0)
  const [typing, setTyping] = useState(true)

  useEffect(() => {
    const word = words[wordIdx]
    if (!word) return
    if (typing) {
      if (text.length < word.length) {
        const t = setTimeout(() => setText(word.slice(0, text.length + 1)), speed)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setTyping(false), pause)
      return () => clearTimeout(t)
    }
    if (text.length > 0) {
      const t = setTimeout(() => setText(text.slice(0, -1)), speed / 2)
      return () => clearTimeout(t)
    }
    setWordIdx((wordIdx + 1) % words.length)
    setTyping(true)
  }, [text, typing, wordIdx, words, speed, pause])

  return text
}
