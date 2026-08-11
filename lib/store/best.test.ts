import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/lib/engine/game'
import { createGame } from '@/lib/engine/game'
import { MODES } from '@/lib/engine/modes'
import { beatsBest, clearBest, loadBest, submitBest } from './best'
import { KEY, type Store } from './keys'

function fakeStore(seed: Record<string, string> = {}): Store & { map: Map<string, string> } {
  const map = new Map(Object.entries(seed))
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v) },
    removeItem: (k) => { map.delete(k) },
  }
}

describe('beatsBest', () => {
  it('schlaegt bei hoeher-ist-besser nur mit einem groesseren Wert', () => {
    expect(beatsBest(31, 30, false)).toBe(true)
    expect(beatsBest(30, 30, false)).toBe(false)
    expect(beatsBest(29, 30, false)).toBe(false)
  })

  it('schlaegt bei niedriger-ist-besser nur mit einem kleineren Wert', () => {
    expect(beatsBest(240, 250, true)).toBe(true)
    expect(beatsBest(250, 250, true)).toBe(false)
    expect(beatsBest(260, 250, true)).toBe(false)
  })

  it('ist ohne bisherigen Wert immer wahr', () => {
    expect(beatsBest(0, undefined, false)).toBe(true)
    expect(beatsBest(9999, undefined, true)).toBe(true)
  })
})

describe('submitBest', () => {
  it('traegt einen Gridshot-Lauf ein und laesst ihn von einem schlechteren stehen', () => {
    const store = fakeStore()
    const g = createGame(MODES.gridshot, DEFAULT_SETTINGS)
    g.score = 30
    g.shots = 40
    const erst = submitBest(store, g, {})
    expect(erst.isBest).toBe(true)
    expect(erst.best.gridshot).toBe(30)

    const g2 = createGame(MODES.gridshot, DEFAULT_SETTINGS)
    g2.score = 20
    g2.shots = 25
    const zweit = submitBest(store, g2, erst.best)
    expect(zweit.isBest).toBe(false)
    expect(zweit.best.gridshot).toBe(30)
    expect(loadBest(store).gridshot).toBe(30)
  })

  it('traegt einen Reaktions-Lauf ohne Schuss nicht ein', () => {
    const store = fakeStore()
    const leer = createGame(MODES.reaction, DEFAULT_SETTINGS)
    expect(leer.shots).toBe(0)
    const nichts = submitBest(store, leer, {})
    expect(nichts.isBest).toBe(false)
    expect(nichts.best.reaction).toBeUndefined()
    expect(store.map.has(KEY.best)).toBe(false)

    const g = createGame(MODES.reaction, DEFAULT_SETTINGS)
    g.react = [250]
    g.shots = 1
    const echt = submitBest(store, g, nichts.best)
    expect(echt.isBest).toBe(true)
    expect(echt.best.reaction).toBe(250)
  })

  it('traegt einen Tracking-Lauf ohne Feuerzeit nicht ein', () => {
    const store = fakeStore()
    const g = createGame(MODES.tracking, DEFAULT_SETTINGS)
    expect(g.trackTotal).toBe(0)
    expect(g.shots).toBe(0)
    const r = submitBest(store, g, {})
    expect(r.isBest).toBe(false)
    expect(r.best.tracking).toBeUndefined()
  })
})

describe('loadBest', () => {
  it('liefert bei leerem Speicher eine leere Karte', () => {
    expect(loadBest(fakeStore())).toEqual({})
  })

  it('verwirft Nicht-Zahlen feldweise und ignoriert unbekannte Modi', () => {
    const store = fakeStore({
      [KEY.best]: JSON.stringify({ gridshot: 30, flick: 'viel', quakeshot: 99, micro: null }),
    })
    expect(loadBest(store)).toEqual({ gridshot: 30 })
  })

  it('liefert bei kaputtem JSON eine leere Karte, ohne zu werfen', () => {
    const store = fakeStore({ [KEY.best]: '{kaputt' })
    expect(() => loadBest(store)).not.toThrow()
    expect(loadBest(store)).toEqual({})
  })
})

describe('clearBest', () => {
  it('leert den Eintrag', () => {
    const store = fakeStore({ [KEY.best]: JSON.stringify({ gridshot: 30 }) })
    clearBest(store)
    expect(store.map.has(KEY.best)).toBe(false)
    expect(loadBest(store)).toEqual({})
  })
})
