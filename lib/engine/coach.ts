import { avg, pcNum } from './format'
import { SHOOT_SPEED } from './modes/counterstrafe'
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
    const clean = speeds.length
      ? speeds.filter((s) => s <= SHOOT_SPEED).length / speeds.length
      : 0
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
