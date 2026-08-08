# Phase 0 + 1: Gerüst und Engine-Port — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein lauffähiges Next.js-16-Projekt plus die vollständige, frameworkfreie Spiel-Engine des bestehenden Aim-Trainers, headless testbar und ohne eine Zeile React oder Three.js.

**Architecture:** Die gesamte Spiellogik lebt unter `lib/engine/` als reine TypeScript-Module über einem mutierbaren `GameState`. Kein DOM, kein React, kein Three. Treffer werden analytisch per Ray-Sphere bestimmt, nicht über einen Szenengraph. Ton, Effekte und HUD-Hinweise werden als Daten im State abgelegt (`sounds`, `fx`, `cue`) und später von der Ansicht konsumiert — die Engine spielt nichts ab und zeichnet nichts. Zufall läuft über `state.rng`, damit Modi in Tests deterministisch sind.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn/ui, Vitest, pnpm.

## Global Constraints

- Paketmanager ist **pnpm**. Niemals `npm install` oder `yarn` verwenden.
- Alle Dateien unter `lib/engine/` sind frei von React, Three.js, DOM-Zugriffen (`document`, `window`) und Timern. Verstoß = Task nicht bestanden.
- Kein direkter Aufruf von `Math.random()` in `lib/engine/` außer als Default-Wert von `state.rng`. Alle Modi ziehen Zufall über `g.rng()`.
- Import-Alias ist `@/*` auf das Projekt-Root.
- Tests liegen neben dem Code als `*.test.ts`, nicht in einem separaten `tests/`-Verzeichnis.
- Oberflächen- und Stat-Texte bleiben **deutsch** und werden wortgleich aus `reference/index.html` übernommen.
- Sensitivity-Konstante ist `0.07` Grad pro Maus-Count. Horizontaler FOV ist `103` bei 16:9.
- Bewegungskonstanten exakt: `RUN = 6.75`, `ACC = 55`, `FRIC = 34`, `COUNTER = 130`.
- Jeder Task endet mit einem Commit. Commit-Messages auf Deutsch, Conventional-Commits-Präfix englisch (`feat:`, `test:`, `chore:`).

## Referenz

`reference/index.html` ist die Quelle der Wahrheit für alle Zahlen, Texte und Formeln. Bei Zweifel dort nachsehen, nicht raten. Relevante Abschnitte sind im Original nummeriert kommentiert (`2 · Mathe / Kamera`, `5 · Waffen / Rückstoß`, `8 · Modi`, `11 · Bewegung`).

## File Structure

| Datei | Verantwortung |
|---|---|
| `lib/engine/types.ts` | Alle geteilten Typen. Keine Logik. |
| `lib/engine/math.ts` | Geometrie: Richtungsvektor, Ray-Sphere, Segmentschnitt, Clamp. |
| `lib/engine/format.ts` | Zahlformatierung für Stats: `avg`, `pcNum`, `pc`, `ms`. |
| `lib/engine/sens.ts` | Sensitivity- und FOV-Umrechnungen. Reine Funktionen. |
| `lib/engine/camera.ts` | Blickrichtung: Basisvektoren, Mausbewegung, Pitch-Grenzen. |
| `lib/engine/movement.ts` | Spielerbewegung inklusive Counterstrafe-Bremsen. |
| `lib/engine/weapons.ts` | Vandal und Phantom: Magazin, Feuerrate, Sprühmuster. |
| `lib/engine/spawn.ts` | Zielerzeugung: winkelbasiert und slotbasiert. |
| `lib/engine/game.ts` | `GameState`-Lebenszyklus, `tick`, Treffer-/Fehlschuss-Buchhaltung. |
| `lib/engine/modes/*.ts` | Elf Modi, je eine Datei. |
| `lib/engine/modes/index.ts` | Registry aller Modi. |
| `lib/engine/routines.ts` | Die drei vordefinierten Routinen. |
| `lib/engine/coach.ts` | Auswertungstext nach einem Lauf. |

---

### Task 1: Projektgerüst

**Files:**
- Move: `index.html` → `reference/index.html`
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `vitest.config.ts`, `components.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nichts
- Produces: lauffähiges `pnpm dev` und `pnpm test`; Import-Alias `@/*`; Vitest findet `lib/**/*.test.ts`

- [ ] **Step 1: Original sichern**

`create-next-app` bricht ab, wenn das Zielverzeichnis unbekannte Dateien enthält. Deshalb wird zuerst aufgeräumt und dann in ein temporäres Verzeichnis gerüstet.

```bash
cd "/c/Users/Lukas/Documents/Valorant Shooter"
mkdir -p reference
git mv index.html reference/index.html
git commit -q -m "chore: Original nach reference/ verschoben"
```

- [ ] **Step 2: Next.js in ein temporäres Verzeichnis rüsten**

```bash
cd /c/Users/Lukas/Documents
pnpm create next-app@latest range-scaffold \
  --ts --tailwind --eslint --app --no-src-dir \
  --import-alias "@/*" --use-pnpm
```

Falls interaktiv nach Turbopack gefragt wird: **Ja**. Falls nach React Compiler gefragt wird: **Nein** (er bringt bei einem Spiel ohne React-State nichts und verlängert Builds).

- [ ] **Step 3: Gerüst ins Projekt übernehmen**

`node_modules` und `.git` des Gerüsts bleiben zurück. Die `.gitignore` des Projekts ist bereits vorhanden und wird nicht überschrieben.

```bash
cd /c/Users/Lukas/Documents/range-scaffold
for f in app public package.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs next-env.d.ts; do
  cp -r "$f" "/c/Users/Lukas/Documents/Valorant Shooter/"
done
cd "/c/Users/Lukas/Documents/Valorant Shooter"
rm -rf /c/Users/Lukas/Documents/range-scaffold
pnpm install
```

- [ ] **Step 4: Gerüst prüfen**

Run: `pnpm dev`
Expected: Server startet, `http://localhost:3000` zeigt die Next.js-Startseite. Danach mit Strg+C beenden.

- [ ] **Step 5: shadcn/ui einrichten**

```bash
pnpm dlx shadcn@latest init -d
```

Falls interaktiv gefragt: Base Color **Neutral**, CSS-Variablen **ja**. Ergebnis ist eine `components.json` und ein erweitertes `app/globals.css`.

- [ ] **Step 6: Vitest installieren und konfigurieren**

```bash
pnpm add -D vitest vite-tsconfig-paths
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})
```

In `package.json` unter `"scripts"` ergänzen:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Rauchtest schreiben**

Create `lib/engine/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('Testaufbau', () => {
  it('führt Tests unter lib/ aus', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 8: Tests laufen lassen**

Run: `pnpm test`
Expected: PASS, 1 Test, 1 Datei.

- [ ] **Step 9: Rauchtest wieder entfernen**

```bash
rm lib/engine/smoke.test.ts
```

Er hat seinen Zweck erfüllt — die Konfiguration ist bewiesen. Ein Test, der nichts über das Produkt aussagt, bleibt nicht liegen.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: Next.js 16, Tailwind 4, shadcn und Vitest eingerichtet"
```

---

### Task 2: Typen und Geometrie

**Files:**
- Create: `lib/engine/types.ts`
- Create: `lib/engine/math.ts`
- Create: `lib/engine/math.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `type Vec3 = { x: number; y: number; z: number }`
  - `type Target`, `type Player`, `type Camera`, `type Settings`, `type Input`, `type Fx`, `type Hole`, `type StatRow`, `type SoundId`, `type GameState`, `type ModeDef`, `type ModeId`, `type WeaponId`
  - `const DEG: number`
  - `clamp(v: number, lo: number, hi: number): number`
  - `dirFrom(yaw: number, pitch: number): Vec3`
  - `raySphere(origin: Vec3, dir: Vec3, t: Target): number`
  - `rayHitBest(origin: Vec3, dir: Vec3, list: Target[]): Target | null`
  - `segCross(ax,ay,bx,by,cx,cy,dx,dy: number): boolean`
  - `speed(p: Player): number`

- [ ] **Step 1: Typen anlegen**

Create `lib/engine/types.ts`:

```ts
export type Vec3 = { x: number; y: number; z: number }

export type WeaponId = 'vandal' | 'phantom'

export type ModeId =
  | 'gridshot' | 'flick' | 'micro' | 'switching'
  | 'tracking' | 'strafetrack' | 'reaction'
  | 'spray'
  | 'counterstrafe' | 'peek' | 'strafeshoot'

export type Target = {
  x: number
  y: number
  z: number
  r: number
  dead: boolean
  born: number
  /** Vom Modus versteckt — weder sichtbar noch treffbar. */
  hidden?: boolean
  /** Bahnphase für Smooth Tracking. */
  ph?: number
  /** Strafe-Richtung, Tempo, Restzeit bis zum Richtungswechsel. */
  dir?: number
  spd?: number
  next?: number
  /** Vertikale Geschwindigkeit und Standhöhe für springende Ziele. */
  vy?: number
  base?: number
}

export type Player = { x: number; y: number; z: number; vx: number; vz: number }

export type Camera = {
  yaw: number
  pitch: number
  /** Orthonormale Basis, von basis() aus yaw/pitch berechnet. */
  F: Vec3
  R: Vec3
  U: Vec3
}

export type Settings = {
  sens: number
  dpi: number
  dur: number
  /** Multiplikator auf alle Zielradien. 1.0 = Standard. */
  sizeMul: number
  weapon: WeaponId
  sound: boolean
}

export type Input = {
  keys: Record<string, boolean>
  mouseDown: boolean
}

export type SoundId = 'hit' | 'head' | 'miss' | 'go' | 'bad' | 'tick' | 'shot'

/** Ein Treffer-Feedback. Die Ansicht projiziert `at` und wählt die Farbe zu `kind`. */
export type Fx = {
  at: Vec3 | 'center'
  text: string
  kind: 'good' | 'bad' | 'warn'
}

/** Ein Einschlag auf der Spray-Wand. `d` ist der Abstand zum Zielpunkt in Metern. */
export type Hole = { x: number; y: number; d: number }

export type StatRow = [string, string | number]

export type GameState = {
  mode: ModeDef
  dur: number
  /** Verstrichene Sekunden seit Rundenbeginn. */
  t: number
  /** Verbleibende Sekunden. */
  left: number
  score: number
  hits: number
  shots: number
  streak: number
  bestStreak: number
  /** Zeit vom Erscheinen bis zum Treffer, in Millisekunden. */
  ttk: number[]
  /** Reaktionszeiten in Millisekunden. */
  react: number[]
  targets: Target[]
  holes: Hole[]
  /** Modus-eigener Zustand. Jeder Modus besitzt seine eigenen Schlüssel. */
  data: Record<string, any>
  /** Sekunden auf dem Ziel bzw. Sekunden mit gedrückter Taste. */
  trackTime: number
  trackTotal: number
  over: boolean
  /** Großer Hinweis in der Bildmitte, z. B. die Strafe-Richtung. */
  cue: string | null
  /** Seit dem letzten Frame entstandene Effekte. Die Ansicht leert die Liste. */
  fx: Fx[]
  /** Seit dem letzten Frame angeforderte Töne. Die Ansicht leert die Liste. */
  sounds: SoundId[]
  player: Player
  camera: Camera
  settings: Settings
  rng: () => number
}

export type ModeDef = {
  id: ModeId
  name: string
  cat: 'aim' | 'spray' | 'move'
  skill: string
  core?: boolean
  desc: string
  hint: string
  /** Gefeuert wird durch Halten der Taste, nicht durch Klick. */
  hold?: boolean
  /** WASD bewegt den Spieler. */
  move?: boolean
  /** Tempo- und Exposure-Balken einblenden. */
  meters?: boolean
  /** Munitionsanzeige einblenden. */
  ammoHud?: boolean
  /** Beschriftung des vierten HUD-Felds. Default: "Streak". */
  extraLabel?: string
  /** Bei true ist ein kleinerer Metrikwert besser. */
  lowerBetter?: boolean
  metricName: string
  start(g: GameState): void
  tick(g: GameState, input: Input, dt: number): void
  fire?(g: GameState): void
  reload?(g: GameState): void
  hudExtra?(g: GameState): string | number
  stats(g: GameState): StatRow[]
  metric(g: GameState): number
}
```

- [ ] **Step 2: Failing Tests für die Geometrie schreiben**

Create `lib/engine/math.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DEG, clamp, dirFrom, raySphere, rayHitBest, segCross, speed } from './math'
import type { Target } from './types'

const target = (over: Partial<Target> = {}): Target => ({
  x: 0, y: 1.65, z: 10, r: 0.4, dead: false, born: 0, ...over,
})

const ORIGIN = { x: 0, y: 1.65, z: 0 }
const FORWARD = { x: 0, y: 0, z: 1 }

describe('dirFrom', () => {
  it('blickt bei yaw 0 und pitch 0 entlang +z', () => {
    const d = dirFrom(0, 0)
    expect(d.x).toBeCloseTo(0, 10)
    expect(d.y).toBeCloseTo(0, 10)
    expect(d.z).toBeCloseTo(1, 10)
  })

  it('blickt bei yaw 90 Grad entlang +x', () => {
    const d = dirFrom(90 * DEG, 0)
    expect(d.x).toBeCloseTo(1, 10)
    expect(d.z).toBeCloseTo(0, 10)
  })

  it('liefert immer einen Einheitsvektor', () => {
    const d = dirFrom(1.2, -0.4)
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1, 10)
  })
})

describe('raySphere', () => {
  it('trifft ein Ziel direkt voraus und liefert den Abstand zur Oberflaeche', () => {
    const d = raySphere(ORIGIN, FORWARD, target())
    expect(d).toBeCloseTo(10 - 0.4, 6)
  })

  it('verfehlt ein Ziel seitlich neben dem Strahl', () => {
    expect(raySphere(ORIGIN, FORWARD, target({ x: 2 }))).toBe(-1)
  })

  it('verfehlt ein Ziel hinter der Kamera', () => {
    expect(raySphere(ORIGIN, FORWARD, target({ z: -10 }))).toBe(-1)
  })

  it('trifft am aeusseren Rand des Radius noch', () => {
    expect(raySphere(ORIGIN, FORWARD, target({ x: 0.39 }))).toBeGreaterThan(0)
  })

  it('verfehlt knapp ausserhalb des Radius', () => {
    expect(raySphere(ORIGIN, FORWARD, target({ x: 0.41 }))).toBe(-1)
  })
})

describe('rayHitBest', () => {
  it('waehlt bei zwei Treffern das naehere Ziel', () => {
    const nah = target({ z: 5 })
    const fern = target({ z: 15 })
    expect(rayHitBest(ORIGIN, FORWARD, [fern, nah])).toBe(nah)
  })

  it('ignoriert tote Ziele', () => {
    const tot = target({ z: 5, dead: true })
    const lebend = target({ z: 15 })
    expect(rayHitBest(ORIGIN, FORWARD, [tot, lebend])).toBe(lebend)
  })

  it('ignoriert versteckte Ziele', () => {
    const versteckt = target({ z: 5, hidden: true })
    expect(rayHitBest(ORIGIN, FORWARD, [versteckt])).toBe(null)
  })

  it('liefert null wenn nichts getroffen wird', () => {
    expect(rayHitBest(ORIGIN, FORWARD, [target({ x: 9 })])).toBe(null)
  })
})

describe('segCross', () => {
  it('erkennt zwei sich kreuzende Strecken', () => {
    expect(segCross(-1, 0, 1, 0, 0, -1, 0, 1)).toBe(true)
  })

  it('erkennt zwei sich verfehlende Strecken', () => {
    expect(segCross(-1, 0, -0.5, 0, 0, -1, 0, 1)).toBe(false)
  })
})

describe('clamp', () => {
  it('begrenzt nach unten und oben und laesst Werte dazwischen unveraendert', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
    expect(clamp(5, 0, 10)).toBe(5)
  })
})

describe('speed', () => {
  it('liefert den Betrag der horizontalen Geschwindigkeit', () => {
    expect(speed({ x: 0, y: 1.65, z: 0, vx: 3, vz: 4 })).toBeCloseTo(5, 10)
  })
})
```

- [ ] **Step 3: Tests laufen lassen und Fehlschlag bestätigen**

Run: `pnpm test`
Expected: FAIL mit `Failed to resolve import "./math"`.

- [ ] **Step 4: Geometrie implementieren**

Create `lib/engine/math.ts`:

```ts
import type { Player, Target, Vec3 } from './types'

export const DEG = Math.PI / 180

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

/** Einheitsvektor der Blickrichtung zu gegebenem Gier- und Nickwinkel. */
export function dirFrom(yaw: number, pitch: number): Vec3 {
  const cp = Math.cos(pitch)
  return { x: cp * Math.sin(yaw), y: Math.sin(pitch), z: cp * Math.cos(yaw) }
}

/**
 * Abstand vom Ursprung bis zum vorderen Schnittpunkt mit der Zielkugel,
 * oder -1 wenn der Strahl sie verfehlt oder sie hinter dem Ursprung liegt.
 * `dir` muss normalisiert sein.
 */
export function raySphere(origin: Vec3, dir: Vec3, t: Target): number {
  const ox = t.x - origin.x
  const oy = t.y - origin.y
  const oz = t.z - origin.z
  const tca = ox * dir.x + oy * dir.y + oz * dir.z
  if (tca <= 0) return -1
  const d2 = ox * ox + oy * oy + oz * oz - tca * tca
  const r2 = t.r * t.r
  if (d2 > r2) return -1
  return tca - Math.sqrt(r2 - d2)
}

