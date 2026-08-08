import type { WeaponId } from './types'

export type Weapon = {
  name: string
  /** Schuss pro Magazin. */
  mag: number
  /** Schuss pro Sekunde. */
  rps: number
  dmg: number
  /**
   * Sprühmuster als [horizontal, vertikal] in Grad, relativ zum ersten Schuss.
   * Nachempfunden, nicht aus Spieldaten ausgelesen.
   */
  pat: [number, number][]
}

export const WEAPONS: Record<WeaponId, Weapon> = {
  vandal: {
    name: 'Vandal',
    mag: 25,
    rps: 9.75,
    dmg: 39,
    pat: [
      [0, 0], [0, 0.55], [0.05, 1.25], [0.05, 2.0], [0, 2.8],
      [-0.05, 3.55], [-0.1, 4.25], [-0.15, 4.85], [-0.2, 5.35], [-0.2, 5.8],
      [-0.1, 6.1], [0.15, 6.35], [0.55, 6.55], [1.05, 6.72], [1.55, 6.85],
      [1.95, 6.94], [2.1, 7.0], [1.85, 7.06], [1.3, 7.1], [0.5, 7.14],
      [-0.4, 7.18], [-1.2, 7.22], [-1.8, 7.26], [-2.05, 7.3], [-1.75, 7.34],
    ],
  },
  phantom: {
    name: 'Phantom',
    mag: 30,
    rps: 11,
    dmg: 35,
    pat: [
      [0, 0], [0, 0.45], [0.04, 1.05], [0.04, 1.7], [0, 2.35],
      [-0.04, 3.0], [-0.08, 3.55], [-0.12, 4.05], [-0.16, 4.5], [-0.16, 4.9],
      [-0.08, 5.2], [0.12, 5.45], [0.45, 5.65], [0.88, 5.8], [1.3, 5.92],
      [1.62, 6.0], [1.75, 6.06], [1.55, 6.11], [1.1, 6.15], [0.42, 6.19],
      [-0.34, 6.22], [-1.0, 6.25], [-1.5, 6.28], [-1.72, 6.31], [-1.5, 6.34],
      [-1.0, 6.37], [-0.3, 6.4], [0.4, 6.43], [1.0, 6.46], [1.3, 6.49],
    ],
  },
}
