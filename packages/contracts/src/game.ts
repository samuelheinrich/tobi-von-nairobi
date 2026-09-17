import type { Completion } from './progress.js';
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
  mood: number;
  moodLabel: string;
  emptyBottles: number;
  drinking: boolean;
  tripSeconds: number;
  tripIntensity: number;
  crowdCount: number;
  interiorFloor: number | null;
  tauntedCount: number;
  /** Last spoken line shown in the HUD, already localised by the speaking system. */
  speech: string;
  flirts: number;
  /** A non-police NPC is physically standing in Tobi's way right now. */
  blocked: boolean;
  lesson: {
    id: string;
    title: string;
    body: string;
    key: string;
    index: number;
    total: number;
    distance: number | null;
    bearing: string;
  } | null;
  posture: 'standing' | 'sitting' | 'hidden';
  interaction: string;
  cabin: { stage: number; strikes: number; returns: number; ready: boolean } | null;
  flight: {
    phase:
      | 'find_trolley'
      | 'breach_door'
      | 'enter_cockpit'
      | 'flying'
      | 'landing'
      | 'landed'
      | 'airport';
    trolleyGrabbed: boolean;
    doorIntegrity: number;
    speed: number;
    altitude: number;
    pitch: number;
    roll: number;
    heading: number;
    throttle: number;
    gearDown: boolean;
    landingProgress: number;
    evacuation: { active: boolean; total: number; arrived: number };
  } | null;
  railway: {
    state: 'RUNNING' | 'BRAKING' | 'STOPPED' | 'DOORS_OPEN';
    speed: number;
    brakeProgress: number;
    distance: number;
    vibration: number;
  } | null;
  score: number;
  elapsedSeconds: number;
  objective: string;
  nearDestination: boolean;
  canCheckIn: boolean;
  result: Completion | null;
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
