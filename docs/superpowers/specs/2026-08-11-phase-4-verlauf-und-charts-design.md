# Phase 4 — Verlauf über Sitzungen und Charts

**Stand:** 2026-08-11 · **Vorgänger:** Phase 3 (Persistenz, Menü, Settings), gemergt in `main`

## Zweck

Der Trainer beantwortet bisher nur „wie lief dieser Lauf". Phase 4 beantwortet drei Fragen, die erst über Wochen entstehen:

1. **Werde ich besser?** Trend je Modus über Zeit.
2. **Wo bin ich schwach?** Vergleich der Modi untereinander.
3. **Wie lief das Training heute?** Tagesbilanz.

Nichts davon steht im Original (`reference/index.html`). Phase 4 ist Neubau, keine Portierung.

## Entscheidungen, die diesem Entwurf vorausgehen

- **Alle drei Fragen werden beantwortet**, nicht nur eine.
- **Eigene Route plus Sparkline im Menü.** Der Verlauf lebt auf `/verlauf`; jede Modus-Karte im Menü zeigt zusätzlich eine winzige Trendlinie.
- **Abweichende Läufe werden gezeigt und markiert**, nicht gefiltert und nicht stillschweigend eingerechnet.
- **Charts werden selbst gezeichnet**, als SVG. Kein Chart-Paket.
- **`lib/store/session.ts` wird abgelöst.** Der Sitzungsverlauf ist eine Teilmenge der Läufe und braucht keinen zweiten Speicherpfad.
- **Sparkline erst ab drei vergleichbaren Läufen.** Unter drei Punkten ist eine Linie keine Aussage.

## Datenmodell

Ein neuer Schlüssel in `localStorage`:

```ts
// lib/store/runs.ts
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
```

Schlüssel `range.runs.v1`, ein flaches Array, ältester Lauf zuerst. Rund 90 Byte JSON je Lauf; der Deckel liegt bei **500 Läufen** (etwa 45 KB gegen ein Budget von 5 MB). Ist er erreicht, fällt der älteste Lauf heraus.

Verworfene Alternativen: ein Schlüssel je Modus (mehr Schlüssel, kein Gewinn) und Tagesaggregate statt Einzelläufen (spart Platz, den wir nicht brauchen, und nimmt der Tagesansicht ihre Details).

### Vergleichbarkeit

Ein Lauf ist **vergleichbar**, wenn `dur` und `size` den Werten aus `DEFAULT_SETTINGS` entsprechen. Die Waffe zählt nicht hinein: sie ändert nur Spray und Munitionsanzeige, nicht die Schwierigkeit der Aim-Modi. Sie wird gespeichert und im Tooltip genannt.

Referenz sind ausdrücklich die **Standardwerte**, nicht die gerade eingestellten. Sonst verschöbe sich die Bedeutung der Kurve rückwirkend, sobald jemand an den Reglern dreht.

Abweichende Läufe werden gespeichert, im Chart als offener Punkt gezeichnet und im Tooltip mit ihrer Abweichung benannt. Sie zählen in den Schnitt des Profils **nicht** hinein — ein Schnitt aus gemischten Bedingungen ist keine Zahl, die etwas bedeutet.

### Schreibpfad

`submitRun()` im `SettingsProvider` trägt den Lauf ein. Diese Funktion existiert bereits und schreibt heute schon Bestwert und Sitzungsverlauf; sie bekommt eine dritte Zeile, keinen neuen Aufrufer.

### Ablösung von `session.ts`

Die Verlaufstabelle im Ergebnis-Schirm zeigt heute die Läufe dieser Sitzung aus `sessionStorage`. Künftig kommt sie aus `runs`, gefiltert auf `t >= sessionStart`.

`sessionStart` ist ein einzelner Zeitstempel unter `range.session.start.v1` in `sessionStorage`, gesetzt beim ersten Lesen, wenn er fehlt. Nicht der Montagezeitpunkt des Providers: `sessionStorage` überlebt einen Reload innerhalb des Tabs, ein Ref nicht — und das bisherige Verhalten war „seit dieses Tab offen ist".

`lib/store/session.ts` und `lib/store/session.test.ts` entfallen. Der alte Schlüssel `range.session.v1` bleibt liegen und verfällt mit der Sitzung; ein Migrationsschritt lohnt für Daten nicht, die ohnehin nur eine Sitzung leben.

## Auswertung

