import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, createGame, fire } from '../game'
import { EYE } from '../movement'
import type { GameState, ModeDef, Target } from '../types'
import { flick } from './flick'
import { gridshot } from './gridshot'
import { micro } from './micro'
import { switching } from './switching'

/** Startet eine Runde mit festem Zufall. */
const start = (mode: ModeDef): GameState =>
  createGame(mode, DEFAULT_SETTINGS, 60, () => 0.5)

/** Legt ein einzelnes Ziel genau ins Fadenkreuz. Kamera zeigt bei yaw/pitch 0 entlang +z. */
function aimAt(g: GameState, over: Partial<Target> = {}) {
  const t: Target = { x: 0, y: EYE, z: 10, r: 0.5, dead: false, born: g.t, ...over }
  g.targets = [t]
  return t
}

describe('gridshot', () => {
  it('startet mit drei Zielen', () => {
    expect(start(gridshot).targets).toHaveLength(3)
  })

  it('zaehlt einen Treffer und ersetzt genau das getroffene Ziel', () => {
    const g = start(gridshot)
    const getroffen = aimAt(g)
    g.targets.push({ x: 20, y: EYE, z: 10, r: 0.4, dead: false, born: 0 })
    fire(g)
    expect(g.score).toBe(1)
    expect(g.hits).toBe(1)
    expect(g.shots).toBe(1)
    expect(g.targets).toHaveLength(2)
    expect(g.targets).not.toContain(getroffen)
  })

  it('zaehlt einen Fehlschuss ohne Punktabzug', () => {
    const g = start(gridshot)
    g.targets = [{ x: 30, y: EYE, z: 10, r: 0.4, dead: false, born: 0 }]
    fire(g)
    expect(g.score).toBe(0)
    expect(g.shots).toBe(1)
    expect(g.hits).toBe(0)
  })

  it('meldet Ziele pro Minute in den Stats', () => {
    const g = start(gridshot)
    g.score = 30
    expect(gridshot.stats(g)).toContainEqual(['Ziele/min', '30.0'])
  })
})

describe('flick', () => {
  it('haelt genau ein Ziel im Spiel', () => {
    const g = start(flick)
    expect(g.targets).toHaveLength(1)
    aimAt(g)
    fire(g)
    expect(g.targets).toHaveLength(1)
  })

  it('zieht bei einem Fehlschuss einen Punkt ab', () => {
    const g = start(flick)
    aimAt(g)
    fire(g)
    expect(g.score).toBe(1)
    g.targets = [{ x: 40, y: EYE, z: 10, r: 0.3, dead: false, born: g.t }]
    fire(g)
    expect(g.score).toBe(0)
  })

  it('faellt nicht unter null', () => {
    const g = start(flick)
    g.targets = [{ x: 40, y: EYE, z: 10, r: 0.3, dead: false, born: g.t }]
    fire(g)
    fire(g)
    expect(g.score).toBe(0)
  })
})

describe('micro', () => {
  it('nutzt kopfgrosse Ziele', () => {
    const g = start(micro)
    expect(g.targets[0].r).toBeCloseTo(0.13, 6)
  })

  it('fordert bei einem Treffer den Kopftreffer-Ton an', () => {
    const g = start(micro)
    aimAt(g)
    fire(g)
    expect(g.sounds).toContain('head')
    expect(g.fx[0].text).toBe('HS')
  })

  it('wertet die Accuracy als Metrik', () => {
    const g = start(micro)
    g.hits = 3
    g.shots = 4
    expect(micro.metric(g)).toBe(75)
  })
})

describe('switching', () => {
  it('stellt sechs Ziele auf', () => {
    expect(start(switching).targets).toHaveLength(6)
  })

  it('laesst getroffene Ziele stehen, aber tot', () => {
    const g = start(switching)
    const t = g.targets[0]
    t.x = 0
    t.y = EYE
    t.z = 10
    t.r = 0.5
    fire(g)
    expect(t.dead).toBe(true)
    expect(g.targets).toHaveLength(6)
    expect(g.score).toBe(1)
  })

  it('stellt einen neuen Satz auf sobald alle sechs liegen', () => {
    const g = start(switching)
    for (const t of g.targets) t.dead = true
    g.targets[0].dead = false
    g.targets[0].x = 0
    g.targets[0].y = EYE
    g.targets[0].z = 10
    g.targets[0].r = 0.5
    fire(g)
    expect(g.targets.every((t) => !t.dead)).toBe(true)
    expect(g.sounds).toContain('go')
  })

  it('misst die Zeit zwischen zwei Kills, nicht seit dem Erscheinen', () => {
    const g = start(switching)
    g.t = 2
    const t = g.targets[0]
    t.x = 0
    t.y = EYE
    t.z = 10
    t.r = 0.5
    fire(g)
    expect(g.ttk[0]).toBeCloseTo(2000, 6)
  })
})
