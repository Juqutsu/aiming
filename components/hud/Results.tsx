'use client'

import { coachLine } from '@/lib/engine/coach'
import type { GameState } from '@/lib/engine/types'

export function Results({
  game, onAgain, onMenu,
}: {
  game: GameState
  onAgain: () => void
  onMenu: () => void
}) {
  const rows = game.mode.stats(game)
  return (
    <div className="screen">
      <div className="wrap">
        <header className="brand">
          <div>
            <div className="logo">{game.mode.name}</div>
            <div className="tag">{game.dur} Sekunden</div>
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
          <button className="btn cut" onClick={onAgain}>Nochmal</button>
          <button className="btn ghost cut" onClick={onMenu}>Zurück</button>
        </div>
      </div>
    </div>
  )
}
