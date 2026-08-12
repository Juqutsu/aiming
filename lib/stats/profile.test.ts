import { describe, expect, it } from 'vitest'
import type { Run } from '@/lib/store/runs'
import { barFill, profile } from './profile'

function run(patch: Partial<Run>): Run {
  return {
    t: 1000, mode: 'gridshot', metric: 30, score: 30, hits: 30, shots: 40,
    dur: 60, size: 1, weapon: 'vandal', ...patch,
  }
}

/** Läufe mit aufsteigender Zeit, damit „die letzten fünf" definiert sind. */
function serie(mode: Run['mode'], werte: number[], patch: Partial<Run> = {}): Run[] {
  return werte.map((metric, i) => run({ mode, metric, t: 1000 + i, ...patch }))
}

describe('profile', () => {
  it('laesst Modi mit weniger als zwei vergleichbaren Laeufen weg', () => {
    expect(profile(serie('gridshot', [30]))).toEqual([])
  })

  it('rechnet Schnitt, juengsten Schnitt und Abweichung', () => {
    const [zeile] = profile(serie('gridshot', [10, 20, 30, 40, 50, 60]))
    expect(zeile.runs).toBe(6)
    expect(zeile.average).toBe(35)
    // Die letzten fuenf: 20..60
    expect(zeile.recent).toBe(40)
    expect(Math.round(zeile.delta)).toBe(14)
  })

  it('dreht das Vorzeichen bei lowerBetter: schneller ist besser', () => {
    const [zeile] = profile(serie('reaction', [300, 300, 300, 300, 300, 200]))
    expect(zeile.recent).toBeLessThan(zeile.average)
    expect(zeile.delta).toBeGreaterThan(0)
  })

  it('laesst abweichende Laeufe aus der Rechnung heraus', () => {
    const laeufe = [...serie('gridshot', [10, 20]), ...serie('gridshot', [900, 900], { size: 1.5 })]
    const [zeile] = profile(laeufe)
    expect(zeile.runs).toBe(2)
    expect(zeile.average).toBe(15)
  })

  it('sortiert das Schwaechste nach oben', () => {
    const laeufe = [...serie('gridshot', [10, 10, 10, 10, 10, 20]), ...serie('flick', [20, 20, 20, 20, 20, 10])]
    expect(profile(laeufe).map((z) => z.mode)).toEqual(['flick', 'gridshot'])
  })
})

describe('barFill', () => {
  it('setzt den eigenen Schnitt in die Mitte', () => {
    expect(barFill(0)).toBeCloseTo(0.5)
  })

  it('klemmt an beiden Raendern', () => {
    expect(barFill(80)).toBe(1)
    expect(barFill(-80)).toBeGreaterThan(0)
    expect(barFill(-80)).toBeLessThan(0.1)
  })
})
