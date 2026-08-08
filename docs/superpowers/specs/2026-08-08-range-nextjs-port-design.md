# RANGE — Port nach Next.js 16 / React Three Fiber

**Datum:** 2026-08-08
**Status:** Genehmigt, bereit für Implementierungsplan

## Ausgangslage

Das bestehende Projekt ist eine einzelne `index.html` mit 1356 Zeilen: HTML-Screens, CSS und ein
`<script>`-Block, der einen kompletten Aim-Trainer enthält. Es funktioniert und macht Spaß. Die
inhaltliche Substanz darin ist wertvoller, als die Dateigröße vermuten lässt:

- eine eigene 3D-Projektion samt Near-Plane-Clipping, auf 2D-Canvas software-gerendert
- analytisches Ray-Sphere-Picking für Treffer
- Valorant-nahe Bewegungsphysik mit hartem Counterstrafe-Bremsen
- die Sensitivity-Formel des Spiels (0,07° pro Maus-Count) inklusive cm/360 und eDPI
- zehn Trainingsmodi, drei Routinen, modus-spezifische Coach-Texte
- zwei nachempfundene Sprühmuster

Ziel ist eine lokale Trainings-Plattform: dasselbe Spiel in echtem 3D, dazu Run-Historie mit
Fortschritts-Charts, ein Builder für eigene Routinen und speicherbare Crosshair-Presets. Kein
Backend, kein Login, keine Cloud.

## Entscheidungen und ihre Begründung

**Stack:** Next.js 16 (App Router), Tailwind v4, shadcn/ui, TypeScript, pnpm. Vorgabe des Nutzers.
Für das Spiel selbst leistet Next wenig — es ist reines Client-Rendering. Der Nutzen liegt im
Drumherum: Routing zwischen Menü, Stats, Routinen und Settings.

**Rendering:** Umstieg von Canvas 2D auf Three.js über react-three-fiber. Die vorhandene Projektion
wird dabei nicht portiert, sondern durch die `PerspectiveCamera` ersetzt. Das ist kein Verlust,
sondern eine Korrektur: `PerspectiveCamera.fov` ist ein **vertikaler** Öffnungswinkel, und genau
diese Größe hält Valorants Hor+-Modell über alle Seitenverhältnisse konstant. Der bestehende Code
rechnet den vertikalen FOV bereits aus den 103° horizontal bei 16:9 aus; dieser Wert wandert
unverändert in die Kamera.

**Ziele bleiben Kugeln.** Keine humanoiden Modelle, keine Kopf-Hitbox. Damit bleibt die
Trefferabfrage bei `raySphere` — analytisch, deterministisch, ohne WebGL testbar.

**Persistenz:** localStorage über die `persist`-Middleware von zustand. Kein IndexedDB, kein Dexie.
Ein Run-Record wiegt rund 150 Byte; in das 5-MB-Budget passen etwa 25.000 Läufe. Das reicht für
jede realistische Nutzungsdauer.

## Architektur

### Leitprinzip: Engine entscheidet, Three.js zeichnet

Die gesamte Spiellogik lebt frameworkfrei unter `lib/engine/`. Kein React, kein Three, kein DOM.
Sie besteht aus reinen Funktionen über einem mutierbaren Zustandsobjekt.

```
lib/engine/
  math.ts        raySphere, segCross, dirFrom, Vektor-Helfer
  camera.ts      yaw/pitch, VFOV aus dem Hor+-Modell, Basisvektoren
  movement.ts    RUN/ACC/FRIC/COUNTER — die Counterstrafe-Physik
  weapons.ts     Vandal und Phantom: Magazin, Feuerrate, Sprühmuster
  sens.ts        0,07°/Count, cm/360, eDPI
  modes/         zehn Module, je start/tick/fire/stats/metric
  game.ts        GameState und tick(dt, input)
```

Three.js erhält jeden Frame den fertigen Zustand und schreibt ihn in Meshes. Die Trefferabfrage
läuft **nicht** über `THREE.Raycaster` gegen den Szenengraph, sondern bleibt analytisch. Der
Szenengraph hält zu keinem Zeitpunkt Wahrheit über den Spielzustand — er ist eine reine Projektion
davon.

