# Phase 4 — Verlauf über Sitzungen und Charts: Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Läufe dauerhaft speichern und daraus Trend, Modus-Profil und Tagesbilanz zeigen — auf einer eigenen Route `/verlauf` plus Sparkline auf jeder Modus-Karte im Menü.

**Architecture:** Ein flaches Array `Run[]` in `localStorage` unter `range.runs.v1` ist die einzige Quelle. Reine Funktionen in `lib/stats/` rechnen daraus Punkte, Zeilen und Tage — sie bekommen `now` übergeben statt `Date.now()` zu rufen und sind ohne Browser testbar. Drei selbstgezeichnete SVG-Komponenten unter `components/charts/` stellen nur dar. `lib/store/session.ts` entfällt: der Sitzungsverlauf ist eine Teilmenge der Läufe.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest (`environment: node`, `include: ['lib/**/*.test.ts']`), pnpm. Keine neue Abhängigkeit — Charts sind handgeschriebenes SVG.

**Vorgelagerte Dokumente:** Spec `docs/superpowers/specs/2026-08-11-phase-4-verlauf-und-charts-design.md`.

## Global Constraints

- **Bezeichner englisch, Kommentare und Oberflächentexte deutsch.** Wie überall sonst im Projekt.
- **Keine neue Abhängigkeit.** Charts als SVG von Hand.
- **`lib/**` bleibt browserfrei.** Kein `window`, kein `document`, kein `Date.now()` in `lib/stats/` — Zeit wird als Parameter übergeben. Nur `lib/**/*.test.ts` läuft unter Vitest; Komponenten werden im Browser abgenommen, nicht per Unit-Test.
- **Speicherschlüssel:** `range.runs.v1` (localStorage), `range.session.start.v1` (sessionStorage). Deckel 500 Läufe, ältester fällt heraus.
- **Vergleichbar** heißt: `dur` und `size` gleich den Werten aus `DEFAULT_SETTINGS` (`dur: 60`, `sizeMul: 1.0`). Die Waffe zählt nicht hinein.
- **`lowerBetter` dreht das Vorzeichen genau zweimal:** in `profile()` (für `delta`), in `byDay()` (für `best`) — und in `bestIndex()` für die Punktfarbe. Nie in einer Komponente.
- **Farbregel:** Datenlinie `var(--text)`, Punkte `var(--dim)`, nur der beste Punkt `var(--sig)`, Achsen und Raster `var(--line)`. Orange trägt Ziele und primäre Aktion — eine Datenlinie ist keins von beidem.
- **Marken-Spezifikation (dataviz):** Linien 2 px mit runden Enden, Punkte r ≥ 4 mit 2 px Ring in Flächenfarbe, Rasterlinien 1 px durchgezogen (nie gestrichelt), keine Zahl an jedem Punkt, eine Achse. **Die Sparkline ist davon ausgenommen:** auf 96×24 Pixeln trägt sie eine 1,5-px-Linie und einen Punkt mit r=2,5 samt 1,5-px-Ring — ein 12 px breiter Punkt füllte die halbe Kachel und verdeckte die Kurve, die er markieren soll.
- **Barrierefreiheit:** jedes Chart trägt eine textliche Entsprechung. Beim `LineChart` ist das ein visuell verstecktes Element (`.vh`) mit Zusammenfassung und allen Punkten; die Sparkline trägt stattdessen `role="img"` mit `aria-label` — für ein 96 Pixel breites Zeichen ohne Achsen die passendere Form als eine versteckte Liste aus zwanzig Zahlen auf jeder der elf Modus-Karten.
- **Kein Migrationsschritt** für `range.session.v1`: der alte Schlüssel bleibt liegen und verfällt mit der Sitzung.
- **Commit-Nachrichten** deutsch ohne Umlaute, wie die bestehende Historie (`feat: ...`, `refactor: ...`).

## Dateien

| Datei | Verantwortung | Task |
|---|---|---|
| `lib/store/keys.ts` | Schlüssel `runs`, `sessionStart`; `session` entfällt | 1 |
| `lib/store/best.ts` | `hatGemessen` wird zu exportiertem `hasMeasured` | 1 |
| `lib/store/runs.ts` (neu) | Laden, Eintragen, Löschen, Deckel, Vergleichbarkeit, Sitzungsbeginn | 1 |
| `lib/stats/period.ts` (neu) | Zeitraum-Filter | 2 |
| `lib/stats/trend.ts` (neu) | Punkte einer Modus-Kurve, bester Punkt, Bedingungstext | 2 |
| `lib/stats/profile.ts` (neu) | Modus-Vergleich, `lowerBetter`-Umkehr, Balkenfüllung | 3 |
| `lib/stats/days.ts` (neu) | Tagesgruppierung nach lokalem Datum | 4 |
| `components/settings/SettingsProvider.tsx` | `runs`, `history` aus `runs`, `resetRuns` | 5 |
| `components/hud/Results.tsx` | Tabelle aus `runs` | 5 |
| `lib/store/session.ts`, `lib/store/session.test.ts` | entfallen | 5 |
| `components/charts/Sparkline.tsx` (neu) | 96×24, Polyline, keine Achsen | 6 |
| `components/charts/LineChart.tsx` (neu) | Kurve mit Ticks, Randdaten, Tooltip | 6 |
| `components/charts/BarRow.tsx` (neu) | ein waagerechter Balken | 6 |
| `app/range.css` | Chart- und Verlaufsklassen | 6, 7, 8 |
| `app/verlauf/page.tsx` (neu) | dünne Server-Komponente | 7 |
| `components/history/HistoryScreen.tsx` (neu) | drei Abschnitte, Zeitraum-Umschalter | 7 |
| `components/menu/MenuScreen.tsx` | Sparkline auf der Karte, Link auf `/verlauf` | 8 |
| `components/settings/SettingsDialog.tsx` | Knopf „Verlauf loeschen" | 9 |

## Abweichungen von der Spec (bewusst, beim Bau nicht neu verhandeln)

1. **`TrendPoint` bekommt ein viertes Feld `note: string`.** Der Tooltip soll Waffe und Abweichung nennen; beides steht im `Run`, nicht im Punkt. Den Text in der Ansicht zusammenzusetzen hieße, die Bedingungen dort erneut mit `DEFAULT_SETTINGS` zu vergleichen — genau die Rechnung, die laut Spec in `lib/stats/` gehört.
2. **`pushRun()` verwirft Läufe ohne Messung.** `best.ts` prüft das bereits (`hatGemessen`); ein abgebrochener Reaktions-Lauf liefert `metric = 9999` und würde die Kurve zerreißen. Der Wächter zieht in die geteilte Stelle: `hasMeasured` wird exportiert und von beiden Schreibpfaden benutzt.
3. **Die Ergebnis-Tabelle zeigt statt „Detail" die Metrik.** Die alte Spalte war der dritte Wert aus `mode.stats(g)` — der lässt sich aus einem gespeicherten `Run` nicht rekonstruieren. `metric` ist gespeichert, ist dieselbe Zahl wie im Bestwert und braucht keine zweite Speicherung.
4. **Die Tagesliste führt Modi und Bestwerte in einer Spalte** (`Gridshot 42 · Reaktion 210`). Die Skizze der Spec zeigt „beste: 42 Ziele" bei drei Modi in derselben Zeile — welche Zahl zu welchem Modus gehört, bliebe offen.

---

### Task 1: Run-Speicher

**Files:**
- Modify: `lib/store/keys.ts` (Block `KEY`)
- Modify: `lib/store/best.ts` (Funktion `hatGemessen` und ihr Aufruf in `submitBest`)
- Create: `lib/store/runs.ts`
- Test: `lib/store/runs.test.ts`

