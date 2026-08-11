export type CrosshairConfig = {
  color: string
  /** Abstand der Striche vom Mittelpunkt, in CSS-Pixeln. */
  gap: number
  len: number
  thick: number
  dot: boolean
  outline: boolean
}

/**
 * Die Voreinstellung.
 *
 * Neutrales Weiß statt einer Signalfarbe: die Ziele sind das einzige Warme im
 * Bild, und ein farbiges Crosshair würde genau davor konkurrieren.
 */
export const DEFAULT_CROSSHAIR: CrosshairConfig = {
  color: '#e6e8ec',
  gap: 3,
  len: 6,
  thick: 2,
  dot: false,
  outline: true,
}

/** Oben, unten, links, rechts. */
const SEG: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]]

/**
 * Zeichnet das Crosshair mittig auf (cx, cy).
 *
 * Dasselbe Modul bedient später die Vorschau in den Einstellungen — deshalb
 * nimmt es einen beliebigen Kontext und keine festen Bildmaße.
 */
export function drawCrosshair(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cfg: CrosshairConfig,
): void {
  const { gap: g, len: l, thick: t } = cfg

  const strokeSegs = () => {
    c.beginPath()
    for (const [dx, dy] of SEG) {
      c.moveTo(cx + dx * g, cy + dy * g)
      c.lineTo(cx + dx * (g + l), cy + dy * (g + l))
    }
    // Bei Länge 0 gäbe es nur Punkte auf der Stelle — der Strich entfällt ganz.
    if (l > 0) c.stroke()
  }

  if (cfg.outline) {
    c.strokeStyle = 'rgba(0,0,0,.85)'
    c.lineWidth = t + 2
    strokeSegs()
    if (cfg.dot) {
      c.beginPath()
      c.arc(cx, cy, t / 2 + 1, 0, Math.PI * 2)
      c.fillStyle = 'rgba(0,0,0,.85)'
      c.fill()
    }
  }

  c.strokeStyle = cfg.color
  c.lineWidth = t
  c.lineCap = 'butt'
  strokeSegs()
  if (cfg.dot) {
    c.beginPath()
    c.arc(cx, cy, t / 2, 0, Math.PI * 2)
    c.fillStyle = cfg.color
    c.fill()
  }
}
