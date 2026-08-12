import { describe, expect, it } from 'vitest'
import type { Run } from '@/lib/store/runs'
import { inPeriod } from './period'

/** Lokale Zeit, damit der Test dasselbe Kalenderraster benutzt wie die Fensterberechnung. */
function at(jahr: number, monat: number, tag: number, stunde: number, minute = 0): number {
  return new Date(jahr, monat - 1, tag, stunde, minute).getTime()
}

// Mittwochnachmittag statt Mitternacht: nur so faellt ein Fehler auf, der die
// Uhrzeit von `now` mit in die Grenze rechnet statt sie auf Mitternacht zu kappen.
const JETZT = at(2026, 8, 12, 15)

function run(t: number): Run {
  return {
    t, mode: 'gridshot', metric: 30, score: 30, hits: 30, shots: 40,
    dur: 60, size: 1, weapon: 'vandal',
  }
}

describe('inPeriod', () => {
  it('behaelt bei sieben Tagen nur die juengsten', () => {
    const laeufe = [run(at(2026, 6, 10, 12)), run(at(2026, 7, 23, 22)), run(at(2026, 8, 9, 6)), run(at(2026, 8, 12, 9))]
    expect(inPeriod(laeufe, '7d', JETZT).map((r) => r.t)).toEqual([laeufe[2].t, laeufe[3].t])
  })

  it('behaelt bei dreissig Tagen auch den zwanzig Tage alten', () => {
    const laeufe = [run(at(2026, 6, 10, 12)), run(at(2026, 7, 23, 22)), run(at(2026, 8, 9, 6)), run(at(2026, 8, 12, 9))]
    expect(inPeriod(laeufe, '30d', JETZT)).toHaveLength(3)
  })

  it('filtert bei alles gar nicht', () => {
    const laeufe = [run(at(2026, 6, 10, 12)), run(at(2026, 8, 12, 9))]
    expect(inPeriod(laeufe, 'all', JETZT)).toEqual(laeufe)
  })

  // Die Grenze liegt auf lokaler Mitternacht, nicht 168 Stunden vor `now`:
  // ein Lauf vom fruehen Morgen sieben Kalendertage zurueck (6. August, hier
  // der aelteste noch eingeschlossene Tag) zaehlt mit, einer vom Abend des
  // Tages davor (5. August) nicht mehr — obwohl beide weniger als 168 h von
  // `now` (12. August, 15 Uhr) entfernt liegen.
  it('schneidet an der Kalendertag-Grenze, nicht an 168 Stunden', () => {
    const frueh = run(at(2026, 8, 6, 6))
    const spaet = run(at(2026, 8, 5, 22))
    expect(inPeriod([frueh, spaet], '7d', JETZT)).toEqual([frueh])
  })
})
