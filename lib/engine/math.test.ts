import { describe, it, expect } from 'vitest'
import { DEG, clamp, dirFrom, raySphere, rayHitBest, segCross, speed } from './math'
import type { Target } from './types'

const target = (over: Partial<Target> = {}): Target => ({
  x: 0, y: 1.65, z: 10, r: 0.4, dead: false, born: 0, ...over,
})

const ORIGIN = { x: 0, y: 1.65, z: 0 }
const FORWARD = { x: 0, y: 0, z: 1 }

describe('dirFrom', () => {
  it('blickt bei yaw 0 und pitch 0 entlang +z', () => {
    const d = dirFrom(0, 0)
    expect(d.x).toBeCloseTo(0, 10)
    expect(d.y).toBeCloseTo(0, 10)
    expect(d.z).toBeCloseTo(1, 10)
  })

  it('blickt bei yaw 90 Grad entlang +x', () => {
    const d = dirFrom(90 * DEG, 0)
    expect(d.x).toBeCloseTo(1, 10)
    expect(d.z).toBeCloseTo(0, 10)
  })

  it('liefert immer einen Einheitsvektor', () => {
    const d = dirFrom(1.2, -0.4)
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1, 10)
  })
})

describe('raySphere', () => {
  it('trifft ein Ziel direkt voraus und liefert den Abstand zur Oberflaeche', () => {
    const d = raySphere(ORIGIN, FORWARD, target())
    expect(d).toBeCloseTo(10 - 0.4, 6)
  })

  it('verfehlt ein Ziel seitlich neben dem Strahl', () => {
    expect(raySphere(ORIGIN, FORWARD, target({ x: 2 }))).toBe(-1)
  })

  it('verfehlt ein Ziel hinter der Kamera', () => {
    expect(raySphere(ORIGIN, FORWARD, target({ z: -10 }))).toBe(-1)
  })

  it('trifft am aeusseren Rand des Radius noch', () => {
    expect(raySphere(ORIGIN, FORWARD, target({ x: 0.39 }))).toBeGreaterThan(0)
  })

  it('verfehlt knapp ausserhalb des Radius', () => {
    expect(raySphere(ORIGIN, FORWARD, target({ x: 0.41 }))).toBe(-1)
  })
})

describe('rayHitBest', () => {
  it('waehlt bei zwei Treffern das naehere Ziel', () => {
    const nah = target({ z: 5 })
    const fern = target({ z: 15 })
    expect(rayHitBest(ORIGIN, FORWARD, [fern, nah])).toBe(nah)
  })

  it('ignoriert tote Ziele', () => {
    const tot = target({ z: 5, dead: true })
    const lebend = target({ z: 15 })
    expect(rayHitBest(ORIGIN, FORWARD, [tot, lebend])).toBe(lebend)
  })

  it('ignoriert versteckte Ziele', () => {
    const versteckt = target({ z: 5, hidden: true })
    expect(rayHitBest(ORIGIN, FORWARD, [versteckt])).toBe(null)
  })

  it('liefert null wenn nichts getroffen wird', () => {
    expect(rayHitBest(ORIGIN, FORWARD, [target({ x: 9 })])).toBe(null)
  })
})

describe('segCross', () => {
  it('erkennt zwei sich kreuzende Strecken', () => {
    expect(segCross(-1, 0, 1, 0, 0, -1, 0, 1)).toBe(true)
  })

  it('erkennt zwei sich verfehlende Strecken', () => {
    expect(segCross(-1, 0, -0.5, 0, 0, -1, 0, 1)).toBe(false)
  })
})

describe('clamp', () => {
  it('begrenzt nach unten und oben und laesst Werte dazwischen unveraendert', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
    expect(clamp(5, 0, 10)).toBe(5)
  })
})

describe('speed', () => {
  it('liefert den Betrag der horizontalen Geschwindigkeit', () => {
    expect(speed({ x: 0, y: 1.65, z: 0, vx: 3, vz: 4 })).toBeCloseTo(5, 10)
  })
})
