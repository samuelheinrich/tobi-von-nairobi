export type GamePhase = 'loading' | 'ready' | 'playing' | 'paused' | 'complete' | 'error';

export type GameplayEvent =
  | { type: 'itemCollected'; pickupId: string; itemId: 'bottle' }
  | { type: 'zoneReached'; targetId: string };

/** Immutable UI projection. Engine objects and high-frequency transforms never cross this boundary. */
export interface GameView {
  phase: GamePhase;
  collected: number;
  total: number;
  stamina: number;
  score: number;
  elapsedSeconds: number;
  objective: string;
  nearDestination: boolean;
  toast: string;
  error: string | null;
  debug: boolean;
  fps: number;
}
