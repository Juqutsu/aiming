import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, createGame, tick } from '../game'
import { DEG } from '../math'
import { WEAPONS } from '../weapons'
import type { GameState, Input, WeaponId } from '../types'
import { SPRAY_AIM, SPRAY_RADIUS, SPRAY_WALL_Z, grouping, spray } from './spray'

const holding: Input = { keys: {}, mouseDown: true }
const idle: Input = { keys: {}, mouseDown: false }

const start = (weapon: WeaponId = 'vandal'): GameState =>
  createGame(spray, { ...DEFAULT_SETTINGS, weapon }, 60, () => 0.5)

/** Simuliert `seconds` in Schritten von 10 ms. */
function run(g: GameState, input: Input, seconds: number) {
  const step = 0.01
  for (let t = 0; t < seconds; t += step) tick(g, input, step)
}

/** Feuert bis das Magazin leer ist. Liefert Schusszahl und verbrauchte Zeit. */
function emptyMagazine(weapon: WeaponId, step: number) {
  const g = start(weapon)
  while (g.data.ammo > 0 && g.t < 20) tick(g, holding, step)
  return { shots: g.shots, holes: g.holes.length, time: g.t }
}

describe('grouping', () => {
  it('wertet alle Einschlaege im Kreis als hundert Prozent', () => {
    expect(grouping([0.0, 0.1, 0.2])).toBe(100)
  })

  it('wertet alle Einschlaege ausserhalb als null', () => {
    expect(grouping([0.3, 0.5])).toBe(0)
  })

  it('rundet den Anteil kaufmaennisch', () => {
    expect(grouping([0.1, 0.1, 0.5])).toBe(67)
  })

  it('liefert null fuer eine leere Liste', () => {
    expect(grouping([])).toBe(0)
  })

  it('zaehlt genau auf dem Radius nicht mehr mit', () => {
    expect(grouping([SPRAY_RADIUS])).toBe(0)
  })
})

