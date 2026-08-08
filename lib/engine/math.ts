import type { Player, Target, Vec3 } from './types'

export const DEG = Math.PI / 180

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

/** Einheitsvektor der Blickrichtung zu gegebenem Gier- und Nickwinkel. */
export function dirFrom(yaw: number, pitch: number): Vec3 {
  const cp = Math.cos(pitch)
  return { x: cp * Math.sin(yaw), y: Math.sin(pitch), z: cp * Math.cos(yaw) }
}

/**
 * Abstand vom Ursprung bis zum vorderen Schnittpunkt mit der Zielkugel,
 * oder -1 wenn der Strahl sie verfehlt oder sie hinter dem Ursprung liegt.
 * `dir` muss normalisiert sein.
 */
export function raySphere(origin: Vec3, dir: Vec3, t: Target): number {
  const ox = t.x - origin.x
  const oy = t.y - origin.y
  const oz = t.z - origin.z
  const tca = ox * dir.x + oy * dir.y + oz * dir.z
  if (tca <= 0) return -1
  const d2 = ox * ox + oy * oy + oz * oz - tca * tca
  const r2 = t.r * t.r
  if (d2 > r2) return -1
  return tca - Math.sqrt(r2 - d2)
}

/** Das nächste getroffene Ziel, oder null. Tote und versteckte Ziele zählen nicht. */
export function rayHitBest(origin: Vec3, dir: Vec3, list: Target[]): Target | null {
  let best: Target | null = null
  let bestDist = Infinity
  for (const t of list) {
    if (t.dead || t.hidden) continue
    const d = raySphere(origin, dir, t)
    if (d > 0 && d < bestDist) {
      bestDist = d
      best = t
    }
  }
  return best
}

/** Schneiden sich die Strecken a→b und c→d? Reine 2D-Draufsicht, für Sichtlinien gegen Deckung. */
export function segCross(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
  const d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax)
  const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx)
  const d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx)
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0
}

/** Horizontales Tempo des Spielers in Metern pro Sekunde. */
export function speed(p: Player): number {
  return Math.hypot(p.vx, p.vz)
}
