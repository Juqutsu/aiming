import { ROUTINES, type RoutineId } from '@/lib/engine/routines'
import type { ModeId } from '@/lib/engine/types'

export type RoutineStep = {
  routine: RoutineId
  index: number
  modeId: ModeId
  dur: number
  /** Der nächste Schritt, oder null am Ende. */
  next: { modeId: ModeId; href: string } | null
  /** Anzeige: „Station 2 von 5". */
  label: string
}

/** Der Link auf eine Station. Ohne Index auf die erste. */
export function routineHref(routine: RoutineId, index = 0): string {
  const [modeId] = ROUTINES[routine].steps[index]
  return `/play/${modeId}?routine=${routine}&step=${index}`
}

/**
 * Liest Routine und Schritt aus den Suchparametern. null, wenn kein gültiger
 * Schritt drinsteht.
 *
 * Die Warteschlange lebt vollständig in der URL: das kostet keinen
 * Zustandsspeicher, überlebt einen Reload mitten in der Routine und macht jede
 * Station teilbar.
 *
 * Der Modus-Abgleich ist der wichtige Fall: ohne ihn spielt jemand nach einem
 * Tippfehler in der Adresse den falschen Modus mit der Dauer eines anderen.
 */
export function readStep(params: URLSearchParams, modeId: ModeId): RoutineStep | null {
  const id = params.get('routine')
  if (id === null || !(id in ROUTINES)) return null
  const routine = ROUTINES[id as RoutineId]

  const roh = params.get('step')
  if (roh === null || !/^\d+$/.test(roh)) return null
  const index = Number(roh)
  if (index >= routine.steps.length) return null

  const [stationMode, dur] = routine.steps[index]
  if (stationMode !== modeId) return null

  const nextIndex = index + 1
  return {
    routine: routine.id,
    index,
    modeId: stationMode,
    dur,
    next:
      nextIndex < routine.steps.length
        ? { modeId: routine.steps[nextIndex][0], href: routineHref(routine.id, nextIndex) }
        : null,
    label: `Station ${index + 1} von ${routine.steps.length}`,
  }
}
