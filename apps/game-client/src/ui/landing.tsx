import { playableLevels, worldNames, destinationName } from '@tobi/game-data';
import type { GameView, LevelDefinition } from '@tobi/contracts';
import { CompassIcon } from './icons.js';
import { Controls } from './controls.js';

export function Landing({
  view,
  level,
  onSelectLevel,
  onStart,
  onSelectEscape,
  starting = false,
}: {
  view: GameView;
  level: LevelDefinition;
  onSelectLevel(id: string): void;
  onStart(): void;
  onSelectEscape(): void;
  starting?: boolean;
}) {
  return (
    <div className="landing">
      <div className="landing-copy">
        <div className="eyebrow">
          <span className="live-dot" /> EIN GANZ NORMALER URLAUB.
        </div>
        <h1>
          TOBI<span className="title-small">VON</span>
          <span className="title-bottom">
            NAIROBI<span className="title-dot">.</span>
          </span>
        </h1>
        <p className="tagline">
          Kleine Pläne.
          <br />
          <em>Grosses Chaos.</em>
        </p>
        <p className="intro">
          {level.pickups.length} Flaschen. Ziel: {destinationName(level)}.
          <br />
          Und ein Mann, der alles im Griff hat. Fast.
        </p>
        <button
          className="primary-button start-button"
          onClick={onStart}
          disabled={view.phase !== 'ready' || starting}
        >
          {view.phase === 'loading'
            ? 'KOFFER WIRD GEPACKT …'
            : level.scenery === 'railway'
              ? 'EINSTEIGEN'
              : view.pursuit
                ? 'FLUCHT STARTEN'
                : 'AB NACH BALI'}
          <span aria-hidden="true">↗</span>
        </button>
        <button
          className="level-select"
          onClick={onSelectEscape}
          disabled={view.phase === 'loading' || starting}
        >
          {view.pursuit ? '← ZUM TUTORIAL' : 'NEU: BALI ESCAPE →'}
        </button>
        <div className="start-note">
          <span className="tiny-play">▶</span> Direkt im Browser <span>·</span> Tastatur & Maus
        </div>
      </div>
      <div className="destination-card">
        <div className="destination-heading">
          <span>DEIN NÄCHSTER STOPP</span>
          <CompassIcon />
        </div>
        <div className="destination-name">
          {worldNames[level.worldId]}
          <span>
            {level.worldId === 'bali' ? '01' : level.worldId === 'bangkok' ? '02' : '03'} / 04
          </span>
        </div>
        <div className="destination-rule" />
        <div className="destination-meta">
          <span>
            {level.title.toUpperCase()} {'★'.repeat(level.maxWanted)}
          </span>
          <span>{level.atmosphere === 'night' ? '☾ 25°' : '☀ 29°'}</span>
        </div>
        <p>{level.subtitle}</p>
        <label className="level-picker">
          LEVEL WÄHLEN
          <select
            aria-label="Level wählen"
            value={level.id}
            disabled={view.phase === 'loading' || starting}
            onChange={(event) => onSelectLevel(event.target.value)}
          >
            {playableLevels.map((entry, index) => (
              <option key={entry.id} value={entry.id}>
                {index + 1}. {entry.title} · {entry.pickups.length} Flaschen
              </option>
            ))}
          </select>
        </label>
        <div className="postmark">
          TOBI
          <br />
          <strong>APPROVED</strong>
          <br />
          SEIT GERADE EBEN
        </div>
      </div>
      <div className="world-strip">
        <span className="strip-label">DIE REISE</span>
        <span className={level.worldId === 'bali' ? 'world-current' : ''}>
          <b>01</b> BALI <i />
        </span>
        <span>
          <b>02</b> THAILAND <small>RAILWAY</small>
        </span>
        <span>
          <b>03</b> ZÜRICH <small>PARADE</small>
        </span>
        <span>
          <b>04</b> ARLESHEIM <small>SPÄTER</small>
        </span>
      </div>
      <div className="landing-footer">
        <Controls escape={view.pursuit !== null} />
        <span className="prototype-tag">TECHNISCHER PROTOTYP · 0.1</span>
      </div>
    </div>
  );
}
