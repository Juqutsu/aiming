import type { ModeId } from './types'

export type RoutineId = 'warmup' | 'duel' | 'full'

export type Routine = {
  id: RoutineId
  name: string
  desc: string
  /** Station als [Modus, Sekunden]. */
  steps: [ModeId, number][]
}

export const ROUTINES: Record<RoutineId, Routine> = {
  warmup: {
    id: 'warmup',
    name: 'Warmup · 5 min',
    desc: 'Reaktion → Gridshot → Micro-Flicks → Strafe Tracking → Counterstrafe. Der Ablauf, bevor du in die Queue gehst.',
    steps: [['reaction', 45], ['gridshot', 60], ['micro', 60], ['strafetrack', 60], ['counterstrafe', 60]],
  },
  duel: {
    id: 'duel',
    name: 'Duell-Block · 6 min',
    desc: 'Alles, was ein Duell entscheidet: Peeken, stehen, treffen, Spray nachziehen.',
    steps: [['micro', 60], ['counterstrafe', 90], ['peek', 90], ['spray', 60], ['flick', 60]],
  },
  full: {
    id: 'full',
    name: 'Voller Durchlauf · 10 min',
    desc: 'Jeder Modus einmal. Gut für einen Standortcheck alle paar Wochen.',
    steps: [
      ['reaction', 40], ['gridshot', 60], ['flick', 60], ['micro', 60], ['switching', 60],
      ['tracking', 60], ['strafetrack', 60], ['spray', 60], ['counterstrafe', 75], ['peek', 75],
      ['strafeshoot', 60],
    ],
  },
}
