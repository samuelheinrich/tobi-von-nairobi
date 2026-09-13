export type GamePhase =
  'loading' | 'ready' | 'playing' | 'paused' | 'complete' | 'caught' | 'error';

export type GameplayEvent =
  | { type: 'itemCollected'; pickupId: string; itemId: 'bottle' }
  | { type: 'zoneReached'; targetId: string }
  | { type: 'policeEscaped' };

/** Immutable UI projection. Engine objects and high-frequency transforms never cross this boundary. */
export interface GameView {
  phase: GamePhase;
  levelId: string;
  pursuit: PursuitView | null;
  collected: number;
  total: number;
  stamina: number;
  score: number;
  elapsedSeconds: number;
  objective: string;
  nearDestination: boolean;
  canCheckIn: boolean;
  toast: string;
  error: string | null;
  debug: boolean;
  fps: number;
}

export type PoliceState = 'PATROL' | 'SUSPICIOUS' | 'CHASE' | 'SEARCH' | 'RETURN_TO_PATROL';
export interface PursuitView {
  chaos: number;
  wanted: number;
  maxWanted: number;
  status: 'quiet' | 'chase' | 'search' | 'escaped' | 'caught';
  escapeSeconds: number | null;
  capturePercent: number;
  escapes: number;
}
