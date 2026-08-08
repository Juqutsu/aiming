import { describe, it, expect } from 'vitest'
import { speed } from './math'
import { createCamera } from './camera'
import { BOUNDS, COUNTER, EYE, FRIC, RUN, createPlayer, movePlayer } from './movement'
import type { Player } from './types'

/** Hält `keys` für `seconds` gedrückt, in Schritten von 4 Millisekunden. */
function hold(p: Player, keys: Record<string, boolean>, seconds: number) {
  const cam = createCamera()
  const step = 0.004
  for (let t = 0; t < seconds; t += step) movePlayer(p, cam, keys, step)
}

describe('Konstanten', () => {
  it('entspricht den Werten aus dem Original', () => {
    expect(RUN).toBe(6.75)
    expect(FRIC).toBe(34)
    expect(COUNTER).toBe(130)
    expect(EYE).toBe(1.65)
  })
})

describe('movePlayer', () => {
  it('beschleunigt auf hoechstens Laufgeschwindigkeit', () => {
    const p = createPlayer()
    hold(p, { KeyD: true }, 2)
    expect(speed(p)).toBeCloseTo(RUN, 6)
  })

  it('laeuft bei gedrueckter D-Taste nach rechts', () => {
    const p = createPlayer()
    hold(p, { KeyD: true }, 0.5)
    expect(p.vx).toBeGreaterThan(0)
  })

  it('bremst ohne Eingabe binnen 250 ms vollstaendig ab', () => {
    const p = createPlayer()
    hold(p, { KeyD: true }, 2)
    hold(p, {}, 0.25)
    expect(speed(p)).toBe(0)
  })

  it('bringt Gegentippen das Tempo binnen 60 ms unter die Schussschwelle', () => {
    const p = createPlayer()
    hold(p, { KeyD: true }, 2)
    expect(speed(p)).toBeCloseTo(RUN, 6)
    hold(p, { KeyA: true }, 0.06)
    expect(speed(p)).toBeLessThanOrEqual(1)
  })

  it('bremst beim Gegentippen haerter als blosses Loslassen', () => {
    const counter = createPlayer()
    hold(counter, { KeyD: true }, 2)
    hold(counter, { KeyA: true }, 0.04)

    const released = createPlayer()
    hold(released, { KeyD: true }, 2)
    hold(released, {}, 0.04)

    expect(speed(counter)).toBeLessThan(speed(released))
  })

  it('haelt diagonale Bewegung auf Laufgeschwindigkeit statt sie zu addieren', () => {
    const p = createPlayer()
    hold(p, { KeyW: true, KeyD: true }, 2)
    expect(speed(p)).toBeCloseTo(RUN, 6)
  })

  it('bleibt innerhalb der Range-Grenzen', () => {
    const p = createPlayer()
    hold(p, { KeyD: true }, 10)
    expect(p.x).toBeLessThanOrEqual(BOUNDS.x)
    const q = createPlayer()
    hold(q, { KeyW: true }, 10)
    expect(q.z).toBeLessThanOrEqual(BOUNDS.zMax)
  })

  it('haelt die Augenhoehe konstant', () => {
    const p = createPlayer()
    hold(p, { KeyW: true, KeyA: true }, 1)
    expect(p.y).toBe(EYE)
  })
})