Daraus folgt eine praktische Eigenschaft: Phase 1 ist vollständig headless testbar, bevor ein
einziges Pixel gerendert wird. Ein Modus lässt sich in einer Schleife simulieren und sein Scoring
prüfen, ohne Browser.

### React-Grenze

Spielzustand darf niemals in `useState` liegen. Bei 240 Bildern pro Sekunde wären das 240
Re-Renders — der Trainer würde unbrauchbar.

- Der Engine-State lebt in einem Ref. `useFrame` mutiert ihn.
- React rendert nur HUD-Zahlen, aktualisiert per Snapshot alle 100 ms.
- Die schnell reagierenden Balken (Tempo, Exposure) schreibt `useFrame` direkt in
  `element.style.width` — an React vorbei. Bei Counterstrafe entscheidet die Latenz dieses Balkens
  darüber, ob die Übung funktioniert; 10 Hz wären dort spürbar zäh.

### Verzeichnisse

```
app/
  page.tsx                Menü: Modi-Grid, Routinen, Bestwerte
  play/[mode]/page.tsx    Spiel
  stats/page.tsx          Fortschritts-Charts
  routines/page.tsx       Builder
  settings/page.tsx       Sens, Crosshair, Ziele, Sound, Qualität
components/
  game/                   Range, Targets, SprayWall, Cover, PlayerCamera
  hud/                    Overlay-DOM: Pills, Meter, Cue, Ammo, Crosshair
  ui/                     shadcn
lib/engine/               siehe oben
lib/store/                zustand + persist
lib/crosshair/            Zeichen-Modul und Valorant-Code-Parser
reference/index.html      das Original, unverändert, als Nachschlagewerk
```

### Datenmodell

```ts
type RunRecord = {
  id: string
  mode: ModeId
  ts: number          // Zeitstempel
  dur: number         // Rundenlänge in Sekunden
  score: number
  hits: number
  shots: number
  metric: number      // die modus-eigene Kennzahl
  extra?: Record<string, number>   // z. B. Exposure, Stand-Quote
}
```

Bestwerte werden **nicht gespeichert**, sondern aus der Historie abgeleitet — bei
`lowerBetter`-Modi als Minimum, sonst als Maximum. Das spart einen kompletten Store und schließt
aus, dass Bestwert und Historie auseinanderlaufen.

Weitere persistierte Zustände: `settings` (Sens, DPI, Rundenlänge, Zielgröße, Waffe, Sound,
Render-Qualität), `crosshairs` (Presets samt aktivem), `routines` (eigene Abläufe).

### Crosshair

Ein einziges Zeichen-Modul, verwendet von der Settings-Vorschau **und** dem In-Game-Overlay. Das
Crosshair liegt als eigenes kleines Canvas über dem 3D-Canvas, nie darin. So bleibt es pixelscharf
und unabhängig von Auflösungs-Skalierung oder Post-Processing.

### Look

Box-Range, Bodenraster als Shader, `MeshStandardMaterial` mit Emissive für die Ziele, ein Rimlight,
Akzentfarbe `#ff4655`. Bloom über `@react-three/postprocessing`, **abschaltbar über die Settings**:
es kostet ein bis zwei Millisekunden Frametime, und in einem Aim-Trainer ist das eine Größe, über
die der Nutzer entscheiden soll. Einschusslöcher der Spray-Wand als `InstancedMesh` mit 120
Instanzen.

## Fehlerbehandlung

- **Kein WebGL verfügbar:** klare Meldung statt weißer Seite, mit Hinweis auf
  Hardwarebeschleunigung im Browser.
- **Pointer Lock verweigert oder verloren:** Spiel pausiert, Overlay fordert zum Klicken auf. Das
  entspricht dem heutigen Verhalten und ist die einzige Stelle, an der der Browser das Spiel
  unterbrechen kann.
