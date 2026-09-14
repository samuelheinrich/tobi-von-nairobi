/** Every sound the game can ask for. Adding a cue here is also how a sample file gets adopted:
 * drop `<cue>.ogg` into `apps/game-client/src/assets/audio/` and the bank prefers it at runtime.
 */
export const soundCues = [
  'drink',
  'refill',
  'throw',
  'smash',
  'powerup',
  'pickup',
  'jump',
  'land',
  'step',
  'hiccup',
  'stumble',
  'alert',
  'escape',
  'caught',
  'provoke',
  'victory',
  'flirt',
  'reject',
  'grumble',
  'block',
  'cheer',
] as const;

export type SoundCue = (typeof soundCues)[number];

export function isSoundCue(value: string): value is SoundCue {
  return (soundCues as readonly string[]).includes(value);
}
