# Phase 2 — R3F-Szene, Pointer-Lock-Eingabe, HUD

> **Für agentische Bearbeiter:** ERFORDERLICHE UNTER-SKILL: `superpowers:subagent-driven-development` (empfohlen) oder `superpowers:executing-plans`, um diesen Plan Aufgabe für Aufgabe umzusetzen. Die Schritte sind als Checkboxen (`- [ ]`) geführt.

**Ziel:** Die fertige, frameworkfreie Engine unter `lib/engine/` bekommt Bild, Eingabe und Anzeige — danach sind alle elf Modi im Browser spielbar und fühlen sich an wie `reference/index.html`.

**Architektur:** Der Spielzustand lebt in einem Ref und wird ausschließlich von einer einzigen `useFrame`-Schleife mutiert. Three.js liest diesen Zustand jeden Frame und schreibt ihn in Meshes — der Szenengraph hält nie Wahrheit. Das HUD ist DOM über dem Canvas: Zahlen per Snapshot alle 100 ms, die schnellen Balken direkt in `style.width`. Kein Spielzustand in `useState`.

**Tech-Stack:** Next.js 16.3 (App Router), React 19.2, TypeScript strict, `three` 0.185, `@react-three/fiber` 9.7, Vitest 4, pnpm.

## Globale Vorgaben

Diese Punkte gelten für **jede** Aufgabe in diesem Plan.

- **Die Bildschleife klemmt `dt`.** `useFrame` übergibt `Math.min(delta, MAX_DT)` an `tick`. `MAX_DT = 0.05` wird aus `lib/engine/game.ts` importiert, nie als Literal geschrieben. Ohne den Deckel degradieren still: Bewegungsintegration, Counterstrafe-Stopp, das 320-ms-Fenster in Peek und der Feuertakt in Spray.
- **Spielzustand niemals in `useState`.** Kein `setState` pro Frame, keine Ableitung von Spielwerten in JSX. Zustand in Refs, Anzeige über imperative Handles.
- **Kein Wert wird doppelt definiert.** Schwellwerte, Maße und Farben, die die Engine schon kennt (`SHOOT_SPEED`, `PEEK_REACTION`, `PEEK_COVER`, `SPRAY_WALL_Z`, `SPRAY_AIM`, `SPRAY_RADIUS`, `RUN`, `EYE`, `VFOV_DEG`, `WEAPONS`), werden importiert, nicht abgeschrieben.
- **Die Ansicht wertet `settings.sound` aus.** `play()` reiht Töne bedingungslos ein; wer die Warteschlange leert, entscheidet über das Abspielen.
- **Die Engine sieht nie Mauspixel.** Die Eingabeschicht ruft `applyMouse(cam, dx, dy, sens)` mit rohen Pointer-Lock-Counts auf.
- **Oberfläche deutsch.** Kommentare deutsch, im Stil der bestehenden Engine-Dateien: sie begründen, warum etwas so ist, statt zu wiederholen, was der Code tut.
- **Keine neuen Abhängigkeiten außer den in Aufgabe 1 genannten.** Kein `drei`, kein `postprocessing`, kein Zustand-Store. Bloom und Persistenz sind Phase 3.
- **Tests nur gegen `lib/`.** `vitest.config.ts` sammelt `lib/**/*.test.ts`. Für Komponenten gibt es keine Tests — der visuelle Teil wird von Hand gegen `reference/index.html` geprüft; jede Komponentenaufgabe endet deshalb mit einer konkreten Sichtprüfung.
- **Nach jeder Aufgabe grün:** `pnpm test` und `pnpm exec tsc --noEmit`.

## Die Koordinaten-Falle

Die Engine rechnet mit **Blickrichtung +Z** und **Rechtsvektor +X** (`camera.ts`, `basis()`). Three.js ist rechtshändig: eine ungedrehte Kamera schaut nach **−Z**, rechts ist **+X**. Dreht man die Kamera nur um 180° um Y, stimmt zwar die Blickrichtung, aber der Rechtsvektor kippt auf −X — die Welt wäre gespiegelt, Strafen nach rechts liefe im Bild nach links, und Sprühmuster sowie Peek-Winkel wären seitenverkehrt.

Die Lösung ist eine gespiegelte z-Achse beim Übertragen in die Szene: `three = (x, y, −z)`, Kameradrehung `(pitch, −yaw, 0)` in der Reihenfolge `YXZ`. Aufgabe 1 baut das als geprüftes Modul; **jede** Weltposition in Phase 2 läuft durch dieses Modul.

## Dateien

```
lib/view/coords.ts          Engine-Welt → Three-Welt, Kamera-Euler        (Aufgabe 1)
lib/view/coords.test.ts
lib/view/hud.ts             HudSnapshot + Balken-Skalen und -Farben       (Aufgabe 2)
lib/view/hud.test.ts
lib/crosshair/draw.ts       Crosshair-Zeichner + Konfiguration            (Aufgabe 3)
lib/crosshair/draw.test.ts
lib/view/sfx.ts             WebAudio-Töne, leert die Warteschlange        (Aufgabe 4)
lib/view/input.ts           Tastatur, Maus, Pointer Lock                  (Aufgabe 5)

app/range.css               Gestaltung, aus dem Original übernommen       (Aufgabe 6)
app/layout.tsx              dunkles Grundlayout, Roboto Condensed         (Aufgabe 6)
app/play/[mode]/page.tsx    Route, notFound() bei unbekannter Modus-ID    (Aufgabe 6)
components/game/PlayScreen.tsx   Klammer: Refs, Canvas, Overlays          (Aufgabe 6)
components/game/GameLoop.tsx     die einzige useFrame-Schleife            (Aufgabe 6)
components/game/Range.tsx        Boden, Raster, Rückwand, Licht, Deckung  (Aufgabe 6)
components/game/Targets.tsx      Kugel-Pool                               (Aufgabe 7)
components/hud/Hud.tsx           Pills, Meter, Cue, Ammo, Hinweis         (Aufgabe 8)
components/hud/Crosshair.tsx     eigenes 2D-Canvas über dem 3D-Canvas     (Aufgabe 8)
components/hud/FxLayer.tsx       Trefferfeedback als DOM                  (Aufgabe 8)
components/game/SprayWall.tsx    Wand, Ringe, Einschläge                  (Aufgabe 9)
components/hud/PauseOverlay.tsx  Pause und Pointer-Lock-Aufforderung      (Aufgabe 11)
components/hud/Results.tsx       Statistik und Coach                      (Aufgabe 11)
app/page.tsx                     schlichtes Modi-Menü                     (Aufgabe 11)
```

Nicht in Phase 2: Routinen-Warteschlange, Bestwerte, Persistenz, Settings-Oberfläche, Bloom. Alle Läufe benutzen `DEFAULT_SETTINGS`. Das ist Phase 3 und wird am Ende dieses Plans noch einmal festgehalten.

---

### Aufgabe 1: Abhängigkeiten und die Koordinaten-Brücke

**Dateien:**
- Ändern: `package.json` (über `pnpm add`)
- Erstellen: `lib/view/coords.ts`
- Test: `lib/view/coords.test.ts`

**Schnittstellen:**
- Verbraucht: `Vec3` aus `lib/engine/types`, `dirFrom` aus `lib/engine/math`, `createCamera`/`basis` aus `lib/engine/camera`
- Liefert: `toThree(v: Vec3): [number, number, number]`, `tz(z: number): number`, `camEuler(yaw: number, pitch: number): [number, number, number]`

- [ ] **Schritt 1: Abhängigkeiten installieren**

```bash
pnpm add three@^0.185.1 @react-three/fiber@^9.7.0
pnpm add -D @types/three@^0.185.4
```

`@react-three/fiber` 9.7 verlangt `react >=19 <19.3`; das Projekt liegt bei 19.2.8 und passt.

- [ ] **Schritt 2: Den fehlschlagenden Test schreiben**

`lib/view/coords.test.ts`:

```ts
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { basis, createCamera } from '@/lib/engine/camera'
import { dirFrom } from '@/lib/engine/math'
import { camEuler, toThree, tz } from './coords'

/** Ein paar Winkel quer über den erlaubten Bereich, inklusive Rückwärtsblick. */
const ANGLES: [number, number][] = [
  [0, 0], [0.7, 0.3], [-2.1, -0.5], [Math.PI, 0.9], [3.9, -1.2],
]

function threeCam(yaw: number, pitch: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera()
  cam.rotation.order = 'YXZ'
  const e = camEuler(yaw, pitch)
  cam.rotation.set(e[0], e[1], e[2])
  cam.updateMatrixWorld()
  return cam
}

describe('toThree', () => {
  it('spiegelt die z-Achse und lässt x und y unberührt', () => {
    expect(toThree({ x: 1, y: 2, z: 3 })).toEqual([1, 2, -3])
    expect(tz(15)).toBe(-15)
  })
})

describe('camEuler', () => {
  it('richtet die Three-Kamera auf dieselbe Richtung wie die Engine', () => {
    for (const [yaw, pitch] of ANGLES) {
      const f = new THREE.Vector3()
      threeCam(yaw, pitch).getWorldDirection(f)
      const want = toThree(dirFrom(yaw, pitch))
      expect(f.x).toBeCloseTo(want[0], 6)
      expect(f.y).toBeCloseTo(want[1], 6)
      expect(f.z).toBeCloseTo(want[2], 6)
    }
  })

  it('hält den Rechtsvektor ungespiegelt — sonst liefe Strafen im Bild verkehrt', () => {
    for (const [yaw, pitch] of ANGLES) {
      const cam = threeCam(yaw, pitch)
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion)
      const e = createCamera()
      e.yaw = yaw
      e.pitch = pitch
      basis(e)
      const want = toThree(e.R)
      expect(right.x).toBeCloseTo(want[0], 6)
      expect(right.y).toBeCloseTo(want[1], 6)
      expect(right.z).toBeCloseTo(want[2], 6)
    }
  })
})
```

