import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { GameViewStore } from './game-view-store.js';
import type { GameHost } from '../runtime/session/game-host.js';
import { Landing } from '../ui/landing.js';
import { Hud, formatTime } from '../ui/hud.js';
import { Controls } from '../ui/controls.js';
import { CompassIcon } from '../ui/icons.js';

export function App() {
  const [generation, setGeneration] = useState(0);
  const store = useMemo(() => new GameViewStore(), [generation]);
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<GameHost | null>(null);
  const [muted, setMuted] = useState(false);
  const [help, setHelp] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const controller = new AbortController();
    let instance: GameHost | null = null;
    const element = canvas.current;
    if (!element) return;
    void import('../runtime/session/game-host.js')
      .then(async ({ GameHost }) => {
        instance = await GameHost.create(element, store, controller.signal);
        if (controller.signal.aborted) {
          instance?.dispose();
          return;
        }
        host.current = instance;
        instance?.setMuted(mutedRef.current);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          store.update({
            phase: 'error',
            error: error instanceof Error ? error.message : 'Tobi konnte nicht starten.',
          });
      });
    return () => {
      controller.abort();
      instance?.dispose();
      host.current = null;
    };
  }, [store]);

  const restart = (): void => {
    setHelp(false);
    setGeneration((value) => value + 1);
  };
  const toggleMute = (): void => {
    host.current?.setMuted(!muted);
    setMuted(!muted);
  };
  const active = ['playing', 'paused', 'complete'].includes(view.phase);
  return (
    <main className={`game-app ${active ? 'in-game' : ''}`}>
      <canvas
        ref={canvas}
        className="game-canvas"
        tabIndex={0}
        aria-label="3D-Spielwelt: Welcome to Bali"
        data-testid="game-canvas"
      />
      {!active && <div className="scene-gradient" />}
      <header className="topbar">
        <div className="brand">
          <CompassIcon />
          <span>
            TOBI<span className="brand-sub">VON NAIROBI</span>
          </span>
        </div>
        <div className="topbar-center">
          THE GAME <span>✳</span> ZERO PLANS. FULL SEND.
        </div>
        <div className="topbar-actions">
          <button
            aria-label={muted ? 'Ton einschalten' : 'Ton ausschalten'}
            aria-pressed={muted}
            onClick={toggleMute}
          >
            {muted ? '◌' : '♫'}
          </button>
          <button
            aria-label="Steuerung anzeigen"
            onClick={() => {
              host.current?.pause();
              setHelp(true);
            }}
          >
            ?
          </button>
          {view.phase === 'playing' && (
            <button aria-label="Spiel pausieren" onClick={() => host.current?.pause()}>
              Ⅱ
            </button>
          )}
        </div>
      </header>
      {['ready', 'loading'].includes(view.phase) && (
        <Landing view={view} onStart={() => host.current?.start()} />
      )}
      {active && <Hud view={view} />}
      {(view.phase === 'paused' || help) && (
        <div className="modal-backdrop">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Pause und Steuerung"
          >
            <span className="eyebrow">KURZ DURCHATMEN</span>
            <h2>
              Tobi macht
              <br />
              <em>eine Pause.</em>
            </h2>
            <p>Die Stadt kann kurz warten.</p>
            <Controls />
            <p className="muted-copy">
              Maus bewegen: Kamera. Falls die Maussperre nicht verfügbar ist, mit gedrückter
              Maustaste ziehen.
            </p>
            <button
              className="primary-button"
              onClick={() => {
                setHelp(false);
                host.current?.start();
              }}
            >
              WEITER GEHT’S <span>↗</span>
            </button>
            <button className="text-button" onClick={restart}>
              Zurück zum Start
            </button>
          </section>
        </div>
      )}
      {view.phase === 'complete' && (
        <div className="modal-backdrop results-backdrop">
          <section
            className="dialog results"
            role="dialog"
            aria-modal="true"
            aria-label="Tutorial abgeschlossen"
          >
            <span className="eyebrow">WELCOME TO BALI · GESCHAFFT</span>
            <div className="result-star">✳</div>
            <h2>
              Buchung bestätigt.
              <br />
              <em>Nerven storniert.</em>
            </h2>
            <div className="result-stats">
              <div>
                <span>FLASCHEN</span>
                <strong>
                  {view.collected}/{view.total}
                </strong>
              </div>
              <div>
                <span>ZEIT</span>
                <strong>{formatTime(view.elapsedSeconds)}</strong>
              </div>
              <div>
                <span>TOBI SCORE</span>
                <strong>{view.score.toLocaleString('de-CH')}</strong>
              </div>
            </div>
            <p>Tobi ist angekommen. Das ist schon mal verdächtig gut gelaufen.</p>
            <button className="primary-button" onClick={restart}>
              NOCH EINE RUNDE <span>↻</span>
            </button>
            <p className="muted-copy">
              Technischer Prototyp: Dieser Durchlauf wird noch nicht gespeichert. Polizei und
              weitere Levels folgen.
            </p>
          </section>
        </div>
      )}
      {view.phase === 'error' && (
        <div className="modal-backdrop">
          <section className="dialog" role="alert">
            <span className="eyebrow">TOBI HAT SICH VERLAUFEN</span>
            <h2>
              Kleiner
              <br />
              <em>Zwischenfall.</em>
            </h2>
            <p>{view.error}</p>
            <button className="primary-button" onClick={restart}>
              ERNEUT VERSUCHEN <span>↻</span>
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
