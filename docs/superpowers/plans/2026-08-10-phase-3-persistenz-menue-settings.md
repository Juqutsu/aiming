# Phase 3 — Persistenz, Menü und Settings

> **Für agentische Bearbeiter:** ERFORDERLICHE UNTER-SKILL: `superpowers:subagent-driven-development` (empfohlen) oder `superpowers:executing-plans`. Die Schritte sind als Checkboxen (`- [ ]`) geführt.

**Ziel:** Bestwerte und Einstellungen überleben den Reload. Das Menü zeigt echte Zahlen statt Striche, die Einstellungen sind bedienbar, und die drei eingebauten Routinen sind am Stück spielbar.

**Architektur:** Die Persistenz ist eine Handvoll reiner Funktionen über einer injizierbaren `Storage`-Schnittstelle — headless testbar, ohne Browser. Darüber liegt genau ein React-Kontext, der die geladenen Werte hält und Änderungen durchschreibt. Der Spielzustand bleibt unberührt: die Engine kennt weiterhin nur `Settings`, und `PlayScreen` bekommt sie als Objekt statt als Konstante.

**Tech-Stack:** unverändert (Next 16, React 19.2, TypeScript strict, three 0.185, R3F 9.7, Vitest 4, pnpm) plus die shadcn-Komponenten aus Aufgabe 5.

## Entscheidungen, die diesem Plan vorausgehen

- **shadcn nur für die Regler.** Menü, Ergebnis und Pause bleiben auf `app/range.css` — sie sehen aus wie das Original, und genau das ist Teil der Abnahme. shadcn kommt für den Settings-Dialog, wo Slider, Select und Switch echte Arbeit sparen.
- **Die eingebauten Routinen kommen jetzt.** `lib/engine/routines.ts` liegt fertig da, und das Original zeigt sie im Menü. Der Routinen-*Builder* (eigene Routinen) bleibt Phase 5.

## Globale Vorgaben

Diese Punkte gelten für **jede** Aufgabe in diesem Plan.

- **Kaputte gespeicherte Daten dürfen die App nicht abschießen.** Jeder Lesezugriff auf den Speicher validiert und fällt bei Unsinn auf den Standardwert zurück. `localStorage` ist Nutzergebiet: er kann von Hand editiert, von einer älteren Version geschrieben oder halb voll sein.
- **Der Speicher wird nie direkt angefasst.** Kein `localStorage.getItem` außerhalb von `lib/store/`. Die Module dort nehmen eine `Storage`-Schnittstelle entgegen, damit sie ohne Browser testbar bleiben.
- **Spielzustand niemals in `useState`** — unverändert aus Phase 2. Einstellungen sind kein Spielzustand: sie ändern sich durch Nutzereingabe, nicht pro Frame, und gehören in den Kontext.
- **Die Engine bleibt unberührt.** Kein Modus, keine Datei unter `lib/engine/` wird für diese Phase geändert.
- **Kein Wert wird doppelt definiert.** `DEFAULT_SETTINGS`, `DEFAULT_CROSSHAIR`, `MODE_LIST`, `ROUTINES`, `HFOV_DEG`, `edpi`, `cm360` werden importiert.
- **Kommentare deutsch**, im Stil der bestehenden Dateien unter `lib/engine/` und `lib/view/`: sie begründen, warum etwas so ist.
- **Keine neuen Abhängigkeiten außer den shadcn-Komponenten** aus Aufgabe 5. Kein Zustandsspeicher-Paket, kein Formular-Paket, kein Zod.
- **Tests nur gegen `lib/`.** Die neuen Module unter `lib/store/` sind reine Logik und bekommen echte Tests. Für Komponenten gibt es weiterhin keine Tests; jede Komponentenaufgabe endet mit einer konkreten Sichtprüfung.
- **Nach jeder Aufgabe grün:** `pnpm test`, `pnpm exec tsc --noEmit` und `pnpm lint` (Letzteres darf nur den einen Altfehler in `lib/engine/types.ts:90` melden).

## Dateien

