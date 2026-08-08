import { describe, it, expect } from 'vitest'
import { createCamera } from './camera'
import { DEG } from './math'
import { createPlayer } from './movement'
import { slotTarget, spawnAtAngle } from './spawn'
import type { GameState, Vec3 } from './types'

/** Zufall, der eine feste Folge abspielt und danach zyklisch von vorn beginnt. */
function seq(values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

function stubState(rng: () => number): GameState {
  return {
    player: createPlayer(),
    camera: createCamera(),
    rng,
    t: 3,
  } as unknown as GameState
}

/** Winkel zwischen Blickrichtung und der Richtung zum Ziel, in Grad. */
function offsetDeg(g: GameState, t: Vec3) {
  const dx = t.x - g.player.x
  const dy = t.y - g.player.y
  const dz = t.z - g.player.z
  const len = Math.hypot(dx, dy, dz)
  const dot = (dx * g.camera.F.x + dy * g.camera.F.y + dz * g.camera.F.z) / len
  return Math.acos(Math.min(1, Math.max(-1, dot))) / DEG
}

describe('spawnAtAngle', () => {
  it('legt das Ziel im gewuenschten Winkelbereich zur Blickrichtung ab', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
      const g = stubState(seq([r]))
      const t = spawnAtAngle(g, 12, 34, 16, 0.34)
      // Die Bodenkorrektur hat Vorrang vor der Winkelgarantie: wurde das Ziel
      // angehoben, liegt es bewusst naeher an der Blickachse als bestellt.
      if (t.y === 0.34 + 0.35) continue
      const off = offsetDeg(g, t)
      expect(off).toBeGreaterThanOrEqual(11.9)
      expect(off).toBeLessThanOrEqual(34.1)
    }
  })

  it('prueft mindestens ein Ziel ohne Bodenkorrektur', () => {
    let geprueft = 0
    for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
      const g = stubState(seq([r]))
      const t = spawnAtAngle(g, 12, 34, 16, 0.34)
      if (t.y !== 0.34 + 0.35) geprueft++
    }
    expect(geprueft).toBeGreaterThanOrEqual(4)
  })

  it('merkt sich den Erscheinungszeitpunkt fuer die TTK-Messung', () => {
    const g = stubState(seq([0.5]))
    expect(spawnAtAngle(g, 12, 34, 16, 0.34).born).toBe(3)
  })

  it('hebt Ziele an, die sonst im Boden stecken wuerden', () => {
    const g = stubState(seq([1, 0.5]))
    g.camera.pitch = -80 * DEG
    const t = spawnAtAngle(g, 12, 34, 16, 0.34)
    expect(t.y).toBeGreaterThanOrEqual(0.34 + 0.35)
  })

  it('erzeugt lebende Ziele', () => {
    const g = stubState(seq([0.5]))
    expect(spawnAtAngle(g, 12, 34, 16, 0.34).dead).toBe(false)
  })
})

describe('slotTarget', () => {
  it('bleibt in der vorgegebenen Box', () => {
    for (const r of [0, 0.5, 1]) {
      const g = stubState(seq([r]))
      const t = slotTarget(g, 0.4, 6.2, 0.9, 3.4, 17)
      expect(Math.abs(t.x)).toBeLessThanOrEqual(6.2)
      expect(t.y).toBeGreaterThanOrEqual(0.9)
      expect(t.y).toBeLessThanOrEqual(3.4)
      expect(t.z).toBe(17)
    }
  })

  it('uebernimmt Radius und Erscheinungszeitpunkt', () => {
    const g = stubState(seq([0.5]))
    const t = slotTarget(g, 0.42, 6.2, 0.9, 3.4, 17)
    expect(t.r).toBe(0.42)
    expect(t.born).toBe(3)
  })
})
