'use client'

import { Settings2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { useSettings } from '@/components/settings/SettingsProvider'
import { MODE_LIST } from '@/lib/engine/modes'
import { ROUTINES, type RoutineId } from '@/lib/engine/routines'
import { cm360, edpi, HFOV_DEG } from '@/lib/engine/sens'
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
  const { settings: s, best, ready } = useSettings()
  const [offen, setOffen] = useState(false)

  return (
    <div className="screen">
      <div className="wrap">
        <header className="brand">
          <div>
            <div className="logo">RA<em>N</em>GE</div>
            <div className="tag">Aim &amp; Movement Trainer</div>
          </div>
          <div className="headtools">
            <button type="button" className="sensbadge" onClick={() => setOffen(true)}>
              Sens <b>{s.sens.toFixed(3)}</b> · <b>{s.dpi}</b> DPI · eDPI{' '}
              <b>{Math.round(edpi(s.sens, s.dpi))}</b>
              <br />
              <b>{cm360(s.sens, s.dpi).toFixed(1)}</b> cm/360 · FOV {HFOV_DEG} (Hor+)
            </button>
            {/* Das Zahnrad daneben, damit die Einstellungen auch ohne Raten
                auffindbar sind — der Badge allein sieht nicht klickbar aus. */}
            <button
              type="button"
              className="gear cut"
              aria-label="Einstellungen"
              onClick={() => setOffen(true)}
            >
              <Settings2 size={18} />
            </button>
          </div>
        </header>

        <section>
          <div className="eyebrow">Routine</div>
          <div className="grid">
            {(Object.keys(ROUTINES) as RoutineId[]).map((id) => {
              const r = ROUTINES[id]
              return (
                <Link className="card cut" key={id} href={routineHref(id)}>
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
                  <Link className="card cut" key={m.id} href={`/play/${m.id}`}>
                    <span className={`skill${m.core ? ' core' : ''}`}>{m.skill}</span>
                    <h3>{m.name}</h3>
                    <p>{m.desc}</p>
                    <div className="best">
                      <span>{m.metricName}</span>
                      {/* Vor dem ersten Lesen aus dem Speicher steht der Strich:
                          eine 0 wäre gelogen, ein Aufblitzen unruhig. */}
                      <b>{ready && b !== undefined ? Math.round(b) : '—'}</b>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <SettingsDialog open={offen} onOpenChange={setOffen} />
    </div>
  )
}