**Interfaces:**
- Consumes: `KEY`, `readJson`, `writeJson`, `Store` aus `./keys`; `MODES` aus `@/lib/engine/modes`; `DEFAULT_SETTINGS` aus `@/lib/engine/game`; `GameState`, `ModeId`, `WeaponId` aus `@/lib/engine/types`.
- Produces:
  - `type Run = { t: number; mode: ModeId; metric: number; score: number; hits: number; shots: number; dur: number; size: number; weapon: WeaponId }`
  - `const MAX_RUNS = 500`
  - `function loadRuns(store: Store): Run[]`
  - `function pushRun(store: Store, g: GameState, now: number): Run[]`
  - `function clearRuns(store: Store): void`
  - `function isStandard(r: Run): boolean`
  - `function sessionStart(store: Store, now: number): number`
  - `function hasMeasured(g: GameState): boolean` (aus `lib/store/best.ts`)

- [ ] **Step 1: Schlüssel eintragen**

In `lib/store/keys.ts` den `KEY`-Block ergänzen:

```ts
/** Die Version im Schlüssel erlaubt es, altes Schema später zu erkennen statt daran zu scheitern. */
export const KEY = {
  settings: 'range.settings.v1',
  crosshair: 'range.crosshair.v1',
  best: 'range.best.v1',
  session: 'range.session.v1',
  runs: 'range.runs.v1',
  /** Nur der Zeitstempel, in `sessionStorage`: „seit wann ist dieses Tab offen". */
  sessionStart: 'range.session.start.v1',
} as const
```

`session` bleibt vorerst stehen, damit `lib/store/session.ts` bis Task 5 übersetzt und die Suite zwischen den Tasks grün bleibt. Task 5 löscht beides zusammen.

- [ ] **Step 2: `hasMeasured` exportieren**

In `lib/store/best.ts` die private Funktion umbenennen und exportieren (Bezeichner sind hier englisch):

```ts
/**
 * Hat der Lauf überhaupt etwas gemessen?
 *
 * `reaction.metric()` gibt bewusst 9999 zurück, wenn nichts gemessen wurde.
 * Bei `lowerBetter` wäre das trotzdem der erste und damit beste Wert — ein
 * Bestwert, den niemand gespielt hat. Klick- und Halte-Modi unterscheiden sich
 * darin, was „etwas passiert" heisst, deshalb beide Zähler.
 */
export function hasMeasured(g: GameState): boolean {
  return g.shots > 0 || g.trackTotal > 0
}
```

Den Aufruf in `submitBest` mitziehen: `if (!hasMeasured(g)) return { best, isBest: false }`.

- [ ] **Step 3: Den fehlschlagenden Test schreiben**

`lib/store/runs.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createGame, DEFAULT_SETTINGS } from '@/lib/engine/game'
import { MODES } from '@/lib/engine/modes'
import { KEY, type Store } from './keys'
import { MAX_RUNS, clearRuns, isStandard, loadRuns, pushRun, sessionStart, type Run } from './runs'

function fakeStore(seed: Record<string, string> = {}): Store & { map: Map<string, string> } {
  const map = new Map(Object.entries(seed))
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v) },
    removeItem: (k) => { map.delete(k) },
  }
}

/** Ein beendeter Gridshot-Lauf. `sizeMul` und `dur` sind die Stellschrauben der Vergleichbarkeit. */
function lauf(score: number, patch: Partial<{ sizeMul: number; dur: number }> = {}) {
  const g = createGame(MODES.gridshot, { ...DEFAULT_SETTINGS, ...patch })
  g.score = score
  g.hits = score
  g.shots = score * 2
  return g
}

describe('loadRuns', () => {
  it('liefert bei leerem Speicher eine leere Liste', () => {
    expect(loadRuns(fakeStore())).toEqual([])
  })

  it('liefert bei kaputtem Inhalt eine leere Liste, ohne zu werfen', () => {
    const store = fakeStore({ [KEY.runs]: '{kaputt' })
    expect(() => loadRuns(store)).not.toThrow()
    expect(loadRuns(store)).toEqual([])
  })

  it('wirft einzelne unbrauchbare Eintraege weg und behaelt die guten', () => {
    const gut: Run = {
      t: 1000, mode: 'gridshot', metric: 30, score: 30, hits: 30, shots: 40,
      dur: 60, size: 1, weapon: 'vandal',
    }
    const store = fakeStore({
      [KEY.runs]: JSON.stringify([gut, { ...gut, mode: 'gibtesnicht' }, { ...gut, metric: 'viel' }, null]),
    })
    expect(loadRuns(store)).toEqual([gut])
  })
})

describe('pushRun', () => {
  it('traegt einen Lauf mit Zeitstempel und Bedingungen ein', () => {
    const store = fakeStore()
    const alle = pushRun(store, lauf(30), 1_700_000_000_000)
    expect(alle).toHaveLength(1)
    expect(alle[0]).toEqual({
      t: 1_700_000_000_000, mode: 'gridshot', metric: 30, score: 30, hits: 30, shots: 60,
      dur: 60, size: 1, weapon: 'vandal',
    })
    expect(loadRuns(store)).toEqual(alle)
  })

  it('haengt hinten an, aeltester zuerst', () => {
    const store = fakeStore()
    pushRun(store, lauf(10), 1000)
    const alle = pushRun(store, lauf(20), 2000)
    expect(alle.map((r) => r.metric)).toEqual([10, 20])
  })

  it('traegt einen Lauf ohne Messung nicht ein', () => {
    const store = fakeStore()
    const leer = createGame(MODES.reaction, DEFAULT_SETTINGS)
    expect(pushRun(store, leer, 1000)).toEqual([])
    expect(store.map.has(KEY.runs)).toBe(false)
  })

  it('haelt den Deckel und wirft den aeltesten heraus', () => {
    const store = fakeStore()
    let alle: Run[] = []
    // Ab 1, weil ein Lauf mit Score 0 auch keinen Schuss hat und gar nicht erst
    // eingetragen wird. MAX_RUNS + 1 Eintraege erzwingen genau eine Verdraengung.
    for (let i = 1; i <= MAX_RUNS + 1; i++) alle = pushRun(store, lauf(i), 1000 + i)
    expect(alle).toHaveLength(MAX_RUNS)
    expect(alle[0].metric).toBe(2)
    expect(alle[MAX_RUNS - 1].metric).toBe(MAX_RUNS + 1)
  })
})

describe('isStandard', () => {
  it('gilt bei Standarddauer und Standardgroesse, unabhaengig von der Waffe', () => {
    const store = fakeStore()
    const [r] = pushRun(store, lauf(30), 1000)
    expect(isStandard(r)).toBe(true)
    expect(isStandard({ ...r, weapon: 'phantom' })).toBe(true)
  })

  it('gilt nicht bei abweichender Zielgroesse oder Dauer', () => {
    const store = fakeStore()
    const [gross] = pushRun(store, lauf(30, { sizeMul: 1.5 }), 1000)
    expect(isStandard(gross)).toBe(false)
    expect(isStandard({ ...gross, size: 1, dur: 90 })).toBe(false)
  })
})

describe('clearRuns', () => {
  it('leert den Verlauf', () => {
    const store = fakeStore()
    pushRun(store, lauf(30), 1000)
    clearRuns(store)
    expect(loadRuns(store)).toEqual([])
  })
})

describe('sessionStart', () => {
  it('setzt den Zeitstempel beim ersten Lesen und haelt ihn danach fest', () => {
    const store = fakeStore()
    expect(sessionStart(store, 5000)).toBe(5000)
    expect(sessionStart(store, 9000)).toBe(5000)
  })

  it('ersetzt einen kaputten Zeitstempel durch den aktuellen', () => {
    const store = fakeStore({ [KEY.sessionStart]: '"gestern"' })
    expect(sessionStart(store, 7000)).toBe(7000)
  })
})
```

- [ ] **Step 4: Test laufen lassen, Fehlschlag bestätigen**

Run: `pnpm vitest run lib/store/runs.test.ts`
Expected: FAIL — `Failed to resolve import "./runs"`.

