import { describe, expect, it } from 'vitest'
import type { Run } from '@/lib/store/runs'
import { inPeriod } from './period'

const TAG = 86_400_000
const JETZT = 1_700_000_000_000

function run(tageHer: number): Run {
  return {
    t: JETZT - tageHer * TAG, mode: 'gridshot', metric: 30, score: 30, hits: 30, shots: 40,
    dur: 60, size: 1, weapon: 'vandal',
  }
}

describe('inPeriod', () => {
  const laeufe = [run(40), run(20), run(3), run(0)]

  it('behaelt bei sieben Tagen nur die juengsten', () => {
    expect(inPeriod(laeufe, '7d', JETZT).map((r) => r.t)).toEqual([run(3).t, run(0).t])
  })

  it('behaelt bei dreissig Tagen auch den zwanzig Tage alten', () => {
    expect(inPeriod(laeufe, '30d', JETZT)).toHaveLength(3)
  })

  it('filtert bei alles gar nicht', () => {
    expect(inPeriod(laeufe, 'all', JETZT)).toEqual(laeufe)
  })

  it('nimmt den Lauf genau auf der Grenze mit', () => {
    expect(inPeriod([run(7)], '7d', JETZT)).toHaveLength(1)
  })
})