/** Das nächste getroffene Ziel, oder null. Tote und versteckte Ziele zählen nicht. */
export function rayHitBest(origin: Vec3, dir: Vec3, list: Target[]): Target | null {
  let best: Target | null = null
  let bestDist = Infinity
  for (const t of list) {
    if (t.dead || t.hidden) continue
    const d = raySphere(origin, dir, t)
    if (d > 0 && d < bestDist) {
      bestDist = d
      best = t
    }
  }
  return best
}

/** Schneiden sich die Strecken a→b und c→d? Reine 2D-Draufsicht, für Sichtlinien gegen Deckung. */
export function segCross(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
  const d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax)
  const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx)
  const d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx)
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0
}

/** Horizontales Tempo des Spielers in Metern pro Sekunde. */
export function speed(p: Player): number {
  return Math.hypot(p.vx, p.vz)
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `pnpm test`
Expected: PASS, alle Tests in `math.test.ts` grün.

- [ ] **Step 6: Commit**

```bash
git add lib/engine/types.ts lib/engine/math.ts lib/engine/math.test.ts
git commit -m "feat: Engine-Typen und Geometrie mit Tests"
```

---

### Task 3: Sensitivity, FOV und Formatierung

**Files:**
- Create: `lib/engine/sens.ts`
- Create: `lib/engine/sens.test.ts`
- Create: `lib/engine/format.ts`
- Create: `lib/engine/format.test.ts`

**Interfaces:**
- Consumes: `DEG` aus `lib/engine/math.ts`
- Produces:
  - `HFOV_DEG = 103`, `VFOV: number` (Radiant), `VFOV_DEG: number`
  - `radPerCount(sens: number): number`
  - `counts360(sens: number): number`
  - `cm360(sens: number, dpi: number): number`
  - `edpi(sens: number, dpi: number): number`
  - `avg(a: number[]): number`
  - `pcNum(a: number, b: number): number`
  - `pc(a: number, b: number): string`
  - `ms(v: number): string`

- [ ] **Step 1: Failing Tests für Sensitivity schreiben**

Der Referenzwert stammt aus der Valorant-Formel: 0,07 Grad pro Maus-Count. Bei Sens 0,22 und 800 DPI ergibt das rund 74,2 cm für eine volle Drehung — der Wert, den jeder Sens-Rechner für diese Einstellung ausgibt.

Create `lib/engine/sens.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DEG } from './math'
import { HFOV_DEG, VFOV, VFOV_DEG, cm360, counts360, edpi, radPerCount } from './sens'

describe('FOV', () => {
  it('nutzt 103 Grad horizontal bei 16:9', () => {
    expect(HFOV_DEG).toBe(103)
  })

  it('leitet daraus rund 70,5 Grad vertikal ab', () => {
    expect(VFOV_DEG).toBeCloseTo(70.53, 1)
  })

  it('gibt VFOV in Radiant passend zu VFOV_DEG aus', () => {
    expect(VFOV).toBeCloseTo(VFOV_DEG * DEG, 10)
  })
})

describe('radPerCount', () => {
  it('dreht bei Sens 1 um 0,07 Grad pro Count', () => {
    expect(radPerCount(1) / DEG).toBeCloseTo(0.07, 10)
  })

  it('skaliert linear mit der Sensitivity', () => {
    expect(radPerCount(0.5)).toBeCloseTo(radPerCount(1) / 2, 12)
  })
})

describe('counts360', () => {
  it('braucht bei Sens 0,22 rund 23377 Counts fuer eine volle Drehung', () => {
    expect(counts360(0.22)).toBeCloseTo(23376.6, 1)
  })
})

describe('cm360', () => {
  it('ergibt bei Sens 0,22 und 800 DPI rund 74,2 cm', () => {
    expect(cm360(0.22, 800)).toBeCloseTo(74.2, 1)
  })

  it('halbiert sich bei doppelter DPI', () => {
    expect(cm360(0.22, 1600)).toBeCloseTo(cm360(0.22, 800) / 2, 10)
  })
})

describe('edpi', () => {
  it('multipliziert Sensitivity mit DPI', () => {
    expect(edpi(0.22, 800)).toBeCloseTo(176, 10)
  })
})
```

- [ ] **Step 2: Tests laufen lassen und Fehlschlag bestätigen**

Run: `pnpm test sens`
Expected: FAIL mit `Failed to resolve import "./sens"`.

- [ ] **Step 3: Sensitivity implementieren**

Create `lib/engine/sens.ts`:

```ts
import { DEG } from './math'

/** Valorants horizontaler FOV bei 16:9. */
export const HFOV_DEG = 103

/**
 * Vertikaler Öffnungswinkel in Radiant.
 *
 * Valorant nutzt Hor+: der horizontale FOV wächst mit breiteren Formaten, der
 * vertikale bleibt konstant. Genau dieser vertikale Wert ist das, was
 * THREE.PerspectiveCamera als `fov` erwartet — er gilt für jedes Seitenverhältnis.
 */
export const VFOV = 2 * Math.atan(Math.tan((HFOV_DEG / 2) * DEG) * (9 / 16))
export const VFOV_DEG = VFOV / DEG

/** Grad pro Maus-Count bei Sensitivity 1, als Radiant. */
const RAD_PER_COUNT_AT_1 = 0.07 * DEG

/** Winkel in Radiant, um den sich die Kamera pro Maus-Count dreht. */
export function radPerCount(sens: number): number {
  return sens * RAD_PER_COUNT_AT_1
}

/** Maus-Counts für eine volle 360-Grad-Drehung. */
export function counts360(sens: number): number {
  return 360 / (0.07 * sens)
}

/** Zentimeter Mausweg für eine volle 360-Grad-Drehung. */
export function cm360(sens: number, dpi: number): number {
  return (counts360(sens) / dpi) * 2.54
}

export function edpi(sens: number, dpi: number): number {
  return sens * dpi
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `pnpm test sens`
Expected: PASS.

- [ ] **Step 5: Failing Tests für die Formatierung schreiben**

Create `lib/engine/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { avg, ms, pc, pcNum } from './format'

describe('avg', () => {
  it('mittelt eine Liste', () => {
    expect(avg([1, 2, 3])).toBeCloseTo(2, 10)
  })

  it('liefert 0 fuer eine leere Liste statt NaN', () => {
    expect(avg([])).toBe(0)
  })
})

describe('pcNum', () => {
  it('rechnet einen Anteil in Prozent um', () => {
    expect(pcNum(1, 4)).toBeCloseTo(25, 10)
  })

  it('liefert 0 statt einer Division durch null', () => {
    expect(pcNum(3, 0)).toBe(0)
  })
})

describe('pc', () => {
  it('formatiert gerundet mit Prozentzeichen', () => {
    expect(pc(2, 3)).toBe('67 %')
  })

  it('zeigt einen Gedankenstrich wenn noch nichts gemessen wurde', () => {
    expect(pc(0, 0)).toBe('–')
  })
})

describe('ms', () => {
  it('formatiert gerundete Millisekunden', () => {
    expect(ms(312.4)).toBe('312 ms')
  })

  it('zeigt einen Gedankenstrich fuer 0 und negative Werte', () => {
    expect(ms(0)).toBe('–')
    expect(ms(-5)).toBe('–')
  })
})
```

- [ ] **Step 6: Tests laufen lassen und Fehlschlag bestätigen**

Run: `pnpm test format`
Expected: FAIL mit `Failed to resolve import "./format"`.

- [ ] **Step 7: Formatierung implementieren**

Create `lib/engine/format.ts`:

```ts
export function avg(a: number[]): number {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0
}

/** Anteil in Prozent als Zahl. 0 statt Division durch null. */
export function pcNum(a: number, b: number): number {
  return b > 0 ? (a / b) * 100 : 0
}

/** Anteil in Prozent als Anzeigetext, "–" wenn nichts gemessen wurde. */
export function pc(a: number, b: number): string {
  return b > 0 ? `${Math.round((a / b) * 100)} %` : '–'
}

/** Millisekunden als Anzeigetext, "–" wenn kein gültiger Wert vorliegt. */
export function ms(v: number): string {
  return v > 0 ? `${Math.round(v)} ms` : '–'
}
```

- [ ] **Step 8: Tests laufen lassen**

Run: `pnpm test`
Expected: PASS, alle bisherigen Testdateien grün.

- [ ] **Step 9: Commit**

```bash
git add lib/engine/sens.ts lib/engine/sens.test.ts lib/engine/format.ts lib/engine/format.test.ts
git commit -m "feat: Sensitivity-, FOV- und Formatierungshelfer mit Tests"
```

---

### Task 4: Kamera

**Files:**
- Create: `lib/engine/camera.ts`
- Create: `lib/engine/camera.test.ts`

**Interfaces:**
- Consumes: `DEG`, `clamp` aus `lib/engine/math.ts`; `radPerCount` aus `lib/engine/sens.ts`; `Camera` aus `lib/engine/types.ts`
- Produces:
  - `PITCH_LIMIT: number` (89 Grad in Radiant)
  - `createCamera(): Camera`
  - `basis(cam: Camera): void` — schreibt `F`, `R`, `U` aus `yaw`/`pitch`
  - `applyMouse(cam: Camera, dx: number, dy: number, sens: number): void`

- [ ] **Step 1: Failing Tests schreiben**

Create `lib/engine/camera.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DEG } from './math'
import { PITCH_LIMIT, applyMouse, basis, createCamera } from './camera'
import { radPerCount } from './sens'

const dot = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  a.x * b.x + a.y * b.y + a.z * b.z

describe('createCamera', () => {
  it('startet nach vorn ausgerichtet mit gueltiger Basis', () => {
    const cam = createCamera()
    expect(cam.yaw).toBe(0)
    expect(cam.pitch).toBe(0)
    expect(cam.F.z).toBeCloseTo(1, 10)
  })
})

describe('basis', () => {
  it('liefert drei paarweise senkrechte Einheitsvektoren', () => {
    const cam = createCamera()
    cam.yaw = 0.8
    cam.pitch = -0.3
    basis(cam)
    for (const v of [cam.F, cam.R, cam.U]) {
      expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1, 10)
    }
    expect(dot(cam.F, cam.R)).toBeCloseTo(0, 10)
    expect(dot(cam.F, cam.U)).toBeCloseTo(0, 10)
    expect(dot(cam.R, cam.U)).toBeCloseTo(0, 10)
  })

  it('haelt R waagerecht, damit Strafen nie schraeg laeuft', () => {
    const cam = createCamera()
    cam.pitch = -0.9
    basis(cam)
    expect(cam.R.y).toBe(0)
  })
})

describe('applyMouse', () => {
  it('dreht pro Count um den Winkel aus radPerCount', () => {
    const cam = createCamera()
    applyMouse(cam, 100, 0, 0.22)
    expect(cam.yaw).toBeCloseTo(100 * radPerCount(0.22), 12)
  })

  it('hebt den Blick bei negativer Mausbewegung nach oben', () => {
    const cam = createCamera()
    applyMouse(cam, 0, -100, 0.22)
    expect(cam.pitch).toBeGreaterThan(0)
  })

  it('begrenzt den Nickwinkel auf 89 Grad', () => {
    const cam = createCamera()
    applyMouse(cam, 0, -100000, 1)
    expect(cam.pitch).toBeCloseTo(PITCH_LIMIT, 10)
    applyMouse(cam, 0, 200000, 1)
    expect(cam.pitch).toBeCloseTo(-PITCH_LIMIT, 10)
  })

  it('laesst den Gierwinkel unbegrenzt weiterlaufen', () => {
    const cam = createCamera()
    applyMouse(cam, 100000, 0, 1)
    expect(Math.abs(cam.yaw)).toBeGreaterThan(2 * Math.PI)
  })

  it('aktualisiert die Basis sofort mit', () => {
    const cam = createCamera()
    applyMouse(cam, 0, 0, 0.22)
    expect(cam.F.z).toBeCloseTo(1, 10)
    applyMouse(cam, 90 * DEG / radPerCount(1), 0, 1)
    expect(cam.F.x).toBeCloseTo(1, 6)
  })
})
```

- [ ] **Step 2: Tests laufen lassen und Fehlschlag bestätigen**

Run: `pnpm test camera`
Expected: FAIL mit `Failed to resolve import "./camera"`.

- [ ] **Step 3: Kamera implementieren**

Create `lib/engine/camera.ts`:

```ts
import { DEG, clamp } from './math'
import { radPerCount } from './sens'
import type { Camera } from './types'

/** Blick knapp unter senkrecht, wie im Original. */
export const PITCH_LIMIT = 89 * DEG

export function createCamera(): Camera {
  const cam: Camera = {
    yaw: 0,
    pitch: 0,
    F: { x: 0, y: 0, z: 1 },
    R: { x: 1, y: 0, z: 0 },
    U: { x: 0, y: 1, z: 0 },
  }
  basis(cam)
  return cam
}

/**
 * Berechnet die orthonormale Basis aus yaw und pitch.
 *
 * R bleibt bewusst waagerecht (y = 0): Strafen soll auch bei geneigtem Blick
 * seitwärts über den Boden laufen und nicht in die Schräge kippen.
 */
export function basis(cam: Camera): void {
  const cp = Math.cos(cam.pitch)
  const sp = Math.sin(cam.pitch)
  const sy = Math.sin(cam.yaw)
  const cy = Math.cos(cam.yaw)
  cam.F = { x: cp * sy, y: sp, z: cp * cy }
  cam.R = { x: cy, y: 0, z: -sy }
  cam.U = {
    x: cam.F.y * cam.R.z - cam.F.z * cam.R.y,
    y: cam.F.z * cam.R.x - cam.F.x * cam.R.z,
    z: cam.F.x * cam.R.y - cam.F.y * cam.R.x,
  }
}

/**
 * Wendet rohe Mausbewegung an. `dx`/`dy` sind Counts aus dem Pointer-Lock-Event,
 * nicht Pixel. Positives `dy` heißt Maus nach unten, also Blick nach unten.
 */