- [ ] **Step 5: `lib/store/runs.ts` schreiben**

```ts
import { DEFAULT_SETTINGS } from '@/lib/engine/game'
import { MODES } from '@/lib/engine/modes'
import type { GameState, ModeId, WeaponId } from '@/lib/engine/types'
import { hasMeasured } from './best'
import { KEY, readJson, writeJson, type Store } from './keys'

export type Run = {
  /** Zeitstempel in Millisekunden, gesetzt beim Eintragen. */
  t: number
  mode: ModeId
  /** Dieselbe Zahl, die auch über den Bestwert entscheidet. */
  metric: number
  score: number
  hits: number
  shots: number
  /** Die Bedingungen, unter denen gespielt wurde. */
  dur: number
  size: number
  weapon: WeaponId
}

/**
 * Deckel des Verlaufs. Rund 90 Byte je Lauf, also etwa 45 KB gegen ein Budget
 * von 5 MB — der Deckel schützt nicht vor dem Speicher, sondern vor einer
 * Kurve, die niemand mehr liest.
 */
export const MAX_RUNS = 500

function zahl(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/**
 * Ein einzelner Eintrag aus dem Speicher.
 *
 * Feldweise geprüft statt vertraut: ein halb geschriebener Eintrag aus einer
 * abgebrochenen Sitzung darf den ganzen Verlauf nicht wertlos machen.
 */
function isRun(v: unknown): v is Run {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    zahl(r.t) && zahl(r.metric) && zahl(r.score) && zahl(r.hits) && zahl(r.shots) &&
    zahl(r.dur) && zahl(r.size) &&
    typeof r.mode === 'string' && r.mode in MODES &&
    (r.weapon === 'vandal' || r.weapon === 'phantom')
  )
}

export function loadRuns(store: Store): Run[] {
  const roh = readJson(store, KEY.runs)
  return Array.isArray(roh) ? roh.filter(isRun) : []
}

export function clearRuns(store: Store): void {
  try {
    store.removeItem(KEY.runs)
  } catch {
    // Ein gesperrter Speicher ist kein Grund abzustürzen.
  }
}

/**
 * Vergleichbar heisst: dieselbe Rundenzeit und dieselbe Zielgrösse wie im
 * Standard. Referenz sind ausdrücklich die Standardwerte, nicht die gerade
 * eingestellten — sonst verschöbe sich die Bedeutung der Kurve rückwirkend,
 * sobald jemand an den Reglern dreht. Die Waffe zählt nicht hinein: sie ändert
 * Spray und Munitionsanzeige, nicht die Schwierigkeit der Aim-Modi.
 */
export function isStandard(r: Run): boolean {
  return r.dur === DEFAULT_SETTINGS.dur && r.size === DEFAULT_SETTINGS.sizeMul
}

/** Trägt einen beendeten Lauf ein und gibt den vollständigen Verlauf zurück. */
export function pushRun(store: Store, g: GameState, now: number): Run[] {
  // Derselbe Wächter wie beim Bestwert: ein Lauf ohne Schuss und ohne Feuerzeit
  // hat nichts gemessen, und `reaction.metric()` gäbe dafür 9999 zurück.
  if (!hasMeasured(g)) return loadRuns(store)
  const metric = g.mode.metric(g)
  if (!Number.isFinite(metric)) return loadRuns(store)
  const run: Run = {
    t: now,
    mode: g.mode.id,
    metric,
    score: g.score,
    hits: g.hits,
    shots: g.shots,
    dur: g.dur,
    size: g.settings.sizeMul,
    weapon: g.settings.weapon,
  }
  const alle = [...loadRuns(store), run].slice(-MAX_RUNS)
  writeJson(store, KEY.runs, alle)
  return alle
}

/**
 * Beginn dieser Sitzung, beim ersten Lesen gesetzt.
 *
 * In `sessionStorage` und nicht in einem Ref: `sessionStorage` überlebt einen
 * Reload innerhalb des Tabs, ein Ref nicht — und gemeint ist „seit dieses Tab
 * offen ist".
 */
export function sessionStart(store: Store, now: number): number {
  const roh = readJson(store, KEY.sessionStart)
  if (zahl(roh)) return roh
  writeJson(store, KEY.sessionStart, now)
  return now
}
```

- [ ] **Step 6: Tests laufen lassen**

Run: `pnpm test`
Expected: PASS — alle Suiten, auch die unveränderten (`best`, `session`).

- [ ] **Step 7: Commit**

```bash
git add lib/store/keys.ts lib/store/best.ts lib/store/runs.ts lib/store/runs.test.ts
git commit -m "feat: Laufspeicher mit Deckel, Vergleichbarkeit und Sitzungsbeginn"
```

---

### Task 2: Zeitraum und Trend

**Files:**
- Create: `lib/stats/period.ts`, `lib/stats/trend.ts`
- Test: `lib/stats/period.test.ts`, `lib/stats/trend.test.ts`

**Interfaces:**
- Consumes: `Run`, `isStandard` aus `@/lib/store/runs`; `DEFAULT_SETTINGS` aus `@/lib/engine/game`; `ModeId` aus `@/lib/engine/types`.
- Produces:
  - `type Period = '7d' | '30d' | 'all'`
  - `function inPeriod(runs: Run[], period: Period, now: number): Run[]`
  - `type TrendPoint = { t: number; metric: number; standard: boolean; note: string }`
  - `function trend(runs: Run[], mode: ModeId): TrendPoint[]`
  - `function bestIndex(points: TrendPoint[], lowerBetter: boolean): number` — `-1` bei leerer Liste

- [ ] **Step 1: Den fehlschlagenden Test für den Zeitraum schreiben**

`lib/stats/period.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Run } from '@/lib/store/runs'
import { inPeriod } from './period'

const TAG = 86_400_000
const JETZT = 1_700_000_000_000

function run(tageHer: number): Run {
  return {
    t: JETZT - tageHer * TAG, mode: 'gridshot', metric: 30, score: 30, hits: 30, shots: 40,
    dur: 60, size: 1, weapon: 'vandal',
  }
}

describe('inPeriod', () => {
  const laeufe = [run(40), run(20), run(3), run(0)]

  it('behaelt bei sieben Tagen nur die juengsten', () => {
    expect(inPeriod(laeufe, '7d', JETZT).map((r) => r.t)).toEqual([run(3).t, run(0).t])
  })

  it('behaelt bei dreissig Tagen auch den zwanzig Tage alten', () => {
    expect(inPeriod(laeufe, '30d', JETZT)).toHaveLength(3)
  })

  it('filtert bei alles gar nicht', () => {
    expect(inPeriod(laeufe, 'all', JETZT)).toEqual(laeufe)
  })

  it('nimmt den Lauf genau auf der Grenze mit', () => {
    expect(inPeriod([run(7)], '7d', JETZT)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `pnpm vitest run lib/stats/period.test.ts`
Expected: FAIL — `Failed to resolve import "./period"`.

- [ ] **Step 3: `lib/stats/period.ts` schreiben**

```ts
import type { Run } from '@/lib/store/runs'

export type Period = '7d' | '30d' | 'all'

const TAG = 86_400_000

/** Das Modul heisst `period` und nicht `range`: „Range" ist in diesem Projekt der Schiessstand. */
const TAGE: Record<Period, number> = { '7d': 7, '30d': 30, all: 0 }

/** Läufe im Zeitraum, von `now` aus zurück gemessen. `all` filtert nicht. */
export function inPeriod(runs: Run[], period: Period, now: number): Run[] {
  if (period === 'all') return runs
  const ab = now - TAGE[period] * TAG
  return runs.filter((r) => r.t >= ab)
}
```

- [ ] **Step 4: Test laufen lassen**

Run: `pnpm vitest run lib/stats/period.test.ts`
Expected: PASS.

- [ ] **Step 5: Den fehlschlagenden Test für den Trend schreiben**

`lib/stats/trend.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Run } from '@/lib/store/runs'
import { bestIndex, trend } from './trend'

