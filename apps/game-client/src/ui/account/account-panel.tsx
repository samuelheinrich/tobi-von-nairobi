import { useState } from 'react';
import type { FormEvent } from 'react';
import type { AccountState } from '../../persistence/use-account.js';
import { levelById } from '@tobi/game-data';

export function AccountPanel({ account, onClose }: { account: AccountState; onClose(): void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState('');
  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const ok = await account.authenticate(mode, { username, password });
    setPassword('');
    if (ok) onClose();
  };
  return (
    <div className="modal-backdrop account-backdrop">
      <section
        className="dialog account-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Konto und Fortschritt"
      >
        <span className="eyebrow">DEIN REISEBUCH</span>
        <h2>
          {account.auth.user ? (
            <>
              Hallo, <em>{account.auth.user.username}.</em>
            </>
          ) : (
            <>
              Grosse Pläne.
              <br />
              <em>Gespeichert.</em>
            </>
          )}
        </h2>
        {account.auth.user ? (
          <>
            <p>
              Bestätigter Gesamtpunktestand:{' '}
              <strong data-testid="saved-total">
                {account.progress?.score.toLocaleString('de-CH') ?? '…'}
              </strong>
            </p>
            <ul className="saved-levels">
              {account.progress?.levels.map((level) => (
                <li key={level.levelId}>
                  <strong>{levelById(level.levelId)?.title ?? level.levelId}</strong>
                  <span>
                    {level.bestScore.toLocaleString('de-CH')} Punkte · {level.completions}×
                    geschafft
                  </span>
                </li>
              ))}
            </ul>
            {!account.progress?.levels.length && (
              <p>Noch kein Level abgeschlossen. Die nächste Runde zählt.</p>
            )}
            {account.progress?.activeRun && (
              <div className="active-run-note">
                <p>
                  Ein Versuch ist noch offen. Ein Browser-Neustart setzt dessen Position nicht fort.
                </p>
                <button
                  className="text-button"
                  disabled={account.busy}
                  onClick={() => void account.abandon()}
                >
                  AKTIVEN VERSUCH VERWERFEN
                </button>
              </div>
            )}
            {account.saveStatus && <p role="status">{account.saveStatus}</p>}
            <button
              className="text-button"
              disabled={account.busy}
              onClick={() => void account.retrySave()}
            >
              FORTSCHRITT SYNCHRONISIEREN
            </button>
            <button
              className="text-button"
              disabled={account.busy}
              onClick={() => void account.logout()}
            >
              ABMELDEN
            </button>
          </>
        ) : (
          <form onSubmit={(event) => void submit(event)}>
            <p>
              Mit Konto werden abgeschlossene neue Durchläufe gespeichert. Ohne Konto kannst du
              weiterhin spielen.
            </p>
            <label>
              Benutzername
              <input
                autoComplete="username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={40}
                pattern="[a-zA-Z0-9_\-]+"
                required
              />
            </label>
            <label>
              Passwort
              <input
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={12}
                maxLength={128}
                required
              />
            </label>
            <p className="muted-copy">
              Mindestens 12 Zeichen. Benutzername: Buchstaben, Zahlen, _ oder -.
            </p>
            <button className="primary-button" disabled={account.busy} type="submit">
              {account.busy
                ? 'EINEN MOMENT …'
                : mode === 'register'
                  ? 'KONTO ERSTELLEN'
                  : 'ANMELDEN'}
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'NEUES KONTO ERSTELLEN' : 'ICH HABE SCHON EIN KONTO'}
            </button>
          </form>
        )}
        {account.error && (
          <p className="account-error" role="alert">
            {account.error}
          </p>
        )}
        <button className="text-button" disabled={account.busy} onClick={onClose}>
          ZURÜCK ZUM SPIEL
        </button>
      </section>
    </div>
  );
}
