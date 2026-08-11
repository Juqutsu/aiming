import { describe, expect, it } from 'vitest'
import type { Run } from '@/lib/store/runs'
import { byDay, dayKey } from './days'

/** Lokale Zeit, damit der Test dieselbe Zeitzone benutzt wie die Gruppierung. */
function at(jahr: number, monat: number, tag: number, stunde: number, minute = 0): number {
  return new Date(jahr, monat - 1, tag, stunde, minute).getTime()
}

function run(t: number, patch: Partial<Run> = {}): Run {
  return {
    t, mode: 'gridshot', metric: 30, score: 30, hits: 30, shots: 40,
    dur: 60, size: 1, weapon: 'vandal', ...patch,
  }
}

describe('dayKey', () => {
  it('liefert das lokale Datum, auch spaet am Abend', () => {
    expect(dayKey(at(2026, 8, 11, 23, 50))).toBe('2026-08-11')
    expect(dayKey(at(2026, 1, 5, 0, 10))).toBe('2026-01-05')
  })
})

describe('byDay', () => {
  it('gruppiert nach lokalem Tag und zaehlt die Laeufe', () => {
    const tage = byDay([run(at(2026, 8, 10, 9)), run(at(2026, 8, 11, 8)), run(at(2026, 8, 11, 23, 50))])
    expect(tage.map((d) => [d.day, d.runs])).toEqual([['2026-08-11', 2], ['2026-08-10', 1]])
  })

  it('fuehrt jeden Modus einmal, in der Reihenfolge des ersten Laufs', () => {
    const tage = byDay([
      run(at(2026, 8, 11, 8), { mode: 'gridshot' }),
      run(at(2026, 8, 11, 9), { mode: 'flick' }),
      run(at(2026, 8, 11, 10), { mode: 'gridshot' }),
    ])
    expect(tage[0].modes).toEqual(['gridshot', 'flick'])
  })

  it('nimmt je Modus den groessten Wert', () => {
    const tage = byDay([run(at(2026, 8, 11, 8), { metric: 42 }), run(at(2026, 8, 11, 9), { metric: 30 })])
    expect(tage[0].best.gridshot).toBe(42)
  })

  it('nimmt bei lowerBetter den kleinsten Wert', () => {
    const tage = byDay([
      run(at(2026, 8, 11, 8), { mode: 'reaction', metric: 210 }),
      run(at(2026, 8, 11, 9), { mode: 'reaction', metric: 260 }),
    ])
    expect(tage[0].best.reaction).toBe(210)
  })

  it('nimmt abweichende Laeufe mit — die Tagesbilanz erzaehlt vom Training, nicht vom Vergleich', () => {
    const tage = byDay([run(at(2026, 8, 11, 8), { size: 1.5, metric: 90 })])
    expect(tage[0].runs).toBe(1)
    expect(tage[0].best.gridshot).toBe(90)
  })

  it('liefert ein leeres Array fuer keine Laeufe', () => {
    expect(byDay([])).toEqual([])
  })
})
