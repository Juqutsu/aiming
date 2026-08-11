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
    // Dunkler Grund mit angedeutetem Ziel: dieselbe Kulisse wie im Spiel, damit
    // die Farbwahl vor demselben Untergrund beurteilt wird.
    c.clearRect(0, 0, W, H)
    c.fillStyle = '#12161d'
    c.fillRect(0, 0, W, H)
    // Gedämpftes Orange statt der vollen Zielfarbe: die Kugel steht im Spiel in
    // einer dunklen Range und wird nie so hell wie der reine Farbwert. Ein
    // knallendes Ziel hier würde die Farbwahl fürs Crosshair verfälschen.
    c.beginPath()
    c.arc(W / 2, H / 2, 20, 0, Math.PI * 2)
    c.fillStyle = '#a8482a'
    c.fill()
    c.save()
    c.scale(ZOOM, ZOOM)
    drawCrosshair(c, W / (2 * ZOOM), H / (2 * ZOOM), cfg)
    c.restore()
  }, [cfg])

  // Nicht über die eigene Auflösung hinaus gestreckt, sonst werden genau die
  // dünnen Striche unscharf, die hier beurteilt werden sollen.
  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      className="w-full max-w-[320px] rounded-lg border border-border"
    />
  )
}

/** Kantenlänge der Marke in CSS-Pixeln. */
const MARK = 24

/**
 * Das eigene Crosshair als Marke der Seite.
 *
 * Kein Logo, das für jedes Produkt taugen würde, sondern genau die Einstellung,
 * mit der gleich geschossen wird. Ändert der Spieler sie, ändert sich die Marke.
 */
export function CrosshairMark({ cfg }: { cfg: CrosshairConfig }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    const c = cv?.getContext('2d')
    if (!cv || !c) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = MARK * dpr
    cv.height = MARK * dpr
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    c.clearRect(0, 0, MARK, MARK)
    drawCrosshair(c, MARK / 2, MARK / 2, cfg)
  }, [cfg])

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ width: MARK, height: MARK }}
    />
  )
}
