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
    // Sonst sieht der `mousedown`-Listener des Hosts jeden Klick hier auch —
    // "Abbrechen" würde dann noch schnell einen Pointer Lock auf einer Seite
    // anfordern, die im selben Klick schon verlassen wird.
    <div id="pause" onMouseDown={(e) => e.stopPropagation()}>
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
