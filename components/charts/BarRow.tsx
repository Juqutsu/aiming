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
