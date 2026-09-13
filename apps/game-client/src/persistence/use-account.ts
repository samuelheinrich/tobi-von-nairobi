import { useEffect, useRef, useState } from 'react';
import { ApiError, createApiClient } from '@tobi/api-client';
import type { AuthResponse, Completion, Credentials, Progress, RunResponse } from '@tobi/contracts';
import { enqueueCompletion, pendingCompletions, removeCompletion } from './outbox.js';

const api = createApiClient(import.meta.env.VITE_API_BASE_URL || '/api/v1');
const message = (error: unknown): string =>
  error instanceof Error ? error.message : 'Verbindung fehlgeschlagen.';

export function useAccount() {
  const [auth, setAuth] = useState<AuthResponse>({ user: null, csrfToken: null });
  const [progress, setProgress] = useState<Progress | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const epoch = useRef(0);
  const starting = useRef(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const authRef = useRef(auth);
  authRef.current = auth;
  const run = useRef<{ owner: string; data: RunResponse } | null>(null);
  const startId = useRef<string | null>(null);
  const flushing = useRef(false);
  const completed = useRef<string | null>(null);
  const volatileResult = useRef<Completion | null>(null);
  const retry = useRef(2000);
  const blocked = useRef(false);

  const refresh = async (): Promise<void> => {
    const current = epoch.current;
    const session = await api.session();
    if (current !== epoch.current) return;
    setAuth(session);
    authRef.current = session;
    if (session.user) {
      const next = await api.progress();
      if (current === epoch.current) setProgress(next);
    } else setProgress(null);
  };
  const sync = async (): Promise<void> => {
    const userId = authRef.current.user?.id;
    if (!userId || flushing.current || blocked.current) return;
    flushing.current = true;
    try {
      const entries = await pendingCompletions(userId);
      for (const entry of entries) {
        if (authRef.current.user?.id !== userId) break;
        setSaveStatus('Fortschritt wird gespeichert …');
        await api.complete(entry.runId, entry.result);
        await removeCompletion(entry.runId);
        if (authRef.current.user?.id !== userId) break;
        setSaveStatus('Fortschritt gespeichert.');
        try {
          const next = await api.progress();
          if (authRef.current.user?.id === userId) setProgress(next);
        } catch {
          if (authRef.current.user?.id === userId)
            setError('Ergebnis gespeichert. Bestwerte konnten noch nicht geladen werden.');
        }
      }
      retry.current = 2000;
    } catch (err) {
      retry.current = Math.min(30000, retry.current * 2);
      if (err instanceof ApiError && [400, 401, 403, 404, 409, 422].includes(err.status)) {
        blocked.current = true;
        setSaveStatus(
          err.status === 401
            ? 'Zum Speichern bitte erneut anmelden.'
            : `Speichern angehalten: ${message(err)}`,
        );
      } else setSaveStatus('Offline: Ergebnis lokal gesichert. Neuer Versuch folgt.');
    } finally {
      flushing.current = false;
    }
  };
  useEffect(() => {
    let live = true,
      timer: ReturnType<typeof setTimeout>;
    const loop = async (): Promise<void> => {
      await sync();
      if (live) timer = setTimeout(() => void loop(), retry.current);
    };
    void refresh()
      .catch(() => {
        if (live) setError('Server nicht erreichbar. Gastspiel bleibt möglich.');
      })
      .finally(() => {
        if (live) {
          setReady(true);
          void loop();
        }
      });
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, []);

  const authenticate = async (
    mode: 'login' | 'register',
    credentials: Credentials,
  ): Promise<boolean> => {
    epoch.current++;
    setBusy(true);
    setError('');
    try {
      const next = await api.authenticate(mode, credentials);
      setAuth(next);
      authRef.current = next;
      setProgress(await api.progress());
      blocked.current = false;
      void sync();
      return true;
    } catch (err) {
      setError(message(err));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const logout = async (): Promise<void> => {
    if (volatileResult.current) {
      setError('Bitte zuerst das noch nicht gesicherte Ergebnis speichern.');
      return;
    }
    epoch.current++;
    setBusy(true);
    setError('');
    try {
      await api.logout();
      setAuth({ user: null, csrfToken: null });
      authRef.current = { user: null, csrfToken: null };
      setProgress(null);
      run.current = null;
      setSaveStatus('');
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };
  const begin = async (levelId: string): Promise<boolean> => {
    if (!ready || starting.current) return false;
    if (volatileResult.current) {
      setError('Ergebnis noch nicht gesichert. Bitte zuerst erneut speichern.');
      return false;
    }
    completed.current = null;
    setSaveStatus('');
    setError('');
    if (!authRef.current.user) {
      run.current = null;
      return true;
    }
    starting.current = true;
    setBusy(true);
    try {
      if ((await pendingCompletions(authRef.current.user.id)).length)
        throw new Error('Bitte zuerst das offene Ergebnis speichern.');
      startId.current ??= crypto.randomUUID();
      const data = await api.start(levelId, startId.current);
      if (data.status !== 'active') {
        startId.current = null;
        throw new Error('Versuch bereits beendet. Bitte neu starten.');
      }
      run.current = { owner: authRef.current.user.id, data };
      startId.current = null;
      const owner = authRef.current.user.id;
      void api
        .progress()
        .then((next) => {
          if (authRef.current.user?.id === owner) setProgress(next);
        })
        .catch(() => undefined);
      return true;
    } catch (err) {
      setError(message(err));
      return false;
    } finally {
      starting.current = false;
      setBusy(false);
    }
  };
  const finish = async (result: Completion): Promise<void> => {
    const current = run.current;
    if (!current || completed.current === current.data.id) return;
    if (result.debugUsed) {
      setSaveStatus('Debug-Durchlauf wird nicht gespeichert. Aktiven Versuch im Konto verwerfen.');
      return;
    }
    volatileResult.current = result;
    try {
      await enqueueCompletion({
        userId: current.owner,
        runId: current.data.id,
        result,
        createdAt: Date.now(),
      });
      completed.current = current.data.id;
      volatileResult.current = null;
      setSaveStatus('Ergebnis lokal gesichert. Synchronisierung läuft …');
      await sync();
    } catch (err) {
      setSaveStatus(`${message(err)} Ergebnis noch nicht gesichert. Bitte erneut speichern.`);
    }
  };
  const retrySave = async (): Promise<void> => {
    blocked.current = false;
    if (volatileResult.current) await finish(volatileResult.current);
    else {
      try {
        await refresh();
        await sync();
      } catch (err) {
        setError(message(err));
      }
    }
  };
  const abandon = async (): Promise<void> => {
    if (volatileResult.current) {
      setError('Bitte zuerst das noch nicht gesicherte Ergebnis speichern.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const latest = await api.progress();
      if (authRef.current.user && (await pendingCompletions(authRef.current.user.id)).length)
        throw new Error('Ein Ergebnis wartet auf Speicherung. Bitte zuerst synchronisieren.');
      if (latest.activeRun) await api.abandon(latest.activeRun.id);
      run.current = null;
      startId.current = null;
      setProgress(await api.progress());
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };
  const resetRun = async (): Promise<boolean> => {
    setBusy(true);
    setError('');
    try {
      if (
        volatileResult.current ||
        (run.current && (await pendingCompletions(run.current.owner)).length)
      )
        throw new Error('Bitte zuerst das offene Ergebnis speichern.');
      if (run.current && completed.current !== run.current.data.id)
        await api.abandon(run.current.data.id);
      run.current = null;
      startId.current = null;
      return true;
    } catch (err) {
      setError(message(err));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return {
    auth,
    ready,
    progress,
    busy,
    error,
    saveStatus,
    authenticate,
    logout,
    begin,
    finish,
    abandon,
    retrySave,
    resetRun,
  };
}
export type AccountState = ReturnType<typeof useAccount>;
