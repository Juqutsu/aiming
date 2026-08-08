import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, createGame, fire, tick } from '../game'
import { EYE } from '../movement'
import type { GameState, Input, ModeDef, Target } from '../types'
import { SHOOT_SPEED, counterstrafe } from './counterstrafe'
import { PEEK_COVER, PEEK_REACTION, peek, visible } from './peek'
import { strafeshoot } from './strafeshoot'

const idle: Input = { keys: {}, mouseDown: false }

const start = (mode: ModeDef): GameState => createGame(mode, DEFAULT_SETTINGS, 60, () => 0.5)

function run(g: GameState, input: Input, seconds: number) {
  const step = 0.01
  for (let t = 0; t < seconds; t += step) tick(g, input, step)
}

/** Legt ein Ziel genau ins Fadenkreuz. */
function aimAt(g: GameState): Target {
  const t: Target = { x: g.player.x, y: EYE, z: g.player.z + 10, r: 0.5, dead: false, born: g.t }
  g.targets = [t]
  return t
}

describe('counterstrafe', () => {
  it('bewegt den Spieler und blendet die Messbalken ein', () => {
    expect(counterstrafe.move).toBe(true)
    expect(counterstrafe.meters).toBe(true)
  })

  it('startet in der Strafe-Phase ohne Ziel und zeigt die Richtung an', () => {
    const g = start(counterstrafe)
    expect(g.data.phase).toBe('strafe')
    expect(g.targets).toHaveLength(0)
    run(g, idle, 0.05)
    expect(g.cue).toBeTruthy()
  })

  it('stellt ein Ziel auf sobald lange genug in die richtige Richtung gestrafed wurde', () => {
    const g = start(counterstrafe)
    const richtung = g.data.dir > 0 ? 'KeyD' : 'KeyA'
    run(g, { keys: { [richtung]: true }, mouseDown: false }, 1)
    expect(g.data.phase).toBe('shoot')
    expect(g.targets).toHaveLength(1)
    expect(g.sounds).toContain('go')
  })

  it('reagiert nicht auf Strafen in die falsche Richtung', () => {
    const g = start(counterstrafe)
    const falsch = g.data.dir > 0 ? 'KeyA' : 'KeyD'
    run(g, { keys: { [falsch]: true }, mouseDown: false }, 1)
    expect(g.data.phase).toBe('strafe')
  })

  it('wertet einen Schuss vor dem Signal als Fehlschuss', () => {
    const g = start(counterstrafe)
    fire(g)
    expect(g.shots).toBe(1)
    expect(g.hits).toBe(0)
    expect(g.fx[0].text).toBe('noch nicht')
  })

  it('verwirft einen Treffer, der in voller Bewegung faellt', () => {
    const g = start(counterstrafe)
    const richtung = g.data.dir > 0 ? 'KeyD' : 'KeyA'
    run(g, { keys: { [richtung]: true }, mouseDown: false }, 1)
    aimAt(g)
    fire(g)
    expect(g.score).toBe(0)
    expect(g.fx.at(-1)?.text).toBe('zu schnell')
    expect(g.sounds).toContain('bad')
  })

  it('wertet einen Treffer aus dem Stand', () => {
    const g = start(counterstrafe)
    const richtung = g.data.dir > 0 ? 'KeyD' : 'KeyA'
    run(g, { keys: { [richtung]: true }, mouseDown: false }, 1)
    g.player.vx = 0
    g.player.vz = 0
    aimAt(g)
    fire(g)
    expect(g.score).toBe(1)
    expect(g.hits).toBe(1)
  })

  it('kehrt nach dem Schuss in die Strafe-Phase zurueck', () => {
    const g = start(counterstrafe)
    const richtung = g.data.dir > 0 ? 'KeyD' : 'KeyA'
    run(g, { keys: { [richtung]: true }, mouseDown: false }, 1)
    fire(g)
    expect(g.data.phase).toBe('strafe')
    expect(g.targets).toHaveLength(0)
  })

  it('zieht die Grenze fuer einen sauberen Schuss bei 1 m/s', () => {
    expect(SHOOT_SPEED).toBe(1.0)
  })

  it('loescht den Hinweis sobald das Ziel erscheint', () => {
    const g = start(counterstrafe)
    const richtung = g.data.dir > 0 ? 'KeyD' : 'KeyA'
    const input = { keys: { [richtung]: true }, mouseDown: false }
    for (let i = 0; i < 100; i++) {
      tick(g, input, 0.01)
      if (g.data.phase === 'shoot') {
        // In dem Tick, in dem wechselt wird: Ziel vorhanden UND Hinweis geloescht?
        expect(g.targets).toHaveLength(1)
        expect(g.cue).toBe(null)
        return
      }
    }
    throw new Error('never reached shoot phase')
  })

  it('meldet die Stand-Quote in den Stats', () => {
    const g = start(counterstrafe)
    g.data.speeds = [0.2, 0.5, 4.0, 0.1]
    expect(counterstrafe.stats(g)).toContainEqual(['Stand-Quote', '75 %'])
  })
})