function run(patch: Partial<Run>): Run {
  return {
    t: 1000, mode: 'gridshot', metric: 30, score: 30, hits: 30, shots: 40,
    dur: 60, size: 1, weapon: 'vandal', ...patch,
  }
}

describe('trend', () => {
  it('nimmt nur den gefragten Modus und sortiert nach Zeit', () => {
    const laeufe = [run({ t: 3000, metric: 33 }), run({ t: 1000, metric: 11 }), run({ t: 2000, mode: 'flick' })]
    expect(trend(laeufe, 'gridshot').map((p) => p.metric)).toEqual([11, 33])
  })

  it('markiert Standardbedingungen und nennt die Waffe', () => {
    const [p] = trend([run({ weapon: 'phantom' })], 'gridshot')
    expect(p.standard).toBe(true)
    expect(p.note).toBe('Phantom')
  })

  it('nennt jede Abweichung im Text und markiert den Punkt als abweichend', () => {
    const [p] = trend([run({ size: 1.5, dur: 90 })], 'gridshot')
    expect(p.standard).toBe(false)
    expect(p.note).toBe('Vandal · 90 s · Ziele 150 %')
  })

  it('liefert fuer einen Modus ohne Lauf eine leere Liste', () => {
    expect(trend([run({})], 'reaction')).toEqual([])
  })
})

describe('bestIndex', () => {
  const punkte = trend([run({ t: 1, metric: 20 }), run({ t: 2, metric: 40 }), run({ t: 3, metric: 30 })], 'gridshot')

  it('zeigt bei hoeher-ist-besser auf den groessten Wert', () => {
    expect(bestIndex(punkte, false)).toBe(1)
  })

  it('zeigt bei niedriger-ist-besser auf den kleinsten Wert', () => {
    expect(bestIndex(punkte, true)).toBe(0)
  })

  it('liefert ohne Punkte minus eins', () => {
    expect(bestIndex([], false)).toBe(-1)
  })
})
```

- [ ] **Step 6: Test laufen lassen, Fehlschlag bestätigen**

Run: `pnpm vitest run lib/stats/trend.test.ts`
Expected: FAIL — `Failed to resolve import "./trend"`.

- [ ] **Step 7: `lib/stats/trend.ts` schreiben**

```ts
import { DEFAULT_SETTINGS } from '@/lib/engine/game'
import type { ModeId } from '@/lib/engine/types'
import { isStandard, type Run } from '@/lib/store/runs'

export type TrendPoint = {
  t: number
  metric: number
  /** `standard` heisst: unter Standardbedingungen gespielt, also vergleichbar. */
  standard: boolean
  /** Waffe und alles, was von den Standardbedingungen abwich — der Text des Tooltips. */
  note: string
}

const WAFFE: Record<Run['weapon'], string> = { vandal: 'Vandal', phantom: 'Phantom' }

/**
 * „Phantom · 90 s · Ziele 150 %".
 *
 * Der Text entsteht hier und nicht in der Ansicht: er ist ein Vergleich mit
 * `DEFAULT_SETTINGS`, und der gehört zur Auswertung.
 */
function note(r: Run): string {
  const teile = [WAFFE[r.weapon]]
  if (r.dur !== DEFAULT_SETTINGS.dur) teile.push(`${r.dur} s`)
  if (r.size !== DEFAULT_SETTINGS.sizeMul) teile.push(`Ziele ${Math.round(r.size * 100)} %`)
  return teile.join(' · ')
}

/** Die Punkte einer Modus-Kurve, ältester zuerst. Abweichende Läufe sind dabei und markiert. */
export function trend(runs: Run[], mode: ModeId): TrendPoint[] {
  return runs
    .filter((r) => r.mode === mode)
    .sort((a, b) => a.t - b.t)
    .map((r) => ({ t: r.t, metric: r.metric, standard: isStandard(r), note: note(r) }))
}

/**
 * Index des besten Punktes, oder -1.
 *
 * Die einzige Stelle, an der die Farbe eines Punktes von `lowerBetter` abhängt —
 * die Charts bekommen nur noch eine Zahl.
 */
export function bestIndex(points: TrendPoint[], lowerBetter: boolean): number {
  let idx = -1
  for (let i = 0; i < points.length; i++) {
    if (idx < 0) {
      idx = i
      continue
    }
    const besser = lowerBetter
      ? points[i].metric < points[idx].metric
      : points[i].metric > points[idx].metric
    if (besser) idx = i
  }
  return idx
}
```

- [ ] **Step 8: Tests laufen lassen**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/stats/period.ts lib/stats/period.test.ts lib/stats/trend.ts lib/stats/trend.test.ts
git commit -m "feat: Zeitraumfilter und Trendpunkte je Modus"
```

---

### Task 3: Profil

**Files:**
- Create: `lib/stats/profile.ts`
- Test: `lib/stats/profile.test.ts`

**Interfaces:**
- Consumes: `avg` aus `@/lib/engine/format`; `MODES` aus `@/lib/engine/modes`; `ModeId` aus `@/lib/engine/types`; `isStandard`, `Run` aus `@/lib/store/runs`.
- Produces:
  - `type ProfileRow = { mode: ModeId; recent: number; average: number; delta: number; runs: number }`
  - `function profile(runs: Run[]): ProfileRow[]`
  - `function barFill(delta: number): number` — 0..1 für `BarRow`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`lib/stats/profile.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Run } from '@/lib/store/runs'
import { barFill, profile } from './profile'

function run(patch: Partial<Run>): Run {
  return {
    t: 1000, mode: 'gridshot', metric: 30, score: 30, hits: 30, shots: 40,
    dur: 60, size: 1, weapon: 'vandal', ...patch,
  }
}

/** Läufe mit aufsteigender Zeit, damit „die letzten fünf" definiert sind. */
function serie(mode: Run['mode'], werte: number[], patch: Partial<Run> = {}): Run[] {
  return werte.map((metric, i) => run({ mode, metric, t: 1000 + i, ...patch }))
}

describe('profile', () => {
  it('laesst Modi mit weniger als zwei vergleichbaren Laeufen weg', () => {
    expect(profile(serie('gridshot', [30]))).toEqual([])
  })

  it('rechnet Schnitt, juengsten Schnitt und Abweichung', () => {
    const [zeile] = profile(serie('gridshot', [10, 20, 30, 40, 50, 60]))
    expect(zeile.runs).toBe(6)
    expect(zeile.average).toBe(35)
    // Die letzten fuenf: 20..60
    expect(zeile.recent).toBe(40)
    expect(Math.round(zeile.delta)).toBe(14)
  })

  it('dreht das Vorzeichen bei lowerBetter: schneller ist besser', () => {
    const [zeile] = profile(serie('reaction', [300, 300, 200]))
    expect(zeile.recent).toBeLessThan(zeile.average)
    expect(zeile.delta).toBeGreaterThan(0)
  })

  it('laesst abweichende Laeufe aus der Rechnung heraus', () => {
    const laeufe = [...serie('gridshot', [10, 20]), ...serie('gridshot', [900, 900], { size: 1.5 })]
    const [zeile] = profile(laeufe)
    expect(zeile.runs).toBe(2)
    expect(zeile.average).toBe(15)
  })

  it('sortiert das Schwaechste nach oben', () => {
    const laeufe = [...serie('gridshot', [10, 20]), ...serie('flick', [20, 10])]
    expect(profile(laeufe).map((z) => z.mode)).toEqual(['flick', 'gridshot'])
  })
})

describe('barFill', () => {
  it('setzt den eigenen Schnitt in die Mitte', () => {
    expect(barFill(0)).toBeCloseTo(0.5)
  })

  it('klemmt an beiden Raendern', () => {
    expect(barFill(80)).toBe(1)
    expect(barFill(-80)).toBeGreaterThan(0)
    expect(barFill(-80)).toBeLessThan(0.1)
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `pnpm vitest run lib/stats/profile.test.ts`
Expected: FAIL — `Failed to resolve import "./profile"`.

- [ ] **Step 3: `lib/stats/profile.ts` schreiben**

```ts
import { avg } from '@/lib/engine/format'
import { MODES } from '@/lib/engine/modes'
import type { ModeId } from '@/lib/engine/types'
import { isStandard, type Run } from '@/lib/store/runs'

