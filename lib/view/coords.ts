import { Camera, Vector3 } from 'three'
import type { Vec3 } from '@/lib/engine/types'

/**
 * Engine-Weltpunkt als Three-Position.
 *
 * Die Engine blickt bei yaw 0 nach +Z und hat rechts +X. Three.js blickt
 * ungedreht nach -Z, rechts ist ebenfalls +X. Eine 180-Grad-Drehung der Kamera
 * würde zwar die Blickrichtung treffen, aber den Rechtsvektor mitdrehen — die
 * Welt wäre seitenverkehrt. Stattdessen wird die z-Achse beim Übertragen
 * gespiegelt. Jede Weltposition in der Szene muss durch diese Funktion.
 */
export function toThree(v: Vec3): [number, number, number] {
  return [v.x, v.y, -v.z]
}

/** Dieselbe Spiegelung für einen einzelnen z-Wert, etwa eine Wandtiefe. */
export function tz(z: number): number {
  return -z
}

/**
 * Kameradrehung in Three-Konvention, passend zur gespiegelten z-Achse.
 * Die Reihenfolge muss `YXZ` sein: nur so bleibt die lokale x-Achse waagerecht,
 * genau wie der bewusst waagerechte Rechtsvektor der Engine.
 */
export function camEuler(yaw: number, pitch: number): [number, number, number] {
  return [pitch, -yaw, 0]
}

/** Wiederverwendeter Vektor für project(): läuft pro Frame und Effekt, keine Allokation pro Aufruf. */
const scratch = new Vector3()

/** Bildpunkt zu einer Weltposition, oder null wenn sie hinter der Kamera liegt. */
export function project(
  v: Vec3, camera: Camera, width: number, height: number,
): { x: number; y: number } | null {
  scratch.set(...toThree(v)).project(camera)
  // z über 1 heißt hinter der Kamera — dort gibt es keinen Bildpunkt.
  if (scratch.z > 1) return null
  return {
    x: (scratch.x * 0.5 + 0.5) * width,
    y: (-scratch.y * 0.5 + 0.5) * height,
  }
}
