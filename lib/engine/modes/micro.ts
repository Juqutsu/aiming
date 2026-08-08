import { avg, ms, pc, pcNum } from '../format'
import { play, registerHit, registerMiss } from '../game'
import { rayHitBest } from '../math'
import { spawnAtAngle } from '../spawn'
import type { GameState, ModeDef, Target } from '../types'

const mk = (g: GameState): Target => spawnAtAngle(g, 2, 8, 15, 0.13 * g.settings.sizeMul)

export const micro: ModeDef = {
  id: 'micro',
  name: 'Micro-Flicks',
  cat: 'aim',
  skill: 'Präzision',
  desc: 'Kopfgroße Ziele, 2–8° Versatz. Das ist die Bewegung, die dir im Duell die Kopfhöhe rettet.',
  hint: 'Kleine Ziele · sauber statt schnell',
  metricName: 'Acc %',
  start(g) {
    g.targets = [mk(g)]
  },
  tick() {},
  fire(g) {
    g.shots++
    const t = rayHitBest(g.player, g.camera.F, g.targets)
    if (t) {
      registerHit(g, t, 'HS')
      play(g, 'head')
      g.score++
    } else {
      registerMiss(g)
    }
    g.targets = [mk(g)]
  },
  stats: (g) => [
    ['Treffer', g.score],
    ['Accuracy', pc(g.hits, g.shots)],
    ['Ø Zeit', ms(avg(g.ttk))],
    ['Beste Serie', g.bestStreak],
  ],
  metric: (g) => Math.round(pcNum(g.hits, g.shots)),
}