```
lib/store/keys.ts            Speicherschlüssel und die Storage-Schnittstelle   (Aufgabe 1)
lib/store/settings.ts        Laden/Speichern von Settings und CrosshairConfig  (Aufgabe 1)
lib/store/settings.test.ts
lib/store/best.ts            Bestwerte, inklusive lowerBetter-Vergleich        (Aufgabe 2)
lib/store/best.test.ts
lib/store/session.ts         Lauf-Verlauf dieser Sitzung                       (Aufgabe 3)
lib/store/session.test.ts
lib/routine/step.ts          Routinen-Schritt aus URL-Parametern               (Aufgabe 4)
lib/routine/step.test.ts

components/settings/SettingsProvider.tsx   der eine Kontext                    (Aufgabe 5)
app/layout.tsx                             Provider einhängen, dark-Klasse     (Aufgabe 5)
app/globals.css                            shadcn-Tokens auf die RANGE-Palette (Aufgabe 5)

components/ui/*                            von der shadcn-CLI erzeugt          (Aufgabe 6)
components/settings/SettingsDialog.tsx     Maus · Spiel · Crosshair            (Aufgabe 6)
components/settings/CrosshairPreview.tsx   Vorschau auf 2D-Canvas              (Aufgabe 6)

app/page.tsx                               Bestwerte, Sens-Badge, Routinen     (Aufgabe 7)
components/game/PlayScreen.tsx             Settings und Routine aus dem Kontext(Aufgabe 8)
components/hud/Crosshair.tsx               Crosshair aus dem Kontext           (Aufgabe 8)
components/hud/Results.tsx                 Bestwert, Weiter, Verlauf           (Aufgabe 9)
```

Nicht in Phase 3: Run-Historie über Sitzungen hinweg und Charts (Phase 4), Routinen-Builder, Crosshair-Presets und Valorant-Import (Phase 5), Bloom.

---

### Aufgabe 1: Speicherschicht für Einstellungen

**Dateien:** erstellen `lib/store/keys.ts`, `lib/store/settings.ts`; Test `lib/store/settings.test.ts`

**Schnittstellen:**
- Verbraucht: `DEFAULT_SETTINGS` aus `lib/engine/game`, `Settings`/`WeaponId` aus `lib/engine/types`, `DEFAULT_CROSSHAIR`/`CrosshairConfig` aus `lib/crosshair/draw`
- Liefert:
  ```ts
  // keys.ts
  export type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  export const KEY: { settings: string; crosshair: string; best: string; session: string }
  export function readJson<T>(store: Store, key: string): unknown
  export function writeJson(store: Store, key: string, value: unknown): void
  export function browserStore(): Store | null
  // settings.ts
  export function loadSettings(store: Store): Settings
  export function saveSettings(store: Store, s: Settings): void
  export function loadCrosshair(store: Store): CrosshairConfig
  export function saveCrosshair(store: Store, c: CrosshairConfig): void
  ```

Die Schlüssel tragen eine Version (`range.settings.v1`), damit ein späteres Schema-Update alte Daten erkennen und verwerfen kann, statt an ihnen zu ersticken.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

`lib/store/settings.test.ts`. Ein `Map`-basierter Fake-Store steht am Anfang der Datei:

```ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/lib/engine/game'
import { DEFAULT_CROSSHAIR } from '@/lib/crosshair/draw'
import { KEY, type Store } from './keys'
import { loadCrosshair, loadSettings, saveCrosshair, saveSettings } from './settings'

function fakeStore(seed: Record<string, string> = {}): Store & { map: Map<string, string> } {
  const map = new Map(Object.entries(seed))
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v) },
    removeItem: (k) => { map.delete(k) },
  }
}
```

Die Fälle:

1. Ein leerer Speicher liefert exakt `DEFAULT_SETTINGS` bzw. `DEFAULT_CROSSHAIR`.
2. Was gespeichert wurde, kommt unverändert zurück (Rundlauf über `saveSettings` → `loadSettings`, mit abweichenden Werten in jedem Feld).
3. Kaputtes JSON (`'{nicht json'`) liefert die Standardwerte, ohne zu werfen.
4. Ein Objekt mit falschen Typen (`{ sens: 'schnell', dpi: null, weapon: 'ak47', sound: 'ja' }`) liefert **feldweise** die Standardwerte — ein einzelnes verdorbenes Feld darf nicht die ganzen Einstellungen kosten.
5. Ein Objekt mit gültigen und ungültigen Feldern gemischt behält die gültigen (`{ sens: 0.4, dpi: 'viel' }` → `sens` 0.4, `dpi` Standard).
6. Zahlen außerhalb der erlaubten Bereiche werden geklemmt, nicht verworfen: `sens: 999` → der obere Grenzwert, `dur: 2` → der untere.
7. `weapon` akzeptiert nur `'vandal'` und `'phantom'`.
8. Für `CrosshairConfig` dieselben Fälle: `color` muss ein `#rrggbb`-String sein, `dot`/`outline` echte Booleans, die drei Zahlen geklemmt.
9. `saveSettings` schreibt unter `KEY.settings` und rührt `KEY.crosshair` nicht an.

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen** — `pnpm exec vitest run lib/store/settings.test.ts`, erwartet: Auflösungsfehler auf `./keys`.

