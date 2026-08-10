'use client'

import { useImperativeHandle, useRef, type RefObject } from 'react'
import type { Fx } from '@/lib/engine/types'

/** Muss zur Animationsdauer in range.css passen. */
const LIFE_MS = 550

export type FxHandle = {
  spawn(text: string, kind: Fx['kind'], x: number, y: number): void
}

/**
 * Treffertexte als DOM statt als gezeichnete Schrift.
 *
 * Die Bewegung übernimmt CSS; hier entsteht nur ein Element pro Effekt, das
 * sich nach seiner Laufzeit selbst entfernt. Das spart eine zweite Zeichenebene
 * und hält die Schrift scharf.
 */
export function FxLayer({ handleRef }: { handleRef: RefObject<FxHandle | null> }) {
  const host = useRef<HTMLDivElement>(null)

  useImperativeHandle(handleRef, () => ({
    spawn(text, kind, x, y) {
      const h = host.current
      if (!h) return
      const el = document.createElement('div')
      el.className = `fx fx-${kind}`
      el.textContent = text
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      h.appendChild(el)
      setTimeout(() => el.remove(), LIFE_MS)
    },
  }), [])

  return <div id="fxLayer" ref={host} />
}