export function applyMouse(cam: Camera, dx: number, dy: number, sens: number): void {
  const k = radPerCount(sens)
  cam.yaw += dx * k
  cam.pitch = clamp(cam.pitch - dy * k, -PITCH_LIMIT, PITCH_LIMIT)
  basis(cam)
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `pnpm test camera`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/engine/camera.ts lib/engine/camera.test.ts
git commit -m "feat: Kamera mit Basisvektoren und Pointer-Lock-Eingabe"
```

---

### Task 5: Bewegung und Counterstrafe

**Files:**
- Create: `lib/engine/movement.ts`
- Create: `lib/engine/movement.test.ts`

**Interfaces:**
- Consumes: `speed` aus `lib/engine/math.ts`; `Camera`, `Player` aus `lib/engine/types.ts`
- Produces:
  - `RUN = 6.75`, `ACC = 55`, `FRIC = 34`, `COUNTER = 130`
  - `EYE = 1.65`
  - `BOUNDS = { x: 16, zMin: -6, zMax: 11 }`
  - `createPlayer(): Player`
  - `movePlayer(p: Player, cam: Camera, keys: Record<string, boolean>, dt: number): void`

- [ ] **Step 1: Failing Tests schreiben**

Der wichtigste Test ist das Counterstrafen: das Antippen der Gegenrichtung muss den Spieler in unter 60 Millisekunden unter die Schussschwelle von 1 m/s bringen. Genau darauf baut der Modus Counterstrafe auf — stimmt diese Zahl nicht, ist die Übung wertlos.

Create `lib/engine/movement.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { speed } from './math'
import { createCamera } from './camera'
import { BOUNDS, COUNTER, EYE, FRIC, RUN, createPlayer, movePlayer } from './movement'
import type { Player } from './types'

/** Hält `keys` für `seconds` gedrückt, in Schritten von 4 Millisekunden. */
function hold(p: Player, keys: Record<string, boolean>, seconds: number) {
  const cam = createCamera()
  const step = 0.004
  for (let t = 0; t < seconds; t += step) movePlayer(p, cam, keys, step)
}

describe('Konstanten', () => {
  it('entspricht den Werten aus dem Original', () => {
    expect(RUN).toBe(6.75)
    expect(FRIC).toBe(34)
    expect(COUNTER).toBe(130)
    expect(EYE).toBe(1.65)
  })
})

describe('movePlayer', () => {
  it('beschleunigt auf hoechstens Laufgeschwindigkeit', () => {
    const p = createPlayer()
    hold(p, { KeyD: true }, 2)
    expect(speed(p)).toBeCloseTo(RUN, 6)
  })

  it('laeuft bei gedrueckter D-Taste nach rechts', () => {
    const p = createPlayer()
    hold(p, { KeyD: true }, 0.5)
    expect(p.vx).toBeGreaterThan(0)
  })

  it('bremst ohne Eingabe binnen 250 ms vollstaendig ab', () => {
    const p = createPlayer()
    hold(p, { KeyD: true }, 2)
    hold(p, {}, 0.25)
    expect(speed(p)).toBe(0)
  })

  it('bringt Gegentippen das Tempo binnen 60 ms unter die Schussschwelle', () => {
    const p = createPlayer()
    hold(p, { KeyD: true }, 2)
    expect(speed(p)).toBeCloseTo(RUN, 6)
    hold(p, { KeyA: true }, 0.06)
    expect(speed(p)).toBeLessThanOrEqual(1)
  })

  it('bremst beim Gegentippen haerter als blosses Loslassen', () => {
    const counter = createPlayer()
    hold(counter, { KeyD: true }, 2)
    hold(counter, { KeyA: true }, 0.04)

    const released = createPlayer()
    hold(released, { KeyD: true }, 2)
    hold(released, {}, 0.04)

    expect(speed(counter)).toBeLessThan(speed(released))
  })

  it('haelt diagonale Bewegung auf Laufgeschwindigkeit statt sie zu addieren', () => {
    const p = createPlayer()
    hold(p, { KeyW: true, KeyD: true }, 2)
    expect(speed(p)).toBeCloseTo(RUN, 6)
  })

  it('bleibt innerhalb der Range-Grenzen', () => {
    const p = createPlayer()
    hold(p, { KeyD: true }, 10)
    expect(p.x).toBeLessThanOrEqual(BOUNDS.x)
    const q = createPlayer()
    hold(q, { KeyW: true }, 10)
    expect(q.z).toBeLessThanOrEqual(BOUNDS.zMax)
  })

  it('haelt die Augenhoehe konstant', () => {
    const p = createPlayer()
    hold(p, { KeyW: true, KeyA: true }, 1)
    expect(p.y).toBe(EYE)
  })
})
```

- [ ] **Step 2: Tests laufen lassen und Fehlschlag bestätigen**

Run: `pnpm test movement`
Expected: FAIL mit `Failed to resolve import "./movement"`.

- [ ] **Step 3: Bewegung implementieren**

Create `lib/engine/movement.ts`:

```ts
import { speed } from './math'
import type { Camera, Player } from './types'

/** Laufgeschwindigkeit in Metern pro Sekunde. */
export const RUN = 6.75
/** Beschleunigung beim Anlaufen. */
export const ACC = 55
/** Verzögerung beim Loslassen aller Tasten. */
export const FRIC = 34
/** Verzögerung beim Antippen der Gegenrichtung — der Kern des Counterstrafens. */
export const COUNTER = 130
/** Augenhöhe über dem Boden. */
export const EYE = 1.65
/** Begrenzung der Range. */
export const BOUNDS = { x: 16, zMin: -6, zMax: 11 }

/** Ab diesem Winkel gilt die Eingabe als Gegenrichtung. Entspricht etwa 102 Grad. */
const COUNTER_DOT = -0.2
/** Unterhalb dieses Tempos schnappt das Gegentippen auf Stillstand. */
const SNAP_SPEED = 0.6

export function createPlayer(): Player {
  return { x: 0, y: EYE, z: 0, vx: 0, vz: 0 }
}

/**
 * Ein Bewegungsschritt.
 *
 * Die Richtung wird aus der Kamerabasis gebildet, damit WASD relativ zum Blick
 * wirkt. Zeigt die Eingabe der aktuellen Bewegung entgegen, greift statt der
 * normalen Beschleunigung die deutlich härtere COUNTER-Verzögerung — das ist
 * das Verhalten, das Counterstrafen im Spiel überhaupt erst möglich macht.
 */
export function movePlayer(
  p: Player,
  cam: Camera,
  keys: Record<string, boolean>,
  dt: number,
): void {
  let ix = 0
  let iz = 0
  if (keys.KeyA) ix -= 1
  if (keys.KeyD) ix += 1
  if (keys.KeyW) iz += 1
  if (keys.KeyS) iz -= 1

  const len = Math.hypot(ix, iz)
  let wx = 0
  let wz = 0
  if (len > 0) {
    ix /= len
    iz /= len
    wx = cam.R.x * ix + cam.F.x * iz
    wz = cam.R.z * ix + cam.F.z * iz
    const l2 = Math.hypot(wx, wz)
    wx /= l2
    wz /= l2
  }

  const sp = speed(p)
  if (len > 0) {
    const dot = sp > 0.01 ? (wx * p.vx + wz * p.vz) / sp : 1
    const a = dot < COUNTER_DOT ? COUNTER : ACC
    p.vx += wx * a * dt
    p.vz += wz * a * dt
    const s2 = speed(p)
    if (s2 > RUN) {
      p.vx *= RUN / s2
      p.vz *= RUN / s2
    }
    if (dot < COUNTER_DOT && s2 < SNAP_SPEED) {
      p.vx = 0
      p.vz = 0
    }
  } else if (sp > 0) {
    const dec = Math.min(sp, FRIC * dt)
    p.vx -= (p.vx / sp) * dec
    p.vz -= (p.vz / sp) * dec
    if (speed(p) < 0.05) {
      p.vx = 0
      p.vz = 0
    }
  }

  p.x += p.vx * dt
  p.z += p.vz * dt
  p.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, p.x))
  p.z = Math.max(BOUNDS.zMin, Math.min(BOUNDS.zMax, p.z))
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `pnpm test movement`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/engine/movement.ts lib/engine/movement.test.ts
git commit -m "feat: Spielerbewegung mit Counterstrafe-Bremsen"
```

---

### Task 6: Waffen und Zielerzeugung

**Files:**
- Create: `lib/engine/weapons.ts`
- Create: `lib/engine/weapons.test.ts`
- Create: `lib/engine/spawn.ts`
- Create: `lib/engine/spawn.test.ts`

**Interfaces:**
- Consumes: `DEG`, `clamp`, `dirFrom` aus `lib/engine/math.ts`; `GameState`, `Target`, `WeaponId` aus `lib/engine/types.ts`
- Produces:
  - `type Weapon = { name: string; mag: number; rps: number; dmg: number; pat: [number, number][] }`
  - `WEAPONS: Record<WeaponId, Weapon>`
  - `spawnAtAngle(g: GameState, minDeg: number, maxDeg: number, dist: number, r: number): Target`
  - `slotTarget(g: GameState, r: number, xr: number, ylo: number, yhi: number, z: number): Target`

Die Sprühmuster sind Wertepaare `[horizontal, vertikal]` in Grad, gemessen vom ersten Schuss aus. Sie werden zeichengenau aus `reference/index.html`, Abschnitt `5 · Waffen / Rückstoß`, übernommen. Keine Zahl anpassen, keine runden.

- [ ] **Step 1: Failing Tests für Waffen schreiben**

Create `lib/engine/weapons.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { WEAPONS } from './weapons'

describe('WEAPONS', () => {
  it('kennt Vandal und Phantom', () => {
    expect(Object.keys(WEAPONS).sort()).toEqual(['phantom', 'vandal'])
  })

  it('gibt jedem Muster genau so viele Schuesse wie das Magazin fasst', () => {
    for (const w of Object.values(WEAPONS)) {
      expect(w.pat.length).toBe(w.mag)
    }
  })

  it('startet jedes Muster im Ursprung', () => {
    for (const w of Object.values(WEAPONS)) {
      expect(w.pat[0]).toEqual([0, 0])
    }
  })

  it('steigt vertikal streng monoton — der Rueckstoss geht nie zurueck', () => {
    for (const w of Object.values(WEAPONS)) {
      for (let i = 1; i < w.pat.length; i++) {
        expect(w.pat[i][1]).toBeGreaterThan(w.pat[i - 1][1])
      }
    }
  })

  it('hat beim Vandal ein hoeheres Magazin-Ende als beim Phantom', () => {
    const vandalTop = WEAPONS.vandal.pat[WEAPONS.vandal.pat.length - 1][1]
    const phantomTop = WEAPONS.phantom.pat[WEAPONS.phantom.pat.length - 1][1]
    expect(vandalTop).toBeGreaterThan(phantomTop)
  })

  it('feuert Phantom schneller als Vandal', () => {
    expect(WEAPONS.phantom.rps).toBeGreaterThan(WEAPONS.vandal.rps)
  })
})
```

- [ ] **Step 2: Tests laufen lassen und Fehlschlag bestätigen**

Run: `pnpm test weapons`
Expected: FAIL mit `Failed to resolve import "./weapons"`.

- [ ] **Step 3: Waffen implementieren**

Create `lib/engine/weapons.ts`:

```ts
import type { WeaponId } from './types'

export type Weapon = {
  name: string
  /** Schuss pro Magazin. */
  mag: number
  /** Schuss pro Sekunde. */
  rps: number
  dmg: number
  /**
   * Sprühmuster als [horizontal, vertikal] in Grad, relativ zum ersten Schuss.
   * Nachempfunden, nicht aus Spieldaten ausgelesen.
   */
  pat: [number, number][]
}

