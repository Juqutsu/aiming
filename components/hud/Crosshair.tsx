'use client'

import { useEffect, useRef } from 'react'
import { DEFAULT_CROSSHAIR, drawCrosshair } from '@/lib/crosshair/draw'

/**
 * Ein eigenes kleines 2D-Canvas über dem 3D-Canvas.
 *
 * Es liegt bewusst nicht in der Szene: so bleibt es pixelscharf und unabhängig
 * von der Auflösungs-Skalierung des Renderers. Neu gezeichnet wird nur bei
 * Größenänderung — das Crosshair steht fest in der Bildmitte.
 */
export function Crosshair() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const paint = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      cv.style.width = `${w}px`
      cv.style.height = `${h}px`
      const c = cv.getContext('2d')
      if (!c) return
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      c.clearRect(0, 0, w, h)
      drawCrosshair(c, w / 2, h / 2, DEFAULT_CROSSHAIR)
    }
    paint()
    window.addEventListener('resize', paint)
    return () => window.removeEventListener('resize', paint)
  }, [])

  return <canvas id="xhair" ref={ref} />
}
