'use client'

import { SlidersHorizontal, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { CrosshairMark } from '@/components/settings/CrosshairPreview'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { useSettings } from '@/components/settings/SettingsProvider'
import { MODE_LIST } from '@/lib/engine/modes'
import { ROUTINES, type RoutineId } from '@/lib/engine/routines'
import { cm360, edpi } from '@/lib/engine/sens'
import type { ModeDef } from '@/lib/engine/types'
import { routineHref } from '@/lib/routine/step'

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
  const { settings: s, crosshair, best, ready } = useSettings()
  const [offen, setOffen] = useState(false)

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
                return (
                  <Link className="card" key={m.id} href={`/play/${m.id}`}>
                    {/* Nur wenn die Fertigkeit mehr sagt als die Gruppe darüber.
                        „Movement“ unter der Überschrift „Movement“ ist kein Label,
                        sondern Rauschen. */}
                    {m.skill !== title && <span className="skill">{m.skill}</span>}
                    <h3>{m.name}</h3>
                    <p>{m.desc}</p>
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
