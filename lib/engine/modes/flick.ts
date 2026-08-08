import { avg, ms, pc } from '../format'
import { registerHit, registerMiss } from '../game'
import { rayHitBest } from '../math'
import { spawnAtAngle } from '../spawn'
import type { GameState, ModeDef, Target } from '../types'

const mk = (g: GameState): Target => spawnAtAngle(g, 12, 34, 16, 0.34 * g.settings.sizeMul)

export const flick: ModeDef = {
  id: 'flick',
  name: 'Flickshots',
  cat: 'aim',
  skill: 'Flick',
  core: true,
  desc: 'Ein Ziel, das jedes Mal 12–34° neben deiner Blickrichtung erscheint. Erzwingt echte Flicks statt Mikro-Korrekturen.',
  hint: 'Ein Schuss pro Ziel · Fehlschuss kostet Punkte',
  metricName: 'Score',
  start(g) {
    g.targets = [mk(g)]
  },
  tick() {},
  fire(g) {
    g.shots++
    const t = rayHitBest(g.player, g.camera.F, g.targets)
    if (t) {
      registerHit(g, t)
      g.score++
    } else {
      registerMiss(g)
      g.score = Math.max(0, g.score - 1)
    }
    g.targets = [mk(g)]
  },
  stats: (g) => [
    ['Score', g.score],
    ['Accuracy', pc(g.hits, g.shots)],
    ['Ø Flick-Zeit', ms(avg(g.ttk))],
    ['Beste Serie', g.bestStreak],
  ],
  metric: (g) => g.score,
}