export const WEAPONS: Record<WeaponId, Weapon> = {
  vandal: {
    name: 'Vandal',
    mag: 25,
    rps: 9.75,
    dmg: 39,
    pat: [
      [0, 0], [0, 0.55], [0.05, 1.25], [0.05, 2.0], [0, 2.8],
      [-0.05, 3.55], [-0.1, 4.25], [-0.15, 4.85], [-0.2, 5.35], [-0.2, 5.8],
      [-0.1, 6.1], [0.15, 6.35], [0.55, 6.55], [1.05, 6.72], [1.55, 6.85],
      [1.95, 6.94], [2.1, 7.0], [1.85, 7.06], [1.3, 7.1], [0.5, 7.14],
      [-0.4, 7.18], [-1.2, 7.22], [-1.8, 7.26], [-2.05, 7.3], [-1.75, 7.34],
    ],
  },
  phantom: {
    name: 'Phantom',
    mag: 30,
    rps: 11,
    dmg: 35,
    pat: [
      [0, 0], [0, 0.45], [0.04, 1.05], [0.04, 1.7], [0, 2.35],
      [-0.04, 3.0], [-0.08, 3.55], [-0.12, 4.05], [-0.16, 4.5], [-0.16, 4.9],
      [-0.08, 5.2], [0.12, 5.45], [0.45, 5.65], [0.88, 5.8], [1.3, 5.92],
      [1.62, 6.0], [1.75, 6.06], [1.55, 6.11], [1.1, 6.15], [0.42, 6.19],
      [-0.34, 6.22], [-1.0, 6.25], [-1.5, 6.28], [-1.72, 6.31], [-1.5, 6.34],
      [-1.0, 6.37], [-0.3, 6.4], [0.4, 6.43], [1.0, 6.46], [1.3, 6.49],
    ],
  },
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `pnpm test weapons`
Expected: PASS.

Falls der Monotonie-Test fehlschlägt, wurde beim Abtippen eine Zahl vertauscht. Gegen `reference/index.html` prüfen, nicht den Test lockern.

- [ ] **Step 5: Failing Tests für die Zielerzeugung schreiben**

`spawn.test.ts` braucht einen `GameState`. Da `game.ts` erst in Task 7 entsteht, wird hier ein minimales Objekt gebaut, das nur die Felder trägt, die die Zielerzeugung liest.

Create `lib/engine/spawn.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createCamera } from './camera'
import { DEG } from './math'
import { createPlayer } from './movement'
import { slotTarget, spawnAtAngle } from './spawn'
import type { GameState, Vec3 } from './types'

/** Zufall, der eine feste Folge abspielt und danach zyklisch von vorn beginnt. */
function seq(values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

function stubState(rng: () => number): GameState {
  return {
    player: createPlayer(),
    camera: createCamera(),
    rng,
    t: 3,
  } as unknown as GameState
}

/** Winkel zwischen Blickrichtung und der Richtung zum Ziel, in Grad. */
function offsetDeg(g: GameState, t: Vec3) {
  const dx = t.x - g.player.x
  const dy = t.y - g.player.y
  const dz = t.z - g.player.z
  const len = Math.hypot(dx, dy, dz)
  const dot = (dx * g.camera.F.x + dy * g.camera.F.y + dz * g.camera.F.z) / len
  return Math.acos(Math.min(1, Math.max(-1, dot))) / DEG
}

describe('spawnAtAngle', () => {
  it('legt das Ziel im gewuenschten Winkelbereich zur Blickrichtung ab', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
      const g = stubState(seq([r]))
      const t = spawnAtAngle(g, 12, 34, 16, 0.34)
      const off = offsetDeg(g, t)
      expect(off).toBeGreaterThanOrEqual(11.9)
      expect(off).toBeLessThanOrEqual(34.1)
    }
  })

  it('merkt sich den Erscheinungszeitpunkt fuer die TTK-Messung', () => {
    const g = stubState(seq([0.5]))
    expect(spawnAtAngle(g, 12, 34, 16, 0.34).born).toBe(3)
  })

  it('hebt Ziele an, die sonst im Boden stecken wuerden', () => {
    const g = stubState(seq([1, 0.5]))
    g.camera.pitch = -80 * DEG
    const t = spawnAtAngle(g, 12, 34, 16, 0.34)
    expect(t.y).toBeGreaterThanOrEqual(0.34 + 0.35)
  })

  it('erzeugt lebende Ziele', () => {
    const g = stubState(seq([0.5]))
    expect(spawnAtAngle(g, 12, 34, 16, 0.34).dead).toBe(false)
  })
})

describe('slotTarget', () => {
  it('bleibt in der vorgegebenen Box', () => {
    for (const r of [0, 0.5, 1]) {
      const g = stubState(seq([r]))
      const t = slotTarget(g, 0.4, 6.2, 0.9, 3.4, 17)
      expect(Math.abs(t.x)).toBeLessThanOrEqual(6.2)
      expect(t.y).toBeGreaterThanOrEqual(0.9)
      expect(t.y).toBeLessThanOrEqual(3.4)
      expect(t.z).toBe(17)
    }
  })

  it('uebernimmt Radius und Erscheinungszeitpunkt', () => {
    const g = stubState(seq([0.5]))
    const t = slotTarget(g, 0.42, 6.2, 0.9, 3.4, 17)
    expect(t.r).toBe(0.42)
    expect(t.born).toBe(3)
  })
})
```

- [ ] **Step 6: Tests laufen lassen und Fehlschlag bestätigen**

Run: `pnpm test spawn`
Expected: FAIL mit `Failed to resolve import "./spawn"`.

- [ ] **Step 7: Zielerzeugung implementieren**

Create `lib/engine/spawn.ts`:

```ts
import { DEG, clamp, dirFrom } from './math'
import type { GameState, Target } from './types'

/** Ziele bleiben in diesem Kegel, damit sie nicht im Boden oder hinter dem Spieler landen. */
const PITCH_MIN = -22 * DEG
const PITCH_MAX = 26 * DEG
const YAW_LIMIT = 58 * DEG
/** Mindestabstand der Kugelunterkante zum Boden. */
const FLOOR_CLEARANCE = 0.35

/**
 * Ein Ziel in `dist` Metern Entfernung, um `minDeg` bis `maxDeg` Grad neben der
 * aktuellen Blickrichtung — in zufälliger Richtung auf diesem Kegel.
 *
 * Der Versatz ist bewusst relativ zum Blick und nicht zur Welt: nur so erzwingt
 * der Modus jedes Mal einen echten Flick statt einer Mikrokorrektur.
 */
export function spawnAtAngle(
  g: GameState,
  minDeg: number,
  maxDeg: number,
  dist: number,
  r: number,
): Target {
  const ang = (minDeg + g.rng() * (maxDeg - minDeg)) * DEG
  const rot = g.rng() * Math.PI * 2
  const dPitch = Math.cos(rot) * ang
  const dYaw = Math.sin(rot) * ang

  const yaw = clamp(g.camera.yaw + dYaw, -YAW_LIMIT, YAW_LIMIT)
  const pitch = clamp(g.camera.pitch + dPitch, PITCH_MIN, PITCH_MAX)
  const d = dirFrom(yaw, pitch)

  const t: Target = {
    x: g.player.x + d.x * dist,
    y: g.player.y + d.y * dist,
    z: g.player.z + d.z * dist,
    r,
    dead: false,
    born: g.t,
  }
  if (t.y < r + FLOOR_CLEARANCE) t.y = r + FLOOR_CLEARANCE
  return t
}

/** Ein Ziel an zufälliger Stelle einer festen Wandfläche in `z` Metern Entfernung. */
export function slotTarget(
  g: GameState,
  r: number,
  xr: number,
  ylo: number,
  yhi: number,
  z: number,
): Target {
  return {
    x: (g.rng() * 2 - 1) * xr,
    y: ylo + g.rng() * (yhi - ylo),
    z,
    r,
    dead: false,
    born: g.t,
  }
}
```

- [ ] **Step 8: Tests laufen lassen**

Run: `pnpm test`
Expected: PASS, alle bisherigen Testdateien grün.

- [ ] **Step 9: Commit**

```bash
git add lib/engine/weapons.ts lib/engine/weapons.test.ts lib/engine/spawn.ts lib/engine/spawn.test.ts
git commit -m "feat: Sprühmuster und Zielerzeugung"
```

---

### Task 7: Rundenzustand und Buchhaltung

**Files:**
- Create: `lib/engine/game.ts`
- Create: `lib/engine/game.test.ts`

**Interfaces:**
- Consumes: `basis`, `createCamera` aus `lib/engine/camera.ts`; `createPlayer`, `movePlayer` aus `lib/engine/movement.ts`; `GameState`, `Input`, `ModeDef`, `Settings`, `SoundId`, `Target`, `Vec3` aus `lib/engine/types.ts`
- Produces:
  - `DEFAULT_SETTINGS: Settings`
  - `createGame(mode: ModeDef, settings: Settings, dur?: number, rng?: () => number): GameState`
  - `tick(g: GameState, input: Input, dt: number): void`
  - `fire(g: GameState): void`
  - `registerHit(g: GameState, t: Target, label?: string): void`
  - `registerMiss(g: GameState, label?: string): void`
  - `pushFx(g: GameState, at: Vec3 | 'center', text: string, kind: Fx['kind']): void`
  - `play(g: GameState, id: SoundId): void`
  - `endGame(g: GameState): void`

Zwei Festlegungen, die den Rest der Engine prägen:

**Die Engine spielt keine Töne und zeichnet nichts.** `play()` hängt eine Kennung an `g.sounds`, `pushFx()` hängt einen Effekt an `g.fx`. Die Ansicht leert beide Listen pro Frame. Damit bleibt die Engine ohne Audio- und ohne Render-Abhängigkeit testbar — und ein Test kann prüfen, *dass* ein Kopftreffer-Ton angefordert wurde, ohne ihn zu hören.

**`registerHit` misst die TTK selbst.** Sie liest `t.born` und verwirft Werte über vier Sekunden, weil die aus verschleppten Zielen stammen und den Durchschnitt verzerren.

- [ ] **Step 1: Failing Tests schreiben**

Create `lib/engine/game.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, createGame, endGame, fire, registerHit, registerMiss, tick } from './game'
import { EYE, RUN } from './movement'
import { speed } from './math'
import type { GameState, Input, ModeDef, Target } from './types'

const noInput: Input = { keys: {}, mouseDown: false }

/** Ein Modus, der nichts tut — Prüfstand für den Rundenrahmen selbst. */
function stubMode(over: Partial<ModeDef> = {}): ModeDef {
  return {
    id: 'gridshot',
    name: 'Stub',
    cat: 'aim',
    skill: 'Test',
    desc: '',
    hint: '',
    metricName: 'Score',
    start() {},
    tick() {},
    stats: () => [],
    metric: (g) => g.score,
    ...over,
  }
}

const target = (over: Partial<Target> = {}): Target => ({
  x: 0, y: EYE, z: 10, r: 0.4, dead: false, born: 0, ...over,
})

describe('createGame', () => {
  it('startet mit leerer Bilanz und voller Rundenzeit', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS, 60)
    expect(g.t).toBe(0)
    expect(g.left).toBe(60)
    expect(g.score).toBe(0)
    expect(g.shots).toBe(0)
    expect(g.over).toBe(false)
  })

  it('faellt ohne Angabe auf die Rundenlaenge aus den Settings zurueck', () => {
    const g = createGame(stubMode(), { ...DEFAULT_SETTINGS, dur: 45 })
    expect(g.dur).toBe(45)
  })

  it('setzt Spieler und Kamera in die Ausgangslage', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    expect(g.player).toEqual({ x: 0, y: EYE, z: 0, vx: 0, vz: 0 })
    expect(g.camera.yaw).toBe(0)
    expect(g.camera.pitch).toBe(0)
  })

  it('ruft start() des Modus auf', () => {
    let gerufen = false
    createGame(stubMode({ start() { gerufen = true } }), DEFAULT_SETTINGS)
    expect(gerufen).toBe(true)
  })

  it('nimmt einen eigenen Zufallsgenerator entgegen', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS, 60, () => 0.5)
    expect(g.rng()).toBe(0.5)
  })
})

describe('tick', () => {
  it('zaehlt die Zeit hoch und die Restzeit herunter', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS, 10)
    tick(g, noInput, 0.5)
    expect(g.t).toBeCloseTo(0.5, 10)
    expect(g.left).toBeCloseTo(9.5, 10)
  })

  it('beendet die Runde wenn die Zeit abgelaufen ist', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS, 1)
    tick(g, noInput, 1.5)
    expect(g.left).toBe(0)
    expect(g.over).toBe(true)
  })

  it('ruft tick() des Modus mit dem Zeitschritt auf', () => {
    let gesehen = 0
    const g = createGame(stubMode({ tick(_g, _i, dt) { gesehen = dt } }), DEFAULT_SETTINGS, 10)
    tick(g, noInput, 0.25)
    expect(gesehen).toBe(0.25)
  })

  it('bewegt den Spieler nur in Modi mit move', () => {
    const still = createGame(stubMode(), DEFAULT_SETTINGS, 10)
    tick(still, { keys: { KeyD: true }, mouseDown: false }, 0.5)
    expect(speed(still.player)).toBe(0)

    const beweglich = createGame(stubMode({ move: true }), DEFAULT_SETTINGS, 10)
    tick(beweglich, { keys: { KeyD: true }, mouseDown: false }, 0.5)
    expect(speed(beweglich.player)).toBeGreaterThan(0)
    expect(speed(beweglich.player)).toBeLessThanOrEqual(RUN)
  })

  it('tut nach dem Rundenende nichts mehr', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS, 1)
    tick(g, noInput, 2)
    const t = g.t
    tick(g, noInput, 1)
    expect(g.t).toBe(t)
  })
})

describe('fire', () => {
  it('leitet an den Modus weiter', () => {
    let gerufen = false
    const g = createGame(stubMode({ fire() { gerufen = true } }), DEFAULT_SETTINGS)
    fire(g)
    expect(gerufen).toBe(true)
  })

  it('feuert nach dem Rundenende nicht mehr', () => {
    let anzahl = 0
    const g = createGame(stubMode({ fire() { anzahl++ } }), DEFAULT_SETTINGS, 1)
    tick(g, noInput, 2)
    fire(g)
    expect(anzahl).toBe(0)
  })
})

describe('registerHit', () => {
  it('zaehlt Treffer, Serie und beste Serie', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    registerHit(g, target())
    registerHit(g, target())
    expect(g.hits).toBe(2)
    expect(g.streak).toBe(2)
    expect(g.bestStreak).toBe(2)
  })

  it('misst die Zeit vom Erscheinen bis zum Treffer in Millisekunden', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    g.t = 0.4
    registerHit(g, target({ born: 0.1 }))
    expect(g.ttk[0]).toBeCloseTo(300, 6)
  })

  it('verwirft unrealistisch lange Zeiten', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    g.t = 9
    registerHit(g, target({ born: 0 }))
    expect(g.ttk).toHaveLength(0)
  })

  it('fordert einen Ton an und legt einen Effekt am Ziel ab', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    registerHit(g, target({ x: 2 }))
    expect(g.sounds).toContain('hit')
    expect(g.fx[0].kind).toBe('good')
    expect(g.fx[0].at).toEqual({ x: 2, y: EYE, z: 10 })
  })

  it('beschriftet den Effekt standardmaessig mit +1', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    registerHit(g, target())
    expect(g.fx[0].text).toBe('+1')
  })
})

describe('registerMiss', () => {
  it('setzt die Serie zurueck und laesst die beste Serie stehen', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    registerHit(g, target())
    registerHit(g, target())
    registerMiss(g)
    expect(g.streak).toBe(0)
    expect(g.bestStreak).toBe(2)
  })

  it('zeigt einen Hinweis in der Bildmitte nur wenn einer uebergeben wurde', () => {
    const ohne = createGame(stubMode(), DEFAULT_SETTINGS)
    registerMiss(ohne)
    expect(ohne.fx).toHaveLength(0)

    const mit = createGame(stubMode(), DEFAULT_SETTINGS)
    registerMiss(mit, 'zu schnell')
    expect(mit.fx[0]).toEqual({ at: 'center', text: 'zu schnell', kind: 'bad' })
  })

  it('fordert den Fehlschuss-Ton an', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    registerMiss(g)
    expect(g.sounds).toContain('miss')
  })
})

describe('endGame', () => {
  it('markiert die Runde als beendet', () => {
    const g = createGame(stubMode(), DEFAULT_SETTINGS)
    endGame(g)
    expect(g.over).toBe(true)
  })
})
```

- [ ] **Step 2: Tests laufen lassen und Fehlschlag bestätigen**

Run: `pnpm test game`
Expected: FAIL mit `Failed to resolve import "./game"`.

- [ ] **Step 3: Rundenzustand implementieren**

Create `lib/engine/game.ts`:

```ts
import { basis, createCamera } from './camera'
import { createPlayer, movePlayer } from './movement'
import type { Fx, GameState, Input, ModeDef, Settings, SoundId, Target, Vec3 } from './types'

export const DEFAULT_SETTINGS: Settings = {
  sens: 0.22,
  dpi: 800,
  dur: 60,
  sizeMul: 1.0,
  weapon: 'vandal',
  sound: true,
}

/** Über dieser Zeit stammt ein Treffer aus einem verschleppten Ziel und verzerrt den Schnitt. */
const MAX_TTK_MS = 4000

export function createGame(
  mode: ModeDef,
  settings: Settings,
  dur = settings.dur,
  rng: () => number = Math.random,
): GameState {
  const g: GameState = {
    mode,
    dur,
    t: 0,
    left: dur,
    score: 0,
    hits: 0,
    shots: 0,
    streak: 0,
    bestStreak: 0,
    ttk: [],
    react: [],
    targets: [],
    holes: [],
    data: {},
    trackTime: 0,
    trackTotal: 0,
    over: false,
    cue: null,
    fx: [],
    sounds: [],
    player: createPlayer(),
    camera: createCamera(),
    settings,
    rng,
  }
  mode.start(g)
  return g
}

/** Ein Simulationsschritt. Nach dem Rundenende wirkungslos. */
export function tick(g: GameState, input: Input, dt: number): void {
  if (g.over) return
  g.t += dt
  g.left = Math.max(0, g.dur - g.t)
  basis(g.camera)
  if (g.mode.move) movePlayer(g.player, g.camera, input.keys, dt)
  g.mode.tick(g, input, dt)
  if (g.left <= 0) endGame(g)
}

/** Ein Schuss. Modi ohne `fire` werten über `tick` aus (Halten statt Klicken). */
export function fire(g: GameState): void {
  if (g.over) return
  g.mode.fire?.(g)
}

export function endGame(g: GameState): void {
  g.over = true
}

/** Hängt einen Ton an die Warteschlange. Die Ansicht spielt ihn ab und leert die Liste. */
export function play(g: GameState, id: SoundId): void {
  g.sounds.push(id)
}

/** Hängt ein Treffer-Feedback an. `at` ist eine Weltposition oder die Bildmitte. */
export function pushFx(g: GameState, at: Vec3 | 'center', text: string, kind: Fx['kind']): void {
  g.fx.push({ at, text, kind })
}

export function registerHit(g: GameState, t: Target, label = '+1'): void {
  g.hits++
  g.streak++
  g.bestStreak = Math.max(g.bestStreak, g.streak)
  const dt = (g.t - t.born) * 1000
  if (dt > 0 && dt < MAX_TTK_MS) g.ttk.push(dt)
  pushFx(g, { x: t.x, y: t.y, z: t.z }, label, 'good')
  play(g, 'hit')
}

export function registerMiss(g: GameState, label?: string): void {
  g.streak = 0
  if (label) pushFx(g, 'center', label, 'bad')
  play(g, 'miss')
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `pnpm test game`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/engine/game.ts lib/engine/game.test.ts
git commit -m "feat: Rundenzustand, Zeitschritt und Treffer-Buchhaltung"
```

---

### Task 8: Klick-Modi

**Files:**
- Create: `lib/engine/modes/gridshot.ts`
- Create: `lib/engine/modes/flick.ts`
- Create: `lib/engine/modes/micro.ts`
- Create: `lib/engine/modes/switching.ts`
- Create: `lib/engine/modes/clickModes.test.ts`

**Interfaces:**
- Consumes: `rayHitBest` aus `lib/engine/math.ts`; `registerHit`, `registerMiss`, `play` aus `lib/engine/game.ts`; `slotTarget`, `spawnAtAngle` aus `lib/engine/spawn.ts`; `avg`, `ms`, `pc`, `pcNum` aus `lib/engine/format.ts`
- Produces: `gridshot`, `flick`, `micro`, `switching` — je ein `ModeDef`

Alle Beschreibungs-, Hinweis- und Stat-Texte stammen wortgleich aus `reference/index.html`, Abschnitt `8 · Modi`. Sie sind Teil des Produkts, nicht Beiwerk — nicht umformulieren.

- [ ] **Step 1: Failing Tests schreiben**

Create `lib/engine/modes/clickModes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, createGame, fire } from '../game'
import { EYE } from '../movement'
import type { GameState, ModeDef, Target } from '../types'
import { flick } from './flick'
import { gridshot } from './gridshot'
import { micro } from './micro'
import { switching } from './switching'

/** Startet eine Runde mit festem Zufall. */
const start = (mode: ModeDef): GameState =>
  createGame(mode, DEFAULT_SETTINGS, 60, () => 0.5)

/** Legt ein einzelnes Ziel genau ins Fadenkreuz. Kamera zeigt bei yaw/pitch 0 entlang +z. */
function aimAt(g: GameState, over: Partial<Target> = {}) {
  const t: Target = { x: 0, y: EYE, z: 10, r: 0.5, dead: false, born: g.t, ...over }
  g.targets = [t]
  return t
}

describe('gridshot', () => {
  it('startet mit drei Zielen', () => {
    expect(start(gridshot).targets).toHaveLength(3)
  })

  it('zaehlt einen Treffer und ersetzt genau das getroffene Ziel', () => {
    const g = start(gridshot)
    const getroffen = aimAt(g)
    g.targets.push({ x: 20, y: EYE, z: 10, r: 0.4, dead: false, born: 0 })
    fire(g)
    expect(g.score).toBe(1)
    expect(g.hits).toBe(1)
    expect(g.shots).toBe(1)
    expect(g.targets).toHaveLength(2)
    expect(g.targets).not.toContain(getroffen)
  })

  it('zaehlt einen Fehlschuss ohne Punktabzug', () => {
    const g = start(gridshot)
    g.targets = [{ x: 30, y: EYE, z: 10, r: 0.4, dead: false, born: 0 }]
    fire(g)
    expect(g.score).toBe(0)
    expect(g.shots).toBe(1)
    expect(g.hits).toBe(0)
  })

  it('meldet Ziele pro Minute in den Stats', () => {
    const g = start(gridshot)
    g.score = 30
    expect(gridshot.stats(g)).toContainEqual(['Ziele/min', '30.0'])
  })
})

describe('flick', () => {
  it('haelt genau ein Ziel im Spiel', () => {
    const g = start(flick)
    expect(g.targets).toHaveLength(1)
    aimAt(g)
    fire(g)
    expect(g.targets).toHaveLength(1)
  })

  it('zieht bei einem Fehlschuss einen Punkt ab', () => {
    const g = start(flick)
    aimAt(g)
    fire(g)
    expect(g.score).toBe(1)
    g.targets = [{ x: 40, y: EYE, z: 10, r: 0.3, dead: false, born: g.t }]
    fire(g)
    expect(g.score).toBe(0)
  })

  it('faellt nicht unter null', () => {
    const g = start(flick)
    g.targets = [{ x: 40, y: EYE, z: 10, r: 0.3, dead: false, born: g.t }]
    fire(g)
    fire(g)
    expect(g.score).toBe(0)
  })
})

describe('micro', () => {
  it('nutzt kopfgrosse Ziele', () => {
    const g = start(micro)
    expect(g.targets[0].r).toBeCloseTo(0.13, 6)
  })

  it('fordert bei einem Treffer den Kopftreffer-Ton an', () => {
    const g = start(micro)
    aimAt(g)
    fire(g)
    expect(g.sounds).toContain('head')
    expect(g.fx[0].text).toBe('HS')
  })

  it('wertet die Accuracy als Metrik', () => {
    const g = start(micro)
    g.hits = 3
    g.shots = 4
    expect(micro.metric(g)).toBe(75)
  })
})

describe('switching', () => {
  it('stellt sechs Ziele auf', () => {
    expect(start(switching).targets).toHaveLength(6)
  })

  it('laesst getroffene Ziele stehen, aber tot', () => {
    const g = start(switching)
    const t = g.targets[0]
    t.x = 0
    t.y = EYE
    t.z = 10
    t.r = 0.5
    fire(g)
    expect(t.dead).toBe(true)
    expect(g.targets).toHaveLength(6)
    expect(g.score).toBe(1)
  })

  it('stellt einen neuen Satz auf sobald alle sechs liegen', () => {
    const g = start(switching)
    for (const t of g.targets) t.dead = true
    g.targets[0].dead = false
    g.targets[0].x = 0
    g.targets[0].y = EYE
    g.targets[0].z = 10
    g.targets[0].r = 0.5
    fire(g)
    expect(g.targets.every((t) => !t.dead)).toBe(true)
    expect(g.sounds).toContain('go')
  })

  it('misst die Zeit zwischen zwei Kills, nicht seit dem Erscheinen', () => {
    const g = start(switching)
    g.t = 2
    const t = g.targets[0]
    t.x = 0
    t.y = EYE
    t.z = 10
    t.r = 0.5
    fire(g)
    expect(g.ttk[0]).toBeCloseTo(2000, 6)
  })
})
```

- [ ] **Step 2: Tests laufen lassen und Fehlschlag bestätigen**

Run: `pnpm test clickModes`
Expected: FAIL mit `Failed to resolve import "./flick"`.

- [ ] **Step 3: Gridshot implementieren**

Create `lib/engine/modes/gridshot.ts`:

```ts
import { avg, ms, pc } from '../format'
import { registerHit, registerMiss } from '../game'
import { rayHitBest } from '../math'
import { slotTarget } from '../spawn'
import type { GameState, ModeDef, Target } from '../types'

const mk = (g: GameState): Target =>
  slotTarget(g, 0.42 * g.settings.sizeMul, 6.2, 0.9, 3.4, 17)

export const gridshot: ModeDef = {
  id: 'gridshot',
  name: 'Gridshot',
  cat: 'aim',
  skill: 'Klick-Tempo',
  core: true,
  desc: 'Drei Ziele gleichzeitig, sofortiger Respawn. Trainiert Klickgeschwindigkeit und Zielwechsel unter Zeitdruck.',
  hint: 'Linksklick trifft · Esc pausiert',
  metricName: 'Ziele',
  start(g) {
    g.targets = [mk(g), mk(g), mk(g)]
  },
  tick() {},
  fire(g) {
    g.shots++
    const t = rayHitBest(g.player, g.camera.F, g.targets)
    if (t) {
      registerHit(g, t)
      g.score++
      g.targets[g.targets.indexOf(t)] = mk(g)
    } else {
      registerMiss(g)
    }
  },
  stats: (g) => [
    ['Ziele', g.score],
    ['Accuracy', pc(g.hits, g.shots)],
    ['Ø TTK', ms(avg(g.ttk))],
    ['Beste Serie', g.bestStreak],
    ['Ziele/min', ((g.score / g.dur) * 60).toFixed(1)],
  ],
  metric: (g) => g.score,
}
```

- [ ] **Step 4: Flickshots implementieren**

Create `lib/engine/modes/flick.ts`:

```ts
import { avg, ms, pc } from '../format'
import { registerHit, registerMiss } from '../game'
import { rayHitBest } from '../math'
import { spawnAtAngle } from '../spawn'
import type { GameState, ModeDef, Target } from '../types'

const mk = (g: GameState): Target => spawnAtAngle(g, 12, 34, 16, 0.34 * g.settings.sizeMul)

export const flick: ModeDef = {
  id: 'flick',
  name: 'Flickshots',
  cat: 'aim',
  skill: 'Flick',
  core: true,
  desc: 'Ein Ziel, das jedes Mal 12–34° neben deiner Blickrichtung erscheint. Erzwingt echte Flicks statt Mikro-Korrekturen.',
  hint: 'Ein Schuss pro Ziel · Fehlschuss kostet Punkte',
  metricName: 'Score',
  start(g) {
    g.targets = [mk(g)]
  },
  tick() {},
  fire(g) {
    g.shots++
    const t = rayHitBest(g.player, g.camera.F, g.targets)
    if (t) {
      registerHit(g, t)
      g.score++
    } else {
      registerMiss(g)
      g.score = Math.max(0, g.score - 1)
    }
    g.targets = [mk(g)]
  },
  stats: (g) => [
    ['Score', g.score],
    ['Accuracy', pc(g.hits, g.shots)],
    ['Ø Flick-Zeit', ms(avg(g.ttk))],
    ['Beste Serie', g.bestStreak],
  ],
  metric: (g) => g.score,
}
```

- [ ] **Step 5: Micro-Flicks implementieren**

Create `lib/engine/modes/micro.ts`:

```ts
import { avg, ms, pc, pcNum } from '../format'
import { play, registerHit, registerMiss } from '../game'
import { rayHitBest } from '../math'
import { spawnAtAngle } from '../spawn'
import type { GameState, ModeDef, Target } from '../types'

const mk = (g: GameState): Target => spawnAtAngle(g, 2, 8, 15, 0.13 * g.settings.sizeMul)

export const micro: ModeDef = {
  id: 'micro',
  name: 'Micro-Flicks',
  cat: 'aim',
  skill: 'Präzision',
  desc: 'Kopfgroße Ziele, 2–8° Versatz. Das ist die Bewegung, die dir im Duell die Kopfhöhe rettet.',
  hint: 'Kleine Ziele · sauber statt schnell',
  metricName: 'Acc %',
  start(g) {
    g.targets = [mk(g)]
  },
  tick() {},
  fire(g) {
    g.shots++
    const t = rayHitBest(g.player, g.camera.F, g.targets)
    if (t) {
      registerHit(g, t, 'HS')
      play(g, 'head')
      g.score++
    } else {
      registerMiss(g)
    }
    g.targets = [mk(g)]
  },
  stats: (g) => [
    ['Treffer', g.score],
    ['Accuracy', pc(g.hits, g.shots)],
    ['Ø Zeit', ms(avg(g.ttk))],
    ['Beste Serie', g.bestStreak],
  ],
  metric: (g) => Math.round(pcNum(g.hits, g.shots)),
}
```

- [ ] **Step 6: Target Switching implementieren**

Create `lib/engine/modes/switching.ts`:

```ts
import { avg, ms, pc } from '../format'
import { play, pushFx, registerMiss } from '../game'
import { rayHitBest } from '../math'
import { slotTarget } from '../spawn'
import type { GameState, ModeDef } from '../types'

/** Stellt einen frischen Satz von sechs Zielen auf und startet die Zeitmessung neu. */
function newSet(g: GameState): void {
  g.targets = []
  for (let i = 0; i < 6; i++) {
    g.targets.push(slotTarget(g, 0.3 * g.settings.sizeMul, 5.0, 1.0, 3.2, 16))
  }
  g.data.setStart = g.t
}

export const switching: ModeDef = {
  id: 'switching',
  name: 'Target Switching',
  cat: 'aim',
  skill: 'Zielwechsel',
  desc: 'Sechs Ziele, alle müssen weg, dann kommt der nächste Satz. Misst die Zeit zwischen zwei Kills — genau das, was Multi-Kills entscheidet.',
  hint: 'Alle sechs Ziele leeren',
  metricName: 'Kills',
  start(g) {
    newSet(g)
  },
  tick() {},
  fire(g) {
    g.shots++
    const t = rayHitBest(g.player, g.camera.F, g.targets)
    if (!t) {
      registerMiss(g)
      return
    }
    t.dead = true
    g.hits++
    g.streak++
    g.bestStreak = Math.max(g.bestStreak, g.streak)
    g.score++
    // Gemessen wird der Abstand zum vorigen Kill, nicht die Standzeit des Ziels:
    // im Duell zählt genau diese Lücke zwischen zwei Gegnern.
    const last = g.data.lastKill ?? g.data.setStart
    g.ttk.push((g.t - last) * 1000)
    g.data.lastKill = g.t
    pushFx(g, { x: t.x, y: t.y, z: t.z }, '+1', 'good')
    play(g, 'hit')
    if (g.targets.every((x) => x.dead)) {
      newSet(g)
      g.data.lastKill = g.t
      play(g, 'go')
    }
  },
  stats: (g) => [
    ['Kills', g.score],
    ['Accuracy', pc(g.hits, g.shots)],
    ['Ø Wechsel', ms(avg(g.ttk))],
    ['Bester Wechsel', ms(Math.min(...(g.ttk.length ? g.ttk : [0])))],
  ],
  metric: (g) => g.score,
}
```

- [ ] **Step 7: Tests laufen lassen**

Run: `pnpm test clickModes`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/engine/modes
git commit -m "feat: Klick-Modi Gridshot, Flickshots, Micro-Flicks und Target Switching"
```

---

### Task 9: Tracking- und Reaktions-Modi

**Files:**
- Create: `lib/engine/modes/tracking.ts`
- Create: `lib/engine/modes/strafetrack.ts`
- Create: `lib/engine/modes/reaction.ts`
- Create: `lib/engine/modes/holdModes.test.ts`

**Interfaces:**
- Consumes: `rayHitBest` aus `lib/engine/math.ts`; `play`, `pushFx`, `registerMiss` aus `lib/engine/game.ts`; `spawnAtAngle` aus `lib/engine/spawn.ts`; `avg`, `ms`, `pc`, `pcNum` aus `lib/engine/format.ts`
- Produces: `tracking`, `strafetrack`, `reaction` — je ein `ModeDef`

Die beiden Tracking-Modi haben `hold: true` und **kein** `fire`. Sie werten in `tick` aus, solange `input.mouseDown` gilt: `trackTotal` zählt die Feuerzeit, `trackTime` davon den Anteil auf dem Ziel. Der Score ist `trackTime * 10`, gerundet.

Reaktion ist der einzige Modus, in dem ein Klick *vor* dem Erscheinen des Ziels bestraft wird — das ist der Kern der Übung, nicht ein Sonderfall.

- [ ] **Step 1: Failing Tests schreiben**

Create `lib/engine/modes/holdModes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, createGame, fire, tick } from '../game'
import { EYE } from '../movement'
import type { GameState, Input, ModeDef } from '../types'
import { reaction } from './reaction'
import { strafetrack } from './strafetrack'
import { tracking } from './tracking'

