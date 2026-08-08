import { describe, it, expect } from 'vitest'
import { coachLine } from './coach'
import { DEFAULT_SETTINGS, createGame, fire, tick } from './game'
import { MODES, MODE_LIST } from './modes'
import { ROUTINES } from './routines'
import type { GameState, Input, ModeDef } from './types'

/** Deterministischer Zufall, damit ein Fehlschlag reproduzierbar bleibt. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

/** Spielt eine volle Runde mit wechselnder Eingabe durch. */
function playthrough(mode: ModeDef): GameState {
  const rng = seeded(7)
  const g = createGame(mode, DEFAULT_SETTINGS, 10, rng)
  const step = 1 / 120
  let frame = 0
  while (!g.over) {
    const input: Input = {
      keys: { KeyA: frame % 60 < 30, KeyD: frame % 60 >= 30 },
      mouseDown: frame % 20 < 10,
    }
    tick(g, input, step)
    if (frame % 15 === 0) fire(g)
    // Die Ansicht leert diese Listen jeden Frame — hier wird das nachgestellt.
    g.fx.length = 0
    g.sounds.length = 0
    frame++
  }
  return g
}

describe('MODES', () => {
  it('kennt genau elf Modi', () => {
    expect(MODE_LIST).toHaveLength(11)
  })

  it('schluesselt jeden Modus unter seiner eigenen id', () => {
    for (const [key, mode] of Object.entries(MODES)) {
      expect(mode.id).toBe(key)
    }
  })

  it('gibt jedem Modus die Pflichtfelder', () => {
    for (const m of MODE_LIST) {
      expect(m.name.length).toBeGreaterThan(0)
      expect(m.desc.length).toBeGreaterThan(0)
      expect(m.hint.length).toBeGreaterThan(0)
      expect(m.metricName.length).toBeGreaterThan(0)
      expect(['aim', 'spray', 'move']).toContain(m.cat)
    }
  })

  it('gibt jedem Modus entweder fire oder hold', () => {
    for (const m of MODE_LIST) {
      expect(Boolean(m.fire) || Boolean(m.hold)).toBe(true)
    }
  })
})

describe('Gesamtsimulation', () => {
  for (const mode of MODE_LIST) {
    it(`spielt ${mode.name} eine volle Runde ohne Fehler durch`, () => {
      const g = playthrough(mode)
      expect(g.over).toBe(true)
      expect(g.left).toBe(0)
      expect(Number.isFinite(g.score)).toBe(true)
      expect(g.score).not.toBeNaN()
    })

    it(`liefert fuer ${mode.name} auswertbare Stats`, () => {
      const g = playthrough(mode)
      const rows = mode.stats(g)
      expect(rows.length).toBeGreaterThan(0)
      for (const [key, value] of rows) {
        expect(key.length).toBeGreaterThan(0)
        expect(String(value)).not.toContain('NaN')
        expect(String(value)).not.toContain('undefined')
      }
    })

    it(`liefert fuer ${mode.name} eine endliche Metrik`, () => {
      const g = playthrough(mode)
      const m = mode.metric(g)
      expect(Number.isFinite(m)).toBe(true)
    })

    it(`liefert fuer ${mode.name} einen Coach-Text`, () => {
      const g = playthrough(mode)
      const line = coachLine(g)
      expect(line.length).toBeGreaterThan(20)
      expect(line).not.toContain('NaN')
      expect(line).not.toContain('undefined')
    })
  }
})

describe('ROUTINES', () => {
  it('verweist ausschliesslich auf bekannte Modi', () => {
    for (const r of Object.values(ROUTINES)) {
      for (const [id] of r.steps) {
        expect(MODES[id]).toBeDefined()
      }
    }
  })

  it('gibt jeder Station eine positive Dauer', () => {
    for (const r of Object.values(ROUTINES)) {
      for (const [, sec] of r.steps) {
        expect(sec).toBeGreaterThan(0)
      }
    }
  })

  it('nimmt in den vollen Durchlauf jeden Modus mindestens einmal auf', () => {
    const drin = new Set(ROUTINES.full.steps.map(([id]) => id))
    for (const m of MODE_LIST) {
      expect(drin.has(m.id)).toBe(true)
    }
  })

  it('schluesselt jede Routine unter ihrer eigenen id', () => {
    for (const [key, r] of Object.entries(ROUTINES)) {
      expect(r.id).toBe(key)
    }
  })
})

describe('coachLine', () => {
  it('mahnt bei niedriger Accuracy zu weniger Tempo', () => {
    const g = createGame(MODES.gridshot, DEFAULT_SETTINGS, 60, () => 0.5)
    g.hits = 3
    g.shots = 10
    g.ttk = [400]
    expect(coachLine(g)).toContain('%')
  })
})
