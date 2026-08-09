import { describe, it, expect } from 'vitest'
import { basis } from './camera'
import { coachLine } from './coach'
import { DEFAULT_SETTINGS, createGame, fire, tick } from './game'
import { speed } from './math'
import { MODES, MODE_LIST } from './modes'
import { ROUTINES } from './routines'
import type { GameState, Input, ModeDef, ModeId } from './types'

/** Deterministischer Zufall, damit ein Fehlschlag reproduzierbar bleibt. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

/**
 * Richtet die Kamera auf das erste lebende Ziel.
 *
 * Ohne das bleibt die Simulation bei yaw = 0, pitch = 0 stehen — Modi, die
 * Ziele relativ zur Blickrichtung setzen, verfehlen dann jeden Schuss, und
 * die Gesamtsimulation testet nur noch den Leerlaufpfad. Wird diese Funktion
 * vor `tick` aufgerufen, holt deren eigener `basis()`-Aufruf die Änderung
 * automatisch nach. Nach `tick` gibt es diesen Nachlauf nicht mehr — dann
 * muss `basis()` hier selbst laufen, sonst zeigt `camera.F` (das `fire`
 * tatsächlich für den Treffertest benutzt) noch auf die alte Richtung, obwohl
 * yaw/pitch schon stimmen.
 */
function aimAtTarget(g: GameState) {
  const t = g.targets.find((x) => !x.dead && !x.hidden)
  if (!t) return
  const dx = t.x - g.player.x
  const dy = t.y - g.player.y
  const dz = t.z - g.player.z
  g.camera.yaw = Math.atan2(dx, dz)
  g.camera.pitch = Math.atan2(dy, Math.hypot(dx, dz))
  basis(g.camera)
}

/** Spielt eine volle Runde mit wechselnder Eingabe durch. */
function playthrough(mode: ModeDef): GameState {
  const rng = seeded(7)
  const g = createGame(mode, DEFAULT_SETTINGS, 10, rng)
  const step = 1 / 120
  let frame = 0
  while (!g.over) {
    // Halbzyklus von 2 s (480 Frames bei 1/120 s Schrittweite): counterstrafe
    // braucht > 0,25 s Halten über 4,5 m/s plus Beschleunigungsrampe, bevor
    // die Schussphase erreicht wird. peek muss weit genug laufen, um die
    // Deckungskante bei etwa x > 3.09 zu überschreiten — das erfordert
    // deutlich mehr als die zuvor angenommene knappe Sekunde.
    const input: Input = {
      keys: { KeyD: frame % 480 < 240, KeyA: frame % 480 >= 240 },
      mouseDown: frame % 20 < 10,
    }
    aimAtTarget(g) // fuer Modi, die schon im tick auswerten (Tracking)
    tick(g, input, step)
    aimAtTarget(g) // fuer Modi, deren Ziel erst im tick entsteht (Reaktion)
    // Nur schießen, wenn ein Ziel da ist und man steht — genau die
    // Stand-Disziplin, die Counterstrafe, Peek und Strafe & Shoot ohnehin
    // verlangen. Ein Schuss ins Leere ist in keinem Modus realistisch.
    const zielDa = g.targets.some((t) => !t.dead && !t.hidden)
    if (zielDa && speed(g.player) <= 1.0) fire(g)
    // Die Ansicht leert diese Listen jeden Frame — hier wird das nachgestellt.
    g.fx.length = 0
    g.sounds.length = 0
    frame++
  }
  return g
}

/** Modus-eigenes Mindestmaß an Aktivität, das die Simulation belegen muss. */
const AKTIVITAET: Record<ModeId, (g: GameState) => number> = {
  gridshot: (g) => g.hits,
  flick: (g) => g.hits,
  micro: (g) => g.hits,
  switching: (g) => g.hits,
  strafeshoot: (g) => g.hits,
  reaction: (g) => g.hits,
  tracking: (g) => g.trackTime,
  strafetrack: (g) => g.trackTime,
  spray: (g) => g.data.sprays.length,
  counterstrafe: (g) => g.data.speeds.length,
  peek: (g) => g.data.deaths + g.score,
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

    it(`spielt ${mode.name} nicht als leere Huelle durch`, () => {
      const g = playthrough(mode)
      expect(AKTIVITAET[mode.id](g)).toBeGreaterThan(0)
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
