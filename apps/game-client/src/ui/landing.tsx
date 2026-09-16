import { destinationName, welcomeToBali } from '@tobi/game-data';
import type { GameView, LevelDefinition } from '@tobi/contracts';
import { LevelGallery, levelPreview, levelTitle } from './level-gallery.js';
import './level-gallery.css';

export function Landing({
  view,
  level,
  onSelectLevel,
  onStart,
  starting = false,
  signedIn = false,
}: {
  view: GameView;
  level: LevelDefinition;
  onSelectLevel(id: string): void;
  onStart(): void;
  starting?: boolean;
  signedIn?: boolean;
}) {
  const tutorial = level.id === welcomeToBali.id;
  return (
    <div className="level-menu">
      <section className="level-intro" aria-label="Ausgewähltes Level">
        <span className="eyebrow">
          <span className="live-dot" /> KLEINE PLÄNE. GROSSES CHAOS.
        </span>
        <h1>
          Wohin geht’s,
          <br />
          <em>Tobi?</em>
        </h1>
        <p className="menu-invitation">
          Such dir dein nächstes Abenteuer aus.
          <br />
          Tobi hat selbstverständlich alles im Griff.
        </p>
        <div className="selected-level">
          <img
            className="selected-level-preview"
            src={levelPreview(level.id)}
            alt={`Vorschau: ${level.title}`}
            width="640"
            height="360"
          />
          <div className="selected-level-content">
            <span className="eyebrow">
              {tutorial ? 'DEIN ERSTER STOPP / TUTORIAL' : 'BEREIT FÜR DIE NÄCHSTE RUNDE'}
            </span>
            <h2>{levelTitle(level.id, level.title)}</h2>
            <p>
              {tutorial
                ? 'Geführte Übungen: bewegen, Kamera, springen, sprinten, trinken, werfen, pöbeln, verstecken und sitzen. Ohne Polizei.'
                : level.subtitle}
            </p>
            <div className="selected-mission">
              {level.scenery === 'aircraft'
                ? 'Kabinen-Rätsel · 2 Decks'
                : `${level.pickups.length} Flaschen`}{' '}
              <span>→ {destinationName(level)}</span>
            </div>
            <button
              className="primary-button gallery-start"
              disabled={view.phase !== 'ready' || starting}
              onClick={onStart}
            >
              {view.phase === 'loading'
                ? 'LEVEL WIRD GELADEN …'
                : tutorial
                  ? 'TUTORIAL STARTEN'
                  : level.scenery === 'aircraft'
                    ? 'ABHEBEN'
                    : level.scenery === 'hippie-house'
                      ? 'REIN IN DIE WG'
                      : level.scenery === 'railway'
                        ? 'EINSTEIGEN'
                        : level.scenery === 'bali-adventure'
                          ? 'BALI ERKUNDEN'
                          : 'FLUCHT STARTEN'}
              <span aria-hidden="true">↗</span>
            </button>
            <p className="guest-note">
              {signedIn
                ? 'Mit deinem Konto: Levelergebnisse werden gespeichert.'
                : 'Ohne Anmeldung spielen. Ein Konto brauchst du nur zum Speichern.'}
            </p>
          </div>
        </div>
        <p className="menu-controls">
          WASD bewegen · Maus Kamera · Space springen
          <br />G Flasche werfen · ESC Pause
        </p>
      </section>
      <LevelGallery selected={level.id} disabled={starting} onSelect={onSelectLevel} />
    </div>
  );
}
