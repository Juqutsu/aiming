import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, createGame, tick } from '../game'
import { WEAPONS } from '../weapons'
import type { GameState, Input } from '../types'
import { SPRAY_AIM, SPRAY_RADIUS, SPRAY_WALL_Z, grouping, spray } from './spray'

const holding: Input = { keys: {}, mouseDown: true }
const idle: Input = { keys: {}, mouseDown: false }

const start = (): GameState => createGame(spray, DEFAULT_SETTINGS, 60, () => 0.5)

/** Simuliert `seconds` in Schritten von 10 ms. */
function run(g: GameState, input: Input, seconds: number) {
  const step = 0.01
  for (let t = 0; t < seconds; t += step) tick(g, input, step)
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

  it('leert das Magazin in der erwarteten Zeit', () => {
    const g = start()
    const w = WEAPONS.vandal
    run(g, holding, w.mag / w.rps + 0.2)
    expect(g.shots).toBe(w.mag)
    expect(g.holes).toHaveLength(w.mag)
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

  it('mittelt den Score ueber alle Magazine', () => {
    const g = start()
    g.data.sprays = [{ score: 40, avg: 0.3 }, { score: 80, avg: 0.1 }]
    expect(spray.stats(g)[0]).toEqual(['Ø Gruppierung', '60 %'])
  })
})
