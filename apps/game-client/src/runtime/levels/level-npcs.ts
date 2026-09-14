import type { Position3 } from '@tobi/contracts';
import type { BottleTarget } from '../items/thrown-bottles.js';
import type { SpeechTopic } from '@tobi/game-core';
import type { SoundCue } from '../audio/sound-cues.js';

/** Everything a level's resident NPCs offer the session loop.
 * Police are deliberately not part of this: these characters talk, dodge and get in the way,
 * but they never feed the pursuit system.
 */
/** A spoken line plus the cue that should carry it, so the session never guesses a sound. */
export interface NpcReply {
  text: string;
  cue: SoundCue;
}

export interface LevelNpcs {
  /** Throwable targets, in the same shape the projectile system expects. */
  readonly targets: readonly BottleTarget[];
  /** True while an NPC is physically standing in Tobi's path. */
  readonly blocked: boolean;
  update(delta: number, player: Position3): void;
  /** Returns how many NPCs reacted to being shouted at. */
  taunt(position: Position3): number;
  /** Returns true when somebody actually answered a compliment. */
  flirt(position: Position3): boolean;
  /** Corrected ground position when an NPC body overlaps Tobi, or null when he is free. */
  resolve(player: Position3): Position3 | null;
  /** Pops the line an NPC said since the last call, for the HUD. */
  takeReply(): NpcReply | null;
  dispose(): void;
}

/** Which foley carries which kind of line. Friendly chatter chirps, complaints grumble. */
const cues: Record<SpeechTopic, SoundCue> = {
  tobiTaunt: 'provoke',
  tobiCellTaunt: 'provoke',
  tobiFlightTaunt: 'provoke',
  crowd: 'cheer',
  crowdAnnoyed: 'grumble',
  flirt: 'flirt',
  flirtRejected: 'reject',
  bargirlTaunt: 'reject',
  conductor: 'grumble',
  cellGuard: 'grumble',
  resident: 'flirt',
  yoga: 'flirt',
  passenger: 'grumble',
  barGuest: 'cheer',
};

export function replyCue(topic: SpeechTopic): SoundCue {
  return cues[topic];
}
