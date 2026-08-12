'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { DEFAULT_CROSSHAIR, type CrosshairConfig } from '@/lib/crosshair/draw'
import { DEFAULT_SETTINGS } from '@/lib/engine/game'
import type { GameState, Settings } from '@/lib/engine/types'
import { clearBest, loadBest, submitBest, type BestMap } from '@/lib/store/best'
import { browserStore, sessionStore, type Store } from '@/lib/store/keys'
import { loadCrosshair, loadSettings, saveCrosshair, saveSettings } from '@/lib/store/settings'
import { clearRuns, loadRuns, pushRun, sessionStart, type Run } from '@/lib/store/runs'

/** Alles, was aus dem Speicher kommt — als ein Zustand, damit jede Änderung genau einen Render kostet. */
type Gespeichert = {
  settings: Settings
  crosshair: CrosshairConfig
  best: BestMap
  /** Alle gespeicherten Läufe, ältester zuerst. */
  runs: Run[]
  /** Die Läufe dieser Sitzung, ältester zuerst. Eine Teilmenge von `runs`. */
  history: Run[]
  /** True, sobald aus dem Speicher gelesen wurde. Vorher gelten die Standardwerte. */
  ready: boolean
}

export type SettingsApi = Gespeichert & {
  setSettings(patch: Partial<Settings>): void
  setCrosshair(patch: Partial<CrosshairConfig>): void
  resetBest(): void
  resetRuns(): void
  /** Trägt einen beendeten Lauf ein. Gibt zurück, ob es ein Bestwert war. */
  submitRun(g: GameState): boolean
}

const VORHER: Gespeichert = {
  settings: DEFAULT_SETTINGS,
  crosshair: DEFAULT_CROSSHAIR,
  best: {},
  runs: [],
  history: [],
  ready: false,
}

/**
 * Ersatzspeicher, wenn der Browser keinen hergibt (blockierte Cookies, privater
 * Modus). Alles funktioniert weiter, nur überlebt nichts den Reload — ein
 * besseres Verhalten als eine App, die ohne `localStorage` gar nicht läuft.
 */
function memoryStore(): Store {
  const map = new Map<string, string>()
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v) },
    removeItem: (k) => { map.delete(k) },
  }
}

const Ctx = createContext<SettingsApi | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Gespeichert>(VORHER)

  // Spiegel des Zustands, damit die Setzer stabil bleiben: sie mischen ein
  // Teilobjekt in den letzten Wert, ohne ihn über die Abhängigkeitsliste
  // einzufangen — sonst bekäme jeder Verbraucher bei jeder Änderung neue
  // Rückrufe.
  const ref = useRef(state)
  const localRef = useRef<Store | null>(null)
  // Der Beginn dieser Sitzung. Als Ref, weil er die Ansicht nie selbst ändert —
  // er filtert nur, was aus `runs` in `history` fällt.
  const startRef = useRef(0)

  const anwenden = useCallback((patch: Partial<Gespeichert>) => {
    const next = { ...ref.current, ...patch }
    ref.current = next
    setState(next)
  }, [])

  // Einmal nach der Montage gelesen, nicht im Render-Rumpf: der Server hat
  // keinen `localStorage`, ein Lesezugriff beim Rendern wäre ein
  // Hydration-Mismatch. Der eine daraus folgende Nachrender ist gewollt —
  // ohne ihn gäbe es keinen Weg von den Standardwerten zu den gespeicherten.
  useEffect(() => {
    const local = browserStore() ?? memoryStore()
    const session = sessionStore() ?? memoryStore()
    localRef.current = local
    const start = sessionStart(session, Date.now())
    startRef.current = start
    const runs = loadRuns(local)
    anwenden({
      settings: loadSettings(local),
      crosshair: loadCrosshair(local),
      best: loadBest(local),
      runs,
      history: runs.filter((r) => r.t >= start),
      ready: true,
    })
  }, [anwenden])

  // Durchgeschrieben wird im selben Aufruf, nicht in einem Effekt auf die
  // Änderung: der würde auch beim ersten Laden feuern und die eben gelesenen
  // Werte sofort zurückschreiben.
  const setSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...ref.current.settings, ...patch }
    anwenden({ settings: next })
    if (localRef.current) saveSettings(localRef.current, next)
  }, [anwenden])

  const setCrosshair = useCallback((patch: Partial<CrosshairConfig>) => {
    const next = { ...ref.current.crosshair, ...patch }
    anwenden({ crosshair: next })
    if (localRef.current) saveCrosshair(localRef.current, next)
  }, [anwenden])

  const resetBest = useCallback(() => {
    anwenden({ best: {} })
    if (localRef.current) clearBest(localRef.current)
  }, [anwenden])

  // Zwei Knöpfe statt eines gemeinsamen: Bestwerte und Verlauf sind für den
  // Spielenden nicht dasselbe.
  const resetRuns = useCallback(() => {
    anwenden({ runs: [], history: [] })
    if (localRef.current) clearRuns(localRef.current)
  }, [anwenden])

  const submitRun = useCallback((g: GameState) => {
    const local = localRef.current
    if (!local) return false
    const runs = pushRun(local, g, Date.now())
    const { best, isBest } = submitBest(local, g, ref.current.best)
    anwenden({ best, runs, history: runs.filter((r) => r.t >= startRef.current) })
    return isBest
  }, [anwenden])

  return (
    <Ctx.Provider value={{ ...state, setSettings, setCrosshair, resetBest, resetRuns, submitRun }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSettings(): SettingsApi {
  const api = useContext(Ctx)
  if (!api) throw new Error('useSettings braucht einen SettingsProvider darüber.')
  return api
}