- [ ] **Schritt 3: Test laufen lassen, Fehlschlag prüfen**

Ausführen: `pnpm exec vitest run lib/view/coords.test.ts`
Erwartet: FEHLSCHLAG, `Failed to resolve import "./coords"`

- [ ] **Schritt 4: Das Modul schreiben**

`lib/view/coords.ts`:

```ts
import type { Vec3 } from '@/lib/engine/types'

/**
 * Engine-Weltpunkt als Three-Position.
 *
 * Die Engine blickt bei yaw 0 nach +Z und hat rechts +X. Three.js blickt
 * ungedreht nach -Z, rechts ist ebenfalls +X. Eine 180-Grad-Drehung der Kamera
 * würde zwar die Blickrichtung treffen, aber den Rechtsvektor mitdrehen — die
 * Welt wäre seitenverkehrt. Stattdessen wird die z-Achse beim Übertragen
 * gespiegelt. Jede Weltposition in der Szene muss durch diese Funktion.
 */
export function toThree(v: Vec3): [number, number, number] {
  return [v.x, v.y, -v.z]
}

/** Dieselbe Spiegelung für einen einzelnen z-Wert, etwa eine Wandtiefe. */
export function tz(z: number): number {
  return -z
}

/**
 * Kameradrehung in Three-Konvention, passend zur gespiegelten z-Achse.
 * Die Reihenfolge muss `YXZ` sein: nur so bleibt die lokale x-Achse waagerecht,
 * genau wie der bewusst waagerechte Rechtsvektor der Engine.
 */
export function camEuler(yaw: number, pitch: number): [number, number, number] {
  return [pitch, -yaw, 0]
}
```

- [ ] **Schritt 5: Test laufen lassen, Erfolg prüfen**

Ausführen: `pnpm exec vitest run lib/view/coords.test.ts`
Erwartet: BESTANDEN, 3 Tests

- [ ] **Schritt 6: Gesamtlauf und Typprüfung**

Ausführen: `pnpm test` — erwartet: alle bisherigen Tests plus die drei neuen grün
Ausführen: `pnpm exec tsc --noEmit` — erwartet: keine Ausgabe

- [ ] **Schritt 7: Commit**

```bash
git add package.json pnpm-lock.yaml lib/view/coords.ts lib/view/coords.test.ts
git commit -m "feat: three und r3f eingebunden, Koordinaten-Bruecke zur Engine"
```

---

### Aufgabe 2: HUD-Snapshot und Balken-Skalen

**Dateien:**
- Erstellen: `lib/view/hud.ts`
- Test: `lib/view/hud.test.ts`

**Schnittstellen:**
- Verbraucht: `pc`/`pcNum` aus `lib/engine/format`, `RUN` aus `lib/engine/movement`, `SHOOT_SPEED` aus `lib/engine/modes/counterstrafe`, `PEEK_REACTION` aus `lib/engine/modes/peek`, `WEAPONS` aus `lib/engine/weapons`, `GameState` aus `lib/engine/types`
- Liefert: Typ `HudSnapshot`, `snapshot(g)`, `speedPct(sp)`, `SPEED_ZONE_PCT`, `speedColor(sp)`, `expoPct(ms)`, `EXPO_ZONE_PCT`, `expoColor(ms)`, `EXPO_SCALE_MS`

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

`lib/view/hud.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createGame, DEFAULT_SETTINGS } from '@/lib/engine/game'
import { MODES } from '@/lib/engine/modes'
import { RUN } from '@/lib/engine/movement'
import { SHOOT_SPEED } from '@/lib/engine/modes/counterstrafe'
import {
  EXPO_ZONE_PCT, SPEED_ZONE_PCT, expoColor, expoPct, snapshot, speedColor, speedPct,
} from './hud'

describe('snapshot', () => {
  it('zeigt bei Klick-Modi die Accuracy', () => {
    const g = createGame(MODES.gridshot, DEFAULT_SETTINGS)
    g.hits = 3
    g.shots = 4
    expect(snapshot(g).acc).toBe('75 %')
  })

  it('zeigt bei Halte-Modi ohne Munition stattdessen die Zeit auf dem Ziel', () => {
    const g = createGame(MODES.tracking, DEFAULT_SETTINGS)
    g.trackTime = 6
    g.trackTotal = 10
    expect(snapshot(g).acc).toBe('60%')
  })

  it('zeigt bei Spray die Accuracy, obwohl der Modus hold ist', () => {
    const g = createGame(MODES.spray, DEFAULT_SETTINGS)
    g.hits = 10
    g.shots = 25
    expect(snapshot(g).acc).toBe('40 %')
  })

  it('nimmt hudExtra, wo der Modus es anbietet, sonst die Serie', () => {
    const grid = createGame(MODES.gridshot, DEFAULT_SETTINGS)
    grid.streak = 7
    expect(snapshot(grid).extra).toBe(7)
    expect(snapshot(grid).extraLabel).toBe('Streak')

    const sp = createGame(MODES.spray, DEFAULT_SETTINGS)
    expect(snapshot(sp).extra).toBe(0)
    expect(snapshot(sp).extraLabel).toBe('Sprays')
  })

  it('liefert Munition nur für Modi mit Munitionsanzeige', () => {
    expect(snapshot(createGame(MODES.spray, DEFAULT_SETTINGS)).ammo).toBe(25)
    expect(snapshot(createGame(MODES.gridshot, DEFAULT_SETTINGS)).ammo).toBeNull()
  })

  it('rundet die Restzeit auf, damit die Anzeige bei 60 startet und nicht bei 59', () => {
    const g = createGame(MODES.gridshot, DEFAULT_SETTINGS)
    g.left = 59.4
    expect(snapshot(g).time).toBe(60)
  })
})

describe('Balken', () => {
  it('deckelt den Tempo-Balken bei Laufgeschwindigkeit', () => {
    expect(speedPct(0)).toBe(0)
    expect(speedPct(RUN)).toBe(100)
    expect(speedPct(RUN * 2)).toBe(100)
  })

  it('legt die grüne Zone genau auf die Stand-Schwelle der Engine', () => {
    expect(SPEED_ZONE_PCT).toBeCloseTo((SHOOT_SPEED / RUN) * 100, 10)
    expect(speedColor(SHOOT_SPEED)).toBe('var(--ok)')
    expect(speedColor(SHOOT_SPEED + 0.01)).toBe('var(--sig)')
  })

  it('färbt den Exposure-Balken an den Grenzen 320 und 600 ms um', () => {
    expect(expoColor(300)).toBe('var(--ok)')
    expect(expoColor(400)).toBe('var(--warn)')
    expect(expoColor(700)).toBe('var(--sig)')
    expect(EXPO_ZONE_PCT).toBeCloseTo((320 / 900) * 100, 10)
    expect(expoPct(1800)).toBe(100)
  })
})
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Ausführen: `pnpm exec vitest run lib/view/hud.test.ts`
Erwartet: FEHLSCHLAG, `Failed to resolve import "./hud"`

- [ ] **Schritt 3: Das Modul schreiben**

`lib/view/hud.ts`:

```ts
import { pc, pcNum } from '@/lib/engine/format'
import { SHOOT_SPEED } from '@/lib/engine/modes/counterstrafe'
import { PEEK_REACTION } from '@/lib/engine/modes/peek'
import { RUN } from '@/lib/engine/movement'
import type { GameState } from '@/lib/engine/types'
import { WEAPONS } from '@/lib/engine/weapons'

/** Alles, was React am HUD rendert. Wird alle 100 ms neu gebildet. */
export type HudSnapshot = {
  time: number
  score: number
  acc: string
  extraLabel: string
  extra: string | number
  /** null bei Modi ohne Munitionsanzeige. */
  ammo: number | null
  weapon: string
  hint: string
  cue: string | null
}

export function snapshot(g: GameState): HudSnapshot {
  const m = g.mode
  return {
    time: Math.ceil(g.left),
    score: g.score,
    // Halten ohne Magazin heißt Tracking: dort ist die Zeit auf dem Ziel die
    // aussagekräftige Quote, nicht Treffer pro Schuss.
    acc: m.hold && !m.ammoHud
      ? `${pcNum(g.trackTime, g.trackTotal).toFixed(0)}%`
      : pc(g.hits, g.shots),
    extraLabel: m.extraLabel ?? 'Streak',
    extra: m.hudExtra ? m.hudExtra(g) : g.streak,
    ammo: m.ammoHud ? (g.data.ammo as number) : null,
    weapon: WEAPONS[g.settings.weapon].name,
    hint: m.hint,
    cue: g.cue,
  }
}

/** Volle Balkenbreite bei Laufgeschwindigkeit. */
export function speedPct(sp: number): number {
  return Math.min(100, (sp / RUN) * 100)
}

/** Die grüne Zone endet dort, wo die Engine einen Schuss noch als aus dem Stand wertet. */
export const SPEED_ZONE_PCT = (SHOOT_SPEED / RUN) * 100

export function speedColor(sp: number): string {
  return sp <= SHOOT_SPEED ? 'var(--ok)' : 'var(--sig)'
}

/** Der Exposure-Balken ist auf knapp das Dreifache des Todesfensters skaliert. */
export const EXPO_SCALE_MS = 900
/** Ab hier wird es unangenehm, auch wenn der Gegner noch nicht geschossen hat. */
const EXPO_WARN_MS = 600

export function expoPct(msValue: number): number {
  return Math.min(100, (msValue / EXPO_SCALE_MS) * 100)
}

