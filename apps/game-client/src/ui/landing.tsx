import type { GameView } from '@tobi/contracts';
import { CompassIcon } from './icons.js';
import { Controls } from './controls.js';

export function Landing({
  view,
  onStart,
  onSelectEscape,
  starting = false,
}: {
  view: GameView;
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
          Fünf Flaschen. Eine Unterkunft.
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
          <span>DEIN ERSTER STOPP</span>
          <CompassIcon />
        </div>
        <div className="destination-name">
          Bali<span>01 / 04</span>
        </div>
        <div className="destination-rule" />
        <div className="destination-meta">
          <span>{view.pursuit ? 'BALI ESCAPE · ★★★' : 'WELCOME TO BALI'}</span>
          <span>☀ 29°</span>
        </div>
        <p>
          {view.pursuit ? 'Sammeln. Sprinten. Sichtkontakt verlieren.' : 'Erst mal ankommen.'}
          <br />
          {view.pursuit ? 'Zwölf Sekunden. Dann nach Hause.' : 'Eskalieren können wir später.'}
        </p>
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
        <span className="world-current">
          <b>01</b> BALI <i />
        </span>
        <span>
          <b>02</b> BANGKOK <small>SPÄTER</small>
        </span>
        <span>
          <b>03</b> ZÜRICH <small>SPÄTER</small>
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
