import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, createGame, endGame, fire, registerHit, registerMiss, tick } from './game'
import { EYE, RUN } from './movement'
import { speed } from './math'
import type { GameState, Input, ModeDef, Target } from './types'

const noInput: Input = { keys: {}, mouseDown: false }

/** Ein Modus, der nichts tut — Prüfstand für den Rundenrahmen selbst. */
function stubMode(over: Partial<ModeDef> = {}): ModeDef {
  return {
    id: 'gridshot',
    name: 'Stub',
    cat: 'aim',
    skill: 'Test',
    desc: '',
    hint: '',
    metricName: 'Score',
    start() {},
    tick() {},
    stats: () => [],
    metric: (g) => g.score,
    ...over,
  }
}

const target = (over: Partial<Target> = {}): Target => ({
  x: 0, y: EYE, z: 10, r: 0.4, dead: false, born: 0, ...over,
})

describe('createGame', () => {
  it('startet mit leerer Bilanz und voller Rundenzeit', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS, 60)
    expect(g.t).toBe(0)
    expect(g.left).toBe(60)
    expect(g.score).toBe(0)
    expect(g.shots).toBe(0)
    expect(g.over).toBe(false)
  })

  it('faellt ohne Angabe auf die Rundenlaenge aus den Settings zurueck', () => {
    const g = createGame(stubMode(), { ...DEFAULT_SETTINGS, dur: 45 })
    expect(g.dur).toBe(45)
  })

  it('setzt Spieler und Kamera in die Ausgangslage', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    expect(g.player).toEqual({ x: 0, y: EYE, z: 0, vx: 0, vz: 0 })
    expect(g.camera.yaw).toBe(0)
    expect(g.camera.pitch).toBe(0)
  })

  it('ruft start() des Modus auf', () => {
    let gerufen = false
    createGame(stubMode({ start() { gerufen = true } }), DEFAULT_SETTINGS)
    expect(gerufen).toBe(true)
  })

  it('nimmt einen eigenen Zufallsgenerator entgegen', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS, 60, () => 0.5)
    expect(g.rng()).toBe(0.5)
  })
})

describe('tick', () => {
  it('zaehlt die Zeit hoch und die Restzeit herunter', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS, 10)
    tick(g, noInput, 0.5)
    expect(g.t).toBeCloseTo(0.5, 10)
    expect(g.left).toBeCloseTo(9.5, 10)
  })

  it('beendet die Runde wenn die Zeit abgelaufen ist', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS, 1)
    tick(g, noInput, 1.5)
    expect(g.left).toBe(0)
    expect(g.over).toBe(true)
  })

  it('ruft tick() des Modus mit dem Zeitschritt auf', () => {
    let gesehen = 0
    const g = createGame(stubMode({ tick(_g, _i, dt) { gesehen = dt } }), DEFAULT_SETTINGS, 10)
    tick(g, noInput, 0.25)
    expect(gesehen).toBe(0.25)
  })

  it('bewegt den Spieler nur in Modi mit move', () => {
    const still = createGame(stubMode(), DEFAULT_SETTINGS, 10)
    tick(still, { keys: { KeyD: true }, mouseDown: false }, 0.5)
    expect(speed(still.player)).toBe(0)

    const beweglich = createGame(stubMode({ move: true }), DEFAULT_SETTINGS, 10)
    tick(beweglich, { keys: { KeyD: true }, mouseDown: false }, 0.5)
    expect(speed(beweglich.player)).toBeGreaterThan(0)
    expect(speed(beweglich.player)).toBeLessThanOrEqual(RUN)
  })

  it('tut nach dem Rundenende nichts mehr', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS, 1)
    tick(g, noInput, 2)
    const t = g.t
    tick(g, noInput, 1)
    expect(g.t).toBe(t)
  })
})

describe('fire', () => {
  it('leitet an den Modus weiter', () => {
    let gerufen = false
    const g = createGame(stubMode({ fire() { gerufen = true } }), DEFAULT_SETTINGS)
    fire(g)
    expect(gerufen).toBe(true)
  })

  it('feuert nach dem Rundenende nicht mehr', () => {
    let anzahl = 0
    const g = createGame(stubMode({ fire() { anzahl++ } }), DEFAULT_SETTINGS, 1)
    tick(g, noInput, 2)
    fire(g)
    expect(anzahl).toBe(0)
  })
})

describe('registerHit', () => {
  it('zaehlt Treffer, Serie und beste Serie', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    registerHit(g, target())
    registerHit(g, target())
    expect(g.hits).toBe(2)
    expect(g.streak).toBe(2)
    expect(g.bestStreak).toBe(2)
  })

  it('misst die Zeit vom Erscheinen bis zum Treffer in Millisekunden', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    g.t = 0.4
    registerHit(g, target({ born: 0.1 }))
    expect(g.ttk[0]).toBeCloseTo(300, 6)
  })

  it('verwirft unrealistisch lange Zeiten', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    g.t = 9
    registerHit(g, target({ born: 0 }))
    expect(g.ttk).toHaveLength(0)
  })

  it('fordert einen Ton an und legt einen Effekt am Ziel ab', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    registerHit(g, target({ x: 2 }))
    expect(g.sounds).toContain('hit')
    expect(g.fx[0].kind).toBe('good')
    expect(g.fx[0].at).toEqual({ x: 2, y: EYE, z: 10 })
  })

  it('beschriftet den Effekt standardmaessig mit +1', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    registerHit(g, target())
    expect(g.fx[0].text).toBe('+1')
  })
})

describe('registerMiss', () => {
  it('setzt die Serie zurueck und laesst die beste Serie stehen', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    registerHit(g, target())
    registerHit(g, target())
    registerMiss(g)
    expect(g.streak).toBe(0)
    expect(g.bestStreak).toBe(2)
  })

  it('zeigt einen Hinweis in der Bildmitte nur wenn einer uebergeben wurde', () => {
    const ohne = createGame(stubMode(), DEFAULT_SETTINGS)
    registerMiss(ohne)
    expect(ohne.fx).toHaveLength(0)

    const mit = createGame(stubMode(), DEFAULT_SETTINGS)
    registerMiss(mit, 'zu schnell')
    expect(mit.fx[0]).toEqual({ at: 'center', text: 'zu schnell', kind: 'bad' })
  })

  it('fordert den Fehlschuss-Ton an', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    registerMiss(g)
    expect(g.sounds).toContain('miss')
  })
})

describe('endGame', () => {
  it('markiert die Runde als beendet', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    endGame(g)
    expect(g.over).toBe(true)
  })
})