const holding: Input = { keys: {}, mouseDown: true }
const idle: Input = { keys: {}, mouseDown: false }

const start = (mode: ModeDef): GameState => createGame(mode, DEFAULT_SETTINGS, 60, () => 0.5)

/** Simuliert `seconds` mit festem Zeitschritt und friert das Ziel im Fadenkreuz ein. */
function trackFor(g: GameState, input: Input, seconds: number, frozen: boolean) {
  const step = 0.01
  for (let t = 0; t < seconds; t += step) {
    tick(g, input, step)
    if (frozen) {
      g.targets[0].x = 0
      g.targets[0].y = EYE
      g.targets[0].z = 10
      g.targets[0].r = 0.5
    }
  }
}

describe('tracking', () => {
  it('feuert durch Halten, nicht durch Klicken', () => {
    expect(tracking.hold).toBe(true)
    expect(tracking.fire).toBeUndefined()
  })

  it('zaehlt Feuerzeit nur bei gedrueckter Taste', () => {
    const g = start(tracking)
    trackFor(g, idle, 0.5, false)
    expect(g.trackTotal).toBe(0)
    trackFor(g, holding, 0.5, false)
    expect(g.trackTotal).toBeGreaterThan(0.4)
  })

  it('zaehlt Zeit auf dem Ziel und macht daraus den Score', () => {
    const g = start(tracking)
    trackFor(g, holding, 1, true)
    expect(g.trackTime).toBeGreaterThan(0.9)
    expect(g.score).toBe(Math.round(g.trackTime * 10))
  })

  it('zaehlt keine Zeit auf dem Ziel wenn das Fadenkreuz danebenliegt', () => {
    const g = start(tracking)
    const step = 0.01
    for (let t = 0; t < 1; t += step) {
      tick(g, holding, step)
      g.targets[0].x = 50
    }
    expect(g.trackTotal).toBeGreaterThan(0.9)
    expect(g.trackTime).toBe(0)
  })

  it('bewegt das Ziel ueber die Zeit', () => {
    const g = start(tracking)
    const x0 = g.targets[0].x
    trackFor(g, idle, 1, false)
    expect(g.targets[0].x).not.toBe(x0)
  })

  it('wertet den Anteil auf dem Ziel als Metrik', () => {
    const g = start(tracking)
    g.trackTime = 3
    g.trackTotal = 4
    expect(tracking.metric(g)).toBe(75)
  })
})

describe('strafetrack', () => {
  it('haelt das Ziel innerhalb der Range-Breite', () => {
    const g = start(strafetrack)
    trackFor(g, idle, 5, false)
    expect(Math.abs(g.targets[0].x)).toBeLessThanOrEqual(6.5)
  })

  it('laesst gesprungene Ziele wieder auf ihre Standhoehe fallen', () => {
    const g = start(strafetrack)
    const t = g.targets[0]
    t.vy = 3.6
    trackFor(g, idle, 2, false)
    expect(t.y).toBeCloseTo(t.base as number, 6)
    expect(t.vy).toBe(0)
  })

  it('wertet wie Smooth Tracking ueber gehaltene Taste', () => {
    expect(strafetrack.hold).toBe(true)
    const g = start(strafetrack)
    trackFor(g, holding, 1, true)
    expect(g.trackTime).toBeGreaterThan(0.9)
  })
})

describe('reaction', () => {
  it('startet ohne Ziel und unscharf', () => {
    const g = start(reaction)
    expect(g.targets).toHaveLength(0)
    expect(g.data.armed).toBe(false)
  })

  it('stellt nach Ablauf der Wartezeit ein Ziel auf und gibt das Signal', () => {
    const g = start(reaction)
    g.data.wait = 0.02
    tick(g, idle, 0.05)
    expect(g.data.armed).toBe(true)
    expect(g.targets).toHaveLength(1)
    expect(g.sounds).toContain('go')
  })

  it('wertet einen Klick vor dem Signal als Fehlstart', () => {
    const g = start(reaction)
    fire(g)
    expect(g.shots).toBe(1)
    expect(g.hits).toBe(0)
    expect(g.score).toBe(0)
    expect(g.sounds).toContain('bad')
    expect(g.fx[0].text).toBe('zu früh')
  })

  it('wuerfelt nach einem Fehlstart eine neue Wartezeit ohne scharf zu werden', () => {
    const g = start(reaction)
    g.data.wait = 0.01
    fire(g)
    expect(g.data.armed).toBe(false)
    expect(g.data.wait).toBeGreaterThan(0.5)
  })

  it('misst die Zeit zwischen Signal und Treffer', () => {
    const g = start(reaction)
    g.data.wait = 0.01
    tick(g, idle, 0.02)
    g.targets[0].x = 0
    g.targets[0].y = EYE
    g.targets[0].z = 10
    g.targets[0].r = 0.5
    g.t += 0.25
    fire(g)
    expect(g.react[0]).toBeCloseTo(250, 0)
    expect(g.score).toBe(1)
  })

  it('raeumt nach dem Schuss ab und wartet erneut', () => {
    const g = start(reaction)
    g.data.wait = 0.01
    tick(g, idle, 0.02)
    fire(g)
    expect(g.targets).toHaveLength(0)
    expect(g.data.armed).toBe(false)
  })

  it('wertet die mittlere Reaktionszeit als Metrik, kleiner ist besser', () => {
    expect(reaction.lowerBetter).toBe(true)
    const g = start(reaction)
    g.react = [200, 300]
    expect(reaction.metric(g)).toBe(250)
  })

  it('liefert ohne Messung einen Wert, der jeden Bestwert verliert', () => {
    expect(reaction.metric(start(reaction))).toBe(9999)
  })
})
```

- [ ] **Step 2: Tests laufen lassen und Fehlschlag bestätigen**

Run: `pnpm test holdModes`
Expected: FAIL mit `Failed to resolve import "./reaction"`.

- [ ] **Step 3: Smooth Tracking implementieren**

Create `lib/engine/modes/tracking.ts`:

```ts
import { pcNum } from '../format'
import { rayHitBest } from '../math'
import type { ModeDef } from '../types'

export const tracking: ModeDef = {
  id: 'tracking',
  name: 'Smooth Tracking',
  cat: 'aim',
  skill: 'Tracking',
  desc: 'Ein Ziel auf weicher Bahn. Halte die Maustaste gedrückt und bleib drauf — gewertet wird der Anteil der Zeit auf dem Ziel.',
  hint: 'Maustaste halten und dranbleiben',
  hold: true,
  metricName: 'On-Target %',
  start(g) {
    g.targets = [{ x: 0, y: 1.75, z: 12, r: 0.42 * g.settings.sizeMul, dead: false, born: 0, ph: 0 }]
  },
  tick(g, input, dt) {
    const t = g.targets[0]
    // Drei überlagerte Sinusse: die Bahn wiederholt sich nicht sichtbar,
    // bleibt aber weich genug, dass Führen statt Nachziehen belohnt wird.
    t.ph = (t.ph ?? 0) + dt
    t.x = Math.sin(t.ph * 0.85) * 5.2 + Math.sin(t.ph * 1.9) * 1.4
    t.y = 1.75 + Math.sin(t.ph * 1.35) * 0.55
    t.z = 12 + Math.sin(t.ph * 0.55) * 2.2
    if (input.mouseDown) {
      g.trackTotal += dt
      if (rayHitBest(g.player, g.camera.F, g.targets)) {
        g.trackTime += dt
        g.score = Math.round(g.trackTime * 10)
      }
    }
  },
  stats: (g) => [
    ['Zeit auf Ziel', `${g.trackTime.toFixed(1)} s`],
    ['Trefferquote', `${pcNum(g.trackTime, g.trackTotal).toFixed(0)} %`],
    ['Feuerzeit', `${g.trackTotal.toFixed(1)} s`],
  ],
  metric: (g) => Math.round(pcNum(g.trackTime, g.trackTotal)),
}
```

- [ ] **Step 4: Strafe Tracking implementieren**

Create `lib/engine/modes/strafetrack.ts`:

```ts
import { pcNum } from '../format'
import { rayHitBest } from '../math'
import type { ModeDef } from '../types'

const LIMIT_X = 6.5
const GRAVITY = 9.8

export const strafetrack: ModeDef = {
  id: 'strafetrack',
  name: 'Strafe Tracking',
  cat: 'aim',
  skill: 'Tracking',
  core: true,
  desc: 'Das Ziel strafed wie ein echter Gegner: harte Richtungswechsel, wechselndes Tempo, gelegentliche Sprünge. Der realistischste Aim-Modus hier.',
  hint: 'Maustaste halten · Richtungswechsel lesen, nicht raten',
  hold: true,
  metricName: 'On-Target %',
  start(g) {
    g.targets = [{
      x: 0, y: 1.7, z: 13, r: 0.4 * g.settings.sizeMul, dead: false, born: 0,
      dir: 1, spd: 4.2, next: 0, vy: 0, base: 1.7,
    }]
  },
  tick(g, input, dt) {
    const t = g.targets[0]
    t.next = (t.next ?? 0) - dt
    if (t.next <= 0) {
      // Richtung, Tempo und Dauer neu würfeln — das macht die Bewegung
      // unvorhersehbar, ohne sie unfair ruckartig werden zu lassen.
      t.dir = g.rng() < 0.5 ? -1 : 1
      t.spd = 3.2 + g.rng() * 3.6
      t.next = 0.22 + g.rng() * 0.75
      if (g.rng() < 0.22 && t.y <= (t.base as number) + 0.01) t.vy = 3.6
    }
    t.x += (t.dir as number) * (t.spd as number) * dt
    if (t.x > LIMIT_X) { t.x = LIMIT_X; t.dir = -1 }
    if (t.x < -LIMIT_X) { t.x = -LIMIT_X; t.dir = 1 }
    t.vy = (t.vy ?? 0) - GRAVITY * dt
    t.y += t.vy * dt
    if (t.y < (t.base as number)) { t.y = t.base as number; t.vy = 0 }
    if (input.mouseDown) {
      g.trackTotal += dt
      if (rayHitBest(g.player, g.camera.F, g.targets)) {
        g.trackTime += dt
        g.score = Math.round(g.trackTime * 10)
      }
    }
  },
  stats: (g) => [
    ['Zeit auf Ziel', `${g.trackTime.toFixed(1)} s`],
    ['Trefferquote', `${pcNum(g.trackTime, g.trackTotal).toFixed(0)} %`],
    ['Feuerzeit', `${g.trackTotal.toFixed(1)} s`],
  ],
  metric: (g) => Math.round(pcNum(g.trackTime, g.trackTotal)),
}
```

- [ ] **Step 5: Reaktion implementieren**

Create `lib/engine/modes/reaction.ts`:

```ts
import { avg, ms, pc } from '../format'
import { play, pushFx, registerMiss } from '../game'
import { rayHitBest } from '../math'
import { spawnAtAngle } from '../spawn'
import type { GameState, ModeDef } from '../types'

