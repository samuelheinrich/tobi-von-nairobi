/** Device-independent actions for one simulation tick. Look deltas use radians. */
export interface InputActions {
  moveX: number;
  moveZ: number;
  lookX: number;
  lookY: number;
  jumpPressed: boolean;
  sprintHeld: boolean;
  interactPressed: boolean;
  specialPressed: boolean;
  celebratePressed: boolean;
  throwPressed: boolean;
  flirtPressed: boolean;
}

export interface InputSource {
  sample(): InputActions;
  reset(): void;
  dispose(): void;
}

export interface Position3 {
  x: number;
  y: number;
  z: number;
}
