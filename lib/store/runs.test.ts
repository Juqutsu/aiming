import { describe, expect, it } from 'vitest'
import { createGame, DEFAULT_SETTINGS } from '@/lib/engine/game'
import { MODES } from '@/lib/engine/modes'
import { KEY, type Store } from './keys'
import { MAX_RUNS, clearRuns, isStandard, loadRuns, pushRun, sessionStart, type Run } from './runs'

function fakeStore(seed: Record<string, string> = {}): Store & { map: Map<string, string> } {
  const map = new Map(Object.entries(seed))
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v) },
    removeItem: (k) => { map.delete(k) },
  }
}

/** Ein beendeter Gridshot-Lauf. `sizeMul` und `dur` sind die Stellschrauben der Vergleichbarkeit. */
function lauf(score: number, patch: Partial<{ sizeMul: number; dur: number }> = {}) {
  const g = createGame(MODES.gridshot, { ...DEFAULT_SETTINGS, ...patch })
  g.score = score
  g.hits = score
  g.shots = score * 2
  return g
}

describe('loadRuns', () => {
  it('liefert bei leerem Speicher eine leere Liste', () => {
    expect(loadRuns(fakeStore())).toEqual([])
  })

  it('liefert bei kaputtem Inhalt eine leere Liste, ohne zu werfen', () => {
    const store = fakeStore({ [KEY.runs]: '{kaputt' })
    expect(() => loadRuns(store)).not.toThrow()
    expect(loadRuns(store)).toEqual([])
  })

  it('wirft einzelne unbrauchbare Eintraege weg und behaelt die guten', () => {
    const gut: Run = {
      t: 1000, mode: 'gridshot', metric: 30, score: 30, hits: 30, shots: 40,
      dur: 60, size: 1, weapon: 'vandal',
    }
    const store = fakeStore({
      [KEY.runs]: JSON.stringify([gut, { ...gut, mode: 'gibtesnicht' }, { ...gut, metric: 'viel' }, null]),
    })
    expect(loadRuns(store)).toEqual([gut])
  })
})

describe('pushRun', () => {
  it('traegt einen Lauf mit Zeitstempel und Bedingungen ein', () => {
    const store = fakeStore()
    const alle = pushRun(store, lauf(30), 1_700_000_000_000)
    expect(alle).toHaveLength(1)
    expect(alle[0]).toEqual({
      t: 1_700_000_000_000, mode: 'gridshot', metric: 30, score: 30, hits: 30, shots: 60,
      dur: 60, size: 1, weapon: 'vandal',
    })
    expect(loadRuns(store)).toEqual(alle)
  })

  it('haengt hinten an, aeltester zuerst', () => {
    const store = fakeStore()
    pushRun(store, lauf(10), 1000)
    const alle = pushRun(store, lauf(20), 2000)
    expect(alle.map((r) => r.metric)).toEqual([10, 20])
  })

  it('traegt einen Lauf ohne Messung nicht ein', () => {
    const store = fakeStore()
    const leer = createGame(MODES.reaction, DEFAULT_SETTINGS)
    expect(pushRun(store, leer, 1000)).toEqual([])
    expect(store.map.has(KEY.runs)).toBe(false)
  })

  // shots > 0 allein reicht nicht: ein Fehlstart oder ein Fehlschuss zaehlt
  // den Schuss, ohne react zu fuellen — reaction.metric() gaebe 9999 zurueck.
  it('traegt einen Reaktions-Fehlstart ohne react nicht ein', () => {
    const store = fakeStore()
    const fehlstart = createGame(MODES.reaction, DEFAULT_SETTINGS)
    fehlstart.shots = 1
    expect(fehlstart.react).toEqual([])
    expect(pushRun(store, fehlstart, 1000)).toEqual([])
    expect(store.map.has(KEY.runs)).toBe(false)
  })

  it('haelt den Deckel und wirft den aeltesten heraus', () => {
    const store = fakeStore()
    let alle: Run[] = []
    // Ab 1, weil ein Lauf mit Score 0 auch keinen Schuss hat und gar nicht erst
    // eingetragen wird. MAX_RUNS + 1 Eintraege erzwingen genau eine Verdraengung.
    for (let i = 1; i <= MAX_RUNS + 1; i++) alle = pushRun(store, lauf(i), 1000 + i)
    expect(alle).toHaveLength(MAX_RUNS)
    expect(alle[0].metric).toBe(2)
    expect(alle[MAX_RUNS - 1].metric).toBe(MAX_RUNS + 1)
  })
})

describe('isStandard', () => {
  it('gilt bei Standarddauer und Standardgroesse, unabhaengig von der Waffe', () => {
    const store = fakeStore()
    const [r] = pushRun(store, lauf(30), 1000)
    expect(isStandard(r)).toBe(true)
    expect(isStandard({ ...r, weapon: 'phantom' })).toBe(true)
  })

  it('gilt nicht bei abweichender Zielgroesse oder Dauer', () => {
    const store = fakeStore()
    const [gross] = pushRun(store, lauf(30, { sizeMul: 1.5 }), 1000)
    expect(isStandard(gross)).toBe(false)
    expect(isStandard({ ...gross, size: 1, dur: 90 })).toBe(false)
  })

  // Reaktion ist keine kumulative Metrik (Ø ms) — eine Routinen-Station mit
  // abweichender Sekundenzahl bleibt trotzdem vergleichbar.
  it('gilt bei einer Rate-Metrik unabhaengig von der Rundenzeit', () => {
    const rate: Run = {
      t: 1000, mode: 'reaction', metric: 250, score: 1, hits: 1, shots: 1,
      dur: 45, size: 1, weapon: 'vandal',
    }
    expect(isStandard(rate)).toBe(true)
  })

  // Ziele ist eine Summe ueber die Runde — eine Station mit abweichender
  // Sekundenzahl ist deshalb nicht mehr vergleichbar.
  it('gilt bei einer kumulativen Metrik nicht bei abweichender Rundenzeit', () => {
    const summe: Run = {
      t: 1000, mode: 'gridshot', metric: 30, score: 30, hits: 30, shots: 40,
      dur: 45, size: 1, weapon: 'vandal',
    }
    expect(isStandard(summe)).toBe(false)
  })

  it('gilt bei abweichender Zielgroesse nicht, auch bei einer Rate-Metrik', () => {
    const rate: Run = {
      t: 1000, mode: 'reaction', metric: 250, score: 1, hits: 1, shots: 1,
      dur: 60, size: 1.5, weapon: 'vandal',
    }
    expect(isStandard(rate)).toBe(false)
  })
})

describe('clearRuns', () => {
  it('leert den Verlauf', () => {
    const store = fakeStore()
    pushRun(store, lauf(30), 1000)
    clearRuns(store)
    expect(loadRuns(store)).toEqual([])
  })
})

describe('sessionStart', () => {
  it('setzt den Zeitstempel beim ersten Lesen und haelt ihn danach fest', () => {
    const store = fakeStore()
    expect(sessionStart(store, 5000)).toBe(5000)
    expect(sessionStart(store, 9000)).toBe(5000)
  })

  it('ersetzt einen kaputten Zeitstempel durch den aktuellen', () => {
    const store = fakeStore({ [KEY.sessionStart]: '"gestern"' })
    expect(sessionStart(store, 7000)).toBe(7000)
  })
})
