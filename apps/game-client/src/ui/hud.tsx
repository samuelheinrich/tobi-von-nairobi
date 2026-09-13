import { playableLevels } from '@tobi/game-data';
import type { GameView } from '@tobi/contracts';
import { PursuitHud } from './pursuit-hud.js';
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
          01 / BALI{' '}
          <span className="mission-type">
            {playableLevels.find((entry) => entry.id === view.levelId)?.title.toUpperCase()}
          </span>
        </div>
        <h2>{view.objective}</h2>
        <p>
          {view.collected < view.total
            ? 'Folge dem Weg. Tobi kennt sich aus.'
            : view.pursuit && !view.canCheckIn
              ? 'Nutze die Rückseiten der Häuser. Zwölf Sekunden ohne Sichtkontakt!'
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
      <div className="mood-card" data-testid="tobi-mood">
        <span>TOBIS PEGEL</span>
        <strong>{view.moodLabel}</strong>
        <div
          role="progressbar"
          aria-label="Tobis Pegel"
          aria-valuenow={view.mood}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ width: `${view.mood}%` }} />
        </div>
        <small>«Ich laufe noch absolut gerade.»</small>
      </div>
      <div className="score-card">
        <span>TOBI SCORE</span>
        <strong data-testid="score">{view.score.toLocaleString('de-CH')}</strong>
        <small>
          {formatTime(view.elapsedSeconds)} <span>·</span>{' '}
          {view.pursuit?.wanted ? 'GANZ NORMALER URLAUB' : 'ALLES ENTSPANNT'}
        </small>
      </div>
      {view.pursuit && <PursuitHud pursuit={view.pursuit} />}
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
          {view.pursuit && view.collected === view.total && !view.canCheckIn ? (
            <>ERST DIE POLIZEI ABHÄNGEN.</>
          ) : view.collected === view.total ? (
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