/** Neue Wartezeit bis zum Signal. Der Bereich verhindert, dass man den Takt lernt. */
const nextWait = (g: GameState) => 0.7 + g.rng() * 2.1

export const reaction: ModeDef = {
  id: 'reaction',
  name: 'Reaktion',
  cat: 'aim',
  skill: 'Reflex',
  desc: 'Ein Ziel erscheint nach zufälliger Wartezeit. Schieß so schnell wie möglich. Zu früh geklickt zählt als Fehlstart.',
  hint: 'Warten · dann sofort schießen',
  extraLabel: 'Ø ms',
  lowerBetter: true,
  metricName: 'Ø ms',
  start(g) {
    g.targets = []
    g.data.wait = 0.8 + g.rng() * 2.2
    g.data.armed = false
  },
  tick(g, _input, dt) {
    if (g.data.armed) return
    g.data.wait -= dt
    if (g.data.wait > 0) return
    g.data.armed = true
    g.data.at = g.t
    g.targets = [spawnAtAngle(g, 3, 14, 15, 0.3 * g.settings.sizeMul)]
    play(g, 'go')
  },
  fire(g) {
    if (!g.data.armed) {
      g.shots++
      registerMiss(g, 'zu früh')
      g.score = Math.max(0, g.score - 1)
      play(g, 'bad')
      g.data.wait = 0.8 + g.rng() * 2.2
      return
    }
    g.shots++
    const t = rayHitBest(g.player, g.camera.F, g.targets)
    if (t) {
      const rt = (g.t - g.data.at) * 1000
      g.react.push(rt)
      g.hits++
      g.streak++
      g.bestStreak = Math.max(g.bestStreak, g.streak)
      g.score++
      pushFx(g, { x: t.x, y: t.y, z: t.z }, `${Math.round(rt)} ms`, 'good')
      play(g, 'hit')
    } else {
      registerMiss(g)
    }
    g.targets = []
    g.data.armed = false
    g.data.wait = nextWait(g)
  },
  hudExtra: (g) => (g.react.length ? Math.round(avg(g.react)) : '–'),
  stats: (g) => [
    ['Ø Reaktion', ms(avg(g.react))],
    ['Beste', ms(Math.min(...(g.react.length ? g.react : [0])))],
    ['Treffer', g.hits],
    ['Accuracy', pc(g.hits, g.shots)],
  ],
  // 9999 statt 0: ohne Messung darf der Lauf keinen Bestwert setzen.
  metric: (g) => (g.react.length ? Math.round(avg(g.react)) : 9999),
}
```

- [ ] **Step 6: Tests laufen lassen**

Run: `pnpm test holdModes`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/engine/modes
git commit -m "feat: Tracking-Modi und Reaktion"
```

---

### Task 10: Spray Control

**Files:**
- Create: `lib/engine/modes/spray.ts`
- Create: `lib/engine/modes/spray.test.ts`

**Interfaces:**
- Consumes: `WEAPONS` aus `lib/engine/weapons.ts`; `DEG`, `dirFrom` aus `lib/engine/math.ts`; `play`, `pushFx` aus `lib/engine/game.ts`; `avg` aus `lib/engine/format.ts`
- Produces:
  - `spray: ModeDef`
  - `SPRAY_WALL_Z = 15`, `SPRAY_AIM = { x: 0, y: 1.75 }`, `SPRAY_RADIUS = 0.25`
  - `grouping(distances: number[]): number` — Anteil der Einschläge innerhalb `SPRAY_RADIUS`, in Prozent

`grouping` steht bewusst als eigene, exportierte Funktion da: sie ist die einzige echte Rechnung des Modus und lässt sich so direkt prüfen, ohne ein Magazin simulieren zu müssen.

Der Modus feuert nicht über `fire`, sondern in `tick`, solange `input.mouseDown` gilt und Munition da ist. Nach dem letzten Schuss wird die Gruppierung gewertet und nach 1,6 Sekunden automatisch nachgeladen. `R` löst über `reload` ein vorzeitiges Nachladen aus.

- [ ] **Step 1: Failing Tests schreiben**

Create `lib/engine/modes/spray.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, createGame, tick } from '../game'
import { WEAPONS } from '../weapons'
import type { GameState, Input } from '../types'
import { SPRAY_AIM, SPRAY_RADIUS, SPRAY_WALL_Z, grouping, spray } from './spray'

const holding: Input = { keys: {}, mouseDown: true }
const idle: Input = { keys: {}, mouseDown: false }

const start = (): GameState => createGame(spray, DEFAULT_SETTINGS, 60, () => 0.5)

/** Simuliert `seconds` in Schritten von 10 ms. */
function run(g: GameState, input: Input, seconds: number) {
  const step = 0.01
  for (let t = 0; t < seconds; t += step) tick(g, input, step)
}

describe('grouping', () => {
  it('wertet alle Einschlaege im Kreis als hundert Prozent', () => {
    expect(grouping([0.0, 0.1, 0.2])).toBe(100)
  })

  it('wertet alle Einschlaege ausserhalb als null', () => {
    expect(grouping([0.3, 0.5])).toBe(0)
  })

  it('rundet den Anteil kaufmaennisch', () => {
    expect(grouping([0.1, 0.1, 0.5])).toBe(67)
  })

  it('liefert null fuer eine leere Liste', () => {
    expect(grouping([])).toBe(0)
  })

  it('zaehlt genau auf dem Radius nicht mehr mit', () => {
    expect(grouping([SPRAY_RADIUS])).toBe(0)
  })
})

describe('spray', () => {
  it('startet mit vollem Magazin und ohne Einschlaege', () => {
    const g = start()
    expect(g.data.ammo).toBe(WEAPONS.vandal.mag)
    expect(g.holes).toHaveLength(0)
  })

  it('feuert nur bei gedrueckter Taste', () => {
    const g = start()
    run(g, idle, 1)
    expect(g.shots).toBe(0)
  })

  it('leert das Magazin in der erwarteten Zeit', () => {
    const g = start()
    const w = WEAPONS.vandal
    run(g, holding, w.mag / w.rps + 0.2)
    expect(g.shots).toBe(w.mag)
    expect(g.holes).toHaveLength(w.mag)
  })

  it('wertet nach dem letzten Schuss ein Magazin aus', () => {
    const g = start()
    const w = WEAPONS.vandal
    run(g, holding, w.mag / w.rps + 0.2)
    expect(g.data.sprays).toHaveLength(1)
    expect(g.score).toBe(g.data.sprays[0].score)
  })

  it('legt die Einschlaege auf die Wandebene', () => {
    const g = start()
    run(g, holding, 0.5)
    expect(g.holes.length).toBeGreaterThan(0)
    expect(SPRAY_WALL_Z).toBe(15)
  })

  it('trifft mit dem ersten Schuss nahe am Zielpunkt', () => {
    const g = start()
    // Fadenkreuz auf den Zielpunkt der Wand legen.
    g.camera.pitch = Math.atan2(SPRAY_AIM.y - g.player.y, SPRAY_WALL_Z - g.player.z)
    run(g, holding, 0.01)
    expect(g.holes[0].d).toBeLessThan(0.2)
  })

  it('laedt nach dem leeren Magazin automatisch nach', () => {
    const g = start()
    const w = WEAPONS.vandal
    run(g, holding, w.mag / w.rps + 0.2)
    run(g, idle, 2)
    expect(g.data.ammo).toBe(w.mag)
    expect(g.holes).toHaveLength(0)
  })

  it('setzt beim manuellen Nachladen Magazin, Muster und Wand zurueck', () => {
    const g = start()
    run(g, holding, 0.5)
    expect(g.shots).toBeGreaterThan(0)
    spray.reload?.(g)
    expect(g.data.ammo).toBe(WEAPONS.vandal.mag)
    expect(g.data.idx).toBe(0)
    expect(g.holes).toHaveLength(0)
  })

  it('erholt sich vom Rueckstoss wenn die Taste losgelassen wird', () => {
    const g = start()
    run(g, holding, 0.5)
    const idxNachFeuern = g.data.idx
    expect(idxNachFeuern).toBeGreaterThan(0)
    run(g, idle, 1)
    expect(g.data.idx).toBe(0)
  })

  it('mittelt den Score ueber alle Magazine', () => {
    const g = start()
    g.data.sprays = [{ score: 40, avg: 0.3 }, { score: 80, avg: 0.1 }]
    expect(spray.stats(g)[0]).toEqual(['Ø Gruppierung', '60 %'])
  })
})
```

- [ ] **Step 2: Tests laufen lassen und Fehlschlag bestätigen**

Run: `pnpm test spray`
Expected: FAIL mit `Failed to resolve import "./spray"`.

- [ ] **Step 3: Spray Control implementieren**

Create `lib/engine/modes/spray.ts`:

```ts
import { avg } from '../format'
import { play, pushFx } from '../game'
import { DEG, dirFrom } from '../math'
import { WEAPONS } from '../weapons'
import type { GameState, ModeDef } from '../types'

/** Entfernung der Wand in Metern. */
export const SPRAY_WALL_Z = 15
/** Zielpunkt auf der Wand. */
export const SPRAY_AIM = { x: 0, y: 1.75 }
/** Innerhalb dieses Radius zählt ein Einschlag als sitzend. */
export const SPRAY_RADIUS = 0.25
/** Ab diesem Wert gilt ein Magazin als gut kontrolliert. */
const GOOD_SCORE = 70
/** Sekunden bis zum automatischen Nachladen. */
const RELOAD_DELAY = 1.6
/** Musterschritte pro Sekunde, um die sich der Rückstoß erholt. */
const RECOVERY_RATE = 14
/** Zufällige Streuung pro Schuss in Grad — ohne sie wäre das Muster auswendig lernbar. */
const JITTER_DEG = 0.30
/** So viele Einschläge bleiben höchstens sichtbar. */
const MAX_HOLES = 120

/** Anteil der Einschläge innerhalb des Kreises, in Prozent. */
export function grouping(distances: number[]): number {
  if (!distances.length) return 0
  const inside = distances.filter((d) => d < SPRAY_RADIUS).length
  return Math.round((inside / distances.length) * 100)
}

/** Wertet das geleerte Magazin und stößt das Nachladen an. */
function finish(g: GameState): void {
  const cur: number[] = g.data.cur
  if (!cur.length) return
  const score = grouping(cur)
  g.data.sprays.push({ score, avg: avg(cur) })
  g.data.reloadAt = g.t + RELOAD_DELAY
  g.hits += cur.filter((d) => d < SPRAY_RADIUS).length
  g.score = Math.round(avg(g.data.sprays.map((s: { score: number }) => s.score)))
  pushFx(g, 'center', `${score} %`, score >= GOOD_SCORE ? 'good' : 'warn')
  play(g, score >= GOOD_SCORE ? 'go' : 'tick')
}

export const spray: ModeDef = {
  id: 'spray',
  name: 'Spray Control',
  cat: 'spray',
  skill: 'Recoil',
  core: true,
  desc: 'Volles Magazin auf eine Wand, 15 m. Das Muster ist dem echten nachempfunden — gewertet wird, wie eng deine Einschläge um den Punkt liegen.',
  hint: 'Maustaste halten · Rückstoß nach unten ausgleichen · R lädt nach',
  hold: true,
  ammoHud: true,
  extraLabel: 'Sprays',
  metricName: 'Ø %',
  start(g) {
    g.holes = []
    g.targets = []
    g.data.idx = 0
    g.data.next = 0
    g.data.sprays = []
    g.data.cur = []
    g.data.reloadAt = 0
    g.data.ammo = WEAPONS[g.settings.weapon].mag
  },
  tick(g, input, dt) {
    const w = WEAPONS[g.settings.weapon]
    if (g.data.reloadAt && g.t >= g.data.reloadAt) {
      g.data.reloadAt = 0
      spray.reload?.(g)
    }

    if (!input.mouseDown || g.data.ammo <= 0) {
      // Ohne Feuer läuft das Muster zurück an den Anfang.
      g.data.next = 0
      g.data.idx = Math.max(0, g.data.idx - dt * RECOVERY_RATE)
      if (g.data.idx < 0.5) g.data.idx = 0
      g.data.idx = Math.round(g.data.idx)
      return
    }

    g.data.next -= dt
    if (g.data.next > 0) return
    g.data.next = 1 / w.rps

    const p = w.pat[Math.min(g.data.idx, w.pat.length - 1)]
    const jx = (g.rng() - 0.5) * JITTER_DEG
    const jy = (g.rng() - 0.5) * JITTER_DEG
    const d = dirFrom(g.camera.yaw + (p[0] + jx) * DEG, g.camera.pitch + (p[1] + jy) * DEG)
    const tt = (SPRAY_WALL_Z - g.player.z) / d.z
    if (tt > 0) {
      const ix = g.player.x + d.x * tt
      const iy = g.player.y + d.y * tt
      const dist = Math.hypot(ix - SPRAY_AIM.x, iy - SPRAY_AIM.y)
      g.holes.push({ x: ix, y: iy, d: dist })
      g.data.cur.push(dist)
      if (g.holes.length > MAX_HOLES) g.holes.shift()
    }
    g.data.idx++
    g.data.ammo--
    g.shots++
    play(g, 'shot')
    if (g.data.ammo <= 0) finish(g)
  },
  reload(g) {
    g.data.ammo = WEAPONS[g.settings.weapon].mag
    g.data.idx = 0
    g.data.cur = []
    g.holes = []
    play(g, 'tick')
  },
  hudExtra: (g) => g.data.sprays.length,
  stats(g) {
    const all: number[] = g.data.sprays.map((s: { score: number }) => s.score)
    const spread: number[] = g.data.sprays.map((s: { avg: number }) => s.avg)
    return [
      ['Ø Gruppierung', `${all.length ? Math.round(avg(all)) : 0} %`],
      ['Bester Spray', `${all.length ? Math.max(...all) : 0} %`],
      ['Ø Abweichung', `${g.holes.length ? (avg(spread) * 100).toFixed(1) : '0'} cm`],
      ['Magazine', g.data.sprays.length],
    ]
  },
  metric: (g) => g.score,
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `pnpm test spray`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/engine/modes/spray.ts lib/engine/modes/spray.test.ts
git commit -m "feat: Spray Control mit Gruppierungswertung"
```

---

### Task 11: Movement-Modi

**Files:**
- Create: `lib/engine/modes/counterstrafe.ts`
- Create: `lib/engine/modes/peek.ts`
- Create: `lib/engine/modes/strafeshoot.ts`
- Create: `lib/engine/modes/moveModes.test.ts`

**Interfaces:**
- Consumes: `rayHitBest`, `segCross`, `speed` aus `lib/engine/math.ts`; `play`, `pushFx`, `registerMiss` aus `lib/engine/game.ts`; `slotTarget`, `spawnAtAngle` aus `lib/engine/spawn.ts`; `avg`, `ms`, `pc` aus `lib/engine/format.ts`
- Produces:
  - `counterstrafe`, `peek`, `strafeshoot` — je ein `ModeDef` mit `move: true`
  - `SHOOT_SPEED = 1.0` — bis zu diesem Tempo gilt ein Schuss als aus dem Stand
  - `PEEK_COVER = { z: 6, x1: -14, x2: 1.2, h: 3.4 }`
  - `PEEK_REACTION = 0.32` — Sekunden Sichtkontakt, bis der Gegner zurückschießt
  - `visible(g: GameState): boolean` — aus `peek.ts` exportiert, für Tests und für die Ansicht

Diese drei Modi sind der Grund, warum die Bewegungsphysik überhaupt in der Engine liegt. `SHOOT_SPEED` ist die Schwelle, an der die gesamte Counterstrafe-Übung hängt — sie steht als benannte Konstante da und nicht als `1.0` an vier Stellen.

Peek nutzt `segCross`: die Sichtlinie zwischen Spieler und Gegner wird gegen die Deckungskante geprüft. Kreuzt sie die Kante, steht der Spieler in Deckung. Das ist eine reine Draufsicht-Rechnung ohne Höhe — für eine mannshohe Deckung genügt das.

- [ ] **Step 1: Failing Tests schreiben**

