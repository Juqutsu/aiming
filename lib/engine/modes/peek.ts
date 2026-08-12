import { avg, ms, pc } from '../format'
import { play, pushFx, registerMiss } from '../game'
import { rayHitBest, segCross, speed } from '../math'
import type { GameState, ModeDef } from '../types'

/** Die Deckung, als Kante in der Draufsicht. `h` ist nur für die Darstellung. */
export const PEEK_COVER = { z: 6, x1: -14, x2: 1.2, h: 3.4 }
/** Sekunden Sichtkontakt, bis der Gegner zurückschießt. */
export const PEEK_REACTION = 0.32
/** Bis zu diesem Tempo gilt ein Schuss als aus dem Stand. Etwas milder als bei Counterstrafe. */
const PEEK_SHOOT_SPEED = 1.2
/** Pause nach einem Kill oder Tod, bevor der nächste Gegner steht. */
const COOL_KILL = 1.1
const COOL_DEATH = 1.2

/**
 * Sieht der Spieler den Gegner?
 *
 * Reine Draufsicht: kreuzt die Sichtlinie die Deckungskante, ist der Gegner verdeckt.
 * Für eine mannshohe Deckung genügt das — Höhe spielt hier keine Rolle.
 */
export function visible(g: GameState): boolean {
  const c = PEEK_COVER
  const e = g.data.enemy
  return !segCross(g.player.x, g.player.z, e.x, e.z, c.x1, c.z, c.x2, c.z)
}

export const peek: ModeDef = {
  id: 'peek',
  name: 'One-and-Done Peek',
  cat: 'move',
  skill: 'Movement',
  core: true,
  meters: true,
  move: true,
  desc: 'Aus der Deckung raus, ein Duell, zurück. Der Gegner schießt nach 320 ms Sichtkontakt. Gewertet wird deine Zeit im Freien — genau die Disziplin, die dir Runden rettet.',
  hint: 'D peeken · A zurück in Deckung · maximal ein Schuss',
  extraLabel: 'Ø Exposure',
  // Kills ist eine Summe ueber die Runde — eine laengere Runde gibt mehr Zeit
  // zum Sammeln und macht zwei Laeufe unvergleichbar.
  cumulative: true,
  metricName: 'Kills',
  start(g) {
    g.player.x = 1.35
    g.player.z = 0
    g.data.enemy = { x: -3.2, y: 1.62, z: 20, r: 0.34 * g.settings.sizeMul, dead: false, born: 0 }
    g.data.expo = 0
    g.data.seen = 0
    g.data.deaths = 0
    g.data.exposures = []
    g.data.cool = 0
    g.targets = [g.data.enemy]
  },
  tick(g, _input, dt) {
    const sichtbar = visible(g)
    g.data.enemy.hidden = !sichtbar

    if (g.data.cool > 0) {
      g.data.cool -= dt
      if (g.data.cool <= 0) {
        g.data.enemy.dead = false
        g.data.expo = 0
        g.data.seen = 0
      }
      return
    }

    if (sichtbar && !g.data.enemy.dead) {
      g.data.expo += dt
      g.data.seen += dt
      if (g.data.seen > PEEK_REACTION) {
        g.data.deaths++
        g.streak = 0
        pushFx(g, 'center', 'ERWISCHT', 'bad')
        play(g, 'bad')
        g.data.cool = COOL_DEATH
        g.data.enemy.dead = true
        g.data.exposures.push(g.data.expo * 1000)
      }
      return
    }

    // In Deckung baut sich die Aufmerksamkeit des Gegners wieder ab.
    g.data.seen = Math.max(0, g.data.seen - dt * 2.5)
    g.data.expo = 0
  },
  fire(g) {
    if (g.data.cool > 0) return
    g.shots++
    const sp = speed(g.player)
    const treffbar = !g.data.enemy.hidden && !g.data.enemy.dead
    const t = treffbar ? rayHitBest(g.player, g.camera.F, [g.data.enemy]) : null

    if (t && sp <= PEEK_SHOOT_SPEED) {
      g.hits++
      g.score++
      g.streak++
      g.bestStreak = Math.max(g.bestStreak, g.streak)
      g.data.exposures.push(g.data.expo * 1000)
      pushFx(g, { x: t.x, y: t.y, z: t.z }, `${Math.round(g.data.expo * 1000)} ms`, 'good')
      play(g, 'head')
      g.data.enemy.dead = true
      g.data.cool = COOL_KILL
      // Neue Position, damit der nächste Peek nicht auswendig gespielt wird.
      g.data.enemy.x = -2.2 - g.rng() * 3.4
      g.data.enemy.z = 17 + g.rng() * 6
      g.data.enemy.y = 1.5 + g.rng() * 0.35
    } else if (t) {
      registerMiss(g, 'zu schnell')
    } else {
      registerMiss(g)
    }
  },
  hudExtra: (g) => (g.data.exposures.length ? `${Math.round(avg(g.data.exposures))}ms` : '–'),
  stats: (g) => [
    ['Kills', g.score],
    ['Getroffen worden', g.data.deaths],
    ['Ø Exposure', ms(avg(g.data.exposures))],
    ['Kürzeste', ms(g.data.exposures.length ? Math.min(...g.data.exposures) : 0)],
    ['Accuracy', pc(g.hits, g.shots)],
  ],
  metric: (g) => g.score,
}
