"use client"

/**
 * useTypingEffect — re-export from canonical location.
 * Original at /aesop/home/useTypingEffect.ts (now this file). Kept colocated
 * in the home/ subfolder so all home-specific helpers live together.
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
    const t = setTimeout(() => {
      setWordIdx((wordIdx + 1) % words.length)
      setTyping(true)
    }, 0)
    return () => clearTimeout(t)
  }, [text, typing, wordIdx, words, speed, pause])

  return text
}
