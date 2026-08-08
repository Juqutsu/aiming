import { avg, ms, pc } from '../format'
import { play, pushFx, registerMiss } from '../game'
import { rayHitBest, speed } from '../math'
import { spawnAtAngle } from '../spawn'
import type { GameState, ModeDef } from '../types'

/** Bis zu diesem Tempo gilt ein Schuss als aus dem Stand abgegeben. */
export const SHOOT_SPEED = 1.0
/** Ab diesem Tempo zählt die Strafe-Bewegung als ernsthaft. */
const STRAFE_SPEED = 4.5
/** So lange muss sie gehalten werden, bevor das Ziel erscheint. */
const STRAFE_HOLD = 0.25

export const counterstrafe: ModeDef = {
  id: 'counterstrafe',
  name: 'Counterstrafe',
  cat: 'move',
  skill: 'Movement',
  core: true,
  meters: true,
  move: true,
  desc: 'Der Pfeil sagt, wohin du strafen musst. Sobald das Ziel erscheint: gegentippen, warten bis du wirklich steht, schießen. Schüsse über 1,0 m/s zählen als Miss.',
  hint: 'A / D strafen · Gegenrichtung tippen · erst schießen wenn der Balken grün ist',
  extraLabel: 'Ø Zeit',
  metricName: 'Kills',
  start(g) {
    g.data.phase = 'strafe'
    g.data.dir = g.rng() < 0.5 ? -1 : 1
    g.data.hold = 0
    g.data.speeds = []
    g.targets = []
  },
  tick(g, input, dt) {
    if (g.data.phase !== 'strafe') {
      g.cue = null
      return
    }
    g.cue = g.data.dir < 0 ? '◀  A  strafen' : 'strafen  D  ▶'
    const richtig = (g.data.dir < 0 && input.keys.KeyA) || (g.data.dir > 0 && input.keys.KeyD)
    g.data.hold = richtig && speed(g.player) > STRAFE_SPEED ? g.data.hold + dt : 0
    if (g.data.hold <= STRAFE_HOLD) return
    g.data.phase = 'shoot'
    g.cue = null
    g.data.at = g.t
    g.targets = [spawnAtAngle(g, 4, 16, 15, 0.32 * g.settings.sizeMul)]
    play(g, 'go')
  },
  fire(g) {
    if (g.data.phase !== 'shoot') {
      g.shots++
      registerMiss(g, 'noch nicht')
      return
    }
    g.shots++
    const sp = speed(g.player)
    g.data.speeds.push(sp)
    const t = rayHitBest(g.player, g.camera.F, g.targets)
    if (t && sp <= SHOOT_SPEED) {
      const rt = (g.t - g.data.at) * 1000
      g.ttk.push(rt)
      g.hits++
      g.score++
      g.streak++
      g.bestStreak = Math.max(g.bestStreak, g.streak)
      pushFx(g, { x: t.x, y: t.y, z: t.z }, `${Math.round(rt)} ms`, 'good')
      play(g, 'hit')
    } else if (t) {
      registerMiss(g, 'zu schnell')
      play(g, 'bad')
    } else {
      registerMiss(g)
    }
    g.targets = []
    g.data.phase = 'strafe'
    g.data.hold = 0
    g.data.dir = g.rng() < 0.5 ? -1 : 1
  },
  hudExtra: (g) => (g.ttk.length ? `${Math.round(avg(g.ttk))}ms` : '–'),
  stats(g) {
    const speeds: number[] = g.data.speeds
    const sauber = speeds.filter((s) => s <= SHOOT_SPEED).length
    return [
      ['Saubere Kills', g.score],
      ['Accuracy', pc(g.hits, g.shots)],
      ['Ø Stop→Schuss', ms(avg(g.ttk))],
      ['Stand-Quote', `${speeds.length ? Math.round((sauber / speeds.length) * 100) : 0} %`],
      ['Ø Tempo b. Schuss', `${speeds.length ? avg(speeds).toFixed(2) : '0.00'} m/s`],
    ]
  },
  metric: (g) => g.score,
}
