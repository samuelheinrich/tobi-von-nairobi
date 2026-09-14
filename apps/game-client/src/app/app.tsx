import { useAccount } from '../persistence/use-account.js';
import { AccountPanel } from '../ui/account/account-panel.js';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { GameViewStore } from './game-view-store.js';
import type { GameHost } from '../runtime/session/game-host.js';
import { welcomeToBali, baliEscape, playableLevels } from '@tobi/game-data';
import { Landing } from '../ui/landing.js';
import { Hud, formatTime } from '../ui/hud.js';
import { Controls } from '../ui/controls.js';
import { CompassIcon } from '../ui/icons.js';

export function App() {
  const account = useAccount();
  const [showAccount, setShowAccount] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [level, setLevel] = useState(welcomeToBali);
  const store = useMemo(() => new GameViewStore(), [generation, level]);
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<GameHost | null>(null);
  const [muted, setMuted] = useState(false);
  const [help, setHelp] = useState(false);
  const [reducedEffects, setReducedEffects] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const controller = new AbortController();
    let instance: GameHost | null = null;
    const element = canvas.current;
    if (!element) return;
    void import('../runtime/session/game-host.js')
      .then(async ({ GameHost }) => {
        instance = await GameHost.create(element, store, controller.signal, level);
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
  }, [store, level]);

  useEffect(() => {
    if (view.phase === 'complete' && view.result) void account.finish(view.result);
  }, [view.phase, view.result]);
  const begin = async (): Promise<void> => {
    if (account.busy) return;
    host.current?.unlockAudio();
    if (await account.begin(level.id)) host.current?.start();
    else setShowAccount(true);
  };
  const restart = async (): Promise<void> => {
    if (account.busy) return;
    if (!(await account.resetRun())) {
      setShowAccount(true);
      return;
    }
    setHelp(false);
    setGeneration((value) => value + 1);
  };
  const toggleMute = (): void => {
    host.current?.setMuted(!muted);
    setMuted(!muted);
  };
  const active = ['playing', 'paused', 'complete', 'caught'].includes(view.phase);
  return (
    <main className={`game-app atmosphere-${level.atmosphere} ${active ? 'in-game' : ''}`}>
      <canvas
        ref={canvas}
        className="game-canvas"
        style={{
          filter:
            !reducedEffects && view.tripIntensity > 0 && view.phase === 'playing'
              ? `hue-rotate(${view.elapsedSeconds * 16}deg) saturate(${1 + view.tripIntensity * 1.7})`
              : 'none',
        }}
        tabIndex={0}
        aria-label={`3D-Spielwelt: ${level.title}`}
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
            className="effects-button"
            aria-label="Farbeffekte reduzieren"
            aria-pressed={reducedEffects}
            onClick={() => setReducedEffects((value) => !value)}
          >
            ◈
          </button>
          <button
            className="account-button"
            disabled={account.busy || view.phase === 'playing' || view.phase === 'paused'}
            onClick={() => setShowAccount(true)}
          >
            {account.auth.user ? `KONTO · ${account.auth.user.username}` : 'ANMELDEN'}
          </button>
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
        <Landing
          view={view}
          level={level}
          onSelectLevel={(id) => {
            const next = playableLevels.find((entry) => entry.id === id);
            if (next) setLevel(next);
          }}
          starting={account.busy || !account.ready}
          onStart={() => void begin()}
          onSelectEscape={() => setLevel(level.maxWanted > 0 ? welcomeToBali : baliEscape)}
        />
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
            <Controls escape={level.maxWanted > 0} />
            <p className="muted-copy">
              Maus bewegen: Kamera. Falls die Maussperre nicht verfügbar ist, mit gedrückter
              Maustaste ziehen.
            </p>
            <button
              className="text-button"
              aria-label="Farbeffekte reduzieren"
              aria-pressed={reducedEffects}
              onClick={() => setReducedEffects((value) => !value)}
            >
              ◈ FARBEFFEKTE: {reducedEffects ? 'REDUZIERT' : 'AN'}
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setHelp(false);
                if (view.phase === 'paused') host.current?.start();
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
      {view.phase === 'caught' && (
        <div className="modal-backdrop">
          <section className="dialog" role="dialog" aria-modal="true" aria-label="Erwischt">
            <span className="eyebrow">KURZER ZWISCHENSTOPP</span>
            <h2>
              Zu viel Tobi.
              <br />
              <em>Zu wenig Abstand.</em>
            </h2>
            <p>
              Security hat dich erwischt. Nutze Sprint und die Rückseiten der Häuser, um den
              Sichtkontakt zu unterbrechen.
            </p>
            <button className="primary-button" onClick={restart}>
              NOCH EIN VERSUCH <span>↻</span>
            </button>
            <p className="muted-copy">
              Der Durchlauf wird zurückgesetzt. Kein Geld und kein Spielstand gehen verloren.
            </p>
          </section>
        </div>
      )}
      {view.phase === 'complete' && (
        <div className="modal-backdrop results-backdrop">
          <section
            className="dialog results"
            role="dialog"
            aria-modal="true"
            aria-label={
              level.scenery === 'hippie-house'
                ? 'WG verlassen'
                : level.scenery === 'railway'
                  ? 'Zugfahrt abgeschlossen'
                  : level.maxWanted > 0
                    ? 'Flucht abgeschlossen'
                    : 'Tutorial abgeschlossen'
            }
          >
            <span className="eyebrow">{level.title.toUpperCase()} · GESCHAFFT</span>
            <div className="result-star">✳</div>
            <h2>
              {level.scenery === 'hippie-house'
                ? 'Namaste. Und tschüss.'
                : level.scenery === 'railway'
                  ? 'Wagen eins erreicht.'
                  : level.scenery === 'street-parade'
                    ? 'Parade überlebt.'
                    : 'Buchung bestätigt.'}
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
            {view.pursuit && (
              <p>
                {view.pursuit.escapes} erfolgreiche Flucht · Maximal{' '}
                {'★'.repeat(view.pursuit.maxWanted)} · Fluchtbonus enthalten
              </p>
            )}
            <p>Tobi ist angekommen. Das ist schon mal verdächtig gut gelaufen.</p>
            <button className="primary-button" onClick={restart}>
              NOCH EINE RUNDE <span>↻</span>
            </button>
            {playableLevels[playableLevels.findIndex((entry) => entry.id === level.id) + 1] && (
              <button
                className="text-button"
                disabled={account.busy}
                onClick={() => {
                  const next =
                    playableLevels[playableLevels.findIndex((entry) => entry.id === level.id) + 1];
                  void account.resetRun().then((ok) => {
                    if (ok && next) {
                      setHelp(false);
                      setLevel(next);
                    } else setShowAccount(true);
                  });
                }}
              >
                NÄCHSTES LEVEL →
              </button>
            )}
            {account.auth.user ? (
              <div className="save-status">
                <p role="status" data-testid="save-status">
                  {account.saveStatus ||
                    'Für diesen Durchlauf wurde noch kein gespeicherter Versuch gestartet.'}
                </p>
                <button className="text-button" onClick={() => void account.retrySave()}>
                  SPEICHERN ERNEUT VERSUCHEN
                </button>
              </div>
            ) : (
              <p className="muted-copy">
                Dieser Durchlauf wird noch nicht gespeichert. Melde dich vor dem nächsten Spiel an,
                um Fortschritt zu behalten.
              </p>
            )}
          </section>
        </div>
      )}
      {showAccount && <AccountPanel account={account} onClose={() => setShowAccount(false)} />}
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
