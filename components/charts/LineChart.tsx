'use client'

import { useState } from 'react'
import { shortDate } from '@/lib/engine/format'
import type { TrendPoint } from '@/lib/stats/trend'

const W = 640
const H = 200
const PAD = { top: 14, right: 14, bottom: 28, left: 44 }

/**
 * Die Kurve eines Modus.
 *
 * Gefüllte Punkte standen unter Standardbedingungen, offene nicht — beide sind
 * zu sehen, weil ein weggelassener Lauf eine Lücke hinterlässt, die niemand
 * erklären kann.
 */
export function LineChart({ points, best, unit, summary }: {
  points: TrendPoint[]
  /** Index des besten Punktes, aus `bestIndex()`. */
  best: number
  /** Beschriftung der Y-Achse, der `metricName` des Modus. */
  unit: string
  /** Ein Satz, der die Kurve auch ohne Grafik erzählt. */
  summary: string
}) {
  const [aktiv, setAktiv] = useState<number | null>(null)

  const werte = points.map((p) => p.metric)
  const lo = Math.min(...werte)
  const hi = Math.max(...werte)
  // Luft nach oben und unten, damit Punkte nicht am Rahmen kleben. Bei einer
  // waagerechten Reihe steht die Spanne auf dem Betrag des Werts.
  const spanne = hi - lo || Math.abs(hi) || 1
  const y0 = lo - spanne * 0.15
  const y1 = hi + spanne * 0.15

  const innen = W - PAD.left - PAD.right
  const x = (i: number) =>
    points.length === 1 ? PAD.left + innen / 2 : PAD.left + (i * innen) / (points.length - 1)
  const y = (v: number) => PAD.top + ((y1 - v) / (y1 - y0)) * (H - PAD.top - PAD.bottom)
  const ticks = [y1, (y0 + y1) / 2, y0]

  return (
    <figure className="chart">
      <div className="plot" onMouseLeave={() => setAktiv(null)}>
        {/* Für Hilfsmittel steht die Liste unten; das SVG ist die Grafik dazu. */}
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)}
                stroke="var(--line)" strokeWidth="1" />
              <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--dim)">
                {Math.round(v)}
              </text>
            </g>
          ))}

          <polyline
            fill="none"
            stroke="var(--text)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points.map((p, i) => `${x(i)},${y(p.metric)}`).join(' ')}
          />

          {points.map((p, i) => (
            <circle
              key={p.t}
              cx={x(i)}
              cy={y(p.metric)}
              r="4"
              // Gefüllt = Standardbedingungen, offen = abweichend. Orange trägt
              // nur den besten Punkt.
              fill={p.standard ? (i === best ? 'var(--sig)' : 'var(--dim)') : 'var(--surface)'}
              stroke={p.standard ? 'var(--surface)' : i === best ? 'var(--sig)' : 'var(--dim)'}
              strokeWidth="2"
            />
          ))}

          {/* Trefferflächen: ein 4-Pixel-Punkt ist mit der Maus nicht zu halten. */}
          {points.map((p, i) => (
            <rect
              key={`hit-${p.t}`}
              x={x(i) - 12}
              y={PAD.top}
              width="24"
              height={H - PAD.top - PAD.bottom}
              fill="transparent"
              onMouseEnter={() => setAktiv(i)}
            />
          ))}

          <text x={PAD.left} y={H - 8} fontSize="11" fill="var(--dim)">{shortDate(points[0].t)}</text>
          {points.length > 1 && (
            <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize="11" fill="var(--dim)">
              {shortDate(points[points.length - 1].t)}
            </text>
          )}
        </svg>

        {aktiv !== null && (
          <div
            className="tip"
            style={{ left: `${(x(aktiv) / W) * 100}%`, top: `${(y(points[aktiv].metric) / H) * 100}%` }}
          >
            {shortDate(points[aktiv].t)} · <b>{Math.round(points[aktiv].metric)}</b> {unit}
            <br />
            {points[aktiv].note}
          </div>
        )}
      </div>

      {/* Die Aussage kommt auch ohne die Grafik an, und jeder Wert ist lesbar. */}
      <figcaption className="vh">
        {summary}
        <ul>
          {points.map((p) => (
            <li key={p.t}>
              {shortDate(p.t)}: {Math.round(p.metric)} {unit} — {p.note}
              {p.standard ? '' : ' (abweichende Bedingungen)'}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  )
}
