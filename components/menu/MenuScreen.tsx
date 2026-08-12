'use client'

import { SlidersHorizontal, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Sparkline } from '@/components/charts/Sparkline'
import { CrosshairMark } from '@/components/settings/CrosshairPreview'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { useSettings } from '@/components/settings/SettingsProvider'
import { MODE_LIST } from '@/lib/engine/modes'
import { ROUTINES, type RoutineId } from '@/lib/engine/routines'
import { cm360, edpi } from '@/lib/engine/sens'
import type { ModeDef, ModeId } from '@/lib/engine/types'
import { routineHref } from '@/lib/routine/step'
import type { Run } from '@/lib/store/runs'
import { bestIndex, trend } from '@/lib/stats/trend'

/** Sparkline-Daten je Modus: die letzten 20 vergleichbaren Läufe und der Index des besten. */
type Spark = { values: number[]; best: number; /** Gesamtzahl vor dem Abschneiden bei 20. */ total: number }

/**
 * Einmal pro Änderung des Verlaufs statt einmal pro Render: `trend()` filtert
 * und sortiert alle Läufe, elf Modi mal auf jedem Render eines Screens, der
 * am ganzen Settings-Kontext hängt, wäre reine Verschwendung.
 */
function useSparklines(runs: Run[]): Record<ModeId, Spark> {
  return useMemo(() => {
    const out = {} as Record<ModeId, Spark>
    for (const m of MODE_LIST) {
      // Nur vergleichbare Läufe: auf 96 Pixeln sieht man einem Ausschlag
      // nicht an, ob er Fortschritt war oder eine verstellte Zielgröße.
      const vergleichbar = trend(runs, m.id).filter((p) => p.standard)
      const angezeigt = vergleichbar.slice(-20)
      out[m.id] = {
        values: angezeigt.map((p) => p.metric),
        best: bestIndex(angezeigt, !!m.lowerBetter),
        total: vergleichbar.length,
      }
    }
    return out
  }, [runs])
}

const GROUPS: [ModeDef['cat'], string][] = [
  ['aim', 'Aim'],
  ['spray', 'Recoil'],
  ['move', 'Movement'],
]

/** Gesamtdauer einer Routine in vollen Minuten. */
function minuten(steps: readonly [string, number][]): number {
  return Math.round(steps.reduce((a, s) => a + s[1], 0) / 60)
}

export default function MenuScreen() {
  const { settings: s, crosshair, best, runs, ready } = useSettings()
  const [offen, setOffen] = useState(false)
  const sparks = useSparklines(runs)

  return (
    <div className="screen">
      <div className="wrap">
        <header className="brand">
          <div>
            <div className="logo">RA<em>N</em>GE</div>
            <div className="tag">Aim- und Movement-Trainer</div>
          </div>
          <div className="headtools">
            <div className="mark"><CrosshairMark cfg={crosshair} /></div>
            <button type="button" className="sensbadge" onClick={() => setOffen(true)}>
              Sens <b>{s.sens.toFixed(3)}</b> · {s.dpi} DPI
              <br />
              eDPI <b>{Math.round(edpi(s.sens, s.dpi))}</b> · {cm360(s.sens, s.dpi).toFixed(1)} cm/360
            </button>
            <Link className="gear" href="/verlauf" aria-label="Verlauf">
              <TrendingUp size={17} strokeWidth={1.75} />
            </Link>
            <button
              type="button"
              className="gear"
              aria-label="Einstellungen"
              onClick={() => setOffen(true)}
            >
              <SlidersHorizontal size={17} strokeWidth={1.75} />
            </button>
          </div>
        </header>

        <section>
          <div className="eyebrow">Routine</div>
          <div className="grid">
            {(Object.keys(ROUTINES) as RoutineId[]).map((id) => {
              const r = ROUTINES[id]
              return (
                <Link className="card" key={id} href={routineHref(id)}>
                  <span className="skill core">Routine</span>
                  <h3>{r.name}</h3>
                  <p>{r.desc}</p>
                  <div className="best">
                    <span>{r.steps.length} Stationen</span>
                    <b>{minuten(r.steps)} min</b>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {GROUPS.map(([cat, title]) => (
          <section key={cat}>
            <div className="eyebrow">{title}</div>
            <div className="grid">
              {MODE_LIST.filter((m) => m.cat === cat).map((m) => {
                const b = best[m.id]
                const spark = sparks[m.id]
                // „Letzten“ stimmt nur, wenn die Sparkline tatsächlich bei 20
                // Läufen abgeschnitten hat — sonst zeigt sie ohnehin alle.
                const geschnitten = spark.total > spark.values.length
                return (
                  <Link className="card" key={m.id} href={`/play/${m.id}`}>
                    {/* Nur wenn die Fertigkeit mehr sagt als die Gruppe darüber.
                        „Movement“ unter der Überschrift „Movement“ ist kein Label,
                        sondern Rauschen. */}
                    {m.skill !== title && <span className="skill">{m.skill}</span>}
                    <h3>{m.name}</h3>
                    <p>{m.desc}</p>
                    <div className="spark">
                      <Sparkline
                        values={spark.values}
                        best={spark.best}
                        label={`${m.name}: Trend der ${geschnitten ? 'letzten ' : ''}${spark.values.length} vergleichbaren Läufe`}
                      />
                    </div>
                    <div className="best">
                      <span>{m.metricName}</span>
                      {/* Vor dem ersten Lesen aus dem Speicher steht ein Strich:
                          eine 0 wäre gelogen, ein Aufblitzen unruhig. */}
                      <b>{ready && b !== undefined ? Math.round(b) : '-'}</b>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Erst ab `ready`: vorher gelten die Standardwerte, und das
          unkontrollierte DPI-Feld würde seinen `defaultValue` nachträglich
          wechseln — Base UI warnt darüber zu Recht. */}
      {ready && <SettingsDialog open={offen} onOpenChange={setOffen} />}
    </div>
  )
}