export const EXPO_ZONE_PCT = ((PEEK_REACTION * 1000) / EXPO_SCALE_MS) * 100

export function expoColor(msValue: number): string {
  if (msValue < PEEK_REACTION * 1000) return 'var(--ok)'
  return msValue < EXPO_WARN_MS ? 'var(--warn)' : 'var(--sig)'
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg prüfen**

Ausführen: `pnpm exec vitest run lib/view/hud.test.ts`
Erwartet: BESTANDEN, 9 Tests

- [ ] **Schritt 5: Gesamtlauf, Typprüfung, Commit**

```bash
pnpm test && pnpm exec tsc --noEmit
git add lib/view/hud.ts lib/view/hud.test.ts
git commit -m "feat: HUD-Snapshot und Balken-Skalen aus Engine-Konstanten"
```

---

### Aufgabe 3: Crosshair-Zeichner

**Dateien:**
- Erstellen: `lib/crosshair/draw.ts`
- Test: `lib/crosshair/draw.test.ts`

**Schnittstellen:**
- Liefert: Typ `CrosshairConfig`, `DEFAULT_CROSSHAIR`, `drawCrosshair(ctx, cx, cy, cfg)`

Die Werte in `DEFAULT_CROSSHAIR` sind die Voreinstellung aus `reference/index.html` Zeile 312–314.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

`lib/crosshair/draw.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_CROSSHAIR, drawCrosshair } from './draw'

type Call = { op: string; args: number[]; style?: string }

/** Ein Aufzeichnungs-Kontext: er merkt sich nur, was gezeichnet wurde. */
function fakeCtx() {
  const calls: Call[] = []
  const rec = (op: string) => (...args: number[]) => { calls.push({ op, args }) }
  const ctx = {
    calls,
    strokeStyle: '', fillStyle: '', lineWidth: 0, lineCap: '' as CanvasLineCap,
    beginPath: rec('beginPath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    arc: rec('arc'),
    // stroke und fill halten den gerade gesetzten Stil fest — nur so ist die
    // Reihenfolge Kontur-dann-Farbe ueberhaupt pruefbar.
    stroke() { calls.push({ op: 'stroke', args: [], style: ctx.strokeStyle }) },
    fill() { calls.push({ op: 'fill', args: [], style: ctx.fillStyle }) },
  }
  return ctx
}

const draw = (cfg: Partial<typeof DEFAULT_CROSSHAIR>) => {
  const ctx = fakeCtx()
  drawCrosshair(
    ctx as unknown as CanvasRenderingContext2D,
    100, 50,
    { ...DEFAULT_CROSSHAIR, ...cfg },
  )
  return ctx
}

const count = (ctx: ReturnType<typeof fakeCtx>, op: string) =>
  ctx.calls.filter((c) => c.op === op).length

describe('drawCrosshair', () => {
  it('zeichnet vier Striche, mit Kontur zweimal', () => {
    const withOutline = draw({ outline: true, dot: false })
    expect(count(withOutline, 'moveTo')).toBe(8)
    expect(count(withOutline, 'stroke')).toBe(2)

    const plain = draw({ outline: false, dot: false })
    expect(count(plain, 'moveTo')).toBe(4)
    expect(count(plain, 'stroke')).toBe(1)
  })

  it('setzt die Striche auf Gap-Abstand und Gap plus Länge', () => {
    const ctx = draw({ outline: false, dot: false, gap: 3, len: 6 })
    // Nur die Strichbefehle: beginPath und stroke stehen dazwischen.
    const segs = ctx.calls.filter((c) => c.op === 'moveTo' || c.op === 'lineTo')
    expect(segs[0]).toEqual({ op: 'moveTo', args: [100, 47] })
    expect(segs[1]).toEqual({ op: 'lineTo', args: [100, 41] })
  })

  it('lässt bei Länge 0 die Striche weg, zeichnet den Punkt aber weiter', () => {
    const ctx = draw({ outline: false, dot: true, len: 0 })
    expect(count(ctx, 'stroke')).toBe(0)
    expect(count(ctx, 'arc')).toBe(1)
    expect(count(ctx, 'fill')).toBe(1)
  })

  it('zeichnet ohne Punkt keinen Kreis', () => {
    expect(count(draw({ dot: false, outline: false }), 'arc')).toBe(0)
  })

  it('legt die Kontur unter die Farbe, nicht darüber', () => {
    const ctx = draw({ outline: true, dot: true })
    const styles = ctx.calls
      .filter((c) => c.op === 'stroke' || c.op === 'fill')
      .map((c) => c.style)
    expect(styles).toEqual([
      'rgba(0,0,0,.85)', 'rgba(0,0,0,.85)',
      DEFAULT_CROSSHAIR.color, DEFAULT_CROSSHAIR.color,
    ])
  })
})
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Ausführen: `pnpm exec vitest run lib/crosshair/draw.test.ts`
Erwartet: FEHLSCHLAG, `Failed to resolve import "./draw"`

- [ ] **Schritt 3: Das Modul schreiben**

`lib/crosshair/draw.ts`:

```ts
export type CrosshairConfig = {
  color: string
  /** Abstand der Striche vom Mittelpunkt, in CSS-Pixeln. */
  gap: number
  len: number
  thick: number
  dot: boolean
  outline: boolean
}

/** Die Voreinstellung des Originals. */
export const DEFAULT_CROSSHAIR: CrosshairConfig = {
  color: '#25e0b8',
  gap: 3,
  len: 6,
  thick: 2,
  dot: false,
  outline: true,
}

/** Oben, unten, links, rechts. */
const SEG: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]]

/**
 * Zeichnet das Crosshair mittig auf (cx, cy).
 *
 * Dasselbe Modul bedient später die Vorschau in den Einstellungen — deshalb
 * nimmt es einen beliebigen Kontext und keine festen Bildmaße.
 */