- [ ] **Schritt 3: Die Module schreiben**

`lib/store/keys.ts`:

```ts
/**
 * Der Ausschnitt der Web-Storage-API, den wir wirklich brauchen.
 *
 * Als Schnittstelle statt als direkter Zugriff auf `localStorage`, damit die
 * Speicherlogik ohne Browser testbar bleibt — und damit ein Wechsel des
 * Rückens später eine Änderung an einer Stelle ist.
 */
export type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** Die Version im Schlüssel erlaubt es, altes Schema später zu erkennen statt daran zu scheitern. */
export const KEY = {
  settings: 'range.settings.v1',
  crosshair: 'range.crosshair.v1',
  best: 'range.best.v1',
  session: 'range.session.v1',
} as const

/** Rohwert aus dem Speicher. Unlesbares gilt als nicht vorhanden. */
export function readJson<T = unknown>(store: Store, key: string): unknown {
  try {
    const raw = store.getItem(key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

/** Schreiben darf fehlschlagen — ein voller oder gesperrter Speicher ist kein Grund abzustürzen. */
export function writeJson(store: Store, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value))
  } catch {
    // Absichtlich still: die Einstellung gilt für diese Sitzung trotzdem.
  }
}

/** `localStorage`, oder null wenn es ihn nicht gibt (Server, blockierte Cookies). */
export function browserStore(): Store | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
```

`lib/store/settings.ts` — die Validierung besteht aus drei kleinen Helfern, die die Datei für sich behält:

```ts
function num(v: unknown, lo: number, hi: number, fallback: number): number
function bool(v: unknown, fallback: boolean): boolean
function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T
```

`num` klemmt statt zu verwerfen — eine Sensitivity von 999 aus einer alten Version ist ein Wert, den der Nutzer einmal wollte, kein Datenmüll. `NaN` und Nicht-Zahlen fallen auf den Standard. Die Grenzen stammen aus den Reglern des Originals (`reference/index.html` Zeile 207–241) und gehören als benannte Konstanten in diese Datei:

```ts
/** Grenzen der Regler, wie im Original. */
export const LIMITS = {
  sens: [0.05, 1.2],
  dpi: [100, 6400],
  dur: [15, 180],
  sizeMul: [0.5, 1.8],
  gap: [0, 14],
  len: [0, 20],
  thick: [1, 6],
} as const
```

`loadSettings` liest, prüft jedes Feld einzeln gegen `DEFAULT_SETTINGS` und gibt immer ein vollständiges `Settings` zurück. `loadCrosshair` genauso gegen `DEFAULT_CROSSHAIR`, mit einer Farbprüfung per `/^#[0-9a-f]{6}$/i`.

- [ ] **Schritt 4: Test grün, Gesamtlauf, Commit**

```bash
pnpm exec vitest run lib/store/settings.test.ts
pnpm test && pnpm exec tsc --noEmit && pnpm lint
git add lib/store && git commit -m "feat: Einstellungen persistent, mit feldweiser Validierung"
```

---

### Aufgabe 2: Bestwerte

**Dateien:** erstellen `lib/store/best.ts`; Test `lib/store/best.test.ts`

**Schnittstellen:**
- Verbraucht: `KEY`/`Store`/`readJson`/`writeJson` aus `./keys`, `GameState`/`ModeId` aus `lib/engine/types`
- Liefert:
  ```ts
  export type BestMap = Partial<Record<ModeId, number>>
  export function loadBest(store: Store): BestMap
  export function clearBest(store: Store): void
  /** True, wenn `metric` den bisherigen Wert schlägt. Ohne bisherigen Wert immer true. */
  export function beatsBest(metric: number, prev: number | undefined, lowerBetter: boolean): boolean
  /** Wertet einen beendeten Lauf. Gibt die neue Karte und zurück, ob es ein Bestwert war. */
  export function submitBest(store: Store, g: GameState, best: BestMap): { best: BestMap; isBest: boolean }
  ```

