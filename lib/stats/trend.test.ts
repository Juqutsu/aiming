import { describe, expect, it } from 'vitest'
import type { Run } from '@/lib/store/runs'
import { bestIndex, trend } from './trend'

function run(patch: Partial<Run>): Run {
  return {
    t: 1000, mode: 'gridshot', metric: 30, score: 30, hits: 30, shots: 40,
    dur: 60, size: 1, weapon: 'vandal', ...patch,
  }
}

describe('trend', () => {
  it('nimmt nur den gefragten Modus und sortiert nach Zeit', () => {
    const laeufe = [run({ t: 3000, metric: 33 }), run({ t: 1000, metric: 11 }), run({ t: 2000, mode: 'flick' })]
    expect(trend(laeufe, 'gridshot').map((p) => p.metric)).toEqual([11, 33])
  })

  it('markiert Standardbedingungen und nennt die Waffe', () => {
    const [p] = trend([run({ weapon: 'phantom' })], 'gridshot')
    expect(p.standard).toBe(true)
    expect(p.note).toBe('Phantom')
  })

  it('nennt jede Abweichung im Text und markiert den Punkt als abweichend', () => {
    const [p] = trend([run({ size: 1.5, dur: 90 })], 'gridshot')
    expect(p.standard).toBe(false)
    expect(p.note).toBe('Vandal · 90 s · Ziele 150 %')
  })

  it('liefert fuer einen Modus ohne Lauf eine leere Liste', () => {
    expect(trend([run({})], 'reaction')).toEqual([])
  })
})

describe('bestIndex', () => {
  const punkte = trend([run({ t: 1, metric: 20 }), run({ t: 2, metric: 40 }), run({ t: 3, metric: 30 })], 'gridshot')

  it('zeigt bei hoeher-ist-besser auf den groessten Wert', () => {
    expect(bestIndex(punkte, false)).toBe(1)
  })

  it('zeigt bei niedriger-ist-besser auf den kleinsten Wert', () => {
    expect(bestIndex(punkte, true)).toBe(0)
  })

  it('liefert ohne Punkte minus eins', () => {
    expect(bestIndex([], false)).toBe(-1)
  })
})
