import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, createGame, fire, tick } from '../game'
import { EYE } from '../movement'
import type { GameState, Input, ModeDef } from '../types'
import { reaction } from './reaction'
import { strafetrack } from './strafetrack'
import { tracking } from './tracking'

const holding: Input = { keys: {}, mouseDown: true }
const idle: Input = { keys: {}, mouseDown: false }

const start = (mode: ModeDef): GameState => createGame(mode, DEFAULT_SETTINGS, 60, () => 0.5)

/** Simuliert `seconds` mit festem Zeitschritt und friert das Ziel im Fadenkreuz ein. */
function trackFor(g: GameState, input: Input, seconds: number, frozen: boolean) {
  const step = 0.01
  for (let t = 0; t < seconds; t += step) {
    tick(g, input, step)
    if (frozen) {
      g.targets[0].x = 0
      g.targets[0].y = EYE
      g.targets[0].z = 10
      g.targets[0].r = 0.5
    }
  }
}

describe('tracking', () => {
  it('feuert durch Halten, nicht durch Klicken', () => {
    expect(tracking.hold).toBe(true)
    expect(tracking.fire).toBeUndefined()
  })

  it('zaehlt Feuerzeit nur bei gedrueckter Taste', () => {
    const g = start(tracking)
    trackFor(g, idle, 0.5, false)
    expect(g.trackTotal).toBe(0)
    trackFor(g, holding, 0.5, false)
    expect(g.trackTotal).toBeGreaterThan(0.4)
  })

  it('zaehlt Zeit auf dem Ziel und macht daraus den Score', () => {
    const g = start(tracking)
    trackFor(g, holding, 1, true)
    expect(g.trackTime).toBeGreaterThan(0.9)
    expect(g.score).toBe(Math.round(g.trackTime * 10))
  })

  it('zaehlt keine Zeit auf dem Ziel wenn das Fadenkreuz danebenliegt', () => {
    const g = start(tracking)
    const step = 0.01
    for (let t = 0; t < 1; t += step) {
      tick(g, holding, step)
      g.targets[0].x = 50
    }
    expect(g.trackTotal).toBeGreaterThan(0.9)
    expect(g.trackTime).toBe(0)
  })

  it('bewegt das Ziel ueber die Zeit', () => {
    const g = start(tracking)
    const x0 = g.targets[0].x
    trackFor(g, idle, 1, false)
    expect(g.targets[0].x).not.toBe(x0)
  })

  it('wertet den Anteil auf dem Ziel als Metrik', () => {
    const g = start(tracking)
    g.trackTime = 3
    g.trackTotal = 4
    expect(tracking.metric(g)).toBe(75)
  })
})

describe('strafetrack', () => {
  it('haelt das Ziel innerhalb der Range-Breite', () => {
    const g = start(strafetrack)
    trackFor(g, idle, 5, false)
    expect(Math.abs(g.targets[0].x)).toBeLessThanOrEqual(6.5)
  })

  it('laesst gesprungene Ziele wieder auf ihre Standhoehe fallen', () => {
    const g = start(strafetrack)
    const t = g.targets[0]
    t.vy = 3.6
    trackFor(g, idle, 2, false)
    expect(t.y).toBeCloseTo(t.base as number, 6)
    expect(t.vy).toBe(0)
  })

  it('wertet wie Smooth Tracking ueber gehaltene Taste', () => {
    expect(strafetrack.hold).toBe(true)
    const g = start(strafetrack)
    trackFor(g, holding, 1, true)
    expect(g.trackTime).toBeGreaterThan(0.9)
  })
})

describe('reaction', () => {
  it('startet ohne Ziel und unscharf', () => {
    const g = start(reaction)
    expect(g.targets).toHaveLength(0)
    expect(g.data.armed).toBe(false)
  })

  it('stellt nach Ablauf der Wartezeit ein Ziel auf und gibt das Signal', () => {
    const g = start(reaction)
    g.data.wait = 0.02
    tick(g, idle, 0.05)
    expect(g.data.armed).toBe(true)
    expect(g.targets).toHaveLength(1)
    expect(g.sounds).toContain('go')
  })

  it('wertet einen Klick vor dem Signal als Fehlstart', () => {
    const g = start(reaction)
    fire(g)
    expect(g.shots).toBe(1)
    expect(g.hits).toBe(0)
    expect(g.score).toBe(0)
    expect(g.sounds).toContain('bad')
    expect(g.fx[0].text).toBe('zu früh')
  })

  it('wuerfelt nach einem Fehlstart eine neue Wartezeit ohne scharf zu werden', () => {
    const g = start(reaction)
    g.data.wait = 0.01
    fire(g)
    expect(g.data.armed).toBe(false)
    expect(g.data.wait).toBeGreaterThan(0.5)
  })

  it('misst die Zeit zwischen Signal und Treffer', () => {
    const g = start(reaction)
    g.data.wait = 0.01
    tick(g, idle, 0.02)
    g.targets[0].x = 0
    g.targets[0].y = EYE
    g.targets[0].z = 10
    g.targets[0].r = 0.5
    g.t += 0.25
    fire(g)
    expect(g.react[0]).toBeCloseTo(250, 0)
    expect(g.score).toBe(1)
  })

  it('raeumt nach dem Schuss ab und wartet erneut', () => {
    const g = start(reaction)
    g.data.wait = 0.01
    tick(g, idle, 0.02)
    fire(g)
    expect(g.targets).toHaveLength(0)
    expect(g.data.armed).toBe(false)
  })

  it('wertet die mittlere Reaktionszeit als Metrik, kleiner ist besser', () => {
    expect(reaction.lowerBetter).toBe(true)
    const g = start(reaction)
    g.react = [200, 300]
    expect(reaction.metric(g)).toBe(250)
  })

  it('liefert ohne Messung einen Wert, der jeden Bestwert verliert', () => {
    expect(reaction.metric(start(reaction))).toBe(9999)
  })
})