Reine Funktionen in `lib/stats/`, ohne Browser testbar. Sie bekommen die Zeit übergeben statt `Date.now()` zu rufen, damit die Tests deterministisch bleiben.

Bezeichner englisch, Kommentare deutsch — wie überall sonst im Projekt.

```ts
// lib/stats/trend.ts
/** `standard` heißt: unter Standardbedingungen gespielt, also vergleichbar. */
export type TrendPoint = { t: number; metric: number; standard: boolean }
export function trend(runs: Run[], mode: ModeId): TrendPoint[]

// lib/stats/profile.ts
export type ProfileRow = {
  mode: ModeId
  /** Schnitt der letzten fünf vergleichbaren Läufe, oder aller, wenn es weniger sind. */
  recent: number
  /** Schnitt aller vergleichbaren Läufe. */
  average: number
  /** Abweichung in Prozent, vorzeichenrichtig: positiv heißt besser. */
  delta: number
  /** Zahl der vergleichbaren Läufe, aus denen die Zeile stammt. */
  runs: number
}
export function profile(runs: Run[]): ProfileRow[]

// lib/stats/days.ts
export type DayRow = {
  /** Lokales Datum als `YYYY-MM-DD`. */
  day: string
  runs: number
  modes: ModeId[]
  /** Bester Metrikwert des Tages je Modus: das Maximum, bei `lowerBetter` das Minimum. */
  best: Partial<Record<ModeId, number>>
}
export function byDay(runs: Run[]): DayRow[]

// lib/stats/period.ts
export type Period = '7d' | '30d' | 'all'
export function inPeriod(runs: Run[], period: Period, now: number): Run[]
```

Das Modul heißt `period`, nicht `range`: „Range" ist in diesem Projekt der Schießstand ([Range.tsx](../../../components/game/Range.tsx), `range.css`), und ein dritter Wortsinn wäre eine Falle.

**`lowerBetter` dreht das Vorzeichen.** Bei Reaktion ist ein kleinerer Wert besser; `delta` ist trotzdem so definiert, dass positiv „besser" heißt, und `best` in der Tagesliste meint dort das Minimum. Beide Umrechnungen passieren genau einmal, in `profile()` beziehungsweise `byDay()`, und nie in der Ansicht.

`profile()` sortiert das Schwächste nach oben und lässt Modi ohne vergleichbare Läufe weg. Weniger als zwei vergleichbare Läufe ergeben keine Zeile: ein Schnitt aus einem Lauf ist derselbe Lauf.

Die Tagesgruppierung nutzt das lokale Datum. Ein Lauf um 23:50 gehört zu dem Tag, an dem er sich für den Spielenden angefühlt hat, nicht zu dem, den UTC dafür hält.

## Oberfläche

### Route `/verlauf`

Erreichbar über einen Link im Menü-Kopf, neben dem Zahnrad. Kopf wie das Menü, plus ein Zeitraum-Umschalter, der auf alle drei Abschnitte wirkt: 7 Tage, 30 Tage, alles. Beim Öffnen sind 30 Tage aktiv — lang genug für einen Trend, kurz genug, dass die Kurve nicht zur Tapete wird. Die Wahl gilt nur für den Besuch und wird nicht gespeichert.

```
Verlauf                              [7 Tage] [30 Tage] [alles]

Trend
  Gridshot · Flick · Micro · ...      (Modus-Chips, einer aktiv)
  ┌────────────────────────────────────────────────┐
  │  45                          ●                 │
  │  40           ●     ●     ○                    │
  │  35   ●                                        │
  │       ────────────────────────────────────     │
  │       4. Aug                          11. Aug  │
  └────────────────────────────────────────────────┘
  gefüllt = Standardbedingungen · offen = abweichend

Profil
  Reaktion        ▓▓▓▓▓▓░░░░   -8 %   gegen deinen Schnitt
  Micro-Flicks    ▓▓▓▓▓▓▓▓░░   -2 %
  Gridshot        ▓▓▓▓▓▓▓▓▓▓  +11 %

Tage
  11. Aug   6 Läufe   Gridshot, Micro, Reaktion    beste: 42 Ziele
  10. Aug   3 Läufe   Spray, Counterstrafe         beste: 71 %
```

Ohne Daten zeigt jeder Abschnitt einen Satz, der sagt, wie man ihn füllt, statt einer leeren Fläche.

### Menü

