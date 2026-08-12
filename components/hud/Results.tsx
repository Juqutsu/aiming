'use client'

import { useSettings } from '@/components/settings/SettingsProvider'
import { coachLine } from '@/lib/engine/coach'
import { pc } from '@/lib/engine/format'
import { MODES } from '@/lib/engine/modes'
import type { GameState } from '@/lib/engine/types'
import type { RoutineStep } from '@/lib/routine/step'

export function Results({
  game, isBest, step, onAgain, onNext, onMenu,
}: {
  game: GameState
  /** Ob dieser Lauf einen neuen Bestwert gesetzt hat. Ermittelt beim Rundenende, nicht hier. */
  isBest: boolean
  step: RoutineStep | null
  onAgain: () => void
  onNext: (href: string) => void
  onMenu: () => void
}) {
  const { settings, best, history } = useSettings()
  const rows = game.mode.stats(game)
  const metrik = game.mode.metric(game)
  const bisher = best[game.mode.id]

  return (
    <div className="screen">
      <div className="wrap">
        <header className="brand">
          <div>
            <div className="logo">{game.mode.name}</div>
            <div className="tag">
              {game.dur} Sekunden · Sens {settings.sens.toFixed(3)}
              {step && ` · ${step.label}`}
            </div>
          </div>
          <div className="sensbadge">
            {isBest ? (
              <>
                <span className="newbest">Neuer Bestwert</span>
                <br />
                {game.mode.metricName}: <b>{metrik}</b>
              </>
            ) : (
              <>
                {game.mode.metricName}: <b>{metrik}</b>
                {bisher !== undefined && <> · Best: <b>{Math.round(bisher)}</b></>}
              </>
            )}
          </div>
        </header>

        <div className="stats">
          {rows.map(([k, v]) => (
            <div className="stat" key={k}>
              <div className="k">{k}</div>
              <div className="v">{v}</div>
            </div>
          ))}
        </div>

        <div className="coach"><b>Coach</b><span>{coachLine(game)}</span></div>

        <div className="row">
          {step?.next ? (
            <button className="btn" onClick={() => onNext(step.next!.href)}>
              Weiter in der Routine
            </button>
          ) : (
            <button className="btn" onClick={onAgain}>Nochmal</button>
          )}
          <button className="btn ghost" onClick={onMenu}>Zurück</button>
        </div>

        {step && !step.next && (
          <div className="foot">Routine durch. {step.label} war die letzte Station.</div>
        )}

        {/* Erst ab dem zweiten Lauf: eine Tabelle mit einer Zeile sagt nichts. */}
        {history.length > 1 && (
          <>
            <div className="eyebrow">Session</div>
            <table className="hist">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Modus</th>
                  <th className="n">Score</th>
                  <th className="n">Acc</th>
                  <th className="n">Metrik</th>
                </tr>
              </thead>
              <tbody>
                {/* Dieselben zwanzig Zeilen wie bisher: die Tabelle soll den
                    Ergebnis-Schirm nicht in die Länge ziehen. */}
                {history.slice(-20).map((r, i) => (
                  <tr key={r.t}>
                    <td>{i + 1}</td>
                    <td>{MODES[r.mode].name}</td>
                    <td className="n">{r.score}</td>
                    <td className="n">{pc(r.hits, r.shots)}</td>
                    <td className="n">{Math.round(r.metric)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}
