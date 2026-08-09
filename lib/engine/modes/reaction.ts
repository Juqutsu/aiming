import { avg, ms, pc } from '../format'
import { play, pushFx, registerMiss } from '../game'
import { rayHitBest } from '../math'
import { spawnAtAngle } from '../spawn'
import type { GameState, ModeDef } from '../types'

/** Neue Wartezeit bis zum Signal. Der Bereich verhindert, dass man den Takt lernt. */
const nextWait = (g: GameState) => 0.7 + g.rng() * 2.1

export const reaction: ModeDef = {
  id: 'reaction',
  name: 'Reaktion',
  cat: 'aim',
  skill: 'Reflex',
  desc: 'Ein Ziel erscheint nach zufälliger Wartezeit. Schieß so schnell wie möglich. Zu früh geklickt zählt als Fehlstart.',
  hint: 'Warten · dann sofort schießen',
  extraLabel: 'Ø ms',
  lowerBetter: true,
  metricName: 'Ø ms',
  start(g) {
    g.targets = []
    g.data.wait = 0.8 + g.rng() * 2.2
    g.data.armed = false
  },
  tick(g, _input, dt) {
    if (g.data.armed) return
    g.data.wait -= dt
    if (g.data.wait > 0) return
    g.data.armed = true
    g.data.at = g.t
    g.targets = [spawnAtAngle(g, 3, 14, 15, 0.3 * g.settings.sizeMul)]
    play(g, 'go')
  },
  fire(g) {
    if (!g.data.armed) {
      g.shots++
      registerMiss(g, 'zu früh')
      g.score = Math.max(0, g.score - 1)
      play(g, 'bad')
      g.data.wait = 0.8 + g.rng() * 2.2
      return
    }
    g.shots++
    const t = rayHitBest(g.player, g.camera.F, g.targets)
    if (t) {
      const rt = (g.t - g.data.at) * 1000
      // Nur echte Messungen: ein Schuss im selben Frame wie das Erscheinen
      // ergaebe 0 ms und damit einen unschlagbaren Bestwert.
      if (rt > 0) g.react.push(rt)
      g.hits++
      g.streak++
      g.bestStreak = Math.max(g.bestStreak, g.streak)
      g.score++
      pushFx(g, { x: t.x, y: t.y, z: t.z }, `${Math.round(rt)} ms`, 'good')
      play(g, 'hit')
    } else {
      registerMiss(g)
    }
    g.targets = []
    g.data.armed = false
    g.data.wait = nextWait(g)
  },
  hudExtra: (g) => (g.react.length ? Math.round(avg(g.react)) : '–'),
  stats: (g) => [
    ['Ø Reaktion', ms(avg(g.react))],
    ['Beste', ms(Math.min(...(g.react.length ? g.react : [0])))],
    ['Treffer', g.hits],
    ['Accuracy', pc(g.hits, g.shots)],
  ],
  // 9999 statt 0: ohne Messung darf der Lauf keinen Bestwert setzen.
  metric: (g) => (g.react.length ? Math.round(avg(g.react)) : 9999),
}