export type ProfileRow = {
  mode: ModeId
  /** Schnitt der letzten fünf vergleichbaren Läufe, oder aller, wenn es weniger sind. */
  recent: number
  /** Schnitt aller vergleichbaren Läufe. */
  average: number
  /** Abweichung in Prozent, vorzeichenrichtig: positiv heisst besser. */
  delta: number
  /** Zahl der vergleichbaren Läufe, aus denen die Zeile stammt. */
  runs: number
}

const RECENT = 5

/** Der Bereich, den der Balken abbildet: ±20 % um den eigenen Schnitt. */
const SPANNE = 20

export function profile(runs: Run[]): ProfileRow[] {
  const nachModus = new Map<ModeId, number[]>()
  for (const r of runs) {
    // Ein Schnitt aus gemischten Bedingungen ist keine Zahl, die etwas bedeutet.
    if (!isStandard(r)) continue
    const liste = nachModus.get(r.mode)
    if (liste) liste.push(r.metric)
    else nachModus.set(r.mode, [r.metric])
  }

  const zeilen: ProfileRow[] = []
  for (const [mode, werte] of nachModus) {
    // Ein Schnitt aus einem Lauf ist derselbe Lauf.
    if (werte.length < 2) continue
    const average = avg(werte)
    const recent = avg(werte.slice(-RECENT))
    const roh = average === 0 ? 0 : ((recent - average) / Math.abs(average)) * 100
    // Bei Reaktion ist der kleinere Wert besser. Diese Umkehr passiert hier und
    // nie in der Ansicht.
    const delta = MODES[mode].lowerBetter ? -roh : roh
    zeilen.push({ mode, recent, average, delta, runs: werte.length })
  }
  // Das Schwächste nach oben: die Zeile, an der zu arbeiten am meisten bringt.
  return zeilen.sort((a, b) => a.delta - b.delta)
}

/** Balkenfüllung 0..1. Der eigene Schnitt liegt in der Mitte, ±20 % sind die Ränder. */
export function barFill(delta: number): number {
  return Math.min(1, Math.max(0.04, (delta + SPANNE) / (SPANNE * 2)))
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/stats/profile.ts lib/stats/profile.test.ts
git commit -m "feat: Modus-Profil mit Vorzeichenumkehr bei lowerBetter"
```

---

### Task 4: Tage

**Files:**
- Create: `lib/stats/days.ts`
- Test: `lib/stats/days.test.ts`

**Interfaces:**
- Consumes: `MODES` aus `@/lib/engine/modes`; `ModeId` aus `@/lib/engine/types`; `Run` aus `@/lib/store/runs`.
- Produces:
  - `type DayRow = { day: string; runs: number; modes: ModeId[]; best: Partial<Record<ModeId, number>> }`
  - `function byDay(runs: Run[]): DayRow[]` — jüngster Tag zuerst
  - `function dayKey(t: number): string` — lokales `YYYY-MM-DD`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`lib/stats/days.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Run } from '@/lib/store/runs'
import { byDay, dayKey } from './days'

/** Lokale Zeit, damit der Test dieselbe Zeitzone benutzt wie die Gruppierung. */
function at(jahr: number, monat: number, tag: number, stunde: number, minute = 0): number {
  return new Date(jahr, monat - 1, tag, stunde, minute).getTime()
}

function run(t: number, patch: Partial<Run> = {}): Run {
  return {
    t, mode: 'gridshot', metric: 30, score: 30, hits: 30, shots: 40,
    dur: 60, size: 1, weapon: 'vandal', ...patch,
  }
}

describe('dayKey', () => {
  it('liefert das lokale Datum, auch spaet am Abend', () => {
    expect(dayKey(at(2026, 8, 11, 23, 50))).toBe('2026-08-11')
    expect(dayKey(at(2026, 1, 5, 0, 10))).toBe('2026-01-05')
  })
})