Create `lib/engine/modes/moveModes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, createGame, fire, tick } from '../game'
import { EYE } from '../movement'
import type { GameState, Input, ModeDef, Target } from '../types'
import { SHOOT_SPEED, counterstrafe } from './counterstrafe'
import { PEEK_COVER, PEEK_REACTION, peek, visible } from './peek'
import { strafeshoot } from './strafeshoot'

const idle: Input = { keys: {}, mouseDown: false }

const start = (mode: ModeDef): GameState => createGame(mode, DEFAULT_SETTINGS, 60, () => 0.5)

function run(g: GameState, input: Input, seconds: number) {
  const step = 0.01
  for (let t = 0; t < seconds; t += step) tick(g, input, step)
}

/** Legt ein Ziel genau ins Fadenkreuz. */
function aimAt(g: GameState): Target {
  const t: Target = { x: g.player.x, y: EYE, z: g.player.z + 10, r: 0.5, dead: false, born: g.t }
  g.targets = [t]
  return t
}

describe('counterstrafe', () => {
  it('bewegt den Spieler und blendet die Messbalken ein', () => {
    expect(counterstrafe.move).toBe(true)
    expect(counterstrafe.meters).toBe(true)
  })

  it('startet in der Strafe-Phase ohne Ziel und zeigt die Richtung an', () => {
    const g = start(counterstrafe)
    expect(g.data.phase).toBe('strafe')
    expect(g.targets).toHaveLength(0)
    run(g, idle, 0.05)
    expect(g.cue).toBeTruthy()
  })

  it('stellt ein Ziel auf sobald lange genug in die richtige Richtung gestrafed wurde', () => {
    const g = start(counterstrafe)
    const richtung = g.data.dir > 0 ? 'KeyD' : 'KeyA'
    run(g, { keys: { [richtung]: true }, mouseDown: false }, 1)
    expect(g.data.phase).toBe('shoot')
    expect(g.targets).toHaveLength(1)
    expect(g.sounds).toContain('go')
  })

  it('reagiert nicht auf Strafen in die falsche Richtung', () => {
    const g = start(counterstrafe)
    const falsch = g.data.dir > 0 ? 'KeyA' : 'KeyD'
    run(g, { keys: { [falsch]: true }, mouseDown: false }, 1)
    expect(g.data.phase).toBe('strafe')
  })

  it('wertet einen Schuss vor dem Signal als Fehlschuss', () => {
    const g = start(counterstrafe)
    fire(g)
    expect(g.shots).toBe(1)
    expect(g.hits).toBe(0)
    expect(g.fx[0].text).toBe('noch nicht')
  })

  it('verwirft einen Treffer, der in voller Bewegung faellt', () => {
    const g = start(counterstrafe)
    const richtung = g.data.dir > 0 ? 'KeyD' : 'KeyA'
    run(g, { keys: { [richtung]: true }, mouseDown: false }, 1)
    aimAt(g)
    fire(g)
    expect(g.score).toBe(0)
    expect(g.fx.at(-1)?.text).toBe('zu schnell')
    expect(g.sounds).toContain('bad')
  })

  it('wertet einen Treffer aus dem Stand', () => {
    const g = start(counterstrafe)
    const richtung = g.data.dir > 0 ? 'KeyD' : 'KeyA'
    run(g, { keys: { [richtung]: true }, mouseDown: false }, 1)
    g.player.vx = 0
    g.player.vz = 0
    aimAt(g)
    fire(g)
    expect(g.score).toBe(1)
    expect(g.hits).toBe(1)
  })

  it('kehrt nach dem Schuss in die Strafe-Phase zurueck', () => {
    const g = start(counterstrafe)
    const richtung = g.data.dir > 0 ? 'KeyD' : 'KeyA'
    run(g, { keys: { [richtung]: true }, mouseDown: false }, 1)
    fire(g)
    expect(g.data.phase).toBe('strafe')
    expect(g.targets).toHaveLength(0)
  })

  it('zieht die Grenze fuer einen sauberen Schuss bei 1 m/s', () => {
    expect(SHOOT_SPEED).toBe(1.0)
  })

  it('meldet die Stand-Quote in den Stats', () => {
    const g = start(counterstrafe)
    g.data.speeds = [0.2, 0.5, 4.0, 0.1]
    expect(counterstrafe.stats(g)).toContainEqual(['Stand-Quote', '75 %'])
  })
})

describe('peek', () => {
  it('verdeckt den Gegner solange der Spieler hinter der Deckung steht', () => {
    const g = start(peek)
    g.player.x = -5
    g.player.z = 0
    expect(visible(g)).toBe(false)
  })

  it('gibt den Gegner frei sobald der Spieler an der Kante vorbei ist', () => {
    const g = start(peek)
    g.player.x = PEEK_COVER.x2 + 2
    g.player.z = 0
    expect(visible(g)).toBe(true)
  })

  it('markiert verdeckte Gegner als versteckt und damit als untreffbar', () => {
    const g = start(peek)
    g.player.x = -5
    run(g, idle, 0.05)
    expect(g.data.enemy.hidden).toBe(true)
    fire(g)
    expect(g.hits).toBe(0)
  })

  it('laesst den Gegner nach der Reaktionszeit zurueckschiessen', () => {
    const g = start(peek)
    g.player.x = PEEK_COVER.x2 + 2
    run(g, idle, PEEK_REACTION + 0.1)
    expect(g.data.deaths).toBe(1)
    expect(g.sounds).toContain('bad')
    expect(g.fx.some((f) => f.text === 'ERWISCHT')).toBe(true)
  })

  it('wertet einen Kill und merkt sich die Zeit im Freien', () => {
    const g = start(peek)
    g.player.x = PEEK_COVER.x2 + 2
    run(g, idle, 0.1)
    g.data.enemy.x = g.player.x
    g.data.enemy.y = EYE
    g.data.enemy.z = g.player.z + 10
    g.data.enemy.r = 0.5
    fire(g)
    expect(g.score).toBe(1)
    expect(g.data.exposures).toHaveLength(1)
    expect(g.data.exposures[0]).toBeGreaterThan(0)
  })

  it('verwirft einen Treffer aus voller Bewegung', () => {
    const g = start(peek)
    g.player.x = PEEK_COVER.x2 + 2
    g.player.vx = 5
    run(g, idle, 0.1)
    g.data.enemy.x = g.player.x
    g.data.enemy.y = EYE
    g.data.enemy.z = g.player.z + 10
    g.data.enemy.r = 0.5
    g.player.vx = 5
    fire(g)
    expect(g.score).toBe(0)
    expect(g.fx.at(-1)?.text).toBe('zu schnell')
  })
})

describe('strafeshoot', () => {
  it('haelt immer genau ein Ziel bereit', () => {
    expect(start(strafeshoot).targets).toHaveLength(1)
  })

  it('wertet einen Treffer aus dem Stand und stellt ein neues Ziel auf', () => {
    const g = start(strafeshoot)
    const alt = aimAt(g)
    fire(g)
    expect(g.score).toBe(1)
    expect(g.targets[0]).not.toBe(alt)
  })

  it('verwirft einen Treffer in Bewegung ohne neues Ziel aufzustellen', () => {
    const g = start(strafeshoot)
    const t = aimAt(g)
    g.player.vx = 5
    fire(g)
    expect(g.score).toBe(0)
    expect(g.targets[0]).toBe(t)
    expect(g.fx.at(-1)?.text).toBe('zu schnell')
  })

  it('zeigt die Stand-Quote im HUD', () => {
    const g = start(strafeshoot)
    g.data.speeds = [0.1, 0.2, 5.0, 0.3]
    expect(strafeshoot.hudExtra?.(g)).toBe('75%')
  })
})
```

- [ ] **Step 2: Tests laufen lassen und Fehlschlag bestätigen**

Run: `pnpm test moveModes`
Expected: FAIL mit `Failed to resolve import "./counterstrafe"`.

- [ ] **Step 3: Counterstrafe implementieren**

Create `lib/engine/modes/counterstrafe.ts`:

```ts
import { avg, ms, pc } from '../format'
import { play, pushFx, registerMiss } from '../game'
import { rayHitBest, speed } from '../math'
import { spawnAtAngle } from '../spawn'
import type { GameState, ModeDef } from '../types'

/** Bis zu diesem Tempo gilt ein Schuss als aus dem Stand abgegeben. */
export const SHOOT_SPEED = 1.0
/** Ab diesem Tempo zählt die Strafe-Bewegung als ernsthaft. */
const STRAFE_SPEED = 4.5
/** So lange muss sie gehalten werden, bevor das Ziel erscheint. */
const STRAFE_HOLD = 0.25

export const counterstrafe: ModeDef = {
  id: 'counterstrafe',
  name: 'Counterstrafe',
  cat: 'move',
  skill: 'Movement',
  core: true,
  meters: true,
  move: true,
  desc: 'Der Pfeil sagt, wohin du strafen musst. Sobald das Ziel erscheint: gegentippen, warten bis du wirklich steht, schießen. Schüsse über 1,0 m/s zählen als Miss.',
  hint: 'A / D strafen · Gegenrichtung tippen · erst schießen wenn der Balken grün ist',
  extraLabel: 'Ø Zeit',
  metricName: 'Kills',
  start(g) {
    g.data.phase = 'strafe'
    g.data.dir = g.rng() < 0.5 ? -1 : 1
    g.data.hold = 0
    g.data.speeds = []
    g.targets = []
  },
  tick(g, input, dt) {
    if (g.data.phase !== 'strafe') {
      g.cue = null
      return
    }
    g.cue = g.data.dir < 0 ? '◀  A  strafen' : 'strafen  D  ▶'
    const richtig = (g.data.dir < 0 && input.keys.KeyA) || (g.data.dir > 0 && input.keys.KeyD)
    g.data.hold = richtig && speed(g.player) > STRAFE_SPEED ? g.data.hold + dt : 0
    if (g.data.hold <= STRAFE_HOLD) return
    g.data.phase = 'shoot'
    g.data.at = g.t
    g.targets = [spawnAtAngle(g, 4, 16, 15, 0.32 * g.settings.sizeMul)]
    play(g, 'go')
  },
  fire(g) {
    if (g.data.phase !== 'shoot') {
      g.shots++
      registerMiss(g, 'noch nicht')
      return
    }
    g.shots++
    const sp = speed(g.player)
    g.data.speeds.push(sp)
    const t = rayHitBest(g.player, g.camera.F, g.targets)
    if (t && sp <= SHOOT_SPEED) {
      const rt = (g.t - g.data.at) * 1000
      g.ttk.push(rt)
      g.hits++
      g.score++
      g.streak++
      g.bestStreak = Math.max(g.bestStreak, g.streak)
      pushFx(g, { x: t.x, y: t.y, z: t.z }, `${Math.round(rt)} ms`, 'good')
      play(g, 'hit')
    } else if (t) {
      registerMiss(g, 'zu schnell')
      play(g, 'bad')
    } else {
      registerMiss(g)
    }
    g.targets = []
    g.data.phase = 'strafe'
    g.data.hold = 0
    g.data.dir = g.rng() < 0.5 ? -1 : 1
  },
  hudExtra: (g) => (g.ttk.length ? `${Math.round(avg(g.ttk))}ms` : '–'),
  stats(g) {
    const speeds: number[] = g.data.speeds
    const sauber = speeds.filter((s) => s <= SHOOT_SPEED).length
    return [
      ['Saubere Kills', g.score],
      ['Accuracy', pc(g.hits, g.shots)],
      ['Ø Stop→Schuss', ms(avg(g.ttk))],
      ['Stand-Quote', `${speeds.length ? Math.round((sauber / speeds.length) * 100) : 0} %`],
      ['Ø Tempo b. Schuss', `${speeds.length ? avg(speeds).toFixed(2) : '0.00'} m/s`],
    ]
  },
  metric: (g) => g.score,
}
```

- [ ] **Step 4: One-and-Done Peek implementieren**

Create `lib/engine/modes/peek.ts`:

```ts
import { avg, ms, pc } from '../format'
import { play, pushFx, registerMiss } from '../game'
import { rayHitBest, segCross, speed } from '../math'
import type { GameState, ModeDef } from '../types'

/** Die Deckung, als Kante in der Draufsicht. `h` ist nur für die Darstellung. */
export const PEEK_COVER = { z: 6, x1: -14, x2: 1.2, h: 3.4 }
/** Sekunden Sichtkontakt, bis der Gegner zurückschießt. */
export const PEEK_REACTION = 0.32
/** Bis zu diesem Tempo gilt ein Schuss als aus dem Stand. Etwas milder als bei Counterstrafe. */
const SHOOT_SPEED = 1.2
/** Pause nach einem Kill oder Tod, bevor der nächste Gegner steht. */
const COOL_KILL = 1.1
const COOL_DEATH = 1.2

/**
 * Sieht der Spieler den Gegner?
 *
 * Reine Draufsicht: kreuzt die Sichtlinie die Deckungskante, ist der Gegner verdeckt.
 * Für eine mannshohe Deckung genügt das — Höhe spielt hier keine Rolle.
 */
export function visible(g: GameState): boolean {
  const c = PEEK_COVER
  const e = g.data.enemy
  return !segCross(g.player.x, g.player.z, e.x, e.z, c.x1, c.z, c.x2, c.z)
}

export const peek: ModeDef = {
  id: 'peek',
  name: 'One-and-Done Peek',
  cat: 'move',
  skill: 'Movement',
  core: true,
  meters: true,
  move: true,
  desc: 'Aus der Deckung raus, ein Duell, zurück. Der Gegner schießt nach 320 ms Sichtkontakt. Gewertet wird deine Zeit im Freien — genau die Disziplin, die dir Runden rettet.',
  hint: 'D peeken · A zurück in Deckung · maximal ein Schuss',
  extraLabel: 'Ø Exposure',
  metricName: 'Kills',
  start(g) {
    g.player.x = 1.35
    g.player.z = 0
    g.data.enemy = { x: -3.2, y: 1.62, z: 20, r: 0.34 * g.settings.sizeMul, dead: false, born: 0 }
    g.data.expo = 0
    g.data.seen = 0
    g.data.deaths = 0
    g.data.exposures = []
    g.data.state = 'ready'
    g.data.cool = 0
    g.targets = [g.data.enemy]
  },
  tick(g, _input, dt) {
    const sichtbar = visible(g)
    g.data.enemy.hidden = !sichtbar

    if (g.data.cool > 0) {
      g.data.cool -= dt
      if (g.data.cool <= 0) {
        g.data.enemy.dead = false
        g.data.state = 'ready'
        g.data.expo = 0
        g.data.seen = 0
      }
      return
    }

    if (sichtbar && !g.data.enemy.dead) {
      g.data.expo += dt
      g.data.seen += dt
      if (g.data.seen > PEEK_REACTION) {
        g.data.deaths++
        g.streak = 0
        pushFx(g, 'center', 'ERWISCHT', 'bad')
        play(g, 'bad')
        g.data.cool = COOL_DEATH
        g.data.enemy.dead = true
        g.data.exposures.push(g.data.expo * 1000)
      }
      return
    }

    // In Deckung baut sich die Aufmerksamkeit des Gegners wieder ab.
    g.data.seen = Math.max(0, g.data.seen - dt * 2.5)
    if (g.data.state === 'ready') g.data.expo = 0
  },
  fire(g) {
    if (g.data.cool > 0) return
    g.shots++
    const sp = speed(g.player)
    const treffbar = !g.data.enemy.hidden && !g.data.enemy.dead
    const t = treffbar ? rayHitBest(g.player, g.camera.F, [g.data.enemy]) : null

    if (t && sp <= SHOOT_SPEED) {
      g.hits++
      g.score++
      g.streak++
      g.bestStreak = Math.max(g.bestStreak, g.streak)
      g.data.exposures.push(g.data.expo * 1000)
      pushFx(g, { x: t.x, y: t.y, z: t.z }, `${Math.round(g.data.expo * 1000)} ms`, 'good')
      play(g, 'head')
      g.data.enemy.dead = true
      g.data.cool = COOL_KILL
      // Neue Position, damit der nächste Peek nicht auswendig gespielt wird.
      g.data.enemy.x = -2.2 - g.rng() * 3.4
      g.data.enemy.z = 17 + g.rng() * 6
      g.data.enemy.y = 1.5 + g.rng() * 0.35
    } else if (t) {
      registerMiss(g, 'zu schnell')
    } else {
      registerMiss(g)
    }
  },
  hudExtra: (g) => (g.data.exposures.length ? `${Math.round(avg(g.data.exposures))}ms` : '–'),
  stats: (g) => [
    ['Kills', g.score],
    ['Getroffen worden', g.data.deaths],
    ['Ø Exposure', ms(avg(g.data.exposures))],
    ['Kürzeste', ms(g.data.exposures.length ? Math.min(...g.data.exposures) : 0)],
    ['Accuracy', pc(g.hits, g.shots)],
  ],
  metric: (g) => g.score,
}
```

- [ ] **Step 5: Strafe & Shoot implementieren**

Create `lib/engine/modes/strafeshoot.ts`:

```ts
import { avg, ms, pc } from '../format'
import { registerHit, registerMiss } from '../game'
import { rayHitBest, speed } from '../math'
import { slotTarget } from '../spawn'
import type { GameState, ModeDef, Target } from '../types'
import { SHOOT_SPEED } from './counterstrafe'

const mk = (g: GameState): Target =>
  slotTarget(g, 0.34 * g.settings.sizeMul, 5.5, 1.1, 3.0, 16)

export const strafeshoot: ModeDef = {
  id: 'strafeshoot',
  name: 'Strafe & Shoot',
  cat: 'move',
  skill: 'Movement',
  move: true,
  meters: true,
  desc: 'Dauerlauf zwischen zwei Marken, Ziele erscheinen laufend. Du musst permanent zwischen Bewegung und sauberem Stopp umschalten.',
  hint: 'A / D dauerhaft wechseln · nur im Stand schießen',
  extraLabel: 'Stand-Quote',
  metricName: 'Kills',
  start(g) {
    g.targets = [mk(g)]
    g.data.speeds = []
  },
  tick() {},
  fire(g) {
    g.shots++
    const sp = speed(g.player)
    g.data.speeds.push(sp)
    const t = rayHitBest(g.player, g.camera.F, g.targets)
    if (t && sp <= SHOOT_SPEED) {
      registerHit(g, t)
      g.score++
      g.targets = [mk(g)]
    } else if (t) {
      // Das Ziel bleibt stehen: der Schuss war zu früh, nicht danebengezielt.
      registerMiss(g, 'zu schnell')
    } else {
      registerMiss(g)
    }
  },
  hudExtra(g) {
    const speeds: number[] = g.data.speeds
    const sauber = speeds.filter((s) => s <= SHOOT_SPEED).length
    return speeds.length ? `${Math.round((sauber / speeds.length) * 100)}%` : '–'
  },
  stats(g) {
    const speeds: number[] = g.data.speeds
    const sauber = speeds.filter((s) => s <= SHOOT_SPEED).length
    return [
      ['Kills', g.score],
      ['Accuracy', pc(g.hits, g.shots)],
      ['Stand-Quote', `${speeds.length ? Math.round((sauber / speeds.length) * 100) : 0} %`],
      ['Ø TTK', ms(avg(g.ttk))],
    ]
  },
  metric: (g) => g.score,
}
```