export function drawCrosshair(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cfg: CrosshairConfig,
): void {
  const { gap: g, len: l, thick: t } = cfg

  const strokeSegs = () => {
    c.beginPath()
    for (const [dx, dy] of SEG) {
      c.moveTo(cx + dx * g, cy + dy * g)
      c.lineTo(cx + dx * (g + l), cy + dy * (g + l))
    }
    // Bei Länge 0 gäbe es nur Punkte auf der Stelle — der Strich entfällt ganz.
    if (l > 0) c.stroke()
  }

  if (cfg.outline) {
    c.strokeStyle = 'rgba(0,0,0,.85)'
    c.lineWidth = t + 2
    strokeSegs()
    if (cfg.dot) {
      c.beginPath()
      c.arc(cx, cy, t / 2 + 1, 0, Math.PI * 2)
      c.fillStyle = 'rgba(0,0,0,.85)'
      c.fill()
    }
  }

  c.strokeStyle = cfg.color
  c.lineWidth = t
  c.lineCap = 'butt'
  strokeSegs()
  if (cfg.dot) {
    c.beginPath()
    c.arc(cx, cy, t / 2, 0, Math.PI * 2)
    c.fillStyle = cfg.color
    c.fill()
  }
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg prüfen**

Ausführen: `pnpm exec vitest run lib/crosshair/draw.test.ts`
Erwartet: BESTANDEN, 4 Tests

- [ ] **Schritt 5: Gesamtlauf, Typprüfung, Commit**

```bash
pnpm test && pnpm exec tsc --noEmit
git add lib/crosshair/draw.ts lib/crosshair/draw.test.ts
git commit -m "feat: Crosshair-Zeichner als eigenes Modul"
```

---

### Aufgabe 4: Töne

**Dateien:**
- Erstellen: `lib/view/sfx.ts`

**Schnittstellen:**
- Verbraucht: `SoundId` aus `lib/engine/types`
- Liefert: `playQueue(queue: SoundId[], enabled: boolean): void`, `resumeAudio(): void`

Kein Test: die Datei ist eine dünne Hülle um `AudioContext`, den Vitest im Node-Betrieb nicht hat. Die Prüfung ist akustisch und passiert in Aufgabe 7.

- [ ] **Schritt 1: Das Modul schreiben**

`lib/view/sfx.ts`:

```ts
import type { SoundId } from '@/lib/engine/types'

let ac: AudioContext | null = null

/** Der Kontext entsteht erst beim ersten Ton — vorher darf ihn der Browser blocken. */
function ctx(): AudioContext | null {
  if (!ac) {
    try {
      ac = new AudioContext()
    } catch {
      return null
    }
  }
  return ac
}

function blip(freq: number, dur: number, type: OscillatorType, vol: number): void {
  const a = ctx()
  if (!a) return
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(vol, a.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur)
  o.connect(g)
  g.connect(a.destination)
  o.start()
  o.stop(a.currentTime + dur)
}

/** Der Schuss ist ein kurzes Rauschen mit steilem Abfall, kein Ton. */
function noise(): void {
  const a = ctx()
  if (!a) return
  const len = Math.floor(a.sampleRate * 0.06)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
  const n = a.createBufferSource()
  n.buffer = buf
  const g = a.createGain()
  g.gain.value = 0.06
  n.connect(g)
  g.connect(a.destination)
  n.start()
}

const TABLE: Record<SoundId, () => void> = {
  hit: () => blip(880, 0.06, 'square', 0.10),
  head: () => {
    blip(1320, 0.05, 'square', 0.11)
    setTimeout(() => blip(1760, 0.05, 'square', 0.08), 35)
  },
  miss: () => blip(160, 0.05, 'sawtooth', 0.05),
  go: () => blip(660, 0.09, 'triangle', 0.10),
  bad: () => blip(110, 0.22, 'sawtooth', 0.08),
  tick: () => blip(440, 0.04, 'sine', 0.05),
  shot: noise,
}

/**
 * Spielt die Warteschlange der Engine ab und leert sie.
 *
 * Das Stummschalten liegt bewusst hier: `play()` reiht Töne bedingungslos ein
 * und kennt `settings.sound` nicht. Auch stumm muss die Liste geleert werden,
 * sonst wächst sie über die ganze Runde.
 */
export function playQueue(queue: SoundId[], enabled: boolean): void {
  if (enabled) for (const id of queue) TABLE[id]()
  queue.length = 0
}

/** Nach einer Nutzergeste aufrufen — Browser starten den Kontext sonst suspendiert. */
export function resumeAudio(): void {
  void ctx()?.resume()
}
```

- [ ] **Schritt 2: Typprüfung und Commit**

```bash
pnpm exec tsc --noEmit
git add lib/view/sfx.ts
git commit -m "feat: Tonausgabe der Ansicht, Stummschalten inklusive"
```

---

### Aufgabe 5: Eingabeschicht

**Dateien:**
- Erstellen: `lib/view/input.ts`

**Schnittstellen:**
- Verbraucht: `applyMouse` aus `lib/engine/camera`, `fire` aus `lib/engine/game`, `GameState`/`Input` aus `lib/engine/types`
- Liefert: Typ `InputHost`, `createInput(host: InputHost): { input: Input; dispose(): void }`

Kein Test: die Datei besteht aus DOM-Ereignissen, und die Testumgebung ist `node`. Die Prüfung ist die Bedienung in Aufgabe 6 und 7.

- [ ] **Schritt 1: Das Modul schreiben**

`lib/view/input.ts`:

```ts
import { applyMouse } from '@/lib/engine/camera'
import { fire } from '@/lib/engine/game'
import type { GameState, Input } from '@/lib/engine/types'

/** Diese Tasten scrollen sonst die Seite. */
const SWALLOW = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'])

export type InputHost = {
  /** Das Element, das den Pointer Lock hält. */
  el: HTMLElement
  /** Der laufende Zustand, oder null solange keiner existiert. */
  game: () => GameState | null
  /** True, solange nicht gespielt wird: vor dem Start, in der Pause, nach dem Lauf. */
  frozen: () => boolean
  onLock: (locked: boolean) => void
}

/**
 * Bindet Tastatur, Maus und Pointer Lock an einen Zustand.
 *
 * Mausbewegung wird sofort angewandt und nicht bis zum nächsten Frame gesammelt:
 * ein Klick, der zwischen zwei Frames fällt, muss mit der Blickrichtung von
 * genau diesem Moment auswerten. Ein Frame Verzug wäre bei Flicks spürbar.
 */
export function createInput(host: InputHost): { input: Input; dispose(): void } {
  const input: Input = { keys: {}, mouseDown: false }
  let locked = false

  const releaseAll = () => {
    for (const k in input.keys) input.keys[k] = false
    input.mouseDown = false
  }

  const onKeyDown = (e: KeyboardEvent) => {
    input.keys[e.code] = true
    if (SWALLOW.has(e.code)) e.preventDefault()
    if (e.code === 'KeyR' && !host.frozen()) {
      const g = host.game()
      if (g) g.mode.reload?.(g)
    }
  }
  const onKeyUp = (e: KeyboardEvent) => { input.keys[e.code] = false }

  const onMouseDown = (e: MouseEvent) => {
    if (!locked) {
      // Kann abgelehnt werden — dann bleibt der Pausen-Schirm einfach stehen.
      void Promise.resolve(host.el.requestPointerLock()).catch(() => {})
      return
    }
    if (e.button !== 0 || host.frozen()) return
    const g = host.game()
    if (!g) return
    input.mouseDown = true
    // Halte-Modi werten über tick aus, geklickt wird dort nicht.
    if (!g.mode.hold) fire(g)
  }
  const onMouseUp = (e: MouseEvent) => { if (e.button === 0) input.mouseDown = false }

  const onMove = (e: MouseEvent) => {
    if (!locked || host.frozen()) return
    const g = host.game()
    if (!g) return
    applyMouse(g.camera, e.movementX, e.movementY, g.settings.sens)
  }

  const onLockChange = () => {
    locked = document.pointerLockElement === host.el
    if (!locked) releaseAll()
    host.onLock(locked)
  }

  host.el.addEventListener('mousedown', onMouseDown)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('blur', releaseAll)
  document.addEventListener('pointerlockchange', onLockChange)
  document.addEventListener('mousemove', onMove)

  return {
    input,
    dispose() {
      host.el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('blur', releaseAll)
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('mousemove', onMove)
    },
  }
}
```

- [ ] **Schritt 2: Typprüfung und Commit**

```bash
pnpm exec tsc --noEmit
git add lib/view/input.ts
git commit -m "feat: Eingabeschicht mit Pointer Lock und Sofort-Umrechnung der Maus"
```

---

### Aufgabe 6: Szene, Route und die Bildschleife

Ende dieser Aufgabe: `/play/gridshot` zeigt die Range, ein Klick bindet die Maus, Umsehen funktioniert, WASD bewegt in Bewegungsmodi. Noch keine Ziele, kein HUD.

**Dateien:**
- Erstellen: `app/range.css`
- Ändern: `app/layout.tsx` (ganze Datei ersetzen)
- Erstellen: `app/play/[mode]/page.tsx`
- Erstellen: `components/game/PlayScreen.tsx`
- Erstellen: `components/game/GameLoop.tsx`
- Erstellen: `components/game/Range.tsx`

**Schnittstellen:**
- Verbraucht: `createGame`/`tick`/`MAX_DT`/`DEFAULT_SETTINGS` aus `lib/engine/game`, `MODES` aus `lib/engine/modes`, `VFOV_DEG` aus `lib/engine/sens`, `PEEK_COVER` aus `lib/engine/modes/peek`, `camEuler`/`tz` aus `lib/view/coords`, `createInput` aus `lib/view/input`, `playQueue` aus `lib/view/sfx`
- Liefert:
  - `PlayScreen({ modeId }: { modeId: ModeId })` als Default-Export
  - `GameLoop(props: GameLoopProps)` mit
    ```ts
    export type GameLoopProps = {
      gameRef: RefObject<GameState | null>
      inputRef: RefObject<Input | null>
      frozenRef: RefObject<boolean>
      onOver: () => void
    }
    ```
    (Aufgabe 8 erweitert diesen Typ um `hudRef` und `fxRef`.)
  - `Range({ cover }: { cover?: boolean })`

- [ ] **Schritt 1: Gestaltung übernehmen**

`app/range.css` neu anlegen. Der Block ist bis auf die zusätzlichen `.fx`-Regeln (Aufgabe 8) und `#gameRoot` wörtlich der `<style>`-Abschnitt aus `reference/index.html` Zeile 8–135. Übernimm ihn vollständig aus der Datei — er ist erprobt, und Abweichungen kosten nur Ähnlichkeit zum Original. Zusätzlich am Ende:

```css
/* Wurzel des Spiels: der 3D-Canvas füllt das Fenster, der Zeiger verschwindet. */
#gameRoot{position:fixed;inset:0;background:var(--void)}
#gameRoot canvas{display:block;width:100%;height:100%;cursor:none}
#xhair{position:fixed;inset:0;pointer-events:none;z-index:9}
.webglfail{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
  text-align:center;padding:32px;z-index:40;background:var(--void)}
.webglfail p{max-width:460px;color:var(--dim);line-height:1.6}
```

- [ ] **Schritt 2: Layout auf das Original umstellen**

`app/layout.tsx` vollständig ersetzen:

```tsx
import type { Metadata } from 'next'
import { Roboto_Condensed } from 'next/font/google'
import './globals.css'
import './range.css'

const condensed = Roboto_Condensed({
  variable: '--font-condensed',
  subsets: ['latin'],
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'RANGE — Aim & Movement Trainer',
  description: 'Aim- und Movement-Trainer nach Valorant-Vorbild.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="de" className={condensed.variable}>
      <body>{children}</body>
    </html>
  )
}
```

`app/range.css` setzt `html, body` bereits auf dunkel und `overflow:hidden`; die Tailwind-Klassen aus dem Gerüst entfallen ersatzlos. In `app/range.css` die Schriftzeile so anpassen, dass sie die geladene Schrift benutzt:

```css
html,body{height:100%;background:var(--void);color:var(--bone);
  font-family:var(--font-condensed),'Roboto Condensed','Arial Narrow',system-ui,sans-serif;
  overflow:hidden}
```

- [ ] **Schritt 3: Die Route anlegen**

`app/play/[mode]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import PlayScreen from '@/components/game/PlayScreen'
import { MODES } from '@/lib/engine/modes'
import type { ModeId } from '@/lib/engine/types'

export default async function Page({ params }: PageProps<'/play/[mode]'>) {
  const { mode } = await params
  if (!(mode in MODES)) notFound()
  return <PlayScreen modeId={mode as ModeId} />
}
```

Die Modus-Definition selbst darf **nicht** als Prop weitergereicht werden: `ModeDef` enthält Funktionen und ist nicht serialisierbar. Der Client sucht sie über die ID selbst heraus.

- [ ] **Schritt 4: Die Range bauen**

`components/game/Range.tsx`:

```tsx
'use client'

import { PEEK_COVER } from '@/lib/engine/modes/peek'
import { tz } from '@/lib/view/coords'

/** Kante der Rückwand in Engine-Metern, wie im Original. */
const WALL_Z = 34
const WALL_W = 52
const WALL_H = 7

export function Range({ cover }: { cover?: boolean }) {
  const c = PEEK_COVER
  return (
    <>
      <color attach="background" args={['#0d151c']} />
      <ambientLight intensity={0.6} />
      {/* Rimlight von schräg oben — gibt den Kugeln ihre Kante. */}
      <directionalLight position={[8, 14, 6]} intensity={1.15} />

      {/* Boden */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#0d151c" />
      </mesh>
      {/* Raster im Zwei-Meter-Takt, genau wie das gezeichnete Raster des Originals. */}
      <gridHelper args={[96, 48, '#607c96', '#607c96']} position={[0, 0.02, 0]}>
        <lineBasicMaterial attach="material" color="#607c96" transparent opacity={0.18} />
      </gridHelper>

      {/* Rückwand */}
      <mesh position={[0, WALL_H / 2, tz(WALL_Z)]}>
        <planeGeometry args={[WALL_W, WALL_H]} />
        <meshStandardMaterial color="#1a2833" />
      </mesh>

      {cover && (
        <mesh position={[(c.x1 + c.x2) / 2, c.h / 2, tz(c.z)]}>
          <boxGeometry args={[c.x2 - c.x1, c.h, 0.4]} />
          <meshStandardMaterial color="#26333f" />
        </mesh>
      )}
    </>
  )
}
```

- [ ] **Schritt 5: Die Bildschleife bauen**

`components/game/GameLoop.tsx`:

```tsx
'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { MAX_DT, tick } from '@/lib/engine/game'
import type { GameState, Input } from '@/lib/engine/types'
import { camEuler } from '@/lib/view/coords'
import { playQueue } from '@/lib/view/sfx'

export type GameLoopProps = {
  gameRef: RefObject<GameState | null>
  inputRef: RefObject<Input | null>
  /** True, solange nicht simuliert werden darf: vor dem Start, in der Pause, nach dem Lauf. */
  frozenRef: RefObject<boolean>
  onOver: () => void
}

/**
 * Die einzige Stelle, an der der Spielzustand voranschreitet.
 *
 * Sie muss das erste Kind im Canvas sein: R3F ruft `useFrame`-Rückrufe gleicher
 * Priorität in der Reihenfolge ihrer Montage auf, und alle anderen Komponenten
 * lesen den Zustand, den diese Schleife gerade geschrieben hat.
 */
export function GameLoop({ gameRef, inputRef, frozenRef, onOver }: GameLoopProps) {
  const camera = useThree((s) => s.camera)
  const reported = useRef(false)

  useEffect(() => {
    camera.rotation.order = 'YXZ'
  }, [camera])

  useFrame((_, delta) => {
    const g = gameRef.current
    const input = inputRef.current
    if (!g || !input) return

    // Der Deckel ist Pflicht: ohne ihn degradieren nach einem Frame-Aussetzer
    // still die Bewegung, der Counterstrafe-Stopp, das Peek-Fenster und der
    // Feuertakt in Spray. Das Original klemmte an derselben Stelle.
    const dt = Math.min(delta, MAX_DT)

    if (!frozenRef.current && !g.over) {
      tick(g, input, dt)
      playQueue(g.sounds, g.settings.sound)
    } else {
      // Auch pausiert muss die Warteschlange leer bleiben.
      g.sounds.length = 0
    }

    // Die Kamera folgt immer, auch in der Pause — sonst friert das Bild schief ein.
    camera.position.set(g.player.x, g.player.y, -g.player.z)
    const e = camEuler(g.camera.yaw, g.camera.pitch)
    camera.rotation.set(e[0], e[1], e[2])

    if (g.over && !reported.current) {
      reported.current = true
      onOver()
    }
  })

  return null
}
```

- [ ] **Schritt 6: Die Klammer bauen**

`components/game/PlayScreen.tsx`:

```tsx
'use client'

import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { GameLoop } from './GameLoop'
import { Range } from './Range'
import { createGame, DEFAULT_SETTINGS } from '@/lib/engine/game'
import { MODES } from '@/lib/engine/modes'
import { VFOV_DEG } from '@/lib/engine/sens'
import type { GameState, Input, ModeId } from '@/lib/engine/types'
import { createInput } from '@/lib/view/input'
import { resumeAudio } from '@/lib/view/sfx'

/** Der Wert des Originals: nah genug, dass nichts vor der Nase verschwindet. */
const NEAR = 0.06

export default function PlayScreen({ modeId }: { modeId: ModeId }) {
  const mode = MODES[modeId]
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<GameState | null>(null)
  const inputRef = useRef<Input | null>(null)
  const frozenRef = useRef(true)

  // WebGL und Pointer Lock gibt es nur im Browser; vor der Montage wird nichts
  // gerendert, damit der Server keinen Zustand mit Zufallszahlen aufbaut.
  const [mounted, setMounted] = useState(false)
  const [locked, setLocked] = useState(false)
  const [over, setOver] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    gameRef.current = createGame(mode, DEFAULT_SETTINGS)
    const host = hostRef.current
    if (!host) return
    const ctl = createInput({
      el: host,
      game: () => gameRef.current,
      frozen: () => frozenRef.current,
      onLock: (l) => {
        setLocked(l)
        if (l) resumeAudio()
      },
    })
    inputRef.current = ctl.input
    return () => {
      ctl.dispose()
      inputRef.current = null
    }
  }, [mounted, mode])

  frozenRef.current = !locked || over

  if (!mounted) return <div id="gameRoot" />

  return (
    <div id="gameRoot" ref={hostRef}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ fov: VFOV_DEG, near: NEAR, far: 220 }}
      >
        <GameLoop
          gameRef={gameRef}
          inputRef={inputRef}
          frozenRef={frozenRef}
          onOver={() => {
            setOver(true)
            document.exitPointerLock()
          }}
        />
        <Range cover={mode.id === 'peek'} />
      </Canvas>
    </div>
  )
}
```

`camera.fov` ist bei Three der **vertikale** Öffnungswinkel — genau die Größe, die Valorants Hor+-Modell über alle Seitenverhältnisse konstant hält. `VFOV_DEG` wandert deshalb unverändert hinein und wird nie an das Fenster angepasst.

- [ ] **Schritt 7: Typprüfung und Sichtprüfung**

Ausführen: `pnpm exec tsc --noEmit` — erwartet: keine Ausgabe
Ausführen: `pnpm dev`, dann `http://localhost:3000/play/gridshot` öffnen.

Prüfen:
1. Boden mit Raster und Rückwand sind sichtbar, alles dunkel wie im Original.
2. Klick bindet die Maus, der Zeiger verschwindet.
3. Mausbewegung nach **rechts** dreht den Blick nach **rechts**; nach oben schaut nach oben.
4. Der Blick lässt sich knapp unter senkrecht kippen und rastet dort ein.
5. `http://localhost:3000/play/peek` zeigt zusätzlich die Deckung links, und **A/D** bewegen den Spieler — **D** nach rechts. Läuft es verkehrt herum, stimmt die z-Spiegelung nicht; siehe Aufgabe 1.
6. `Esc` löst den Lock, die Ansicht friert nicht ein, sondern bleibt stehen.
7. `http://localhost:3000/play/unsinn` liefert die 404-Seite.

- [ ] **Schritt 8: Commit**

```bash
git add app/range.css app/layout.tsx app/play components/game
git commit -m "feat: R3F-Szene, Route und Bildschleife mit dt-Deckel"
```

---

### Aufgabe 7: Ziele und Schuss

Ende dieser Aufgabe: Gridshot, Flickshots, Micro-Flicks, Target Switching, Smooth Tracking, Strafe Tracking und Reaktion sind spielbar, inklusive Ton.

**Dateien:**
- Erstellen: `components/game/Targets.tsx`
- Ändern: `components/game/PlayScreen.tsx` (Targets einhängen)

**Schnittstellen:**
- Verbraucht: `GameState` aus `lib/engine/types`
- Liefert: `Targets({ gameRef }: { gameRef: RefObject<GameState | null> })`

- [ ] **Schritt 1: Den Kugel-Pool bauen**

`components/game/Targets.tsx`:

```tsx
'use client'

import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import type { Mesh } from 'three'
import type { GameState } from '@/lib/engine/types'

/** Target Switching stellt sechs Ziele auf, Gridshot drei — acht ist reichlich. */
const POOL = 8

/**
 * Ein fester Vorrat an Kugeln, der jeden Frame aus dem Zustand nachgeführt wird.
 *
 * Die Ziel-Liste der Engine wird bei jedem Treffer neu besetzt; Meshes daran zu
 * knüpfen hieße, sie ständig neu zu erzeugen. Stattdessen bleibt der Vorrat
 * stehen und wird nur ein- und ausgeblendet.
 */
export function Targets({ gameRef }: { gameRef: RefObject<GameState | null> }) {
  const meshes = useRef<(Mesh | null)[]>([])

  useFrame(() => {
    const g = gameRef.current
    if (!g) return
    for (let i = 0; i < POOL; i++) {
      const m = meshes.current[i]
      if (!m) continue
      const t = g.targets[i]
      const show = !!t && !t.dead && !t.hidden
      m.visible = show
      if (!show || !t) continue
      m.position.set(t.x, t.y, -t.z)
      m.scale.setScalar(t.r)
    }
  })

  return (
    <>
      {Array.from({ length: POOL }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshes.current[i] = el }}
          visible={false}
        >
          <sphereGeometry args={[1, 28, 18]} />
          <meshStandardMaterial
            color="#ff4655"
            emissive="#ff4655"
            emissiveIntensity={0.55}
            roughness={0.35}
            metalness={0.05}
          />
        </mesh>
      ))}
    </>
  )
}
```

Die Geometrie hat Radius 1 und wird über `scale` auf `t.r` gebracht — so teilen sich alle acht Kugeln eine Geometrie.

- [ ] **Schritt 2: Einhängen**

In `components/game/PlayScreen.tsx` den Import ergänzen und die Komponente **nach** `GameLoop` einsetzen:

```tsx
import { Targets } from './Targets'
```

```tsx
        <GameLoop ... />
        <Range cover={mode.id === 'peek'} />
        <Targets gameRef={gameRef} />
```

- [ ] **Schritt 3: Typprüfung und Sichtprüfung**

Ausführen: `pnpm exec tsc --noEmit` — erwartet: keine Ausgabe
Ausführen: `pnpm dev`

Prüfen, jeweils mit gebundener Maus:
1. `/play/gridshot` — drei Kugeln, ein Treffer ersetzt genau die getroffene, Trefferton hörbar, Fehlschuss klingt anders.
2. `/play/flick` — eine Kugel, deutlich seitlich vom Blick; nach jedem Schuss steht die nächste woanders.
3. `/play/micro` — sehr kleine Kugel, Treffer klingt wie ein Kopfschuss.
4. `/play/switching` — sechs Kugeln, getroffene verschwinden, nach der sechsten steht ein neuer Satz.
5. `/play/tracking` — die Kugel fährt eine weiche Bahn; gedrückte Maustaste erhöht den Score nur, solange das Crosshair auf ihr liegt (noch ohne Crosshair: Bildmitte).
6. `/play/strafetrack` — harte Richtungswechsel und gelegentliche Sprünge.
7. `/play/reaction` — nach kurzer Wartezeit erscheint eine Kugel mit Signalton; ein Klick davor gibt den Fehlstart-Ton.
8. Ein Ziel hinter der Kamera ist nie treffbar.

- [ ] **Schritt 4: Commit**

```bash
git add components/game/Targets.tsx components/game/PlayScreen.tsx
git commit -m "feat: Ziele als Kugel-Pool, sieben Aim-Modi spielbar"
```

---

### Aufgabe 8: HUD, Crosshair und Trefferfeedback

Ende dieser Aufgabe: Zahlen oben, Balken links, Cue in der Mitte, Munition rechts unten, Hinweis unten, Crosshair und aufsteigende Treffertexte.

**Dateien:**
- Erstellen: `components/hud/Hud.tsx`
- Erstellen: `components/hud/Crosshair.tsx`
- Erstellen: `components/hud/FxLayer.tsx`
- Ändern: `app/range.css` (Regeln für `.fx`)
- Ändern: `components/game/GameLoop.tsx` (Snapshot, Balken, Fx)
- Ändern: `components/game/PlayScreen.tsx` (Overlays einhängen)

**Schnittstellen:**
- Verbraucht: `HudSnapshot`/`snapshot`/`speedPct`/`SPEED_ZONE_PCT`/`speedColor`/`expoPct`/`EXPO_ZONE_PCT`/`expoColor` aus `lib/view/hud`, `speed` aus `lib/engine/math`, `DEFAULT_CROSSHAIR`/`drawCrosshair` aus `lib/crosshair/draw`, `toThree` aus `lib/view/coords`
- Liefert:
  ```ts
  export type HudHandle = {
    set(snap: HudSnapshot): void
    setMeters(speed: number, exposureMs: number | null): void
  }
  export type FxHandle = { spawn(text: string, kind: Fx['kind'], x: number, y: number): void }
  ```
  `GameLoopProps` wächst um `hudRef: RefObject<HudHandle | null>` und `fxRef: RefObject<FxHandle | null>`.

- [ ] **Schritt 1: Fx-Regeln ergänzen**

Ans Ende von `app/range.css`:

```css
/* Trefferfeedback: Ring und Text, 550 ms, danach entfernt der Aufrufer das Element. */
#fxLayer{position:fixed;inset:0;pointer-events:none;z-index:11;overflow:hidden}
.fx{position:absolute;transform:translate(-50%,-50%);font:700 17px ui-monospace,monospace;
  white-space:nowrap;animation:fxText .55s linear forwards}
.fx:before{content:"";position:absolute;left:50%;top:50%;width:20px;height:20px;margin:-10px 0 0 -10px;
  border:2px solid currentColor;border-radius:50%;animation:fxRing .55s linear forwards}
.fx-good{color:var(--ok)}
.fx-bad{color:var(--sig)}
.fx-warn{color:var(--warn)}
@keyframes fxText{from{opacity:1;transform:translate(-50%,-50%)}
  to{opacity:0;transform:translate(-50%,calc(-50% - 48px))}}
@keyframes fxRing{from{transform:scale(1);opacity:1}to{transform:scale(7);opacity:0}}
@media (prefers-reduced-motion:reduce){.fx,.fx:before{animation-duration:.2s}}
```

- [ ] **Schritt 2: Das HUD bauen**

`components/hud/Hud.tsx`:

```tsx
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
      <div className="hudTop">
        <div className="pill cut"><div className="k">Zeit</div><div className="v">{s.time}</div></div>
        <div className="pill cut"><div className="k">Score</div><div className="v sig">{s.score}</div></div>
        <div className="pill cut"><div className="k">Acc</div><div className="v">{s.acc}</div></div>
        <div className="pill cut">
          <div className="k">{s.extraLabel}</div>
          <div className="v ok">{s.extra}</div>
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
```

- [ ] **Schritt 3: Das Crosshair bauen**

`components/hud/Crosshair.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { DEFAULT_CROSSHAIR, drawCrosshair } from '@/lib/crosshair/draw'

/**
 * Ein eigenes kleines 2D-Canvas über dem 3D-Canvas.
 *
 * Es liegt bewusst nicht in der Szene: so bleibt es pixelscharf und unabhängig
 * von der Auflösungs-Skalierung des Renderers. Neu gezeichnet wird nur bei
 * Größenänderung — das Crosshair steht fest in der Bildmitte.
 */
export function Crosshair() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const paint = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      cv.style.width = `${w}px`
      cv.style.height = `${h}px`
      const c = cv.getContext('2d')
      if (!c) return
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      c.clearRect(0, 0, w, h)
      drawCrosshair(c, w / 2, h / 2, DEFAULT_CROSSHAIR)
    }
    paint()
    window.addEventListener('resize', paint)
    return () => window.removeEventListener('resize', paint)
  }, [])

  return <canvas id="xhair" ref={ref} />
}
```

- [ ] **Schritt 4: Das Trefferfeedback bauen**

`components/hud/FxLayer.tsx`:

```tsx
'use client'

import { useImperativeHandle, useRef, type RefObject } from 'react'
import type { Fx } from '@/lib/engine/types'

/** Muss zur Animationsdauer in range.css passen. */
const LIFE_MS = 550

export type FxHandle = {
  spawn(text: string, kind: Fx['kind'], x: number, y: number): void
}

/**
 * Treffertexte als DOM statt als gezeichnete Schrift.
 *
 * Die Bewegung übernimmt CSS; hier entsteht nur ein Element pro Effekt, das
 * sich nach seiner Laufzeit selbst entfernt. Das spart eine zweite Zeichenebene
 * und hält die Schrift scharf.
 */
export function FxLayer({ handleRef }: { handleRef: RefObject<FxHandle | null> }) {
  const host = useRef<HTMLDivElement>(null)

  useImperativeHandle(handleRef, () => ({
    spawn(text, kind, x, y) {
      const h = host.current
      if (!h) return
      const el = document.createElement('div')
      el.className = `fx fx-${kind}`
      el.textContent = text
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      h.appendChild(el)
      setTimeout(() => el.remove(), LIFE_MS)
    },
  }), [])

  return <div id="fxLayer" ref={host} />
}
```

- [ ] **Schritt 5: Die Schleife erweitern**

`components/game/GameLoop.tsx` — Typ und Rumpf ergänzen:

```tsx
import { Vector3 } from 'three'
import { speed } from '@/lib/engine/math'
import type { FxHandle } from '@/components/hud/FxLayer'
import type { HudHandle } from '@/components/hud/Hud'
import { snapshot } from '@/lib/view/hud'
```

```tsx
export type GameLoopProps = {
  gameRef: RefObject<GameState | null>
  inputRef: RefObject<Input | null>
  frozenRef: RefObject<boolean>
  hudRef: RefObject<HudHandle | null>
  fxRef: RefObject<FxHandle | null>
  onOver: () => void
}
```

Im Komponentenrumpf, vor `useFrame`:

```tsx
  const size = useThree((s) => s.size)
  const sinceSnap = useRef(0)
  const projected = useRef(new Vector3())
```

und im `useFrame`, nach dem Nachführen der Kamera:

```tsx
    // Effekte erst nach dem Kamera-Update projizieren, sonst hängen sie einen Frame nach.
    if (g.fx.length) {
      const fx = fxRef.current
      for (const f of g.fx) {
        if (!fx) continue
        if (f.at === 'center') {
          fx.spawn(f.text, f.kind, size.width / 2, size.height * 0.35)
          continue
        }
        const v = projected.current.set(f.at.x, f.at.y, -f.at.z).project(camera)
        // z über 1 heißt hinter der Kamera — dort gibt es keinen Bildpunkt.
        if (v.z > 1) continue
        fx.spawn(
          f.text, f.kind,
          (v.x * 0.5 + 0.5) * size.width,
          (-v.y * 0.5 + 0.5) * size.height,
        )
      }
      g.fx.length = 0
    }

    const hud = hudRef.current
    if (hud) {
      // Die Balken laufen mit voller Bildrate: bei Counterstrafe entscheidet
      // ihre Latenz darüber, ob die Übung überhaupt funktioniert.
      if (g.mode.meters) {
        hud.setMeters(
          speed(g.player),
          g.mode.id === 'peek' ? (g.data.expo ?? 0) * 1000 : null,
        )
      }
      sinceSnap.current += dt
      if (sinceSnap.current >= 0.1) {
        sinceSnap.current = 0
        hud.set(snapshot(g))
      }
    }
```

Der Snapshot muss auch im eingefrorenen Zustand laufen, damit die Anzeige nach dem Binden der Maus sofort stimmt — der Block steht deshalb außerhalb der `frozen`-Abfrage.

- [ ] **Schritt 6: Einhängen**

In `components/game/PlayScreen.tsx`:

```tsx
import { Crosshair } from '@/components/hud/Crosshair'
import { FxLayer, type FxHandle } from '@/components/hud/FxLayer'
import { Hud, type HudHandle } from '@/components/hud/Hud'
```

```tsx
  const hudRef = useRef<HudHandle | null>(null)
  const fxRef = useRef<FxHandle | null>(null)
```

`GameLoop` bekommt `hudRef={hudRef} fxRef={fxRef}`, und **nach** dem `</Canvas>`:

```tsx
      <Hud handleRef={hudRef} meters={!!mode.meters} />
      <FxLayer handleRef={fxRef} />
      <Crosshair />
```

- [ ] **Schritt 7: Typprüfung und Sichtprüfung**

Ausführen: `pnpm exec tsc --noEmit` — erwartet: keine Ausgabe
Ausführen: `pnpm dev`

Prüfen:
1. `/play/gridshot` — Zeit zählt von 60 herunter, Score und Accuracy stimmen, Feld vier heißt „Streak“.
2. Das Crosshair steht scharf in der Bildmitte, Farbe `#25e0b8`, mit schwarzer Kontur.
3. Ein Treffer erzeugt einen Ring **an der Kugel**, nicht in der Bildmitte; ein Fehlschuss meldet sich mittig.
4. `/play/reaction` — Feld vier heißt „Ø ms“ und zeigt Zahlen.
5. `/play/counterstrafe` — der Tempo-Balken reagiert unmittelbar, wird grün unter 1,0 m/s und rot darüber; die grüne Zone endet bei knapp 15 % der Breite. Der Cue-Text steht groß im oberen Drittel.
6. `/play/peek` — der Exposure-Balken erscheint zusätzlich und färbt sich bei 320 und 600 ms um.
7. `/play/tracking` — das Acc-Feld zeigt einen Prozentwert ohne Leerzeichen, also die Zeit auf dem Ziel.
8. Der Hinweistext unten entspricht `mode.hint`.

- [ ] **Schritt 8: Commit**

```bash
git add app/range.css components/hud components/game
git commit -m "feat: HUD, Crosshair und Trefferfeedback"
```

---

### Aufgabe 9: Spray-Wand

Ende dieser Aufgabe: Spray Control ist spielbar, mit Wand, Zielring, Einschlägen, Munitionsanzeige und Nachladen über **R**.

**Dateien:**
- Erstellen: `components/game/SprayWall.tsx`
- Ändern: `components/game/PlayScreen.tsx`

**Schnittstellen:**
- Verbraucht: `SPRAY_AIM`/`SPRAY_RADIUS`/`SPRAY_WALL_Z` aus `lib/engine/modes/spray`, `tz` aus `lib/view/coords`
- Liefert: `SprayWall({ gameRef }: { gameRef: RefObject<GameState | null> })`

- [ ] **Schritt 1: Die Wand bauen**

`components/game/SprayWall.tsx`:

```tsx
'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { Color, InstancedMesh, Object3D } from 'three'
import { SPRAY_AIM, SPRAY_RADIUS, SPRAY_WALL_Z } from '@/lib/engine/modes/spray'
import type { GameState } from '@/lib/engine/types'
import { tz } from '@/lib/view/coords'

/** Deckel aus `spray.ts`: mehr Einschläge hält die Engine nicht vor. */
const MAX_HOLES = 120
/** Radius eines Einschlags in Metern, wie im Original. */
const HOLE_R = 0.035
/** Einschläge und Ringe liegen knapp vor der Wand, sonst flimmern sie. */
const EPS = 0.01

const WALL_W = 18
const WALL_H = 6

export function SprayWall({ gameRef }: { gameRef: RefObject<GameState | null> }) {
  const holes = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const inside = useMemo(() => new Color('#25e0b8'), [])
  const outside = useMemo(() => new Color('#141a20'), [])

  useFrame(() => {
    const g = gameRef.current
    const mesh = holes.current
    if (!g || !mesh) return
    for (let i = 0; i < MAX_HOLES; i++) {
      const h = g.holes[i]
      if (h) {
        dummy.position.set(h.x, h.y, tz(SPRAY_WALL_Z) + EPS * 2)
        dummy.scale.setScalar(1)
        mesh.setColorAt(i, h.d < SPRAY_RADIUS ? inside : outside)
      } else {
        // Ungenutzte Instanzen werden auf null skaliert statt versteckt —
        // InstancedMesh kennt keine Sichtbarkeit je Instanz.
        dummy.scale.setScalar(0)
      }
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <>
      <mesh position={[0, WALL_H / 2, tz(SPRAY_WALL_Z)]}>
        <planeGeometry args={[WALL_W, WALL_H]} />
        <meshStandardMaterial color="#20303d" />
      </mesh>

      {/* Der Kreis, innerhalb dessen ein Einschlag als sitzend zählt. */}
      <mesh position={[SPRAY_AIM.x, SPRAY_AIM.y, tz(SPRAY_WALL_Z) + EPS]}>
        <ringGeometry args={[SPRAY_RADIUS - 0.01, SPRAY_RADIUS, 64]} />
        <meshBasicMaterial color="#25e0b8" transparent opacity={0.5} />
      </mesh>
      {/* Ein zweiter Ring zur Orientierung, ohne Wertung. */}
      <mesh position={[SPRAY_AIM.x, SPRAY_AIM.y, tz(SPRAY_WALL_Z) + EPS]}>
        <ringGeometry args={[SPRAY_RADIUS * 2 - 0.01, SPRAY_RADIUS * 2, 64]} />
        <meshBasicMaterial color="#789bb0" transparent opacity={0.28} />
      </mesh>
      {/* Der Zielpunkt selbst. */}
      <mesh position={[SPRAY_AIM.x, SPRAY_AIM.y, tz(SPRAY_WALL_Z) + EPS * 2]}>
        <circleGeometry args={[0.03, 16]} />
        <meshBasicMaterial color="#ff4655" />
      </mesh>

      <instancedMesh ref={holes} args={[undefined, undefined, MAX_HOLES]}>
        <circleGeometry args={[HOLE_R, 12]} />
        <meshBasicMaterial />
      </instancedMesh>
    </>
  )
}
```

- [ ] **Schritt 2: Einhängen**

In `components/game/PlayScreen.tsx`:

```tsx
import { SprayWall } from './SprayWall'
```

```tsx
        <Targets gameRef={gameRef} />
        {mode.id === 'spray' && <SprayWall gameRef={gameRef} />}
```

- [ ] **Schritt 3: Typprüfung und Sichtprüfung**

Ausführen: `pnpm exec tsc --noEmit` — erwartet: keine Ausgabe
Ausführen: `pnpm dev`, `/play/spray`

Prüfen:
1. Die Wand steht in 15 m, der Zielpunkt auf 1,75 m Höhe, zwei Ringe darum.
2. Gedrückte Maustaste feuert in gleichmäßigem Takt, die Munition rechts unten zählt herunter, jeder Schuss knallt.
3. Die Einschläge steigen zuerst fast senkrecht und ziehen ab etwa Kugel 13 zur Seite — dasselbe Muster wie im Original.
4. Einschläge im inneren Ring sind grün, die übrigen dunkel.
5. Nach dem letzten Schuss erscheint ein Prozentwert mittig, das Feld „Sprays“ zählt hoch, nach 1,6 s ist das Magazin voll und die Wand leer.
6. **R** lädt sofort nach und löscht die Einschläge.
7. Das Acc-Feld zeigt Treffer pro Schuss, nicht die Tracking-Quote.

- [ ] **Schritt 4: Commit**

```bash
git add components/game/SprayWall.tsx components/game/PlayScreen.tsx
git commit -m "feat: Spray-Wand mit Einschlaegen als InstancedMesh"
```

---

### Aufgabe 10: Bewegungsmodi prüfen und nachziehen

Diese Aufgabe schreibt wenig Code. Sie stellt sicher, dass die drei Bewegungsmodi wirklich funktionieren — sie sind die einzigen, in denen Physik, Balkenlatenz und Deckungsgeometrie zusammenwirken.

**Dateien:**
- Ändern: nur bei gefundenen Abweichungen; erwartet werden `components/game/Range.tsx` und `components/hud/Hud.tsx`

- [ ] **Schritt 1: Counterstrafe prüfen**

`pnpm dev`, `/play/counterstrafe`:
1. Der Cue nennt eine Richtung; **A** oder **D** entsprechend gedrückt halten.
2. Nach etwa einer Viertelsekunde bei vollem Tempo erscheint ein Ziel mit Signalton, der Cue verschwindet.
3. Kurzes Antippen der Gegenrichtung bringt den Tempo-Balken binnen etwa 100 ms in den grünen Bereich; bloßes Loslassen dauert deutlich länger.
4. Ein Schuss im Grünen zählt und zeigt die Zeit an der Kugel, ein Schuss im Roten meldet „zu schnell“.
5. Ein Schuss vor dem Erscheinen meldet „noch nicht“.

- [ ] **Schritt 2: Peek prüfen**

`/play/peek`:
1. Der Spieler startet rechts hinter der Deckung, der Gegner ist verdeckt und unsichtbar.
2. **D** schiebt nach rechts ins Freie, der Gegner wird sichtbar, der Exposure-Balken beginnt zu laufen.
3. Bleibt man länger als 320 ms sichtbar, erscheint „ERWISCHT“, und nach gut einer Sekunde steht der Gegner neu.
4. Ein Treffer aus dem Stand zeigt die Exposure-Zeit an der Kugel und setzt den Gegner an eine neue Stelle.
5. **A** bringt zurück in Deckung, der Balken fällt auf null.
6. Die Deckung steht im Bild **links vorne** und passt zur Sichtlinie: wo der Gegner verschwindet, verdeckt ihn auch die gezeichnete Wand. Passt das nicht, stimmt die z-Spiegelung oder die Breite in `Range.tsx` nicht.

- [ ] **Schritt 3: Strafe & Shoot prüfen**

`/play/strafeshoot`:
1. Ziele stehen auf der Wand in 16 m und werden nach jedem Treffer ersetzt.
2. Das vierte HUD-Feld heißt „Stand-Quote“ und zeigt einen Prozentwert.
3. Ein Fehlschuss lässt das Ziel stehen.

- [ ] **Schritt 4: Abweichungen beheben und commiten**

Nur was in den Schritten 1–3 auffällt. Falls nichts auffällt, entfällt der Commit.

```bash
git add -A
git commit -m "fix: Bewegungsmodi an das Original angeglichen"
```

---

### Aufgabe 11: Pause, Ergebnis, Fallback und Menü

Ende dieser Aufgabe ist Phase 2 abgeschlossen: der Lauf hat einen Anfang, ein Ende und einen Weg zurück.

**Dateien:**
- Erstellen: `components/hud/PauseOverlay.tsx`
- Erstellen: `components/hud/Results.tsx`
- Ändern: `components/game/PlayScreen.tsx`
- Ändern: `app/page.tsx` (ganze Datei ersetzen)

**Schnittstellen:**
- Verbraucht: `coachLine` aus `lib/engine/coach`, `MODE_LIST` aus `lib/engine/modes`, `GameState` aus `lib/engine/types`
- Liefert: `PauseOverlay({ title, text, onResume, onQuit })`, `Results({ game, onAgain, onMenu })`

- [ ] **Schritt 1: Pausen-Schirm**

`components/hud/PauseOverlay.tsx`:

```tsx
'use client'

export function PauseOverlay({
  title, text, onResume, onQuit,
}: {
  title: string
  text: string
  onResume: () => void
  onQuit: () => void
}) {
  return (
    <div id="pause">
      <div className="box">
        <h2>{title}</h2>
        <p>{text}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn cut" onClick={onResume}>Maus binden</button>
          <button className="btn ghost cut" onClick={onQuit}>Abbrechen</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Schritt 2: Ergebnis-Schirm**

`components/hud/Results.tsx`:

```tsx
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
```

- [ ] **Schritt 3: Overlays und WebGL-Fallback einhängen**

`components/game/PlayScreen.tsx` erweitern. Ergänzungen im Kopf:

```tsx
import { useRouter } from 'next/navigation'
import { PauseOverlay } from '@/components/hud/PauseOverlay'
import { Results } from '@/components/hud/Results'
```

```tsx
  const router = useRouter()
  const [webgl, setWebgl] = useState(true)
  /** Erzwingt eine frische Runde bei „Nochmal“: neuer Key, neuer Canvas. */
  const [runId, setRunId] = useState(0)
```

Im Montage-Effekt zusätzlich:

```tsx
    setWebgl(!!document.createElement('canvas').getContext('webgl2'))
```

Der Effekt, der das Spiel erzeugt, bekommt `runId` in die Abhängigkeiten:

```tsx
  }, [mounted, mode, runId])
