import { playableLevels, worldNames, destinationName } from '@tobi/game-data';
import type { GameView } from '@tobi/contracts';
import { PursuitHud } from './pursuit-hud.js';
import { BottleIcon } from './icons.js';

export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function Hud({ view }: { view: GameView }) {
  const level = playableLevels.find((entry) => entry.id === view.levelId) ?? playableLevels[0];
  return (
    <div className="hud" aria-label="Spielstatus">
      <section className="mission-card">
        <div className="eyebrow">
          {worldNames[level.worldId].toUpperCase()}{' '}
          <span className="mission-type">{level.title.toUpperCase()}</span>
        </div>
        <h2>{view.objective}</h2>
        <p>
          {view.collected < view.total
            ? level.scenery === 'railway'
              ? 'Durch die offenen Wagen nach vorne. G: leere Flasche werfen.'
              : 'Flaschen trinken sich automatisch. G: werfen. R: anpöbeln.'
            : view.pursuit && !view.canCheckIn
              ? 'Nutze Gebäude oder Musikfahrzeuge als Deckung. Zwölf Sekunden ohne Sichtkontakt!'
              : `${destinationName(level)} wartet am Ende des Wegs.`}
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
      <div className="hands-card">
        <strong data-testid="bottle-hand">
          {view.drinking
            ? 'TOBI TRINKT …'
            : view.emptyBottles
              ? 'FLASCHE IN DER HAND'
              : 'HÄNDE FREI'}
        </strong>
        <span>
          <kbd>G</kbd> Werfen · <b data-testid="empty-bottles">{view.emptyBottles}</b> leer
        </span>
        {view.crowdCount > 0 && (
          <span data-testid="crowd-count">
            <kbd>R</kbd> Anpöbeln · {view.tauntedCount} / {view.crowdCount} reagieren
          </span>
        )}
        {view.tripSeconds > 0 && (
          <span data-testid="color-trip">FARBRAUSCH · {view.tripSeconds}s</span>
        )}
      </div>
      {view.phase === 'playing' && view.emptyBottles > 0 && (
        <div className="throw-reticle" aria-label="Wurfrichtung">
          +
        </div>
      )}
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
              <kbd>E</kbd>{' '}
              {level.scenery === 'railway'
                ? 'WAGEN 1 ERREICHT'
                : level.scenery === 'street-parade'
                  ? 'BACKSTAGE BETRETEN'
                  : 'EINCHECKEN'}
            </>
          ) : (
            <>ERST DIE FLASCHEN, DANN DER CHECK-IN.</>
          )}
        </div>
      )}
      <div className="location-chip">
        <span>◉</span> {destinationName(level).toUpperCase()}{' '}
        <small>
          {level.scenery === 'railway' ? 'BITTE NICHT AUSSTEIGEN.' : 'KARL HAT EINEN PLAN.'}
        </small>
      </div>
      {view.debug && <div className="debug-badge">DEBUG RUN · {view.fps} FPS</div>}
    </div>
  );
}
