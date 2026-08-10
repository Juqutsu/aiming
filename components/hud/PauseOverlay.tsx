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