Auf jeder Modus-Karte eine Sparkline der letzten 20 **vergleichbaren** Läufe, zwischen Beschreibung und Fußzeile. Auf 96 Pixeln kann man einem Ausschlag nicht ansehen, ob er Fortschritt oder eine verstellte Zielgröße war; deshalb kommt hier nur hinein, was denselben Bedingungen unterlag.

Unter drei solchen Läufen bleibt die Stelle leer und die Karte behält ihre Höhe, damit das Raster nicht springt.

### Ergebnis-Schirm

Unverändert bis auf die Quelle der Tabelle.

### Einstellungen

Neben „Bestwerte löschen" ein zweiter Knopf „Verlauf löschen", ebenfalls mit Rückfrage. Zwei Knöpfe statt eines gemeinsamen: Bestwerte und Verlauf sind für den Spielenden nicht dasselbe.

## Charts

Drei Komponenten unter `components/charts/`, alle als SVG, alle ohne Abhängigkeit:

- **`Sparkline`** — Polyline, 96×24, keine Achsen, keine Beschriftung.
- **`LineChart`** — drei Y-Ticks, Datum an den beiden Rändern, ein Punkt je Lauf, Tooltip am Punkt. Offene Punkte für abweichende Bedingungen.
- **`BarRow`** — ein waagerechter Balken mit Beschriftung, für das Profil.

Farbregel aus der bestehenden Oberfläche: Orange trägt die Ziele und die primäre Aktion. Eine Datenlinie ist keins von beidem und läuft in `--text`; Punkte in `--dim`; nur der beste Punkt einer Reihe bekommt `--sig`. Achsen und Raster in `--line`.

Alle drei sind reine Darstellung: sie rechnen nichts, sie bekommen fertige Punkte. Skalierung, Filterung und Vorzeichen liegen in `lib/stats/`.

Barrierefreiheit: jedes Chart trägt eine textliche Zusammenfassung in einem visuell versteckten Element, damit die Aussage auch ohne die Grafik ankommt.

## Dateien

```
lib/store/runs.ts               Laden, Eintragen, Löschen, Deckel     (neu)
lib/store/runs.test.ts
lib/store/session.ts            entfällt
lib/store/session.test.ts       entfällt

lib/stats/trend.ts              Punkte für die Linie                  (neu)
lib/stats/profile.ts            Modus-Vergleich, lowerBetter-Umkehr   (neu)
lib/stats/days.ts               Tagesgruppierung                      (neu)
lib/stats/period.ts             Zeitraum-Filter                       (neu)
lib/stats/*.test.ts

components/charts/Sparkline.tsx                                       (neu)
components/charts/LineChart.tsx                                       (neu)
components/charts/BarRow.tsx                                          (neu)

app/verlauf/page.tsx            dünne Server-Komponente               (neu)
components/history/HistoryScreen.tsx                                  (neu)

components/settings/SettingsProvider.tsx   runs eintragen, Verlauf löschen
components/settings/SettingsDialog.tsx     Knopf „Verlauf löschen“
components/menu/MenuScreen.tsx             Sparkline, Link auf /verlauf
components/hud/Results.tsx                 Tabelle aus runs
app/range.css                              Chart- und Verlaufsklassen
```

## Nicht in Phase 4

Routinen-Builder, Crosshair-Presets und Valorant-Import (Phase 5). Kein Export der Daten, kein Vergleich mit anderen Spielenden, keine Cloud. Alles bleibt im Browser.

## Abnahme

1. Drei Läufe Gridshot spielen, `/verlauf` öffnen: drei Punkte auf der Linie, eine Zeile im Profil, ein Tag in der Tagesliste.
2. Zielgröße auf 150 % stellen, einen Lauf spielen: der Punkt erscheint offen, der Tooltip nennt die Abweichung, das Profil ändert sich nicht.
3. Zeitraum auf 7 Tage stellen: ältere Läufe verschwinden aus allen drei Abschnitten.
4. `F5`: alles steht noch.
5. Im Menü zeigt eine Karte mit drei vergleichbaren Läufen eine Sparkline, eine mit zweien nicht, und beide sind gleich hoch.
6. „Verlauf löschen": alle drei Abschnitte fallen auf ihren Leerzustand zurück, die Bestwerte bleiben.
7. `localStorage.setItem('range.runs.v1', '{kaputt')` und `F5`: die App startet mit leerem Verlauf, ohne Fehler in der Konsole.
8. 501 Läufe eintragen: der älteste ist weg, die Kurve beginnt später.