```

Vor dem `return`:

```tsx
  if (!mounted) return <div id="gameRoot" />
  if (!webgl) {
    return (
      <div className="webglfail">
        <p>
          Dieser Browser stellt kein WebGL bereit. Aktiviere die
          Hardwarebeschleunigung in den Browser-Einstellungen und lade die Seite neu.
        </p>
      </div>
    )
  }
```

Nach dem Crosshair im Baum:

```tsx
      {over && gameRef.current && (
        <Results
          game={gameRef.current}
          onAgain={() => { setOver(false); setRunId((n) => n + 1) }}
          onMenu={() => router.push('/')}
        />
      )}
      {!over && !locked && (
        <PauseOverlay
          title={started ? 'Pausiert' : 'Bereit'}
          text={started
            ? 'Klick, um weiterzumachen. Esc pausiert.'
            : 'Klick, um die Maus zu binden. Esc pausiert.'}
          onResume={() => { void hostRef.current?.requestPointerLock() }}
          onQuit={() => router.push('/')}
        />
      )}
```

Dazu ein Ref, das sich merkt, ob überhaupt schon gespielt wurde:

```tsx
  const startedRef = useRef(false)
  const started = startedRef.current
```

und im `onLock`-Rückruf `if (l) startedRef.current = true`. Beim Wechsel von `runId` wird `startedRef.current = false` gesetzt — dieselbe Zeile in den Erzeugungs-Effekt.

Der `GameLoop` liest den Zustand über `gameRef`; der neue Lauf ersetzt schlicht dessen Inhalt. Der `reported`-Ref in `GameLoop` muss dabei zurückgesetzt werden — dafür bekommt der `<GameLoop>` ein `key={runId}`.

- [ ] **Schritt 4: Menü**

`app/page.tsx` vollständig ersetzen:

```tsx
import Link from 'next/link'
import { MODE_LIST } from '@/lib/engine/modes'
import { cm360, edpi } from '@/lib/engine/sens'
import { DEFAULT_SETTINGS } from '@/lib/engine/game'
import type { ModeDef } from '@/lib/engine/types'

