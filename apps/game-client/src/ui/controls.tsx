export function Controls({ escape = false }: { escape?: boolean }) {
  return (
    <div className="controls">
      <span>
        <kbd>W A S D</kbd> Bewegen
      </span>
      <span>
        <kbd>MAUS</kbd> Kamera
      </span>
      <span>
        <kbd>SPACE</kbd> Springen
      </span>
      <span>
        <kbd>SHIFT</kbd> Sprinten
      </span>
      <span>
        <kbd>E</kbd> Interaktion
      </span>
      {escape && (
        <span>
          <kbd>R</kbd> Aufsehen erregen
        </span>
      )}
      <span>
        <kbd>ESC</kbd> Pause
      </span>
    </div>
  );
}
