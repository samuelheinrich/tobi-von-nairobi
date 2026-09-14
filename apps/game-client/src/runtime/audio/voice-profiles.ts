import type { SpeechTopic } from '@tobi/game-core';

/** How one kind of speaker sounds: which system voices suit it, and how it is pitched. */
export interface VoiceProfile {
  /** Voice names to prefer, best first. Matched case-insensitively as a prefix, because
   * macOS appends the language: «Rocko» matches «Rocko (German (Germany))». */
  prefer: readonly string[];
  pitch: number;
  rate: number;
  volume: number;
}

/** Joke and robot voices that ship with macOS. They are in the same list as the real ones and
 * carry no flag that separates them, so they have to be named. Picking «Bells» to read a line
 * of dialogue is worse than staying silent.
 */
const NOVELTY = new Set(
  [
    'albert',
    'bad news',
    'bahh',
    'bells',
    'boing',
    'bubbles',
    'cellos',
    'deranged',
    'fred',
    'good news',
    'hysterical',
    'jester',
    'junior',
    'kathy',
    'organ',
    'pipe organ',
    'princess',
    'ralph',
    'superstar',
    'trinoids',
    'whisper',
    'wobble',
    'zarvox',
  ].map((name) => name.toLowerCase()),
);

export function isNoveltyVoice(name: string): boolean {
  // Strip the parenthesised language macOS appends before comparing.
  return NOVELTY.has(
    name
      .replace(/\s*\(.*\)\s*$/, '')
      .trim()
      .toLowerCase(),
  );
}

const TOBI: VoiceProfile = {
  // Loud, low and a bit too fast: a man who is certain he is being reasonable.
  prefer: ['Rocko', 'Eddy', 'Grandpa', 'Reed'],
  pitch: 0.6,
  rate: 1.18,
  volume: 1,
};

/** Uniformed, clipped and loud. The first shout is the loudest thing in the level. */
const POLICE: VoiceProfile = {
  prefer: ['Reed', 'Grandpa', 'Rocko', 'Eddy'],
  pitch: 0.78,
  rate: 1.12,
  volume: 1,
};

const profiles: Record<SpeechTopic, VoiceProfile> = {
  tobiTaunt: TOBI,
  tobiCellTaunt: { ...TOBI, rate: 1.1 },
  tobiFlightTaunt: { ...TOBI, pitch: 0.72, rate: 1.05, volume: 0.85 },
  crowd: { prefer: ['Flo', 'Sandy', 'Shelley', 'Anna'], pitch: 1.05, rate: 1.08, volume: 0.8 },
  crowdAnnoyed: { prefer: ['Rocko', 'Reed', 'Eddy'], pitch: 0.88, rate: 1.12, volume: 0.85 },
  // The bar girls speak English, bright and quick.
  flirt: { prefer: ['Samantha', 'Shelley', 'Flo'], pitch: 1.35, rate: 1.12, volume: 0.9 },
  flirtRejected: { prefer: ['Samantha', 'Shelley', 'Flo'], pitch: 1.25, rate: 1.05, volume: 0.85 },
  bargirlTaunt: { prefer: ['Samantha', 'Shelley', 'Flo'], pitch: 1.3, rate: 1.18, volume: 0.9 },
  conductor: { prefer: ['Grandpa', 'Rocko', 'Reed'], pitch: 0.72, rate: 0.95, volume: 0.95 },
  cellGuard: { prefer: ['Grandpa', 'Reed', 'Rocko'], pitch: 0.68, rate: 0.88, volume: 0.9 },
  resident: { prefer: ['Sandy', 'Flo', 'Anna'], pitch: 1.08, rate: 0.95, volume: 0.8 },
  // Slow and low-effort on purpose: nobody in a yoga room raises their voice.
  yoga: { prefer: ['Shelley', 'Sandy', 'Anna'], pitch: 1.12, rate: 0.78, volume: 0.72 },
  passenger: { prefer: ['Grandma', 'Anna', 'Sandy'], pitch: 0.98, rate: 0.9, volume: 0.72 },
  barGuest: { prefer: ['Eddy', 'Rocko', 'Flo'], pitch: 0.95, rate: 1.06, volume: 0.8 },
  policeSpotted: { ...POLICE, pitch: 0.74, rate: 1.22 },
  policeChase: POLICE,
  // Searching is muttered to a colleague, not shouted across a square.
  policeSearch: { ...POLICE, pitch: 0.82, rate: 0.98, volume: 0.8 },
  policeCaught: { ...POLICE, pitch: 0.8, rate: 0.92, volume: 0.95 },
  // Greetings are offhand: quieter and a touch slower than a reaction to being shouted at.
  greeting: { prefer: ['Sandy', 'Flo', 'Anna', 'Shelley'], pitch: 1.04, rate: 0.98, volume: 0.66 },
  greetingBar: { prefer: ['Samantha', 'Shelley', 'Flo'], pitch: 1.3, rate: 1.06, volume: 0.72 },
  greetingYoga: { prefer: ['Shelley', 'Sandy'], pitch: 1.12, rate: 0.8, volume: 0.6 },
  greetingTrain: { prefer: ['Grandma', 'Eddy', 'Anna'], pitch: 0.97, rate: 0.94, volume: 0.66 },
};

export function voiceProfile(topic: SpeechTopic): VoiceProfile {
  return profiles[topic];
}