- **localStorage blockiert oder voll:** Rückfall auf einen In-Memory-Store, das Spiel läuft weiter,
  ein dezenter Hinweis erscheint. Das Original macht das bereits so; das Verhalten wird übernommen.
- **Unbekannte Modus-ID in der Route:** `notFound()`.
- **Fehlerhafter Valorant-Crosshair-Code:** Parser gibt ein Ergebnis mit Fehlerliste zurück, die
  UI zeigt sie an und importiert nichts. Kein Werfen, kein halb angewandter Import.

## Tests

Vitest, ausschließlich gegen `lib/engine` und `lib/crosshair` — die Stellen mit echter Logik:

- Sensitivity: cm/360 und eDPI gegen bekannte Werte
- `raySphere`: Treffer, Vorbeischuss, Ziel hinter der Kamera
- Counterstrafe: Gegentippen bringt die Geschwindigkeit binnen der erwarteten Zeit unter 1 m/s
- Spray: Gruppierungs-Score eines vollen Magazins bei perfektem Ausgleich
- Modus-Scoring: Gridshot respawnt, Flickshots zieht bei Fehlschuss ab, Reaktion wertet Frühklicks
  als Fehlstart
- Crosshair-Parser: gültiger Code, Code mit unbekannten Parametern, kaputter Code

Keine Component-Tests, keine E2E-Suite. Der visuelle Teil wird von Hand geprüft — dafür existiert
`reference/index.html` als direkter Vergleich.

## Phasen

| # | Inhalt | Fertig, wenn |
|---|---|---|
| 0 | Gerüst: pnpm, Next 16, Tailwind 4, shadcn, vitest, `git init`, `index.html` nach `reference/` | `pnpm dev` zeigt die leere App |
| 1 | Engine-Port, frameworkfrei, mit Tests | `pnpm test` grün, alle zehn Modi headless simulierbar |
| 2 | R3F-Szene, Pointer-Lock-Input, HUD | alle zehn Modi spielbar, fühlt sich an wie das Original |
| 3 | Persistenz, Menü und Settings in shadcn | Bestwerte und Einstellungen überleben den Reload |
| 4 | Run-Historie und Charts | Fortschrittskurve pro Modus |
| 5 | Routinen-Builder, Crosshair-Presets, Valorant-Import | eigene Routine spielbar, Import funktioniert |

Jede Phase bekommt einen eigenen Implementierungsplan. Nach Phase 2 ist das Projekt erstmals
wieder in dem Zustand, den `index.html` heute hat — ab da ist jede Phase reiner Zugewinn.

## Bewusst gezogene Grenzen

**Der Valorant-Crosshair-Import ist verlustbehaftet.** Der Code des Spiels trägt rund dreißig
Parameter: Bewegungs- und Feuerfehler, äußere Linien, Z-Achsen-Verhalten. Unser Renderer kennt
sechs. Importiert werden Farbe, Innenlinien-Länge, -Dicke und -Offset, Mittelpunkt und Kontur; alles
Übrige wird in der UI als ignoriert ausgewiesen. Ein vollständiger Nachbau wäre ein eigenes Projekt
und hat für das Training keinen Wert — das Crosshair muss sich vertraut anfühlen, nicht identisch
sein.

**Der Routinen-Builder kommt ohne Drag-and-Drop.** Hoch- und Runter-Buttons statt dnd-kit. Spart
eine Abhängigkeit; falls sich die Bedienung bei längeren Routinen klobig anfühlt, ist der Tausch
später eine lokale Änderung an einer Komponente.

**Keine Erweiterung des Waffen-Arsenals.** Vandal und Phantom bleiben die einzigen Waffen, die
Sprühmuster bleiben die vorhandenen, nachempfundenen. Ein Sensitivity-Konverter für andere Spiele
ist nicht Teil dieses Projekts.

## Annahmen

- Die Oberfläche bleibt deutsch. Kein i18n.
- Kein Auth, kein Backend, keine Cloud-Synchronisierung.
- Das Deployment-Ziel ist offen. Nichts in dieser Architektur schließt Vercel aus; alle Seiten sind
  client-lastig und statisch auslieferbar.