**Die Falle, die dieser Aufgabe ihren Wert gibt:** `reaction.metric()` liefert `9999`, wenn keine gültige Reaktion gemessen wurde — ausdrücklich, damit ein leerer Lauf keinen Bestwert setzt. Bei `lowerBetter: true` und leerer Bestwert-Karte ist `9999` aber trotzdem der erste Wert und wird gespeichert; genau das passiert im Original. Ein Lauf ohne jede Messung darf gar nicht erst eingereicht werden.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

`lib/store/best.test.ts`, mit demselben Fake-Store wie in Aufgabe 1 (kopiere den Helfer; drei Zeilen doppelt sind billiger als eine geteilte Testhilfe, die zwei Dateien koppelt):

1. `beatsBest` bei `lowerBetter: false`: größer schlägt, gleich schlägt nicht, kleiner schlägt nicht.
2. `beatsBest` bei `lowerBetter: true`: kleiner schlägt, gleich nicht, größer nicht.
3. `beatsBest` mit `prev: undefined` ist immer true — außer der Lauf hat nichts gemessen, was `submitBest` abfängt, nicht `beatsBest`.
4. `submitBest` mit einem Gridshot-Lauf (`createGame(MODES.gridshot, DEFAULT_SETTINGS)`, `g.score = 30`, `g.shots = 40`) schreibt 30 und meldet `isBest: true`; ein zweiter Lauf mit 20 meldet `false` und lässt die 30 stehen.
5. **Der Reaktions-Fall:** ein Lauf von `MODES.reaction` ohne Schüsse (`g.shots === 0`) wird **nicht** eingetragen — `best.reaction` bleibt `undefined`, `isBest` ist `false`. Danach ein Lauf mit `g.react = [250]` und `g.shots = 1` trägt 250 ein.
6. Ein Tracking-Lauf ohne Feuerzeit (`trackTotal === 0`, `shots === 0`) wird ebenfalls nicht eingetragen.
7. `loadBest` liefert `{}` bei leerem Speicher, verwirft Nicht-Zahlen feldweise und ignoriert unbekannte Modus-Schlüssel.
8. `clearBest` leert den Eintrag.

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

- [ ] **Schritt 3: Das Modul schreiben.** Die Einreich-Sperre als eigene, benannte Bedingung:

```ts
/**
 * Hat der Lauf überhaupt etwas gemessen?
 *
 * `reaction.metric()` gibt bewusst 9999 zurück, wenn nichts gemessen wurde.
 * Bei `lowerBetter` wäre das trotzdem der erste und damit beste Wert — ein
 * Bestwert, den niemand gespielt hat. Klick- und Halte-Modi unterscheiden sich
 * darin, was „etwas passiert" heißt, deshalb beide Zähler.
 */
function hatGemessen(g: GameState): boolean {
  return g.shots > 0 || g.trackTotal > 0
}
```

- [ ] **Schritt 4: Test grün, Gesamtlauf, Commit** — `git commit -m "feat: Bestwerte je Modus, leere Laeufe zaehlen nicht"`

---

### Aufgabe 3: Verlauf dieser Sitzung

**Dateien:** erstellen `lib/store/session.ts`; Test `lib/store/session.test.ts`

**Schnittstellen:**
- Liefert:
  ```ts
  export type RunRow = { mode: string; score: number; acc: string; detail: string }
  export function loadSession(store: Store): RunRow[]
  export function pushRun(store: Store, g: GameState): RunRow[]
  export function clearSession(store: Store): void
  ```

`pushRun` bildet die Zeile aus dem beendeten Lauf: `mode.name`, `g.score`, `pc(g.hits, g.shots)` und als Detail den **dritten** Statistik-Wert aus `mode.stats(g)` — genau wie das Original (`reference/index.html` Zeile 1259). Fehlt der dritte Eintrag, steht `'–'`.

Der Verlauf gehört in `sessionStorage`, nicht in `localStorage`: er beschreibt diese Sitzung, und ein Verlauf von vorgestern beim Öffnen wäre falsch. Das Modul nimmt die `Store`-Schnittstelle entgegen und entscheidet nicht selbst, welcher es ist — der Aufrufer reicht `sessionStorage` herein.

