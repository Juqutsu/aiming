'use client'

import { useImperativeHandle, useRef, useState, type RefObject } from 'react'
import {
  EXPO_ZONE_PCT, SPEED_ZONE_PCT, expoColor, expoPct, speedColor, speedPct,
  type HudSnapshot,
} from '@/lib/view/hud'

export type HudHandle = {
  /** Die langsamen Zahlen. Wird alle 100 ms gerufen. */
  set(snap: HudSnapshot): void
  /** Die schnellen Balken. Wird jeden Frame gerufen und schreibt direkt ins DOM. */
  setMeters(speed: number, exposureMs: number | null): void
}

const EMPTY: HudSnapshot = {
  time: 0, score: 0, acc: '–', extraLabel: 'Streak', extra: 0,
  ammo: null, weapon: '', hint: '', cue: null,
}

export function Hud({
  handleRef,
  meters,
}: {
  handleRef: RefObject<HudHandle | null>
  /** Nur Bewegungsmodi zeigen Tempo und Exposure. */
  meters: boolean
}) {
  const [s, setS] = useState<HudSnapshot>(EMPTY)
  const speedBar = useRef<HTMLElement>(null)
  const speedVal = useRef<HTMLSpanElement>(null)
  const expoWrap = useRef<HTMLDivElement>(null)
  const expoBar = useRef<HTMLElement>(null)
  const expoVal = useRef<HTMLSpanElement>(null)

  useImperativeHandle(handleRef, () => ({
    set: setS,
    setMeters(sp, expo) {
      const bar = speedBar.current
      if (bar) {
        bar.style.width = `${speedPct(sp)}%`
        bar.style.background = speedColor(sp)
      }
      if (speedVal.current) speedVal.current.textContent = `${sp.toFixed(2)} m/s`

      const wrap = expoWrap.current
      if (wrap) wrap.classList.toggle('hidden', expo === null)
      if (expo !== null) {
        if (expoBar.current) {
          expoBar.current.style.width = `${expoPct(expo)}%`
          expoBar.current.style.background = expoColor(expo)
        }
        if (expoVal.current) expoVal.current.textContent = `${Math.round(expo)} ms`
      }
    },
  }), [])

  return (
    <div id="hud">
      {/* Eine Leiste, vier Zellen: die Zahlen stehen fest nebeneinander, statt
          als vier einzelne Kacheln im Blickfeld zu schweben. */}
      <div className="hudTop">
        <div className="pill"><div className="k">Zeit</div><div className="v">{s.time}</div></div>
        <div className="pill"><div className="k">Score</div><div className="v">{s.score}</div></div>
        <div className="pill"><div className="k">Acc</div><div className="v">{s.acc}</div></div>
        <div className="pill">
          <div className="k">{s.extraLabel}</div>
          <div className="v">{s.extra}</div>
        </div>
      </div>

      {meters && (
        <div className="hudLeft">
          <div className="meter">
            <div className="k"><span>Tempo</span><span ref={speedVal}>0.00 m/s</span></div>
            <div className="bar">
              <div className="zone" style={{ width: `${SPEED_ZONE_PCT}%` }} />
              <i ref={speedBar} />
            </div>
          </div>
          <div className="meter hidden" ref={expoWrap}>
            <div className="k"><span>Exposure</span><span ref={expoVal}>0 ms</span></div>
            <div className="bar">
              <div className="zone" style={{ width: `${EXPO_ZONE_PCT}%` }} />
              <i ref={expoBar} />
            </div>
          </div>
        </div>
      )}

      {s.cue && <div className="cue">{s.cue}</div>}
      {s.ammo !== null && (
        <div className="ammo"><div className="n">{s.ammo}</div><div className="w">{s.weapon}</div></div>
      )}
      <div className="hudBottom">{s.hint}</div>
    </div>
  )
}
