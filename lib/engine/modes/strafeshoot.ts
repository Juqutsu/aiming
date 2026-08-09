import { avg, ms, pc } from '../format'
import { play, pushFx, registerMiss } from '../game'
import { rayHitBest, speed } from '../math'
import { slotTarget } from '../spawn'
import type { GameState, ModeDef, Target } from '../types'
import { SHOOT_SPEED } from './counterstrafe'

const mk = (g: GameState): Target =>
  slotTarget(g, 0.34 * g.settings.sizeMul, 5.5, 1.1, 3.0, 16)

export const strafeshoot: ModeDef = {
  id: 'strafeshoot',
  name: 'Strafe & Shoot',
  cat: 'move',
  skill: 'Movement',
  move: true,
  meters: true,
  desc: 'Dauerlauf zwischen zwei Marken, Ziele erscheinen laufend. Du musst permanent zwischen Bewegung und sauberem Stopp umschalten.',
  hint: 'A / D dauerhaft wechseln · nur im Stand schießen',
  extraLabel: 'Stand-Quote',
  metricName: 'Kills',
  start(g) {
    g.targets = [mk(g)]
    g.data.speeds = []
  },
  tick() {},
  fire(g) {
    g.shots++
    const sp = speed(g.player)
    g.data.speeds.push(sp)
    const t = rayHitBest(g.player, g.camera.F, g.targets)
    if (t && sp <= SHOOT_SPEED) {
      // Bewusst nicht registerHit: das verwirft Zeiten ueber vier Sekunden.
      // Hier ueberlebt das Ziel jeden Fehlschuss und bleibt stehen — lange
      // Standzeiten sind normale Messwerte, keine verschleppten Artefakte.
      g.hits++
      g.streak++
      g.bestStreak = Math.max(g.bestStreak, g.streak)
      g.ttk.push((g.t - t.born) * 1000)
      pushFx(g, { x: t.x, y: t.y, z: t.z }, '+1', 'good')
      play(g, 'hit')
      g.score++
      g.targets = [mk(g)]
    } else if (t) {
      // Das Ziel bleibt stehen: der Schuss war zu früh, nicht danebengezielt.
      registerMiss(g, 'zu schnell')
    } else {
      registerMiss(g)
    }
  },
  hudExtra(g) {
    const speeds: number[] = g.data.speeds
    const sauber = speeds.filter((s) => s <= SHOOT_SPEED).length
    return speeds.length ? `${Math.round((sauber / speeds.length) * 100)}%` : '–'
  },
  stats(g) {
    const speeds: number[] = g.data.speeds
    const sauber = speeds.filter((s) => s <= SHOOT_SPEED).length
    return [
      ['Kills', g.score],
      ['Accuracy', pc(g.hits, g.shots)],
      ['Stand-Quote', `${speeds.length ? Math.round((sauber / speeds.length) * 100) : 0} %`],
      ['Ø TTK', ms(avg(g.ttk))],
    ]
  },
  metric: (g) => g.score,
}