Tests: leerer Speicher liefert `[]`; `pushRun` hängt an und gibt die vollständige Liste zurück; kaputter Inhalt liefert `[]` statt zu werfen; ein Eintrag mit fehlenden Feldern wird beim Laden verworfen, die intakten bleiben; die Liste ist auf 20 Einträge gedeckelt (die Tabelle im Ergebnis-Schirm soll nicht endlos wachsen).

- [ ] Schritte wie in Aufgabe 1 und 2: Test zuerst, Fehlschlag prüfen, schreiben, grün, Commit `feat: Lauf-Verlauf der Sitzung`.

---

### Aufgabe 4: Routinen-Schritt aus der URL

**Dateien:** erstellen `lib/routine/step.ts`; Test `lib/routine/step.test.ts`

**Schnittstellen:**
- Verbraucht: `ROUTINES`/`RoutineId` aus `lib/engine/routines`, `MODES`/`ModeId` aus `lib/engine/modes`
- Liefert:
  ```ts
  export type RoutineStep = {
    routine: RoutineId
    index: number
    modeId: ModeId
    dur: number
    /** Der nächste Schritt, oder null am Ende. */
    next: { modeId: ModeId; href: string } | null
    /** Anzeige: „Station 2 von 5". */
    label: string
  }
  /** Liest Routine und Schritt aus den Suchparametern. null, wenn kein gültiger Schritt drinsteht. */
  export function readStep(params: URLSearchParams, modeId: ModeId): RoutineStep | null
  /** Der Link auf die erste Station. */
  export function routineHref(routine: RoutineId, index?: number): string
  ```

Die Warteschlange lebt vollständig in der URL: `/play/gridshot?routine=warmup&step=1`. Das kostet keinen Zustandsspeicher, überlebt einen Reload mitten in der Routine und macht jede Station teilbar.

`readStep` gibt `null` zurück, wenn die Routine unbekannt ist, der Index außerhalb liegt, **oder** der Modus in der URL nicht zu dem Modus passt, den die Routine an dieser Stelle vorsieht. Der letzte Fall ist der wichtige: sonst spielt jemand nach einem Tippfehler in der Adresse den falschen Modus mit der Dauer eines anderen.

Tests: gültiger Schritt liefert Modus und Dauer aus `ROUTINES`; `next` zeigt auf `step+1` und ist beim letzten Schritt `null`; unbekannte Routine, nicht-numerischer Schritt, negativer Schritt, zu großer Schritt und Modus-Mismatch liefern alle `null`; `label` zählt ab 1 (`'Station 1 von 5'`); `routineHref('warmup')` zeigt auf die erste Station mit deren Modus.

- [ ] Schritte wie zuvor. Commit `feat: Routinen-Schritt aus den URL-Parametern`.

---

### Aufgabe 5: Der Einstellungs-Kontext

Ende dieser Aufgabe ist noch nichts sichtbar anders — aber die geladenen Einstellungen stehen überall bereit, und shadcn-Komponenten würden dunkel rendern statt hell.

**Dateien:** erstellen `components/settings/SettingsProvider.tsx`; ändern `app/layout.tsx`, `app/globals.css`

**Schnittstellen:**
```ts
export type SettingsApi = {
  settings: Settings
  crosshair: CrosshairConfig
  best: BestMap
  /** True, sobald aus dem Speicher gelesen wurde. Vorher gelten die Standardwerte. */
  ready: boolean
  setSettings(patch: Partial<Settings>): void
  setCrosshair(patch: Partial<CrosshairConfig>): void
  resetBest(): void
  /** Trägt einen beendeten Lauf ein. Gibt zurück, ob es ein Bestwert war. */
  submitRun(g: GameState): boolean
}
export function SettingsProvider({ children }: { children: ReactNode }): ReactElement
export function useSettings(): SettingsApi
```

- [ ] **Schritt 1: Den Provider schreiben**

Er hält `settings`, `crosshair`, `best` und `ready` in `useState` — das sind Nutzereinstellungen, kein Spielzustand, und sie ändern sich nur auf Eingabe.

Gelesen wird **einmal nach der Montage** in einem Effekt, nicht während des Renderns: der Server hat keinen `localStorage`, und ein Lesezugriff im Render-Rumpf wäre ein Hydration-Mismatch. Bis dahin gelten `DEFAULT_SETTINGS` und `DEFAULT_CROSSHAIR`, und `ready` ist `false` — Verbraucher, für die der Unterschied sichtbar wäre (die Bestwerte im Menü), zeigen bis dahin einen Strich.