describe('peek', () => {
  it('verdeckt den Gegner solange der Spieler hinter der Deckung steht', () => {
    const g = start(peek)
    g.player.x = -5
    g.player.z = 0
    expect(visible(g)).toBe(false)
  })

  it('gibt den Gegner frei sobald der Spieler an der Kante vorbei ist', () => {
    const g = start(peek)
    g.player.x = PEEK_COVER.x2 + 2
    g.player.z = 0
    expect(visible(g)).toBe(true)
  })

  it('markiert verdeckte Gegner als versteckt und damit als untreffbar', () => {
    const g = start(peek)
    g.player.x = -5
    run(g, idle, 0.05)
    expect(g.data.enemy.hidden).toBe(true)
    fire(g)
    expect(g.hits).toBe(0)
  })

  it('laesst den Gegner nach der Reaktionszeit zurueckschiessen', () => {
    const g = start(peek)
    g.player.x = PEEK_COVER.x2 + 2
    run(g, idle, PEEK_REACTION + 0.1)
    expect(g.data.deaths).toBe(1)
    expect(g.sounds).toContain('bad')
    expect(g.fx.some((f) => f.text === 'ERWISCHT')).toBe(true)
  })

  it('wertet einen Kill und merkt sich die Zeit im Freien', () => {
    const g = start(peek)
    g.player.x = PEEK_COVER.x2 + 2
    run(g, idle, 0.1)
    g.data.enemy.x = g.player.x
    g.data.enemy.y = EYE
    g.data.enemy.z = g.player.z + 10
    g.data.enemy.r = 0.5
    fire(g)
    expect(g.score).toBe(1)
    expect(g.data.exposures).toHaveLength(1)
    expect(g.data.exposures[0]).toBeGreaterThan(0)
  })

  it('verwirft einen Treffer aus voller Bewegung', () => {
    const g = start(peek)
    g.player.x = PEEK_COVER.x2 + 2
    g.player.vx = 5
    run(g, idle, 0.1)
    g.data.enemy.x = g.player.x
    g.data.enemy.y = EYE
    g.data.enemy.z = g.player.z + 10
    g.data.enemy.r = 0.5
    g.player.vx = 5
    fire(g)
    expect(g.score).toBe(0)
    expect(g.fx.at(-1)?.text).toBe('zu schnell')
  })
})

describe('strafeshoot', () => {
  it('haelt immer genau ein Ziel bereit', () => {
    expect(start(strafeshoot).targets).toHaveLength(1)
  })

  it('wertet einen Treffer aus dem Stand und stellt ein neues Ziel auf', () => {
    const g = start(strafeshoot)
    const alt = aimAt(g)
    fire(g)
    expect(g.score).toBe(1)
    expect(g.targets[0]).not.toBe(alt)
  })

  it('verwirft einen Treffer in Bewegung ohne neues Ziel aufzustellen', () => {
    const g = start(strafeshoot)
    const t = aimAt(g)
    g.player.vx = 5
    fire(g)
    expect(g.score).toBe(0)
    expect(g.targets[0]).toBe(t)
    expect(g.fx.at(-1)?.text).toBe('zu schnell')
  })

  it('zeigt die Stand-Quote im HUD', () => {
    const g = start(strafeshoot)
    g.data.speeds = [0.1, 0.2, 5.0, 0.3]
    expect(strafeshoot.hudExtra?.(g)).toBe('75%')
  })
})
