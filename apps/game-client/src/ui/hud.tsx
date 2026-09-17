import { TutorialCoach } from './tutorial-coach.js';
import {
  levelById,
  playableLevels,
  pursuitBalance,
  worldNames,
  destinationName,
} from '@tobi/game-data';
import type { GameView } from '@tobi/contracts';
import { PursuitHud } from './pursuit-hud.js';
import { BottleIcon } from './icons.js';

export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function Hud({ view }: { view: GameView }) {
  const level = levelById(view.levelId) ?? playableLevels[0];
  return (
    <div className="hud" aria-label="Spielstatus">
      <TutorialCoach lesson={view.lesson} />
      <section className="mission-card">
        <div className="eyebrow">
          {worldNames[level.worldId].toUpperCase()}{' '}
          <span className="mission-type">{level.title.toUpperCase()}</span>
        </div>
        <h2>{view.objective}</h2>
        <p>
          {level.scenery === 'aircraft'
            ? view.flight?.phase === 'flying'
              ? 'W/S: Nase · A/D: Rollen · Shift: mehr Schub · Space: weniger Schub · L: landen.'
              : view.flight?.phase === 'landing'
                ? 'Der kurze Arcade-Landeanflug läuft. Tobi sollte sich vorsichtshalber festhalten.'
                : view.flight?.phase === 'landed'
                  ? 'Saubere Landung. Verlasse mit E den Pilotensitz und geh zum Terminal.'
                  : view.flight?.phase === 'airport'
                    ? 'Folge der Evakuierung über das Rollfeld und erreiche die Partyhalle im Terminal.'
                    : 'Finde den Servicewagen, greife ihn mit E und ramme damit die Cockpittür.'
            : level.scenery === 'drunk-tank'
              ? 'R: rumpöbeln, bis der Wärter vorbeischaut. E auf der Pritsche beendet die Nacht.'
              : level.scenery === 'railway'
                ? view.railway?.state === 'BRAKING'
                  ? 'NOTBREMSUNG · Passagiere halten sich fest, Landschaft und Schienengeräusch werden langsamer.'
                  : view.railway?.state === 'STOPPED'
                    ? 'Der Zug steht. Öffne die markierte Seitentür mit E.'
                    : view.railway?.state === 'DOORS_OPEN'
                      ? 'Der Ausstieg ist offen. Verlasse den Zug auf der linken Seite.'
                      : 'Durchquere Sitz-, Gepäck-, WC- und Barwagen bis zur roten Notbremse.'
                : view.collected < view.total
                  ? level.scenery === 'hippie-house'
                    ? '18 Flaschen in der WG, 18 im Quartier. Treppen im Norden, Haustür im Süden. E: Scooter / Sitz.'
                    : level.scenery === 'nana-plaza'
                      ? 'BTS → Soi 4 → Plaza. Treppen hinten im Hof. E: Bar / Sitz, F: flirten, R: pöbeln. Danach zurück zum BTS.'
                      : 'Flaschen trinken sich automatisch. G: werfen. R: anpöbeln.'
                  : view.pursuit && !view.canCheckIn
                    ? `Nutze Gebäude oder Musikfahrzeuge als Deckung. ${pursuitBalance.escapeDuration} Sekunden ohne Sichtkontakt!`
                    : `${destinationName(level)} wartet am Ende des Wegs.`}
        </p>
        {view.total > 0 && (
          <div className="bottle-progress">
            <BottleIcon />
            <strong data-testid="bottle-count">
              {view.collected}
              <span> / {view.total}</span>
            </strong>
            <div className="progress-pips">
              {Array.from({ length: Math.min(view.total, 30) }, (_, i) => (
                <i key={i} className={i < view.collected ? 'filled' : ''} />
              ))}
            </div>
          </div>
        )}
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
        {view.flight &&
          ['find_trolley', 'breach_door', 'enter_cockpit'].includes(view.flight.phase) && (
            <span data-testid="cabin-status">
              COCKPITTÜR · {view.flight.doorIntegrity}% ·{' '}
              {view.flight.trolleyGrabbed ? 'SERVICEWAGEN IN DER HAND' : 'SERVICEWAGEN SUCHEN'}
            </span>
          )}
        {view.flight?.phase === 'flying' && (
          <span data-testid="flight-status">
            AIRSPEED {view.flight.speed} · ALT {view.flight.altitude} m · SCHUB{' '}
            {Math.round(view.flight.throttle * 100)}% · PITCH{' '}
            {Math.round((view.flight.pitch * 180) / Math.PI)}° · ROLL{' '}
            {Math.round((view.flight.roll * 180) / Math.PI)}°
          </span>
        )}
        {view.flight?.phase === 'landing' && (
          <span data-testid="landing-status">
            LANDEANFLUG · {Math.round(view.flight.landingProgress * 100)}% · AIRSPEED{' '}
            {view.flight.speed} · ALT {view.flight.altitude} m
          </span>
        )}
        {view.flight?.phase === 'landed' && (
          <strong data-testid="landing-status">TOUCHDOWN · GELANDET</strong>
        )}
        {view.flight?.phase === 'airport' && (
          <span data-testid="evacuation-status">
            EVAKUIERUNG · {view.flight.evacuation.arrived}/{view.flight.evacuation.total} IM
            TERMINAL
          </span>
        )}
        {view.railway && (
          <span data-testid="railway-status">
            ZUG · {view.railway.state} · {Math.round(view.railway.speed * 3.6)} KM/H
            {view.railway.state === 'BRAKING'
              ? ` · BREMSE ${Math.round(view.railway.brakeProgress * 100)}%`
              : ''}
          </span>
        )}
        {view.posture !== 'standing' && (
          <strong data-testid="posture">
            {view.posture === 'sitting' ? 'TOBI SITZT · UNAUFFÄLLIG' : 'IM WC VERSTECKT'}
          </strong>
        )}
        {view.interaction && <span data-testid="seat-interaction">{view.interaction}</span>}
        {view.interiorFloor !== null && (
          <strong data-testid="interior-floor">
            {level.scenery === 'nana-plaza'
              ? `NANA PLAZA · FLOOR ${view.interiorFloor + 1} · TREPPEN HINTEN`
              : view.flight
                ? view.interiorFloor === 0
                  ? 'A380 · HAUPTDECK · ECONOMY'
                  : 'A380 · OBERDECK · BUSINESS'
                : view.interiorFloor === 0
                  ? 'ERDGESCHOSS · AUSGANG IM SÜDEN'
                  : `${view.interiorFloor}. OBERGESCHOSS · 6 ZIMMER`}
          </strong>
        )}
        <strong data-testid="bottle-hand">
          {view.drinking
            ? 'TOBI TRINKT …'
            : view.emptyBottles
              ? 'FLASCHE IN DER HAND'
              : 'HÄNDE FREI'}
        </strong>
        <span>
          <kbd>G</kbd> In Tobis Blickrichtung werfen ·{' '}
          <b data-testid="empty-bottles">{view.emptyBottles}</b> leer
        </span>
        {view.crowdCount > 0 && (
          <span data-testid="crowd-count">
            <kbd>R</kbd> Anpöbeln · {view.tauntedCount} / {view.crowdCount} reagieren
          </span>
        )}
        {view.flirts > 0 && (
          <span data-testid="flirt-count">
            <kbd>F</kbd> Anflirten · {view.flirts} Komplimente
          </span>
        )}
        {view.blocked && <span data-testid="npc-block">DER SCHAFFNER STEHT IM WEG</span>}
        {view.tripSeconds > 0 && (
          <span data-testid="color-trip">FARBRAUSCH · {view.tripSeconds}s</span>
        )}
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
      {view.speech && (
        <div className="npc-speech" role="status" data-testid="npc-speech">
          {view.speech}
        </div>
      )}
      {view.toast && !view.speech && (
        <div className="pickup-toast" role="status">
          {view.toast}
        </div>
      )}
      {view.nearDestination && (
        <div className="interact-prompt">
          {view.lesson ? (
            <>ERST DIE ÜBUNGEN ABSCHLIESSEN.</>
          ) : view.flight && view.flight.phase !== 'airport' ? (
            <>COCKPIT ÜBERNEHMEN UND FLUGZEUG STEUERN.</>
          ) : view.pursuit && view.collected === view.total && !view.canCheckIn ? (
            <>ERST DIE POLIZEI ABHÄNGEN.</>
          ) : view.collected === view.total ? (
            <>
              <kbd>E</kbd>{' '}
              {level.scenery === 'aircraft'
                ? 'PARTY-BAR BETRETEN'
                : level.scenery === 'hippie-house'
                  ? 'WG VERLASSEN'
                  : level.scenery === 'railway'
                    ? 'WAGEN 1 ERREICHT'
                    : level.scenery === 'street-parade'
                      ? 'BACKSTAGE BETRETEN'
                      : level.scenery === 'nana-plaza'
                        ? 'SOI 4 VERLASSEN'
                        : level.scenery === 'drunk-tank'
                          ? 'HINLEGEN UND AUSNÜCHTERN'
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
          {level.scenery === 'railway'
            ? view.railway?.state === 'DOORS_OPEN'
              ? 'AUSSTEIGEN ERLAUBT.'
              : 'NOTBREMSE GANZ VORNE.'
            : level.scenery === 'drunk-tank'
              ? 'KARL IST NICHT ERREICHBAR.'
              : 'KARL HAT EINEN PLAN.'}
        </small>
      </div>
      {view.debug && <div className="debug-badge">DEBUG RUN · {view.fps} FPS</div>}
    </div>
  );
}