`setSettings` und `setCrosshair` nehmen ein Teilobjekt, mischen es in den Zustand und schreiben **im selben Aufruf** durch. Kein Effekt, der auf Änderungen lauscht: der würde auch beim ersten Laden feuern und die eben gelesenen Werte sofort zurückschreiben.

`submitRun` ruft `submitBest` aus Aufgabe 2 und `pushRun` aus Aufgabe 3, setzt die neue Bestwert-Karte und gibt `isBest` zurück.

Der Store wird einmal über `browserStore()` geholt und in einem Ref gehalten; ist er `null` (Speicher blockiert), arbeitet alles weiter, nur überlebt nichts den Reload. Für den Sitzungs-Verlauf entsprechend `sessionStorage`.

- [ ] **Schritt 2: `app/layout.tsx`**

Der Provider ist eine Client-Komponente und umschließt `{children}`. Zusätzlich bekommt `<html>` die Klasse `dark`, damit die shadcn-Tokens aus `app/globals.css` greifen:

```tsx
<html lang="de" className={`dark ${condensed.variable}`}>
```

- [ ] **Schritt 3: shadcn-Tokens auf die RANGE-Palette ziehen**

In `app/globals.css` innerhalb des bestehenden `.dark`-Blocks die Handvoll Tokens überschreiben, die im Dialog sichtbar werden. Die Farbwerte stammen aus den Variablen in `app/range.css` (`--void`, `--ink`, `--line`, `--bone`, `--dim`, `--sig`, `--ok`) — schlag sie dort nach und übernimm sie, statt neue zu erfinden:

```css
.dark {
  /* … bestehende shadcn-Werte … */

  /* Auf die RANGE-Palette gezogen: der Dialog steht über einem dunklen Spiel,
     die neutralen shadcn-Grautöne würden davor wie ein Fremdkörper wirken. */
  --background: <--void aus range.css>;
  --foreground: <--bone>;
  --card: <--ink>;
  --card-foreground: <--bone>;
  --popover: <--ink>;
  --popover-foreground: <--bone>;
  --muted-foreground: <--dim>;
  --border: <--line>;
  --input: <--line>;
  --primary: <--sig>;
  --primary-foreground: <--void>;
  --ring: <--ok>;
}
```

- [ ] **Schritt 4: Prüfen und commiten**

`pnpm exec tsc --noEmit`, `pnpm test`, `pnpm lint`, `pnpm build`. Dann `pnpm dev`: das Menü und ein Spiel sehen unverändert aus — der Provider ist bisher unsichtbar. Prüfe in den Dev-Tools, dass `<html>` die Klasse `dark` trägt und dass beim ersten Laden nichts in `localStorage` geschrieben wird (der Provider liest nur).

`git commit -m "feat: Einstellungs-Kontext und dunkle shadcn-Tokens"`

---

### Aufgabe 6: Der Settings-Dialog

**Dateien:** erstellen `components/settings/SettingsDialog.tsx`, `components/settings/CrosshairPreview.tsx`, `components/ui/*` (CLI)

- [ ] **Schritt 1: shadcn-Komponenten holen**

```bash
pnpm dlx shadcn@latest add dialog tabs slider select switch input label button separator
```

Landet unter `components/ui/`. Falls die CLI `lib/utils.ts` (mit `cn`) anlegt oder verlangt, ist das erwartet — `components.json` verweist bereits darauf. Ändere nichts an den erzeugten Dateien.

- [ ] **Schritt 2: Die Vorschau**

`CrosshairPreview` ist ein kleines `<canvas>`, das bei jeder Änderung neu zeichnet: dunkelgrüner Grund, ein Kreis als angedeutetes Ziel, darüber `drawCrosshair` aus `lib/crosshair/draw` mit doppelter Skalierung, damit die Striche erkennbar sind. Vorbild ist `drawPreview()` in `reference/index.html` (Zeile 1278). Neu gezeichnet wird in einem Effekt mit der `CrosshairConfig` in der Abhängigkeitsliste.

- [ ] **Schritt 3: Der Dialog**

Drei Tabs:

