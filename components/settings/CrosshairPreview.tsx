'use client'

import { useEffect, useRef } from 'react'
import { drawCrosshair, type CrosshairConfig } from '@/lib/crosshair/draw'

const W = 320
const H = 140

/** Doppelt gezeichnet, damit die dünnen Striche in der Vorschau erkennbar bleiben. */
const ZOOM = 2

export function CrosshairPreview({ cfg }: { cfg: CrosshairConfig }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current?.getContext('2d')
    if (!c) return
    // Dunkelgrüner Grund mit angedeutetem Ziel — dieselbe Kulisse wie im
    // Original (`reference/index.html`, drawPreview), damit die Farbwahl
    // vor demselben Untergrund beurteilt wird wie im Spiel.
    c.clearRect(0, 0, W, H)
    c.fillStyle = '#12261a'
    c.fillRect(0, 0, W, H)
    c.beginPath()
    c.arc(W / 2, H / 2, 26, 0, Math.PI * 2)
    c.fillStyle = '#33553f'
    c.fill()
    c.save()
    c.scale(ZOOM, ZOOM)
    drawCrosshair(c, W / (2 * ZOOM), H / (2 * ZOOM), cfg)
    c.restore()
  }, [cfg])

  return <canvas ref={ref} width={W} height={H} className="w-full rounded-lg border border-border" />
}
