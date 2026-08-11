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
        <div className="row">
          <button className="btn" onClick={onResume}>Maus binden</button>
          <button className="btn ghost" onClick={onQuit}>Abbrechen</button>
        </div>
      </div>
    </div>
  )
}
