import type { Run } from '@/lib/store/runs'

export type Period = '7d' | '30d' | 'all'

const TAG = 86_400_000

/** Das Modul heisst `period` und nicht `range`: „Range" ist in diesem Projekt der Schiessstand. */
const TAGE: Record<Period, number> = { '7d': 7, '30d': 30, all: 0 }

/** Läufe im Zeitraum, von `now` aus zurück gemessen. `all` filtert nicht. */
export function inPeriod(runs: Run[], period: Period, now: number): Run[] {
  if (period === 'all') return runs
  const ab = now - TAGE[period] * TAG
  return runs.filter((r) => r.t >= ab)
}
