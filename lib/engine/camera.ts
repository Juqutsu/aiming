import { DEG, clamp } from './math'
import { radPerCount } from './sens'
import type { Camera } from './types'

/** Blick knapp unter senkrecht, wie im Original. */
export const PITCH_LIMIT = 89 * DEG

export function createCamera(): Camera {
  const cam: Camera = {
    yaw: 0,
    pitch: 0,
    F: { x: 0, y: 0, z: 1 },
    R: { x: 1, y: 0, z: 0 },
    U: { x: 0, y: 1, z: 0 },
  }
  basis(cam)
  return cam
}

/**
 * Berechnet die orthonormale Basis aus yaw und pitch.
 *
 * R bleibt bewusst waagerecht (y = 0): Strafen soll auch bei geneigtem Blick
 * seitwärts über den Boden laufen und nicht in die Schräge kippen.
 */
export function basis(cam: Camera): void {
  const cp = Math.cos(cam.pitch)
  const sp = Math.sin(cam.pitch)
  const sy = Math.sin(cam.yaw)
  const cy = Math.cos(cam.yaw)
  cam.F = { x: cp * sy, y: sp, z: cp * cy }
  cam.R = { x: cy, y: 0, z: -sy }
  cam.U = {
    x: cam.F.y * cam.R.z - cam.F.z * cam.R.y,
    y: cam.F.z * cam.R.x - cam.F.x * cam.R.z,
    z: cam.F.x * cam.R.y - cam.F.y * cam.R.x,
  }
}

/**
 * Wendet rohe Mausbewegung an. `dx`/`dy` sind Counts aus dem Pointer-Lock-Event,
 * nicht Pixel. Positives `dy` heißt Maus nach unten, also Blick nach unten.
 */
export function applyMouse(cam: Camera, dx: number, dy: number, sens: number): void {
  const k = radPerCount(sens)
  cam.yaw += dx * k
  cam.pitch = clamp(cam.pitch - dy * k, -PITCH_LIMIT, PITCH_LIMIT)
  basis(cam)
}
