import { avg, ms, pc } from '../format'
import { registerHit, registerMiss } from '../game'
import { rayHitBest } from '../math'
import { slotTarget } from '../spawn'
import type { GameState, ModeDef, Target } from '../types'

const mk = (g: GameState): Target =>
  slotTarget(g, 0.42 * g.settings.sizeMul, 6.2, 0.9, 3.4, 17)

export const gridshot: ModeDef = {
  id: 'gridshot',
  name: 'Gridshot',
  cat: 'aim',
  skill: 'Klick-Tempo',
  core: true,
  desc: 'Drei Ziele gleichzeitig, sofortiger Respawn. Trainiert Klickgeschwindigkeit und Zielwechsel unter Zeitdruck.',
  hint: 'Linksklick trifft · Esc pausiert',
  metricName: 'Ziele',
  start(g) {
    g.targets = [mk(g), mk(g), mk(g)]
  },
  tick() {},
  fire(g) {
    g.shots++
    const t = rayHitBest(g.player, g.camera.F, g.targets)
    if (t) {
      registerHit(g, t)
      g.score++
      g.targets[g.targets.indexOf(t)] = mk(g)
    } else {
      registerMiss(g)
    }
  },
  stats: (g) => [
    ['Ziele', g.score],
    ['Accuracy', pc(g.hits, g.shots)],
    ['Ø TTK', ms(avg(g.ttk))],
    ['Beste Serie', g.bestStreak],
    ['Ziele/min', ((g.score / g.dur) * 60).toFixed(1)],
  ],
  metric: (g) => g.score,
}