- **Maus** — Sensitivity (Slider, `LIMITS.sens`, drei Nachkommastellen), DPI (Input, `type="number"`, `LIMITS.dpi`), darunter die abgeleiteten Werte als Text: eDPI über `edpi()` und cm/360 über `cm360()`, beide aus `lib/engine/sens`. Nicht selbst ausrechnen.
- **Spiel** — Rundenlänge (Slider, `LIMITS.dur`, Sekunden), Zielgröße (Slider, `LIMITS.sizeMul`, als Prozent angezeigt), Waffe (Select, Namen aus `WEAPONS`), Sound (Switch).
- **Crosshair** — Farbe (`<input type="color">`, dafür lohnt keine shadcn-Komponente), Gap/Länge/Dicke (Slider aus `LIMITS`), Mittelpunkt und Kontur (Switch), daneben die Vorschau.

Jede Änderung ruft `setSettings`/`setCrosshair` mit genau dem geänderten Feld. Kein lokaler Formularzustand, kein Speichern-Knopf: der Kontext ist die Wahrheit, und das Original speicherte auch sofort.

Unten ein Knopf **Bestwerte löschen**, der `resetBest()` ruft — mit einer Rückfrage, weil er nicht umkehrbar ist.

Der Dialog wird von außen über `open`/`onOpenChange` gesteuert; das Menü besitzt den Zustand.

- [ ] **Schritt 4: Prüfen und commiten**

`tsc`, `test`, `lint`, `build`. Der Dialog ist noch von nirgends erreichbar — das macht Aufgabe 7. Prüfe ihn zwischenzeitlich, indem du ihn im Menü vorübergehend mit `open` fest auf `true` renderst, und nimm das vor dem Commit wieder heraus.

`git commit -m "feat: Settings-Dialog mit shadcn-Reglern und Crosshair-Vorschau"`

---

### Aufgabe 7: Das Menü

**Dateien:** ändern `app/page.tsx`; ggf. erstellen `components/menu/MenuScreen.tsx`

`app/page.tsx` ist bisher eine Server-Komponente. Sie braucht jetzt den Kontext und einen Dialog-Zustand, also wird der Inhalt zu einer Client-Komponente. Halte `app/page.tsx` als dünne Server-Komponente, die `<MenuScreen />` rendert — dann bleibt die Route für Phase 4 offen für serverseitige Teile.

Vier Änderungen gegenüber heute:

1. **Bestwerte** statt `—`: `best[m.id]` aus dem Kontext, gerundet dargestellt. Solange `ready` false ist, weiter der Strich.
2. **Der Sens-Badge** liest `settings` statt `DEFAULT_SETTINGS` und wird klickbar — er öffnet den Dialog. Daneben ein Zahnrad-Knopf (`lucide-react` ist installiert), damit die Funktion auch ohne Raten auffindbar ist.
3. **Eine vierte Gruppe „Routine"**, ganz oben, vor Aim — wie im Original. Je Routine eine Karte mit Name, Beschreibung, Stationszahl und Gesamtdauer aus `ROUTINES`; der Link kommt aus `routineHref()` (Aufgabe 4).
4. Die Fußzeile „Einstellungen, Bestwerte und Routinen kommen in der nächsten Phase" fällt weg.

Sichtprüfung: vier Gruppen; Bestwerte erscheinen nach einem gespielten Lauf und überleben `F5`; der Dialog öffnet und schließt; eine Änderung an der Sensitivity ist sofort im Badge sichtbar und nach einem Reload noch da; „Bestwerte löschen" setzt alle Karten auf Strich zurück.

`git commit -m "feat: Menue mit Bestwerten, Einstellungen und Routinen"`

---

### Aufgabe 8: Einstellungen im Spiel

**Dateien:** ändern `components/game/PlayScreen.tsx`, `components/hud/Crosshair.tsx`

- [ ] **Schritt 1: `PlayScreen`**

`createGame(mode, DEFAULT_SETTINGS)` wird zu `createGame(mode, settings, dur)`, mit `settings` aus `useSettings()`. Die Dauer kommt aus dem Routinen-Schritt, wenn einer in der URL steht, sonst aus `settings.dur`.

**Wichtig:** Das Spiel darf erst entstehen, wenn `ready` true ist. Sonst startet die Runde mit den Standardwerten und ignoriert die gespeicherte Sensitivity — der Fehler, den man erst nach dem dritten Lauf bemerkt. Bis dahin bleibt der bestehende `mounted`-Vorbehalt stehen und rendert `<div id="gameRoot" />`.

