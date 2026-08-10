import { describe, expect, it } from 'vitest'
import { createGame, DEFAULT_SETTINGS } from '@/lib/engine/game'
import { MODES } from '@/lib/engine/modes'
import { RUN } from '@/lib/engine/movement'
import { SHOOT_SPEED } from '@/lib/engine/modes/counterstrafe'
import {
  EXPO_ZONE_PCT, SPEED_ZONE_PCT, expoColor, expoPct, snapshot, speedColor, speedPct,
} from './hud'

describe('snapshot', () => {
  it('zeigt bei Klick-Modi die Accuracy', () => {
    const g = createGame(MODES.gridshot, DEFAULT_SETTINGS)
    g.hits = 3
    g.shots = 4
    expect(snapshot(g).acc).toBe('75 %')
  })

  it('zeigt bei Halte-Modi ohne Munition stattdessen die Zeit auf dem Ziel', () => {
    const g = createGame(MODES.tracking, DEFAULT_SETTINGS)
    g.trackTime = 6
    g.trackTotal = 10
    expect(snapshot(g).acc).toBe('60%')
  })

  it('zeigt bei Spray die Accuracy, obwohl der Modus hold ist', () => {
    const g = createGame(MODES.spray, DEFAULT_SETTINGS)
    g.hits = 10
    g.shots = 25
    expect(snapshot(g).acc).toBe('40 %')
  })

  it('nimmt hudExtra, wo der Modus es anbietet, sonst die Serie', () => {
    const grid = createGame(MODES.gridshot, DEFAULT_SETTINGS)
    grid.streak = 7
    expect(snapshot(grid).extra).toBe(7)
    expect(snapshot(grid).extraLabel).toBe('Streak')

    const sp = createGame(MODES.spray, DEFAULT_SETTINGS)
    expect(snapshot(sp).extra).toBe(0)
    expect(snapshot(sp).extraLabel).toBe('Sprays')
  })

  it('liefert Munition nur für Modi mit Munitionsanzeige', () => {
    expect(snapshot(createGame(MODES.spray, DEFAULT_SETTINGS)).ammo).toBe(25)
    expect(snapshot(createGame(MODES.gridshot, DEFAULT_SETTINGS)).ammo).toBeNull()
  })

  it('rundet die Restzeit auf, damit die Anzeige bei 60 startet und nicht bei 59', () => {
    const g = createGame(MODES.gridshot, DEFAULT_SETTINGS)
    g.left = 59.4
    expect(snapshot(g).time).toBe(60)
  })
})

describe('Balken', () => {
  it('deckelt den Tempo-Balken bei Laufgeschwindigkeit', () => {
    expect(speedPct(0)).toBe(0)
    expect(speedPct(RUN)).toBe(100)
    expect(speedPct(RUN * 2)).toBe(100)
  })

  it('legt die grüne Zone genau auf die Stand-Schwelle der Engine', () => {
    expect(SPEED_ZONE_PCT).toBeCloseTo((SHOOT_SPEED / RUN) * 100, 10)
    expect(speedColor(SHOOT_SPEED)).toBe('var(--ok)')
    expect(speedColor(SHOOT_SPEED + 0.01)).toBe('var(--sig)')
  })

  it('färbt den Exposure-Balken an den Grenzen 320 und 600 ms um', () => {
    expect(expoColor(300)).toBe('var(--ok)')
    expect(expoColor(400)).toBe('var(--warn)')
    expect(expoColor(700)).toBe('var(--sig)')
    expect(EXPO_ZONE_PCT).toBeCloseTo((320 / 900) * 100, 10)
    expect(expoPct(1800)).toBe(100)
  })
})