- [ ] **Step 6: Tests laufen lassen**

Run: `pnpm test moveModes`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/engine/modes
git commit -m "feat: Movement-Modi Counterstrafe, Peek und Strafe & Shoot"
```

---

### Task 12: Registry, Routinen, Coach und Gesamtsimulation

**Files:**
- Create: `lib/engine/modes/index.ts`
- Create: `lib/engine/routines.ts`
- Create: `lib/engine/coach.ts`
- Create: `lib/engine/engine.test.ts`

**Interfaces:**
- Consumes: alle elf Modi; `pcNum`, `avg` aus `lib/engine/format.ts`; `createGame`, `fire`, `tick` aus `lib/engine/game.ts`
- Produces:
  - `MODES: Record<ModeId, ModeDef>`
  - `MODE_LIST: ModeDef[]`
  - `type RoutineId = 'warmup' | 'duel' | 'full'`
  - `type Routine = { id: RoutineId; name: string; desc: string; steps: [ModeId, number][] }`
  - `ROUTINES: Record<RoutineId, Routine>`
  - `coachLine(g: GameState): string`

Dieser Task schließt Phase 1 ab. Der letzte Test ist die Abnahme: jeder der elf Modi wird eine volle Runde lang mit zufälliger Eingabe durchsimuliert, ohne Browser, ohne Canvas.

- [ ] **Step 1: Failing Tests schreiben**

Create `lib/engine/engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { coachLine } from './coach'
import { DEFAULT_SETTINGS, createGame, fire, tick } from './game'
import { MODES, MODE_LIST } from './modes'
import { ROUTINES } from './routines'
import type { GameState, Input, ModeDef } from './types'

/** Deterministischer Zufall, damit ein Fehlschlag reproduzierbar bleibt. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

/** Spielt eine volle Runde mit wechselnder Eingabe durch. */
function playthrough(mode: ModeDef): GameState {
  const rng = seeded(7)
  const g = createGame(mode, DEFAULT_SETTINGS, 10, rng)
  const step = 1 / 120
  let frame = 0
  while (!g.over) {
    const input: Input = {
      keys: { KeyA: frame % 60 < 30, KeyD: frame % 60 >= 30 },
      mouseDown: frame % 20 < 10,
    }
    tick(g, input, step)
    if (frame % 15 === 0) fire(g)
    // Die Ansicht leert diese Listen jeden Frame — hier wird das nachgestellt.
    g.fx.length = 0
    g.sounds.length = 0
    frame++
  }
  return g
}

describe('MODES', () => {
  it('kennt genau elf Modi', () => {
    expect(MODE_LIST).toHaveLength(11)
  })

  it('schluesselt jeden Modus unter seiner eigenen id', () => {
    for (const [key, mode] of Object.entries(MODES)) {
      expect(mode.id).toBe(key)
    }
  })

  it('gibt jedem Modus die Pflichtfelder', () => {
    for (const m of MODE_LIST) {
      expect(m.name.length).toBeGreaterThan(0)
      expect(m.desc.length).toBeGreaterThan(0)
      expect(m.hint.length).toBeGreaterThan(0)
      expect(m.metricName.length).toBeGreaterThan(0)
      expect(['aim', 'spray', 'move']).toContain(m.cat)
    }
  })

  it('gibt jedem Modus entweder fire oder hold', () => {
    for (const m of MODE_LIST) {
      expect(Boolean(m.fire) || Boolean(m.hold)).toBe(true)
    }
  })
})

describe('Gesamtsimulation', () => {
  for (const mode of MODE_LIST) {
    it(`spielt ${mode.name} eine volle Runde ohne Fehler durch`, () => {
      const g = playthrough(mode)
      expect(g.over).toBe(true)
      expect(g.left).toBe(0)
      expect(Number.isFinite(g.score)).toBe(true)
      expect(g.score).not.toBeNaN()
    })

    it(`liefert fuer ${mode.name} auswertbare Stats`, () => {
      const g = playthrough(mode)
      const rows = mode.stats(g)
      expect(rows.length).toBeGreaterThan(0)
      for (const [key, value] of rows) {
        expect(key.length).toBeGreaterThan(0)
        expect(String(value)).not.toContain('NaN')
        expect(String(value)).not.toContain('undefined')
      }
    })

    it(`liefert fuer ${mode.name} eine endliche Metrik`, () => {
      const g = playthrough(mode)
      const m = mode.metric(g)
      expect(Number.isFinite(m)).toBe(true)
    })

    it(`liefert fuer ${mode.name} einen Coach-Text`, () => {
      const g = playthrough(mode)
      const line = coachLine(g)
      expect(line.length).toBeGreaterThan(20)
      expect(line).not.toContain('NaN')
      expect(line).not.toContain('undefined')
    })
  }
})

describe('ROUTINES', () => {
  it('verweist ausschliesslich auf bekannte Modi', () => {
    for (const r of Object.values(ROUTINES)) {
      for (const [id] of r.steps) {
        expect(MODES[id]).toBeDefined()
      }
    }
  })

  it('gibt jeder Station eine positive Dauer', () => {
    for (const r of Object.values(ROUTINES)) {
      for (const [, sec] of r.steps) {
        expect(sec).toBeGreaterThan(0)
      }
    }
  })

  it('nimmt in den vollen Durchlauf jeden Modus mindestens einmal auf', () => {
    const drin = new Set(ROUTINES.full.steps.map(([id]) => id))
    for (const m of MODE_LIST) {
      expect(drin.has(m.id)).toBe(true)
    }
  })

  it('schluesselt jede Routine unter ihrer eigenen id', () => {
    for (const [key, r] of Object.entries(ROUTINES)) {
      expect(r.id).toBe(key)
    }
  })
})

describe('coachLine', () => {
  it('mahnt bei niedriger Accuracy zu weniger Tempo', () => {
    const g = createGame(MODES.gridshot, DEFAULT_SETTINGS, 60, () => 0.5)
    g.hits = 3
    g.shots = 10
    g.ttk = [400]
    expect(coachLine(g)).toContain('%')
  })
})
```

- [ ] **Step 2: Tests laufen lassen und Fehlschlag bestätigen**

Run: `pnpm test engine`
Expected: FAIL mit `Failed to resolve import "./coach"`.

- [ ] **Step 3: Registry anlegen**

Create `lib/engine/modes/index.ts`:

```ts
import type { ModeDef, ModeId } from '../types'
import { counterstrafe } from './counterstrafe'
import { flick } from './flick'
import { gridshot } from './gridshot'
import { micro } from './micro'
import { peek } from './peek'
import { reaction } from './reaction'
import { spray } from './spray'
import { strafeshoot } from './strafeshoot'
import { strafetrack } from './strafetrack'
import { switching } from './switching'
import { tracking } from './tracking'

/** Reihenfolge bestimmt die Anzeige im Menü: erst Aim, dann Recoil, dann Movement. */
export const MODE_LIST: ModeDef[] = [
  gridshot, flick, micro, switching, tracking, strafetrack, reaction,
  spray,
  counterstrafe, peek, strafeshoot,
]

export const MODES = Object.fromEntries(
  MODE_LIST.map((m) => [m.id, m]),
) as Record<ModeId, ModeDef>
```

- [ ] **Step 4: Routinen anlegen**

Create `lib/engine/routines.ts`:

```ts
import type { ModeId } from './types'

export type RoutineId = 'warmup' | 'duel' | 'full'

export type Routine = {
  id: RoutineId
  name: string
  desc: string
  /** Station als [Modus, Sekunden]. */
  steps: [ModeId, number][]
}

export const ROUTINES: Record<RoutineId, Routine> = {
  warmup: {
    id: 'warmup',
    name: 'Warmup · 5 min',
    desc: 'Reaktion → Gridshot → Micro-Flicks → Strafe Tracking → Counterstrafe. Der Ablauf, bevor du in die Queue gehst.',
    steps: [['reaction', 45], ['gridshot', 60], ['micro', 60], ['strafetrack', 60], ['counterstrafe', 60]],
  },
  duel: {
    id: 'duel',
    name: 'Duell-Block · 6 min',
    desc: 'Alles, was ein Duell entscheidet: Peeken, stehen, treffen, Spray nachziehen.',
    steps: [['micro', 60], ['counterstrafe', 90], ['peek', 90], ['spray', 60], ['flick', 60]],
  },
  full: {
    id: 'full',
    name: 'Voller Durchlauf · 10 min',
    desc: 'Jeder Modus einmal. Gut für einen Standortcheck alle paar Wochen.',
    steps: [
      ['reaction', 40], ['gridshot', 60], ['flick', 60], ['micro', 60], ['switching', 60],
      ['tracking', 60], ['strafetrack', 60], ['spray', 60], ['counterstrafe', 75], ['peek', 75],
    ],
  },
}
```

Der Test `nimmt in den vollen Durchlauf jeden Modus mindestens einmal auf` schlägt mit dieser Liste fehl: `strafeshoot` fehlt. Das ist eine Lücke des Originals, kein Abtippfehler — die Routine heißt „Voller Durchlauf" und soll das auch sein. Ergänze `['strafeshoot', 60]` am Ende der Liste, statt den Test abzuschwächen.

- [ ] **Step 5: Coach anlegen**

Create `lib/engine/coach.ts`:

```ts
import { avg, pcNum } from './format'
import type { GameState } from './types'

/**
 * Ein Satz Rückmeldung nach dem Lauf.
 *
 * Die Reihenfolge ist Absicht: modus-eigene Diagnosen zuerst, danach die
 * allgemeinen Accuracy-Regeln. Jeder Zweig nennt eine konkrete Zahl und sagt,
 * was als Nächstes zu tun ist — ein Lob ohne Handlungsanweisung hilft niemandem.
 */
export function coachLine(g: GameState): string {
  const acc = pcNum(g.hits, g.shots)
  const t = avg(g.ttk)

  if (g.mode.id === 'peek') {
    const e = avg(g.data.exposures)
    if (g.data.deaths > g.score) {
      return 'Du bist länger draußen als das Duell dauert. Ziel: raus, ein Schuss, rein — die Entscheidung fällt, bevor du peekst, nicht danach.'
    }
    if (e > 500) {
      return `Ø ${Math.round(e)} ms im Freien. Unter 400 ms bist du für die meisten Gegner nicht mehr rechtzeitig treffbar. Crosshair vor dem Peek schon auf die Winkelkante legen.`
    }
    return `Sauber: Ø ${Math.round(e)} ms Exposure bei ${g.score} Kills. Genau dieses Muster in der Ranked-Runde wiederholen.`
  }

  if (g.mode.id === 'counterstrafe') {
    const speeds: number[] = g.data.speeds ?? []
    const clean = speeds.length ? speeds.filter((s) => s <= 1).length / speeds.length : 0
    if (clean < 0.7) {
      return `Nur ${Math.round(clean * 100)} % deiner Schüsse kamen im Stand. Das ist die teuerste Lücke im Spiel — tippe die Gegenrichtung kurz an, statt die Taste nur loszulassen.`
    }
    if (t > 600) {
      return `Stand ist sauber, aber ${Math.round(t)} ms vom Ziel bis zum Schuss ist langsam. Crosshair-Placement auf Kopfhöhe halten, dann brauchst du den Flick nicht.`
    }
    return 'Stopp und Schuss sitzen. Nimm den nächsten Durchlauf mit kleinerer Zielgröße.'
  }

  if (g.mode.id === 'spray') {
    const a: number[] = (g.data.sprays ?? []).map((s: { score: number }) => s.score)
    if (!a.length) {
      return 'Kein volles Magazin geleert. Halte durch bis zum letzten Schuss — die Kugeln 10 bis 20 sind der Teil, den fast niemand übt.'
    }
    const m = avg(a)
    if (m < 45) {
      return `${Math.round(m)} % im Kreis. Die ersten vier Kugeln gehen fast gerade hoch — zieh in dieser Zeit gleichmäßig nach unten, nicht ruckartig. Erst danach kommt die Seitwärtsbewegung.`
    }
    if (m < 70) {
      return `${Math.round(m)} % im Kreis. Der vertikale Teil sitzt, die horizontale Korrektur ab Kugel 13 noch nicht. Nimm bewusst nur die ersten 15 Kugeln, bis die Bahn sitzt.`
    }
    return `${Math.round(m)} % — das ist Spray-Kontrolle, die in echten Duellen hält. Wechsle mal die Waffe, das Muster ist deutlich anders.`
  }

  if (g.mode.hold) {
    const on = pcNum(g.trackTime, g.trackTotal)
    if (on < 45) {
      return `${Math.round(on)} % auf dem Ziel. Du reagierst auf die Bewegung statt sie zu führen — schau auf die Hüfte des Ziels, nicht auf dein Crosshair.`
    }
    if (on < 65) {
      return `${Math.round(on)} % ist solide. Der Verlust liegt fast immer im Richtungswechsel: dort weniger Arm, mehr Handgelenk.`
    }
    return `${Math.round(on)} % — sehr gut. Erhöhe die Schwierigkeit über kleinere Ziele statt über längere Runden.`
  }

  if (g.mode.id === 'reaction') {
    if (!g.react.length) {
      return 'Keine gültige Reaktion gemessen. Warte auf das Ziel, statt vorher zu klicken.'
    }
    const r = avg(g.react)
    if (r > 320) {
      return `${Math.round(r)} ms. Ein großer Teil davon ist Weg zum Ziel, nicht Reaktion — halte das Crosshair näher an der Bildmitte in Ruhestellung.`
    }
    return `${Math.round(r)} ms ist überdurchschnittlich. Reaktion ist selten dein Limit; investiere die Zeit lieber in Counterstrafe und Peek.`
  }

  if (acc < 55) {
    return `${Math.round(acc)} % Accuracy. Du schießt schneller als du zielst. Nimm bewusst 15 % Tempo raus — Score über Accuracy ist fast immer ein Netto-Verlust.`
  }
  if (acc > 88 && t > 620) {
    return `${Math.round(acc)} % bei Ø ${Math.round(t)} ms. Du bist zu vorsichtig: geh aufs Ziel zu, statt es einzukreisen. Etwas weniger Accuracy für deutlich mehr Tempo ist hier der bessere Trade.`
  }
  if (acc > 78) {
    return `${Math.round(acc)} % bei Ø ${Math.round(t)} ms — gute Balance. Halte diese Accuracy und drück das Tempo schrittweise.`
  }
  return `${Math.round(acc)} % bei Ø ${Math.round(t)} ms. Ziel für den nächsten Lauf: gleiche Trefferzahl, aber 5 Punkte mehr Accuracy.`
}
```

Hinweis zur Reihenfolge: im Original stand die Prüfung auf `g.react.length` innerhalb des Reaktions-Zweigs erst nach der Mittelwertbildung. Hier steht sie davor, damit der leere Fall nie durch die Zahlenformatierung läuft. Das ist die einzige inhaltliche Änderung am Coach.

- [ ] **Step 6: Tests laufen lassen und die Lücke in der Routine schließen**

Run: `pnpm test engine`
Expected: FAIL bei `nimmt in den vollen Durchlauf jeden Modus mindestens einmal auf`, weil `strafeshoot` in `ROUTINES.full` fehlt.

Ergänze `['strafeshoot', 60]` in `ROUTINES.full.steps`. Falls zusätzlich ein Modus mit `NaN` in den Stats auffällt: am Produktionscode beheben, nicht am Test — ein `NaN` im Ergebnisbildschirm ist ein echter Fehler.

Run: `pnpm test engine`
Expected: PASS.

- [ ] **Step 7: Gesamtlauf**

Run: `pnpm test`
Expected: PASS, alle Testdateien grün.

Run: `pnpm exec tsc --noEmit`
Expected: keine Ausgabe.

- [ ] **Step 8: Prüfen, dass die Engine frameworkfrei geblieben ist**

```bash
grep -rn "react\|three\|document\.\|window\.\|setTimeout\|setInterval" lib/engine --include="*.ts" | grep -v ".test.ts"
```

Expected: keine Treffer. Ein Treffer bedeutet, dass eine Ansichts-Abhängigkeit in die Engine gerutscht ist — sie gehört in Phase 2, nicht hierher.

```bash
grep -rn "Math.random" lib/engine --include="*.ts" | grep -v ".test.ts"
```

Expected: genau ein Treffer, der Default-Parameter in `createGame`.

- [ ] **Step 9: Commit**

```bash
git add lib/engine
git commit -m "feat: Modus-Registry, Routinen und Coach — Phase 1 abgeschlossen"
```

---

## Abnahme Phase 1

Nach Task 12 gilt:

- `pnpm test` ist grün und deckt Sensitivity, Geometrie, Bewegung, Sprühmuster, Rundenrahmen und alle elf Modi ab.
- Jeder Modus lässt sich headless eine volle Runde durchsimulieren, ohne Browser und ohne Canvas.
- `lib/engine/` enthält keine Referenz auf React, Three.js, DOM oder Timer.
- Die Ansicht existiert noch nicht — das ist Phase 2.

## Was dieser Plan bewusst nicht enthält

- **Kein Rendering, kein Input-Handling.** Pointer Lock, Canvas, Szene und HUD sind Phase 2.
- **Keine Persistenz.** Bestwerte, Run-Historie und Settings-Speicherung sind Phase 3.
- **Keine Seiten außer der Next.js-Standardseite.** Menü, Stats und Settings kommen in Phase 3 und 4.
- **Keine Component-Tests.** Die Engine trägt die Logik, also trägt sie die Tests.