describe('byDay', () => {
  it('gruppiert nach lokalem Tag und zaehlt die Laeufe', () => {
    const tage = byDay([run(at(2026, 8, 10, 9)), run(at(2026, 8, 11, 8)), run(at(2026, 8, 11, 23, 50))])
    expect(tage.map((d) => [d.day, d.runs])).toEqual([['2026-08-11', 2], ['2026-08-10', 1]])
  })

  it('fuehrt jeden Modus einmal, in der Reihenfolge des ersten Laufs', () => {
    const tage = byDay([
      run(at(2026, 8, 11, 8), { mode: 'flick' }),
      run(at(2026, 8, 11, 9), { mode: 'gridshot' }),
      run(at(2026, 8, 11, 10), { mode: 'flick' }),
    ])
    expect(tage[0].modes).toEqual(['flick', 'gridshot'])
  })

  it('nimmt je Modus den groessten Wert', () => {
    const tage = byDay([run(at(2026, 8, 11, 8), { metric: 30 }), run(at(2026, 8, 11, 9), { metric: 42 })])
    expect(tage[0].best.gridshot).toBe(42)
  })

  it('nimmt bei lowerBetter den kleinsten Wert', () => {
    const tage = byDay([
      run(at(2026, 8, 11, 8), { mode: 'reaction', metric: 260 }),
      run(at(2026, 8, 11, 9), { mode: 'reaction', metric: 210 }),
    ])
    expect(tage[0].best.reaction).toBe(210)
  })

  it('nimmt abweichende Laeufe mit — die Tagesbilanz erzaehlt vom Training, nicht vom Vergleich', () => {
    const tage = byDay([run(at(2026, 8, 11, 8), { size: 1.5, metric: 90 })])
    expect(tage[0].runs).toBe(1)
    expect(tage[0].best.gridshot).toBe(90)
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `pnpm vitest run lib/stats/days.test.ts`
Expected: FAIL — `Failed to resolve import "./days"`.

- [ ] **Step 3: `lib/stats/days.ts` schreiben**

```ts
import { MODES } from '@/lib/engine/modes'
import type { ModeId } from '@/lib/engine/types'
import type { Run } from '@/lib/store/runs'

export type DayRow = {
  /** Lokales Datum als `YYYY-MM-DD`. */
  day: string
  runs: number
  modes: ModeId[]
  /** Bester Metrikwert des Tages je Modus: das Maximum, bei `lowerBetter` das Minimum. */
  best: Partial<Record<ModeId, number>>
}

/**
 * Lokales Datum.
 *
 * Ein Lauf um 23:50 gehört zu dem Tag, an dem er sich für den Spielenden
 * angefühlt hat, nicht zu dem, den UTC dafür hält.
 */
export function dayKey(t: number): string {
  const d = new Date(t)
  const zwei = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`
}

/** Alle Läufe nach Tag, jüngster zuerst. Abweichende Läufe zählen mit. */
export function byDay(runs: Run[]): DayRow[] {
  const tage = new Map<string, DayRow>()
  for (const r of runs) {
    const key = dayKey(r.t)
    let zeile = tage.get(key)
    if (!zeile) {
      zeile = { day: key, runs: 0, modes: [], best: {} }
      tage.set(key, zeile)
    }
    zeile.runs++
    if (!zeile.modes.includes(r.mode)) zeile.modes.push(r.mode)
    const bisher = zeile.best[r.mode]
    // Bei Reaktion ist der beste Wert der kleinste. Diese Umkehr passiert hier
    // und nie in der Ansicht.
    const besser =
      bisher === undefined || (MODES[r.mode].lowerBetter ? r.metric < bisher : r.metric > bisher)
    if (besser) zeile.best[r.mode] = r.metric
  }
  return [...tage.values()].sort((a, b) => (a.day < b.day ? 1 : -1))
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/stats/days.ts lib/stats/days.test.ts
git commit -m "feat: Tagesgruppierung nach lokalem Datum"
```

---

### Task 5: Provider auf `runs` umstellen, `session.ts` entfernen

**Files:**
- Modify: `components/settings/SettingsProvider.tsx`
- Modify: `components/hud/Results.tsx` (Tabellenkopf und `history.map`)
- Delete: `lib/store/session.ts`, `lib/store/session.test.ts`

**Interfaces:**
- Consumes: `loadRuns`, `pushRun`, `clearRuns`, `sessionStart`, `Run` aus `@/lib/store/runs`; `MODES` aus `@/lib/engine/modes`; `pc` aus `@/lib/engine/format`.
- Produces: `SettingsApi` bekommt `runs: Run[]`, `history: Run[]` (Läufe dieser Sitzung) und `resetRuns(): void`. `submitRun(g: GameState): boolean` bleibt in der Signatur unverändert.

- [ ] **Step 1: Die alten Dateien löschen**

```bash
git rm lib/store/session.ts lib/store/session.test.ts
```

Und in `lib/store/keys.ts` die Zeile `session: 'range.session.v1',` aus dem `KEY`-Block entfernen. Der alte Schlüssel bleibt im Browser liegen und verfällt mit der Sitzung; ein Migrationsschritt lohnt für Daten nicht, die ohnehin nur eine Sitzung leben.

`pnpm test` läuft danach noch; `pnpm build` scheitert bis Step 3.

- [ ] **Step 2: Den Provider umstellen**

In `components/settings/SettingsProvider.tsx` den Import ersetzen:

```ts
import { clearRuns, loadRuns, pushRun, sessionStart, type Run } from '@/lib/store/runs'
```

(die Zeile `import { loadSession, pushRun, type RunRow } from '@/lib/store/session'` fällt weg)

Den Zustandstyp erweitern:

```ts
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
```

Im Rumpf der Komponente neben `localRef`/`sessionRef` einen Ref für den Sitzungsbeginn anlegen:

```ts
  // Der Beginn dieser Sitzung. Als Ref, weil er die Ansicht nie selbst ändert —
  // er filtert nur, was aus `runs` in `history` fällt.
  const startRef = useRef(0)
```

Den Lese-Effekt ersetzen:

```ts
  useEffect(() => {
    const local = browserStore() ?? memoryStore()
    const session = sessionStore() ?? memoryStore()
    localRef.current = local
    sessionRef.current = session
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
```

Nach `resetBest` einfügen:

```ts
  // Zwei Knöpfe statt eines gemeinsamen: Bestwerte und Verlauf sind für den
  // Spielenden nicht dasselbe.
  const resetRuns = useCallback(() => {
    anwenden({ runs: [], history: [] })
    if (localRef.current) clearRuns(localRef.current)
  }, [anwenden])
```

`submitRun` ersetzen:

```ts
  const submitRun = useCallback((g: GameState) => {
    const local = localRef.current
    if (!local) return false
    const runs = pushRun(local, g, Date.now())
    const { best, isBest } = submitBest(local, g, ref.current.best)
    anwenden({ best, runs, history: runs.filter((r) => r.t >= startRef.current) })
    return isBest
  }, [anwenden])
```

Und den Provider-Wert:

```tsx
    <Ctx.Provider value={{ ...state, setSettings, setCrosshair, resetBest, resetRuns, submitRun }}>
```

- [ ] **Step 3: Die Ergebnis-Tabelle umstellen**

In `components/hud/Results.tsx` zwei Importe ergänzen:

```ts
import { pc } from '@/lib/engine/format'
import { MODES } from '@/lib/engine/modes'
```

Den Tabellenblock ersetzen (der `history.length > 1`-Wächter bleibt):

```tsx
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
```

- [ ] **Step 4: Testsuite, Linter und Build laufen lassen**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: Tests PASS, Build erfolgreich. Der vorbestehende Lint-Fehler aus `main` (siehe `git log`) darf stehen bleiben; ein *neuer* Fehler nicht.

- [ ] **Step 5: Im Browser prüfen**

Run: `pnpm dev`, dann `http://localhost:3000` öffnen, zwei kurze Läufe spielen (Gridshot, dann Flick).
Expected: Die Tabelle im Ergebnis-Schirm zeigt beide Läufe mit Modusnamen, Score, Acc und Metrik. Nach `F5` und einem dritten Lauf stehen im Ergebnis-Schirm weiterhin nur die Läufe dieses Tabs — `sessionStorage` hat den Beginn behalten.

- [ ] **Step 6: Commit**

```bash
git add -A components/settings/SettingsProvider.tsx components/hud/Results.tsx lib/store/keys.ts lib/store/session.ts lib/store/session.test.ts
git commit -m "refactor: Sitzungsverlauf aus dem Laufspeicher statt aus sessionStorage"
```

---

### Task 6: Chart-Komponenten

**Files:**
- Create: `components/charts/Sparkline.tsx`, `components/charts/LineChart.tsx`, `components/charts/BarRow.tsx`
- Modify: `app/range.css` (neuer Abschnitt vor `/* ---------- Spielwurzel ---------- */`)

**Interfaces:**
- Consumes: `TrendPoint` aus `@/lib/stats/trend`.
- Produces:
  - `function Sparkline({ values, best, label }: { values: number[]; best: number; label: string })`
  - `function LineChart({ points, best, unit, summary }: { points: TrendPoint[]; best: number; unit: string; summary: string })`
  - `function BarRow({ label, fill, value, hint }: { label: string; fill: number; value: string; hint: string })`

Alle drei rechnen nichts: Filterung, Vorzeichen und die Frage, welcher Punkt der beste ist, kommen fertig aus `lib/stats/`. Was sie tun, ist Werte auf Pixel abbilden.

- [ ] **Step 1: `components/charts/Sparkline.tsx` schreiben**

```tsx
const W = 96
const H = 24
const P = 3

/**
 * Die Kurve der letzten Läufe, ohne Achsen und ohne Beschriftung.
 *
 * Unter drei Punkten bleibt die Fläche leer und behält ihre Höhe: eine Linie
 * aus zwei Punkten ist keine Aussage, und ein springendes Raster ist unruhig.
 */
export function Sparkline({ values, best, label }: {
  values: number[]
  /** Index des besten Werts, aus `bestIndex()`. -1 wenn es keinen gibt. */
  best: number
  label: string
}) {
  if (values.length < 3) return <svg width={W} height={H} aria-hidden="true" />

  const lo = Math.min(...values)
  const hi = Math.max(...values)
  // Eine waagerechte Reihe hat keine Spanne — ohne diesen Ersatz teilten wir durch null.
  const spanne = hi - lo || 1
  const x = (i: number) => P + (i * (W - P * 2)) / (values.length - 1)
  const y = (v: number) => H - P - ((v - lo) / spanne) * (H - P * 2)

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <polyline
        fill="none"
        stroke="var(--text)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
      />
      {best >= 0 && (
        <circle cx={x(best)} cy={y(values[best])} r="2.5" fill="var(--sig)"
          stroke="var(--surface)" strokeWidth="1.5" />
      )}
    </svg>
  )
}
```

- [ ] **Step 2: `components/charts/LineChart.tsx` schreiben**

```tsx
'use client'

import { useState } from 'react'
import type { TrendPoint } from '@/lib/stats/trend'

const W = 640
const H = 200
const PAD = { top: 14, right: 14, bottom: 28, left: 44 }

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function datum(t: number): string {
  const d = new Date(t)
  return `${d.getDate()}. ${MONATE[d.getMonth()]}`
}

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

          <text x={PAD.left} y={H - 8} fontSize="11" fill="var(--dim)">{datum(points[0].t)}</text>
          {points.length > 1 && (
            <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize="11" fill="var(--dim)">
              {datum(points[points.length - 1].t)}
            </text>
          )}
        </svg>

        {aktiv !== null && (
          <div
            className="tip"
            style={{ left: `${(x(aktiv) / W) * 100}%`, top: `${(y(points[aktiv].metric) / H) * 100}%` }}
          >
            {datum(points[aktiv].t)} · <b>{Math.round(points[aktiv].metric)}</b> {unit}
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
              {datum(p.t)}: {Math.round(p.metric)} {unit} — {p.note}
              {p.standard ? '' : ' (abweichende Bedingungen)'}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  )
}
```

- [ ] **Step 3: `components/charts/BarRow.tsx` schreiben**

```tsx
/**
 * Eine Zeile des Profils.
 *
 * Der Balken ist keine Menge, sondern eine Lage: die Mitte ist der eigene
 * Schnitt. Die Umrechnung dahin liegt in `barFill()`.
 */
export function BarRow({ label, fill, value, hint }: {
  label: string
  /** 0..1, aus `barFill()`. */
  fill: number
  /** Der Wert als fertiger Text, mit Vorzeichen. */
  value: string
  /** Was den Wert erklärt — nur für Hilfsmittel sichtbar. */
  hint: string
}) {
  return (
    // `.profbar`, nicht `.bar`: `.bar` gehört bereits den HUD-Balken (app/range.css:140).
    <div className="profbar">
      <span>
        {label}
        <span className="vh"> — {hint}</span>
      </span>
      <span className="track">
        <span className="fill" style={{ width: `${Math.round(fill * 100)}%` }} />
      </span>
      <span className="val">{value}</span>
    </div>
  )
}
```

- [ ] **Step 4: Die Klassen in `app/range.css` ergänzen**

Direkt vor dem Block `/* ---------- Spielwurzel ---------- */` einfügen:

```css
/* ---------- Verlauf und Charts ---------- */

/* Nur für Hilfsmittel: die Aussage eines Charts in Worten. */
.vh{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;
  clip-path:inset(50%);white-space:nowrap;border:0}

.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
.chip{background:none;border:1px solid var(--line);color:var(--dim);cursor:pointer;
  border-radius:var(--r-sm);padding:6px 11px;font:inherit;font-size:12px;
  transition:background .12s,border-color .12s,color .12s}
.chip:hover{border-color:var(--raised);background:var(--surface);color:var(--text)}
/* Der aktive Zustand ist eine primäre Aussage — hier darf der Akzent stehen. */
.chip[aria-pressed="true"]{background:var(--sig);border-color:var(--sig);color:var(--sig-ink)}
.chip:focus-visible{outline:2px solid var(--sig);outline-offset:2px}

.chart{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);
  padding:16px}
.chart .plot{position:relative}
.chart svg{display:block;width:100%;height:auto}
.legend{font-size:11px;color:var(--dim);margin-top:10px}

.tip{position:absolute;pointer-events:none;transform:translate(-50%,calc(-100% - 10px));
  background:var(--raised);border:1px solid var(--line);border-radius:var(--r-sm);
  padding:6px 9px;font-size:12px;line-height:1.45;white-space:nowrap;z-index:2}
.tip b{font-family:var(--font-num);font-variant-numeric:tabular-nums;font-weight:600}

.bars{display:grid;gap:10px}
/* `.profbar`, nicht `.bar`: den Namen tragen schon die HUD-Balken weiter oben. */
.profbar{display:grid;grid-template-columns:140px 1fr 64px;align-items:center;gap:12px;
  font-size:13px}
.profbar .track{height:8px;border-radius:4px;background:var(--line);overflow:hidden}
.profbar .fill{display:block;height:100%;border-radius:4px;background:var(--text)}
.profbar .val{text-align:right;color:var(--dim);
  font-family:var(--font-num);font-variant-numeric:tabular-nums}

.empty{color:var(--dim);font-size:13px;line-height:1.6}

@media (max-width:640px){
  .profbar{grid-template-columns:100px 1fr 56px;gap:8px}
}
```

- [ ] **Step 5: Build und Linter**

Run: `pnpm lint && pnpm build`
Expected: kein neuer Fehler. Die Komponenten sind noch nirgends eingebunden — das ist in Ordnung, sie werden in Task 7 und 8 verdrahtet.

- [ ] **Step 6: Commit**

```bash
git add components/charts app/range.css
git commit -m "feat: Sparkline, LineChart und BarRow als SVG ohne Abhaengigkeit"
```

---

### Task 7: Route `/verlauf`

**Files:**
- Create: `app/verlauf/page.tsx`, `components/history/HistoryScreen.tsx`
- Modify: `components/menu/MenuScreen.tsx` (nur der Link im Kopf; die Sparkline folgt in Task 8)

**Interfaces:**
- Consumes: `useSettings()` (`runs`, `ready`); `inPeriod`, `Period`; `trend`, `bestIndex`, `TrendPoint`; `profile`, `barFill`; `byDay`; `LineChart`, `BarRow`; `MODES`, `MODE_LIST`.
- Produces: `export default function HistoryScreen()`.

**Hintergrund:** Routen sind in diesem Projekt dünne Server-Komponenten (`app/page.tsx` ist das Muster). Wer die Konventionen des App Routers nachlesen will: `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`.

- [ ] **Step 1: Die Route anlegen**

`app/verlauf/page.tsx`:

```tsx
import HistoryScreen from '@/components/history/HistoryScreen'

/** Dünn gehalten, damit die Route für serverseitige Teile offen bleibt. */
export default function Verlauf() {
  return <HistoryScreen />
}
```

- [ ] **Step 2: `components/history/HistoryScreen.tsx` schreiben**

```tsx
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

  const sichtbar = useMemo(() => inPeriod(runs, period, Date.now()), [runs, period])
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
```

- [ ] **Step 3: Den Link im Menü-Kopf setzen**

In `components/menu/MenuScreen.tsx` den Icon-Import erweitern:

```ts
import { SlidersHorizontal, TrendingUp } from 'lucide-react'
```

und in `.headtools` direkt vor dem Zahnrad-Knopf einfügen:

```tsx
            <Link className="gear" href="/verlauf" aria-label="Verlauf">
              <TrendingUp size={17} strokeWidth={1.75} />
            </Link>
```

`.gear` ist bisher nur auf `button` gesetzt — die Regel greift über die Klasse und gilt für den `Link` genauso. Prüfen: `.gear:hover` funktioniert auch für `a` (die Regel im CSS ist klassenbasiert, nicht elementbasiert).

- [ ] **Step 4: Build und Linter**

Run: `pnpm lint && pnpm build`
Expected: kein neuer Fehler.

- [ ] **Step 5: Im Browser prüfen (Abnahmepunkte 1–4 der Spec)**

Run: `pnpm dev`

1. Drei Gridshot-Läufe spielen, dann `/verlauf` über das Kurven-Symbol im Menü öffnen.
   Expected: drei Punkte auf der Linie, eine Zeile im Profil, ein Tag in der Tagesliste.
2. In den Einstellungen die Zielgröße auf 150 % stellen, einen Lauf spielen, `/verlauf` öffnen.
   Expected: der vierte Punkt ist offen, sein Tooltip nennt „Ziele 150 %", das Profil ist unverändert (`runs` bleibt bei 3).
3. Zeitraum auf „7 Tage" stellen.
   Expected: alle drei Abschnitte rechnen neu; mit frischen Läufen ändert sich nichts, ältere fielen heraus.
4. `F5`.
   Expected: alles steht noch.

Zusätzlich mit `localStorage.setItem('range.runs.v1', '{kaputt')` und `F5` prüfen (Abnahmepunkt 7): die App startet mit leerem Verlauf, die Konsole bleibt fehlerfrei.

- [ ] **Step 6: Commit**

```bash
git add app/verlauf components/history components/menu/MenuScreen.tsx
git commit -m "feat: Route /verlauf mit Trend, Profil und Tagesbilanz"
```

---

### Task 8: Sparkline im Menü

**Files:**
- Modify: `components/menu/MenuScreen.tsx` (Modus-Karten)
- Modify: `app/range.css` (`.card .best` und neue `.card .spark`)

**Interfaces:**
- Consumes: `Sparkline`; `trend`, `bestIndex`; `runs` aus `useSettings()`.

- [ ] **Step 1: Platz auf der Karte schaffen**

In `app/range.css` die Regel `.card .best` von `order:4` auf `order:5` setzen und darunter ergänzen:

```css
/* Die Stelle behält ihre Höhe, auch wenn noch keine Kurve hineinpasst —
   sonst springt das Raster, sobald ein Modus seinen dritten Lauf bekommt. */
.card .spark{order:4;height:24px;margin-top:14px}
```

- [ ] **Step 2: Die Sparkline einsetzen**

In `components/menu/MenuScreen.tsx` die Importe ergänzen:

```ts
import { Sparkline } from '@/components/charts/Sparkline'
import { bestIndex, trend } from '@/lib/stats/trend'
```

`runs` aus dem Kontext holen:

```ts
  const { settings: s, crosshair, best, runs, ready } = useSettings()
```

Im `MODE_LIST.filter(...).map((m) => { ... })`-Rumpf vor dem `return` ergänzen:

```tsx
                // Nur vergleichbare Läufe: auf 96 Pixeln sieht man einem
                // Ausschlag nicht an, ob er Fortschritt war oder eine
                // verstellte Zielgröße.
                const werte = trend(runs, m.id).filter((p) => p.standard).slice(-20)
                const bi = bestIndex(werte, !!m.lowerBetter)
```

und im JSX zwischen `<p>{m.desc}</p>` und `<div className="best">` einfügen:

```tsx
                    <div className="spark">
                      <Sparkline
                        values={werte.map((p) => p.metric)}
                        best={bi}
                        label={`${m.name}: Trend der letzten ${werte.length} vergleichbaren Läufe`}
                      />
                    </div>
```

- [ ] **Step 3: Build und Linter**

Run: `pnpm lint && pnpm build`
Expected: kein neuer Fehler.

- [ ] **Step 4: Im Browser prüfen (Abnahmepunkt 5)**

Run: `pnpm dev`, Menü öffnen.
Expected: Eine Karte mit drei vergleichbaren Läufen zeigt eine Kurve, eine mit zweien nicht — und beide Karten sind gleich hoch. Der beste Punkt ist orange.

- [ ] **Step 5: Commit**

```bash
git add components/menu/MenuScreen.tsx app/range.css
git commit -m "feat: Sparkline vergleichbarer Laeufe auf jeder Modus-Karte"
```

---

### Task 9: „Verlauf loeschen" in den Einstellungen

**Files:**
- Modify: `components/settings/SettingsDialog.tsx` (Block nach `<Separator />` am Ende)

**Interfaces:**
- Consumes: `resetRuns()` aus `useSettings()`.

- [ ] **Step 1: Den zweiten Knopf setzen**

In `components/settings/SettingsDialog.tsx` `resetRuns` aus dem Kontext holen (dort, wo bereits `resetBest` geholt wird) und den Block am Ende ersetzen:

```tsx
        <Separator />
        {/* Zwei Knöpfe statt eines gemeinsamen: Bestwerte und Verlauf sind für
            den Spielenden nicht dasselbe. */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="destructive"
            onClick={() => {
              // Rückfrage, weil der Schritt nicht umkehrbar ist.
              if (window.confirm('Alle Bestwerte löschen? Das lässt sich nicht rückgängig machen.')) {
                resetBest()
              }
            }}
          >
            Bestwerte löschen
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (window.confirm('Den ganzen Verlauf löschen? Die Bestwerte bleiben stehen.')) {
                resetRuns()
              }
            }}
          >
            Verlauf löschen
          </Button>
        </div>
```

Das bisherige `className="justify-self-start"` wandert damit weg; der umschließende `div` sitzt im Grid des `DialogContent` und beginnt links.

- [ ] **Step 2: Build und Linter**

Run: `pnpm lint && pnpm build`
Expected: kein neuer Fehler.

- [ ] **Step 3: Im Browser prüfen (Abnahmepunkt 6)**

Run: `pnpm dev`, Einstellungen öffnen, „Verlauf löschen" bestätigen.
Expected: `/verlauf` zeigt in allen drei Abschnitten den Leerzustand, die Sparklines im Menü sind weg, die Bestwerte auf den Karten stehen noch.

- [ ] **Step 4: Commit**

```bash
git add components/settings/SettingsDialog.tsx
git commit -m "feat: Verlauf loeschen als eigener Knopf in den Einstellungen"
```

---

### Task 10: Abnahme

**Files:** keine — dieser Task prüft nur.

- [ ] **Step 1: Volle Suite**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: Tests PASS, Build erfolgreich, kein neuer Lint-Fehler gegenüber `main`.

- [ ] **Step 2: Deckel prüfen (Abnahmepunkt 8)**

Run: `pnpm dev`, in der Browser-Konsole:

```js
const t0 = Date.now() - 501 * 60_000
const laeufe = Array.from({ length: 501 }, (_, i) => ({
  t: t0 + i * 60_000, mode: 'gridshot', metric: i, score: i, hits: i, shots: i * 2,
  dur: 60, size: 1, weapon: 'vandal',
}))
localStorage.setItem('range.runs.v1', JSON.stringify(laeufe))
location.reload()
```

Danach einen weiteren Lauf spielen und `JSON.parse(localStorage.getItem('range.runs.v1')).length` prüfen.
Expected: 500. Der erste Eintrag hat `metric` 1, nicht 0 — der älteste ist herausgefallen.

- [ ] **Step 3: Die Abnahmeliste der Spec durchgehen**

Alle acht Punkte aus `docs/superpowers/specs/2026-08-11-phase-4-verlauf-und-charts-design.md`, Abschnitt „Abnahme". Punkte 1–5 und 7 wurden in Task 7 und 8 geprüft, Punkt 6 in Task 9, Punkt 8 in Step 2. Was hier noch fehlschlägt, wird als eigener Commit repariert.

- [ ] **Step 4: Branch abschließen**

Mit `superpowers:finishing-a-development-branch` entscheiden, wie die Arbeit nach `main` kommt.

---

## Selbstprüfung

**Spec-Abdeckung.** Datenmodell und Deckel → Task 1. Vergleichbarkeit → Task 1 (`isStandard`). Schreibpfad über `submitRun()` → Task 5. Ablösung von `session.ts` inklusive `sessionStart` → Task 1 und 5. `trend`, `profile`, `days`, `period` → Task 2–4. Route `/verlauf` mit Zeitraum-Umschalter, drei Abschnitten und Leerzuständen → Task 7. Sparkline im Menü ab drei vergleichbaren Läufen bei gleicher Kartenhöhe → Task 8. Ergebnis-Schirm aus `runs` → Task 5. „Verlauf löschen" → Task 9. Drei Chart-Komponenten mit Farbregel und versteckter Zusammenfassung → Task 6. Alle acht Abnahmepunkte → Task 7, 8, 9, 10.

**Offene Punkte:** keine. Die vier bewussten Abweichungen stehen oben unter „Abweichungen von der Spec".

**Typkonsistenz.** `Run` (Task 1) wird in Task 2–5 und 7–8 unverändert benutzt. `TrendPoint` hat in Task 2, 6, 7 und 8 dieselben vier Felder. `bestIndex()` liefert überall den Index, nie den Wert. `barFill()` liefert 0..1, `BarRow` erwartet 0..1. `profile()` liefert `delta` bereits vorzeichenrichtig — `prozent()` in Task 7 formatiert nur. `history` ist ab Task 5 `Run[]`, und `Results.tsx` liest daraus `mode`, `score`, `hits`, `shots`, `metric`, `t`.
