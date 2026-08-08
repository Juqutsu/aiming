import { DEG } from './math'

/** Valorants horizontaler FOV bei 16:9. */
export const HFOV_DEG = 103

/**
 * Vertikaler Öffnungswinkel in Radiant.
 *
 * Valorant nutzt Hor+: der horizontale FOV wächst mit breiteren Formaten, der
 * vertikale bleibt konstant. Genau dieser vertikale Wert ist das, was
 * THREE.PerspectiveCamera als `fov` erwartet — er gilt für jedes Seitenverhältnis.
 */
export const VFOV = 2 * Math.atan(Math.tan((HFOV_DEG / 2) * DEG) * (9 / 16))
export const VFOV_DEG = VFOV / DEG

/** Grad pro Maus-Count bei Sensitivity 1, als Radiant. */
const RAD_PER_COUNT_AT_1 = 0.07 * DEG

/** Winkel in Radiant, um den sich die Kamera pro Maus-Count dreht. */
export function radPerCount(sens: number): number {
  return sens * RAD_PER_COUNT_AT_1
}

/** Maus-Counts für eine volle 360-Grad-Drehung. */
export function counts360(sens: number): number {
  return 360 / (0.07 * sens)
}

/** Zentimeter Mausweg für eine volle 360-Grad-Drehung. */
export function cm360(sens: number, dpi: number): number {
  return (counts360(sens) / dpi) * 2.54
}

export function edpi(sens: number, dpi: number): number {
  return sens * dpi
}
