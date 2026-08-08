import { describe, it, expect } from 'vitest'
import { DEG } from './math'
import { PITCH_LIMIT, applyMouse, basis, createCamera } from './camera'
import { radPerCount } from './sens'

const dot = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  a.x * b.x + a.y * b.y + a.z * b.z

describe('createCamera', () => {
  it('startet nach vorn ausgerichtet mit gueltiger Basis', () => {
    const cam = createCamera()
    expect(cam.yaw).toBe(0)
    expect(cam.pitch).toBe(0)
    expect(cam.F.z).toBeCloseTo(1, 10)
  })
})

describe('basis', () => {
  it('liefert drei paarweise senkrechte Einheitsvektoren', () => {
    const cam = createCamera()
    cam.yaw = 0.8
    cam.pitch = -0.3
    basis(cam)
    for (const v of [cam.F, cam.R, cam.U]) {
      expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1, 10)
    }
    expect(dot(cam.F, cam.R)).toBeCloseTo(0, 10)
    expect(dot(cam.F, cam.U)).toBeCloseTo(0, 10)
    expect(dot(cam.R, cam.U)).toBeCloseTo(0, 10)
  })

  it('haelt R waagerecht, damit Strafen nie schraeg laeuft', () => {
    const cam = createCamera()
    cam.pitch = -0.9
    basis(cam)
    expect(cam.R.y).toBe(0)
  })

  it('zeigt R bei Blick nach vorn nach rechts', () => {
    const cam = createCamera()
    expect(cam.R.x).toBeCloseTo(1, 10)
    expect(cam.R.y).toBe(0)
    expect(cam.R.z).toBeCloseTo(0, 10)
  })

  it('dreht R mit dem Blick mit', () => {
    const cam = createCamera()
    cam.yaw = Math.PI / 2
    basis(cam)
    expect(cam.R.x).toBeCloseTo(0, 10)
    expect(cam.R.z).toBeCloseTo(-1, 10)
  })
})

describe('applyMouse', () => {
  it('dreht pro Count um den Winkel aus radPerCount', () => {
    const cam = createCamera()
    applyMouse(cam, 100, 0, 0.22)
    expect(cam.yaw).toBeCloseTo(100 * radPerCount(0.22), 12)
  })

  it('hebt den Blick bei negativer Mausbewegung nach oben', () => {
    const cam = createCamera()
    applyMouse(cam, 0, -100, 0.22)
    expect(cam.pitch).toBeGreaterThan(0)
  })

  it('begrenzt den Nickwinkel auf 89 Grad', () => {
    const cam = createCamera()
    applyMouse(cam, 0, -100000, 1)
    expect(cam.pitch).toBeCloseTo(PITCH_LIMIT, 10)
    applyMouse(cam, 0, 200000, 1)
    expect(cam.pitch).toBeCloseTo(-PITCH_LIMIT, 10)
  })

  it('laesst den Gierwinkel unbegrenzt weiterlaufen', () => {
    const cam = createCamera()
    applyMouse(cam, 100000, 0, 1)
    expect(Math.abs(cam.yaw)).toBeGreaterThan(2 * Math.PI)
  })

  it('aktualisiert die Basis sofort mit', () => {
    const cam = createCamera()
    applyMouse(cam, 0, 0, 0.22)
    expect(cam.F.z).toBeCloseTo(1, 10)
    applyMouse(cam, 90 * DEG / radPerCount(1), 0, 1)
    expect(cam.F.x).toBeCloseTo(1, 6)
  })
})
