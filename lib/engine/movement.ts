import { speed } from './math'
import type { Camera, Player } from './types'

/** Laufgeschwindigkeit in Metern pro Sekunde. */
export const RUN = 6.75
/** Beschleunigung beim Anlaufen. */
export const ACC = 55
/** Verzögerung beim Loslassen aller Tasten. */
export const FRIC = 34
/** Verzögerung beim Antippen der Gegenrichtung — der Kern des Counterstrafens. */
export const COUNTER = 130
/** Augenhöhe über dem Boden. */
export const EYE = 1.65
/** Begrenzung der Range. */
export const BOUNDS = { x: 16, zMin: -6, zMax: 11 }

/** Ab diesem Winkel gilt die Eingabe als Gegenrichtung. Entspricht etwa 102 Grad. */
const COUNTER_DOT = -0.2
/** Unterhalb dieses Tempos schnappt das Gegentippen auf Stillstand. */
const SNAP_SPEED = 0.6

export function createPlayer(): Player {
  return { x: 0, y: EYE, z: 0, vx: 0, vz: 0 }
}

/**
 * Ein Bewegungsschritt.
 *
 * Die Richtung wird aus der Kamerabasis gebildet, damit WASD relativ zum Blick
 * wirkt. Zeigt die Eingabe der aktuellen Bewegung entgegen, greift statt der
 * normalen Beschleunigung die deutlich härtere COUNTER-Verzögerung — das ist
 * das Verhalten, das Counterstrafen im Spiel überhaupt erst möglich macht.
 */
export function movePlayer(
  p: Player,
  cam: Camera,
  keys: Record<string, boolean>,
  dt: number,
): void {
  let ix = 0
  let iz = 0
  if (keys.KeyA) ix -= 1
  if (keys.KeyD) ix += 1
  if (keys.KeyW) iz += 1
  if (keys.KeyS) iz -= 1

  const len = Math.hypot(ix, iz)
  let wx = 0
  let wz = 0
  if (len > 0) {
    ix /= len
    iz /= len
    wx = cam.R.x * ix + cam.F.x * iz
    wz = cam.R.z * ix + cam.F.z * iz
    const l2 = Math.hypot(wx, wz)
    wx /= l2
    wz /= l2
  }

  const sp = speed(p)
  if (len > 0) {
    const dot = sp > 0.01 ? (wx * p.vx + wz * p.vz) / sp : 1
    const a = dot < COUNTER_DOT ? COUNTER : ACC
    p.vx += wx * a * dt
    p.vz += wz * a * dt
    const s2 = speed(p)
    if (s2 > RUN) {
      p.vx *= RUN / s2
      p.vz *= RUN / s2
    }
    if (dot < COUNTER_DOT && s2 < SNAP_SPEED) {
      p.vx = 0
      p.vz = 0
    }
  } else if (sp > 0) {
    const dec = Math.min(sp, FRIC * dt)
    p.vx -= (p.vx / sp) * dec
    p.vz -= (p.vz / sp) * dec
    if (speed(p) < 0.05) {
      p.vx = 0
      p.vz = 0
    }
  }

  p.x += p.vx * dt
  p.z += p.vz * dt
  p.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, p.x))
  p.z = Math.max(BOUNDS.zMin, Math.min(BOUNDS.zMax, p.z))
}
