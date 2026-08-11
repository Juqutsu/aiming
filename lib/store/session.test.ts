import { describe, expect, it } from 'vitest'
import { createGame, DEFAULT_SETTINGS } from '@/lib/engine/game'
import { MODES } from '@/lib/engine/modes'
import { KEY, type Store } from './keys'
import { MAX_ROWS, clearSession, loadSession, pushRun } from './session'

function fakeStore(seed: Record<string, string> = {}): Store & { map: Map<string, string> } {
  const map = new Map(Object.entries(seed))
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v) },
    removeItem: (k) => { map.delete(k) },
  }
}

function gridshotLauf(score: number) {
  const g = createGame(MODES.gridshot, DEFAULT_SETTINGS)
  g.score = score
  g.hits = score
  g.shots = score * 2
  return g
}

describe('loadSession', () => {
  it('liefert bei leerem Speicher eine leere Liste', () => {
    expect(loadSession(fakeStore())).toEqual([])
  })

  it('liefert bei kaputtem Inhalt eine leere Liste, ohne zu werfen', () => {
    const store = fakeStore({ [KEY.session]: '{kaputt' })
    expect(() => loadSession(store)).not.toThrow()
    expect(loadSession(store)).toEqual([])
  })

  it('verwirft Eintraege mit fehlenden Feldern und behaelt die intakten', () => {
    const store = fakeStore({
      [KEY.session]: JSON.stringify([
        { mode: 'Gridshot', score: 30, acc: '75 %', detail: '410 ms' },
        { mode: 'Flick', score: 12 },
        'unsinn',
      ]),
    })
    expect(loadSession(store)).toEqual([{ mode: 'Gridshot', score: 30, acc: '75 %', detail: '410 ms' }])
  })
})

describe('pushRun', () => {
  it('haengt eine Zeile aus dem beendeten Lauf an und gibt die ganze Liste zurueck', () => {
    const store = fakeStore()
    const erste = pushRun(store, gridshotLauf(30))
    expect(erste).toHaveLength(1)
    expect(erste[0].mode).toBe(MODES.gridshot.name)
    expect(erste[0].score).toBe(30)
    expect(erste[0].acc).toBe('50 %')

    const zweite = pushRun(store, gridshotLauf(10))
    expect(zweite).toHaveLength(2)
    expect(loadSession(store)).toHaveLength(2)
  })

  it('nimmt als Detail den dritten Statistik-Wert des Modus', () => {
    const store = fakeStore()
    const g = gridshotLauf(30)
    const rows = g.mode.stats(g)
    expect(pushRun(store, g)[0].detail).toBe(String(rows[2][1]))
  })

  it('setzt einen Strich, wenn der Modus keinen dritten Statistik-Wert hat', () => {
    const store = fakeStore()
    const g = gridshotLauf(30)
    // Ein Modus mit nur zwei Statistik-Zeilen ist erlaubt; die Tabelle braucht
    // trotzdem eine Zelle.
    g.mode = { ...g.mode, stats: () => [['Ziele', 30], ['Accuracy', '50 %']] }
    expect(pushRun(store, g)[0].detail).toBe('–')
  })

  it('deckelt die Liste', () => {
    const store = fakeStore()
    let letzte = loadSession(store)
    for (let i = 0; i < MAX_ROWS + 5; i++) letzte = pushRun(store, gridshotLauf(i))
    expect(letzte).toHaveLength(MAX_ROWS)
    // Der aelteste faellt raus, der juengste steht am Ende.
    expect(letzte[letzte.length - 1].score).toBe(MAX_ROWS + 4)
    expect(letzte[0].score).toBe(5)
  })
})

describe('clearSession', () => {
  it('leert den Eintrag', () => {
    const store = fakeStore()
    pushRun(store, gridshotLauf(30))
    clearSession(store)
    expect(loadSession(store)).toEqual([])
  })
})
