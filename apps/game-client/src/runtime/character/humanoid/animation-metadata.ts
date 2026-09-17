import type {
  AnimationLoopMode,
  AnimationMetadata,
  CharacterConfig,
  HumanoidAction,
} from './schema.js';

const once = new Set<HumanoidAction>([
  'jump_start',
  'jump_land',
  'sit_down',
  'stand_up',
  'throw_bottle',
  'taunt',
  'drink',
  'pickup',
  'hit_reaction',
]);

/** Semantic defaults are keyed by the game's action vocabulary, never by imported clip names. */
export function animationMetadata(
  config: Pick<CharacterConfig, 'crossfade' | 'animationMetadata'>,
  action: HumanoidAction,
): AnimationMetadata {
  const configured = config.animationMetadata?.[action];
  return {
    name: action,
    loopMode: once.has(action) ? 'once' : 'repeat',
    rootMotion: false,
    inPlace: true,
    crossfadeDuration: config.crossfade,
    playbackSpeed: 1,
    reverseAllowed: false,
    ...configured,
  };
}

export interface ResolvedLoopTime {
  time: number;
  cycle: number;
  reverse: boolean;
  complete: boolean;
}

/** Resolves an unbounded animation clock without throwing away completed-cycle information. */
export function resolveLoopTime(
  elapsed: number,
  duration: number,
  mode: AnimationLoopMode,
): ResolvedLoopTime {
  const safeDuration = Math.max(0.0001, duration);
  const safeElapsed = Math.max(0, elapsed);
  if (mode === 'once')
    return {
      time: Math.min(safeElapsed, safeDuration),
      cycle: 0,
      reverse: false,
      complete: safeElapsed >= safeDuration,
    };
  if (mode === 'pingpong') {
    const leg = Math.floor(safeElapsed / safeDuration);
    const phase = safeElapsed % safeDuration;
    const reverse = leg % 2 === 1;
    return {
      time: reverse ? safeDuration - phase : phase,
      cycle: Math.floor(leg / 2),
      reverse,
      complete: false,
    };
  }
  return {
    time: safeElapsed % safeDuration,
    cycle: Math.floor(safeElapsed / safeDuration),
    reverse: false,
    complete: false,
  };
}
