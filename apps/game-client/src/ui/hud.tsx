import type { GameView } from '@tobi/contracts';
import { BottleIcon } from './icons.js';

export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function Hud({ view }: { view: GameView }) {
  return (
    <div className="hud" aria-label="Spielstatus">
      <section className="mission-card">
        <div className="eyebrow">
          01 / BALI <span className="mission-type">TUTORIAL</span>
        </div>
        <h2>{view.objective}</h2>
        <p>
          {view.collected < view.total
            ? 'Folge dem Weg. Tobi kennt sich aus.'
            : 'Die Casa Tobi wartet am Ende des Wegs.'}
        </p>
        <div className="bottle-progress">
          <BottleIcon />
          <strong data-testid="bottle-count">
            {view.collected}
            <span> / {view.total}</span>
          </strong>
          <div className="progress-pips">
            {Array.from({ length: view.total }, (_, i) => (
              <i key={i} className={i < view.collected ? 'filled' : ''} />
            ))}
          </div>
        </div>
      </section>
      <div className="score-card">
        <span>TOBI SCORE</span>
        <strong data-testid="score">{view.score.toLocaleString('de-CH')}</strong>
        <small>
          {formatTime(view.elapsedSeconds)} <span>·</span> ALLES ENTSPANNT
        </small>
      </div>
      <div className="stamina-card">
        <div>
          <span>TOBIS ENERGIE</span>
          <b>{view.stamina}%</b>
        </div>
        <div
          className="stamina-track"
          role="progressbar"
          aria-label="Stamina"
          aria-valuenow={view.stamina}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ width: `${view.stamina}%` }} />
        </div>
        <small>
          <kbd>SHIFT</kbd> Erstaunlich schnell für seine Verhältnisse.
        </small>
      </div>
      {view.toast && (
        <div className="pickup-toast" role="status">
          {view.toast}
        </div>
      )}
      {view.nearDestination && (
        <div className="interact-prompt">
          {view.collected === view.total ? (
            <>
              <kbd>E</kbd> EINCHECKEN
            </>
          ) : (
            <>ERST DIE FLASCHEN, DANN DER CHECK-IN.</>
          )}
        </div>
      )}
      <div className="location-chip">
        <span>◉</span> CASA TOBI <small>BUCHUNG BESTÄTIGT.</small>
      </div>
      {view.debug && <div className="debug-badge">DEBUG RUN · {view.fps} FPS</div>}
    </div>
  );
}