const GROUPS: [ModeDef['cat'], string][] = [
  ['aim', 'Aim'],
  ['spray', 'Recoil'],
  ['move', 'Movement'],
]

export default function Home() {
  const s = DEFAULT_SETTINGS
  return (
    <div className="screen">
      <div className="wrap">
        <header className="brand">
          <div>
            <div className="logo">RA<em>N</em>GE</div>
            <div className="tag">Aim &amp; Movement Trainer</div>
          </div>
          <div className="sensbadge">
            Sens <b>{s.sens}</b> · <b>{s.dpi}</b> DPI · eDPI <b>{edpi(s.sens, s.dpi)}</b><br />
            <b>{cm360(s.sens, s.dpi).toFixed(1)}</b> cm/360 · FOV 103 (Hor+)
          </div>
        </header>

        {GROUPS.map(([cat, title]) => (
          <section key={cat}>
            <div className="eyebrow">{title}</div>
            <div className="grid">
              {MODE_LIST.filter((m) => m.cat === cat).map((m) => (
                <Link className="card cut" key={m.id} href={`/play/${m.id}`}>
                  <span className={`skill${m.core ? ' core' : ''}`}>{m.skill}</span>
                  <h3>{m.name}</h3>
                  <p>{m.desc}</p>
                  <div className="best"><span>{m.metricName}</span><b>—</b></div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <div className="foot">
          Einstellungen, Bestwerte und Routinen kommen in der nächsten Phase.
        </div>
      </div>
    </div>
  )
}
```

`.screen` setzt `overflow-y:auto`, das Menü ist also scrollbar, obwohl `body` auf `overflow:hidden` steht.

- [ ] **Schritt 5: Typprüfung, Gesamtlauf und Abnahme**

Ausführen: `pnpm test` — erwartet: alle Tests grün
Ausführen: `pnpm exec tsc --noEmit` — erwartet: keine Ausgabe
Ausführen: `pnpm build` — erwartet: erfolgreicher Build ohne Fehler
Ausführen: `pnpm dev`

Abnahme, jeder Modus einmal von vorn bis hinten:
1. Das Menü zeigt elf Karten in drei Gruppen; jede führt in ihren Modus.
2. Jeder Lauf beginnt mit „Bereit“, ein Klick bindet die Maus.
3. `Esc` pausiert, das Bild bleibt stehen, der Klick auf „Maus binden“ macht weiter — und die Uhr ist in der Pause **nicht** weitergelaufen.
4. Nach Ablauf der Zeit erscheint der Ergebnis-Schirm mit den Werten aus `stats()` und einem Coach-Satz, der zum Lauf passt.
5. „Nochmal“ startet frisch bei voller Zeit und leerem Score.
6. „Zurück“ führt ins Menü.
7. Vergleich mit `reference/index.html` im zweiten Tab: Blickgeschwindigkeit bei gleicher Sensitivity, Bewegungs- und Bremsverhalten und der Feuertakt im Spray fühlen sich gleich an.

- [ ] **Schritt 6: Commit**

```bash
git add app components
git commit -m "feat: Pause, Ergebnis-Schirm, WebGL-Fallback und Modi-Menue"
```

---

## Was Phase 2 bewusst offen lässt

Diese Punkte gehören nicht in diesen Plan und dürfen nicht nebenbei mitgebaut werden:

- **Persistenz.** Alle Läufe benutzen `DEFAULT_SETTINGS`, Bestwerte zeigen „—“. Phase 3.
- **Einstellungen.** Sensitivity, DPI, Rundenlänge, Zielgröße, Waffe, Sound und Crosshair sind fest verdrahtet. Phase 3.
- **Routinen-Warteschlange.** `ROUTINES` existiert in der Engine, hat aber keine Oberfläche und keinen „Weiter in der Routine“-Knopf. Phase 3 zusammen mit dem Menü.
- **Bloom und Render-Qualität.** `@react-three/postprocessing` wird nicht installiert; der Schalter dafür kommt mit den Einstellungen. Phase 3.
- **shadcn-Oberfläche.** Menü und Ergebnis benutzen die Klassen aus `range.css`. Der Umbau auf shadcn-Komponenten ist Phase 3.
- **Run-Historie und Charts.** Phase 4.