describe('spray', () => {
  it('startet mit vollem Magazin und ohne Einschlaege', () => {
    const g = start()
    expect(g.data.ammo).toBe(WEAPONS.vandal.mag)
    expect(g.holes).toHaveLength(0)
  })

  it('feuert nur bei gedrueckter Taste', () => {
    const g = start()
    run(g, idle, 1)
    expect(g.shots).toBe(0)
  })

  // Zwei deutlich verschiedene Schrittweiten: mit absolut gesetzter Restzeit
  // haengt die Feuerrate an der Bildrate und die grobe Schrittweite braucht
  // sichtbar laenger fuer dasselbe Magazin.
  describe.each([1 / 30, 1 / 240])('bei Schrittweite %f s', (step) => {
    it('leert das Magazin mit genau mag Schuessen', () => {
      const { shots, holes } = emptyMagazine('vandal', step)
      expect(shots).toBe(WEAPONS.vandal.mag)
      expect(holes).toBe(WEAPONS.vandal.mag)
    })

    it('leert das Magazin in der erwarteten Zeit', () => {
      const w = WEAPONS.vandal
      const soll = w.mag / w.rps
      const { time } = emptyMagazine('vandal', step)
      // Der letzte Schuss faellt genau eine Schussdauer vor dem nominellen
      // Magazinende — mehr darf die Abweichung bei keiner Schrittweite werden.
      expect(time).toBeGreaterThan(soll - 1 / w.rps)
      expect(time).toBeLessThanOrEqual(soll)
    })
  })

  it('braucht fuer ein Magazin bei grober wie feiner Schrittweite dieselbe Zeit', () => {
    const grob = emptyMagazine('vandal', 1 / 30)
    const fein = emptyMagazine('vandal', 1 / 240)
    expect(grob.shots).toBe(fein.shots)
    expect(grob.time).toBeCloseTo(fein.time, 1)
  })

  it('wertet nach dem letzten Schuss ein Magazin aus', () => {
    const g = start()
    const w = WEAPONS.vandal
    run(g, holding, w.mag / w.rps + 0.2)
    expect(g.data.sprays).toHaveLength(1)
    expect(g.score).toBe(g.data.sprays[0].score)
  })

  it('legt die Einschlaege auf die Wandebene', () => {
    const g = start()
    run(g, holding, 0.5)
    expect(g.holes.length).toBeGreaterThan(0)
    expect(SPRAY_WALL_Z).toBe(15)
  })

  it('trifft mit dem ersten Schuss nahe am Zielpunkt', () => {
    const g = start()
    // Fadenkreuz auf den Zielpunkt der Wand legen.
    g.camera.pitch = Math.atan2(SPRAY_AIM.y - g.player.y, SPRAY_WALL_Z - g.player.z)
    run(g, holding, 0.01)
    expect(g.holes[0].d).toBeLessThan(0.2)
  })

  it('laedt nach dem leeren Magazin automatisch nach', () => {
    const g = start()
    const w = WEAPONS.vandal
    run(g, holding, w.mag / w.rps + 0.2)
    run(g, idle, 2)
    expect(g.data.ammo).toBe(w.mag)
    expect(g.holes).toHaveLength(0)
  })

  it('setzt beim manuellen Nachladen Magazin, Muster und Wand zurueck', () => {
    const g = start()
    run(g, holding, 0.5)
    expect(g.shots).toBeGreaterThan(0)
    spray.reload?.(g)
    expect(g.data.ammo).toBe(WEAPONS.vandal.mag)
    expect(g.data.idx).toBe(0)
    expect(g.holes).toHaveLength(0)
  })

  it('erholt sich vom Rueckstoss wenn die Taste losgelassen wird', () => {
    const g = start()
    run(g, holding, 0.5)
    const idxNachFeuern = g.data.idx
    expect(idxNachFeuern).toBeGreaterThan(0)
    run(g, idle, 1)
    expect(g.data.idx).toBe(0)
  })

  // Der einzige Pfad in der Engine mit echter Projektionsmathematik. Gleicht
  // die Kamera das Muster exakt aus, muss jeder Einschlag auf dem Zielpunkt
  // liegen — ein Vorzeichenfehler im vertikalen Musterterm faellt hier sofort
  // auf, weil er den Versatz verdoppelt statt ihn aufzuheben.
  describe.each<WeaponId>(['vandal', 'phantom'])('bei perfektem Ausgleich mit %s', (weapon) => {
    /** Feuert ein volles Magazin und richtet vor jedem Schuss gegen das Muster aus. */
    function perfectSpray(): GameState {
      const g = start(weapon)
      const w = WEAPONS[weapon]
      // Winkel vom Auge auf den Zielpunkt der Wand.
      const zielPitch = Math.atan2(SPRAY_AIM.y - g.player.y, SPRAY_WALL_Z - g.player.z)
      // 10 ms liegt sicher unter einer Schussdauer: hoechstens ein Schuss je Tick.
      while (g.data.ammo > 0 && g.t < 20) {
        const p = w.pat[Math.min(Math.floor(g.data.idx), w.pat.length - 1)]
        g.camera.yaw = -p[0] * DEG
        g.camera.pitch = zielPitch - p[1] * DEG
        tick(g, holding, 0.01)
      }
      return g
    }

    it('legt jeden Einschlag auf den Zielpunkt', () => {
      const g = perfectSpray()
      expect(g.holes).toHaveLength(WEAPONS[weapon].mag)
      expect(Math.max(...g.holes.map((h) => h.d))).toBeLessThan(0.01)
    })

    it('wertet das Magazin mit hundert Prozent Gruppierung', () => {
      const g = perfectSpray()
      expect(g.data.sprays).toHaveLength(1)
      expect(g.data.sprays[0].score).toBe(100)
    })
  })

  it('mittelt den Score ueber alle Magazine', () => {
    const g = start()
    g.data.sprays = [{ score: 40, avg: 0.3 }, { score: 80, avg: 0.1 }]
    expect(spray.stats(g)[0]).toEqual(['Ø Gruppierung', '60 %'])
  })
})