Der Routinen-Schritt kommt über `useSearchParams()` und `readStep(params, modeId)`. Er wandert als Prop in `Results` (Aufgabe 9). Eine Client-Komponente mit `useSearchParams` unter dem App Router braucht eine `<Suspense>`-Grenze — setze sie in `app/play/[mode]/page.tsx` um `<PlayScreen />`.

`settings` gehört **nicht** in die Abhängigkeitsliste des Effekts, der das Spiel erzeugt: eine Änderung mitten im Lauf würde die Runde neu starten. Die Einstellungen werden beim Erzeugen eingefroren; das ist auch das Verhalten des Originals. Schreibe den Grund als Kommentar dazu, sonst „repariert" ihn der Nächste.

- [ ] **Schritt 2: `Crosshair`**

Nimmt die Konfiguration aus dem Kontext statt `DEFAULT_CROSSHAIR` und zeichnet neu, wenn sie sich ändert — die Abhängigkeitsliste des Effekts bekommt sie. Der Resize-Listener bleibt.

- [ ] **Schritt 3: Sichtprüfung**

Sensitivity im Menü verstellen → im Spiel dreht sich der Blick spürbar anders. Rundenlänge auf 20 s → die Uhr startet bei 20. Zielgröße auf 150 % → Kugeln sichtbar größer. Waffe auf Phantom → Spray hat 30 Schuss und die Munitionsanzeige sagt „Phantom". Sound aus → still. Crosshair-Farbe ändern → im Spiel sofort sichtbar.

`git commit -m "feat: gespeicherte Einstellungen wirken im Spiel"`

---

### Aufgabe 9: Der Ergebnis-Schirm

**Dateien:** ändern `components/hud/Results.tsx`, `components/game/PlayScreen.tsx`

Drei Ergänzungen, alle mit Vorbild im Original (`reference/index.html` Zeile 267–286 für die Struktur, 1250–1270 für die Logik):

1. **Bestwert-Badge** oben rechts. Bei einem neuen Bestwert `Neuer Bestwert` plus `metricName: <Wert>`, sonst `metricName: <Wert> · Best: <bisheriger>`. Die Klasse `.newbest` liegt bereits in `app/range.css`. `submitRun` wird **genau einmal** pro beendetem Lauf gerufen — in `PlayScreen`s `onOver`-Rückruf, nicht im Render von `Results`, sonst zählt jeder erneute Render einen Lauf.
2. **Weiter in der Routine** statt „Nochmal", wenn ein nächster Schritt existiert. Der Knopf navigiert auf `step.next.href`. Am Ende der Routine steht wieder „Nochmal", und unter den Knöpfen ein Hinweis, dass die Routine durch ist.
3. **Verlaufstabelle**, sobald diese Sitzung mehr als einen Lauf hat. Das Markup steht schon in `app/range.css` (`table.hist`). Spalten: Nummer, Modus, Score, Accuracy, Detail.

Der Untertitel bekommt die Sensitivity dazu, wie im Original: `${g.dur} Sekunden · Sens ${settings.sens.toFixed(3)}`.

Sichtprüfung: ein Lauf setzt einen Bestwert und zeigt das Badge; der zweite, schlechtere Lauf zeigt den alten Bestwert daneben; nach zwei Läufen erscheint die Tabelle; eine Routine läuft mit „Weiter" von Station zu Station durch, jede mit der Dauer aus `ROUTINES`; nach der letzten Station steht kein „Weiter" mehr.

`git commit -m "feat: Bestwert, Routinen-Fortsetzung und Sitzungsverlauf im Ergebnis"`

---

## Abnahme

1. Einstellungen ändern, Browser schließen, neu öffnen → alles steht noch.
2. Einen Lauf spielen, `F5` → der Bestwert steht im Menü.
3. „Bestwerte löschen" leert sie, auch nach einem Reload.
4. `localStorage.setItem('range.settings.v1', '{kaputt')` in der Konsole, dann `F5` → die App startet mit Standardwerten, ohne Fehler in der Konsole.
5. Eine Routine von der ersten bis zur letzten Station durchspielen.
6. Mitten in einer Routine `F5` → dieselbe Station läuft wieder, mit derselben Dauer.
7. `pnpm build` grün, `pnpm lint` nur mit dem bekannten Altfehler.
