import { describe, it, expect } from 'vitest'
import { coachLine } from './coach'
import { DEFAULT_SETTINGS, createGame } from './game'
import { MODES } from './modes'
import type { GameState, ModeId } from './types'

/** Eine Runde im Ausgangszustand, die der jeweilige Fall dann zurechtbiegt. */
function state(mode: ModeId, biege: (g: GameState) => void): GameState {
  const g = createGame(MODES[mode], DEFAULT_SETTINGS, 60, () => 0.5)
  biege(g)
  return g
}

/**
 * Jeder Zweig von coachLine einmal.
 *
 * Die Reihenfolge in coachLine ist Absicht — modus-eigene Diagnosen vor den
 * allgemeinen Accuracy-Regeln. Die Faelle sind deshalb so gebaut, dass sie
 * genau in den gemeinten Zweig fallen und nicht in einen frueheren.
 */
const FAELLE: [string, GameState, string][] = [
  // peek: eigene Diagnose vor allem anderen.
  [
    'peek, oefter gestorben als gekillt',
    state('peek', (g) => {
      g.score = 1
      g.data.deaths = 4
      g.data.exposures = [300]
    }),
    'länger draußen',
  ],
  [
    'peek, zu lange im Freien',
    state('peek', (g) => {
      g.score = 5
      g.data.deaths = 1
      g.data.exposures = [800, 900]
    }),
    'im Freien',
  ],
  [
    'peek, kurze Exposure',
    state('peek', (g) => {
      g.score = 5
      g.data.deaths = 0
      g.data.exposures = [220, 260]
    }),
    'Sauber',
  ],

  // counterstrafe: erst Stand-Quote, dann Zeit.
  [
    'counterstrafe, zu viele Schuesse aus der Bewegung',
    state('counterstrafe', (g) => {
      g.data.speeds = [0.2, 4.0, 4.0, 4.0]
      g.ttk = [400]
    }),
    'im Stand',
  ],
  [
    'counterstrafe, sauberer Stand aber langsam',
    state('counterstrafe', (g) => {
      g.data.speeds = [0.2, 0.3, 0.4, 0.5]
      g.ttk = [900]
    }),
    'langsam',
  ],
  [
    'counterstrafe, sauberer Stand und schnell',
    state('counterstrafe', (g) => {
      g.data.speeds = [0.2, 0.3, 0.4, 0.5]
      g.ttk = [380]
    }),
    'Stopp und Schuss sitzen',
  ],

  // spray: kein Magazin, drei Guetestufen.
  ['spray, kein volles Magazin', state('spray', (g) => { g.data.sprays = [] }), 'Kein volles Magazin'],
  [
    'spray, schwache Gruppierung',
    state('spray', (g) => { g.data.sprays = [{ score: 30, avg: 0.5 }] }),
    'ersten vier Kugeln',
  ],
  [
    'spray, mittlere Gruppierung',
    state('spray', (g) => { g.data.sprays = [{ score: 60, avg: 0.3 }] }),
    'ab Kugel 13',
  ],
  [
    'spray, gute Gruppierung',
    state('spray', (g) => { g.data.sprays = [{ score: 85, avg: 0.1 }] }),
    'Spray-Kontrolle',
  ],

  // hold-Modi: Anteil auf dem Ziel. Greift fuer tracking und strafetrack.
  [
    'tracking, wenig Zeit auf dem Ziel',
    state('tracking', (g) => { g.trackTime = 3; g.trackTotal = 10 }),
    'Hüfte des Ziels',
  ],
  [
    'tracking, solider Anteil',
    state('tracking', (g) => { g.trackTime = 5.5; g.trackTotal = 10 }),
    'Richtungswechsel',
  ],
  [
    'strafetrack, hoher Anteil',
    state('strafetrack', (g) => { g.trackTime = 8; g.trackTotal = 10 }),
    'sehr gut',
  ],

  // reaction: keine Messung, langsam, schnell.
  ['reaction, keine gueltige Messung', state('reaction', (g) => { g.react = [] }), 'Keine gültige Reaktion'],
  ['reaction, langsam', state('reaction', (g) => { g.react = [400, 380] }), 'Weg zum Ziel'],
  ['reaction, schnell', state('reaction', (g) => { g.react = [220, 240] }), 'überdurchschnittlich'],

  // Allgemeine Accuracy-Regeln: gridshot faellt in keinen der Zweige davor.
  [
    'allgemein, niedrige Accuracy',
    state('gridshot', (g) => { g.hits = 4; g.shots = 10; g.ttk = [500] }),
    'schneller als du zielst',
  ],
  [
    'allgemein, hohe Accuracy bei hoher Zeit',
    state('gridshot', (g) => { g.hits = 95; g.shots = 100; g.ttk = [700] }),
    'zu vorsichtig',
  ],
  [
    'allgemein, gute Balance',
    state('gridshot', (g) => { g.hits = 80; g.shots = 100; g.ttk = [400] }),
    'gute Balance',
  ],
  [
    'allgemein, Mittelfeld',
    state('gridshot', (g) => { g.hits = 70; g.shots = 100; g.ttk = [450] }),
    '5 Punkte mehr Accuracy',
  ],
]

describe('coachLine', () => {
  it.each(FAELLE)('trifft den Zweig: %s', (_name, g, fragment) => {
    expect(coachLine(g)).toContain(fragment)
  })

  it('liefert fuer jeden Zweig einen brauchbaren Satz', () => {
    for (const [name, g] of FAELLE) {
      const line = coachLine(g)
      expect(line.length, name).toBeGreaterThan(20)
      expect(line, name).not.toContain('NaN')
      expect(line, name).not.toContain('undefined')
    }
  })

  it('deckt jeden Zweig mit genau einem Fall ab', () => {
    const texte = FAELLE.map(([, g]) => coachLine(g))
    expect(new Set(texte).size).toBe(FAELLE.length)
  })
})
