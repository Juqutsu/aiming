import { describe, it, expect } from 'vitest'
import { DEG } from './math'
import { HFOV_DEG, VFOV, VFOV_DEG, cm360, counts360, edpi, radPerCount } from './sens'

describe('FOV', () => {
  it('nutzt 103 Grad horizontal bei 16:9', () => {
    expect(HFOV_DEG).toBe(103)
  })

  it('leitet daraus rund 70,5 Grad vertikal ab', () => {
    expect(VFOV_DEG).toBeCloseTo(70.53, 1)
  })

  it('gibt VFOV in Radiant passend zu VFOV_DEG aus', () => {
    expect(VFOV).toBeCloseTo(VFOV_DEG * DEG, 10)
  })
})

describe('radPerCount', () => {
  it('dreht bei Sens 1 um 0,07 Grad pro Count', () => {
    expect(radPerCount(1) / DEG).toBeCloseTo(0.07, 10)
  })

  it('skaliert linear mit der Sensitivity', () => {
    expect(radPerCount(0.5)).toBeCloseTo(radPerCount(1) / 2, 12)
  })
})

describe('counts360', () => {
  it('braucht bei Sens 0,22 rund 23377 Counts fuer eine volle Drehung', () => {
    expect(counts360(0.22)).toBeCloseTo(23376.6, 1)
  })
})

describe('cm360', () => {
  it('ergibt bei Sens 0,22 und 800 DPI rund 74,2 cm', () => {
    expect(cm360(0.22, 800)).toBeCloseTo(74.2, 1)
  })

  it('halbiert sich bei doppelter DPI', () => {
    expect(cm360(0.22, 1600)).toBeCloseTo(cm360(0.22, 800) / 2, 10)
  })
})

describe('edpi', () => {
  it('multipliziert Sensitivity mit DPI', () => {
    expect(edpi(0.22, 800)).toBeCloseTo(176, 10)
  })
})
