import { DEG, clamp, dirFrom } from './math'
import type { GameState, Target } from './types'

/** Ziele bleiben in diesem Kegel, damit sie nicht im Boden oder hinter dem Spieler landen. */
const PITCH_MIN = -22 * DEG
const PITCH_MAX = 26 * DEG
const YAW_LIMIT = 58 * DEG
/** Mindestabstand der Kugelunterkante zum Boden. */
const FLOOR_CLEARANCE = 0.35

/**
 * Ein Ziel in `dist` Metern Entfernung, um `minDeg` bis `maxDeg` Grad neben der
 * aktuellen Blickrichtung — in zufälliger Richtung auf diesem Kegel.
 *
 * Der Versatz ist bewusst relativ zum Blick und nicht zur Welt: nur so erzwingt
 * der Modus jedes Mal einen echten Flick statt einer Mikrokorrektur.
 */
export function spawnAtAngle(
  g: GameState,
  minDeg: number,
  maxDeg: number,
  dist: number,
  r: number,
): Target {
  const ang = (minDeg + g.rng() * (maxDeg - minDeg)) * DEG
  const rot = g.rng() * Math.PI * 2
  const dPitch = Math.cos(rot) * ang
  const dYaw = Math.sin(rot) * ang

  const yaw = clamp(g.camera.yaw + dYaw, -YAW_LIMIT, YAW_LIMIT)
  const pitch = clamp(g.camera.pitch + dPitch, PITCH_MIN, PITCH_MAX)
  const d = dirFrom(yaw, pitch)

  const t: Target = {
    x: g.player.x + d.x * dist,
    y: g.player.y + d.y * dist,
    z: g.player.z + d.z * dist,
    r,
    dead: false,
    born: g.t,
  }
  if (t.y < r + FLOOR_CLEARANCE) t.y = r + FLOOR_CLEARANCE
  return t
}

/** Ein Ziel an zufälliger Stelle einer festen Wandfläche in `z` Metern Entfernung. */
export function slotTarget(
  g: GameState,
  r: number,
  xr: number,
  ylo: number,
  yhi: number,
  z: number,
): Target {
  return {
    x: (g.rng() * 2 - 1) * xr,
    y: ylo + g.rng() * (yhi - ylo),
    z,
    r,
    dead: false,
    born: g.t,
  }
}
