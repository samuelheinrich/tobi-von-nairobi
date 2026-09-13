import type { PursuitView } from '@tobi/contracts';

export function PursuitHud({ pursuit }: { pursuit: PursuitView }) {
  const searching = pursuit.escapeSeconds !== null;
  return (
    <section className={`pursuit-card ${pursuit.wanted ? 'is-wanted' : ''}`} aria-label="Fahndung">
      <div className="pursuit-heading">
        <span>CHAOS</span>
        <b data-testid="chaos">{pursuit.chaos} / 100</b>
      </div>
      <div
        className="chaos-track"
        role="progressbar"
        aria-label="Chaos"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pursuit.chaos}
      >
        <i style={{ width: `${pursuit.chaos}%` }} />
      </div>
      <div
        className="wanted-stars"
        aria-label={`Fahndungslevel ${pursuit.wanted}`}
        data-testid="wanted"
      >
        {'★'.repeat(pursuit.wanted)}
        <span>{'☆'.repeat(5 - pursuit.wanted)}</span>
      </div>
      <strong role="status" data-testid="pursuit-status">
        {pursuit.status === 'caught'
          ? 'ERWISCHT'
          : searching
            ? `FLUCHT IN: ${pursuit.escapeSeconds}`
            : pursuit.status === 'chase'
              ? 'SICHTKONTAKT! LAUF, TOBI!'
              : pursuit.wanted
                ? 'SECURITY SUCHT DICH'
                : pursuit.escapes
                  ? 'ABGEHÄNGT. AB NACH HAUSE.'
                  : 'NOCH IST ALLES RUHIG.'}
      </strong>
      <p>
        {pursuit.wanted
          ? 'Um die Häuser laufen. Ausser Sicht bleiben.'
          : 'R: «Ich kenne Karl!» · Mehr Chaos alle 3 Sek.'}
      </p>
      {pursuit.capturePercent > 0 && (
        <div className="capture-warning" role="status">
          ABSTAND GEWINNEN · {pursuit.capturePercent}%
          <div style={{ width: `${pursuit.capturePercent}%` }} />
        </div>
      )}
    </section>
  );
}
