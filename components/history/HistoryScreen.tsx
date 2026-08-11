'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BarRow } from '@/components/charts/BarRow'
import { LineChart } from '@/components/charts/LineChart'
import { useSettings } from '@/components/settings/SettingsProvider'
import { MODES, MODE_LIST } from '@/lib/engine/modes'
import type { ModeId } from '@/lib/engine/types'
import { byDay } from '@/lib/stats/days'
import { inPeriod, type Period } from '@/lib/stats/period'
import { barFill, profile } from '@/lib/stats/profile'
import { bestIndex, trend } from '@/lib/stats/trend'

const PERIODS: [Period, string][] = [['7d', '7 Tage'], ['30d', '30 Tage'], ['all', 'alles']]

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

/** `2026-08-11` als „11. Aug". */
function tagLabel(day: string): string {
  const [, monat, tag] = day.split('-').map(Number)
  return `${tag}. ${MONATE[monat - 1]}`
}

/** Vorzeichenrichtig, weil positiv „besser" heisst — auch bei Reaktion. */
function prozent(delta: number): string {
  const gerundet = Math.round(delta)
  return `${gerundet > 0 ? '+' : ''}${gerundet} %`
}

export default function HistoryScreen() {
  const { runs, ready } = useSettings()
  // Der Zeitraum gilt nur für diesen Besuch. Dreissig Tage sind lang genug für
  // einen Trend und kurz genug, dass die Kurve nicht zur Tapete wird.
  const [period, setPeriod] = useState<Period>('30d')
  const [mode, setMode] = useState<ModeId>('gridshot')
  // Lazy-Initialisierung: `Date.now()` läuft so nur einmal beim Mount statt bei
  // jedem Render — die Reinheitsregel der Hooks verbietet impure Aufrufe im
  // Render-Körper selbst.
  const [now] = useState(() => Date.now())

  const sichtbar = useMemo(() => inPeriod(runs, period, now), [runs, period, now])
  const gespielt = useMemo(
    () => MODE_LIST.filter((m) => sichtbar.some((r) => r.mode === m.id)).map((m) => m.id),
    [sichtbar],
  )
  const punkte = useMemo(() => trend(sichtbar, mode), [sichtbar, mode])
  const zeilen = useMemo(() => profile(sichtbar), [sichtbar])
  const tage = useMemo(() => byDay(sichtbar), [sichtbar])

  const kopf = (
    <header className="brand">
      <div>
        <div className="logo">Verlauf</div>
        <div className="tag">Trend, Profil und Tagesbilanz</div>
      </div>
      <div className="headtools">
        <div className="chips" style={{ marginBottom: 0 }}>
          {PERIODS.map(([p, label]) => (
            <button
              key={p}
              type="button"
              className="chip"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
            >
              {label}
            </button>
          ))}
        </div>
        <Link className="gear" href="/" aria-label="Zurück zum Menü">
          <ArrowLeft size={17} strokeWidth={1.75} />
        </Link>
      </div>
    </header>
  )

  // Vor dem ersten Lesen aus dem Speicher wäre „noch keine Läufe" gelogen.
  if (!ready) return <div className="screen"><div className="wrap">{kopf}</div></div>

  const modus = MODES[mode]
  const bester = bestIndex(punkte, !!modus.lowerBetter)
  const summary =
    punkte.length > 0
      ? `${modus.name}: ${punkte.length} Läufe, ${modus.metricName} von ${Math.round(punkte[0].metric)} auf ${Math.round(punkte[punkte.length - 1].metric)}.`
      : ''

  return (
    <div className="screen">
      <div className="wrap">
        {kopf}

        <section>
          <div className="eyebrow">Trend</div>
          {gespielt.length === 0 ? (
            <p className="empty">
              In diesem Zeitraum liegt kein Lauf. Spiel eine Runde — ab dem ersten Lauf steht hier deine Kurve.
            </p>
          ) : (
            <>
              <div className="chips">
                {gespielt.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="chip"
                    aria-pressed={id === mode}
                    onClick={() => setMode(id)}
                  >
                    {MODES[id].name}
                  </button>
                ))}
              </div>
              {punkte.length === 0 ? (
                <p className="empty">Für {modus.name} liegt in diesem Zeitraum kein Lauf.</p>
              ) : (
                <>
                  <LineChart points={punkte} best={bester} unit={modus.metricName} summary={summary} />
                  <p className="legend">gefüllt = Standardbedingungen · offen = abweichend</p>
                </>
              )}
            </>
          )}
        </section>

        <section>
          <div className="eyebrow">Profil</div>
          {zeilen.length === 0 ? (
            <p className="empty">
              Ab zwei Läufen unter Standardbedingungen je Modus steht hier, wo du stark bist.
            </p>
          ) : (
            <>
              <div className="bars">
                {zeilen.map((z) => (
                  <BarRow
                    key={z.mode}
                    label={MODES[z.mode].name}
                    fill={barFill(z.delta)}
                    value={prozent(z.delta)}
                    hint={`${z.runs} vergleichbare Läufe, Schnitt ${Math.round(z.average)} ${MODES[z.mode].metricName}`}
                  />
                ))}
              </div>
              <p className="legend">letzte fünf Läufe gegen deinen Schnitt</p>
            </>
          )}
        </section>

        <section>
          <div className="eyebrow">Tage</div>
          {tage.length === 0 ? (
            <p className="empty">In diesem Zeitraum hast du nicht trainiert.</p>
          ) : (
            <table className="hist">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th className="n">Läufe</th>
                  <th>Bestes je Modus</th>
                </tr>
              </thead>
              <tbody>
                {tage.map((d) => (
                  <tr key={d.day}>
                    <td>{tagLabel(d.day)}</td>
                    <td className="n">{d.runs}</td>
                    <td>
                      {d.modes
                        .map((m) => `${MODES[m].name} ${Math.round(d.best[m] ?? 0)}`)
                        .join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
