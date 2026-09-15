import type { Appearance, BodyShape, HairStyle, ShoeStyle } from '../presets.js';

export type FemaleBody =
  'slim_glamour' | 'slim_busty' | 'athletic_beach' | 'petite' | 'glamour_curvy';
export type FemaleRole =
  'gogo_dancer' | 'club_dancer' | 'cabaret_dancer' | 'beach_female' | 'pool_party';
export type Morphs = {
  waistWidth: number;
  hipWidth: number;
  chestSize: number;
  chestShape: number;
  bellyFlatness: number;
  legLength: number;
  thighSize: number;
  calfSize: number;
  shoulderWidth: number;
  armThickness: number;
  bodyHeight: number;
};
export type Outfit =
  | 'triangle'
  | 'bandeau'
  | 'sport_bikini'
  | 'high_cut'
  | 'one_piece'
  | 'sarong'
  | 'open_blouse'
  | 'beach_shorts'
  | 'beach_dress'
  | 'bra_hotpants'
  | 'crop_shorts'
  | 'mini_dress'
  | 'sequin'
  | 'neon'
  | 'leather'
  | 'cabaret'
  | 'corset';
export type Makeup = 'natural' | 'soft_gloss' | 'glamour' | 'smoky' | 'neon' | 'berry';
export interface FemaleStyle {
  role: FemaleRole;
  bodyPreset: FemaleBody;
  morphs: Morphs;
  outfit: Outfit;
  makeup: Makeup;
  ageYears: number;
  animation: number;
}
const profiles: Record<FemaleBody, Morphs> = {
  slim_glamour: {
    waistWidth: 0.82,
    hipWidth: 0.88,
    chestSize: 1.15,
    chestShape: 1,
    bellyFlatness: 0.96,
    legLength: 1.08,
    thighSize: 0.9,
    calfSize: 0.92,
    shoulderWidth: 0.93,
    armThickness: 0.85,
    bodyHeight: 1,
  },
  slim_busty: {
    waistWidth: 0.77,
    hipWidth: 0.86,
    chestSize: 1.3,
    chestShape: 1.1,
    bellyFlatness: 0.98,
    legLength: 1.05,
    thighSize: 0.86,
    calfSize: 0.88,
    shoulderWidth: 0.91,
    armThickness: 0.82,
    bodyHeight: 1,
  },
  athletic_beach: {
    waistWidth: 0.91,
    hipWidth: 0.97,
    chestSize: 1.09,
    chestShape: 0.92,
    bellyFlatness: 1,
    legLength: 1.03,
    thighSize: 1.05,
    calfSize: 1.08,
    shoulderWidth: 1.08,
    armThickness: 1,
    bodyHeight: 1.02,
  },
  petite: {
    waistWidth: 0.85,
    hipWidth: 0.84,
    chestSize: 1.04,
    chestShape: 0.98,
    bellyFlatness: 0.94,
    legLength: 0.94,
    thighSize: 0.9,
    calfSize: 0.91,
    shoulderWidth: 0.92,
    armThickness: 0.86,
    bodyHeight: 0.97,
  },
  glamour_curvy: {
    waistWidth: 0.91,
    hipWidth: 1.06,
    chestSize: 1.28,
    chestShape: 1.08,
    bellyFlatness: 0.9,
    legLength: 1.02,
    thighSize: 1.13,
    calfSize: 1.06,
    shoulderWidth: 1,
    armThickness: 0.96,
    bodyHeight: 1.01,
  },
};
const dancerRanges: Record<keyof Morphs, readonly [number, number]> = {
  waistWidth: [0.75, 0.96],
  hipWidth: [0.82, 1.08],
  chestSize: [1, 1.34],
  chestShape: [0.9, 1.13],
  bellyFlatness: [0.88, 1],
  legLength: [0.93, 1.11],
  thighSize: [0.83, 1.16],
  calfSize: [0.85, 1.12],
  shoulderWidth: [0.89, 1.1],
  armThickness: [0.8, 1.04],
  bodyHeight: [0.96, 1.035],
};
export const femaleRanges = {
  gogo_dancer: dancerRanges,
  club_dancer: dancerRanges,
  cabaret_dancer: dancerRanges,
  beach_female: {
    ...dancerRanges,
    chestSize: [0.98, 1.3],
    waistWidth: [0.8, 0.99],
    hipWidth: [0.83, 1.09],
    armThickness: [0.83, 1.06],
  } as typeof dancerRanges,
  pool_party: { ...dancerRanges, chestSize: [1, 1.32] } as typeof dancerRanges,
};
const stage: Outfit[] = [
  'triangle',
  'bra_hotpants',
  'crop_shorts',
  'mini_dress',
  'sequin',
  'neon',
  'leather',
  'corset',
  'cabaret',
];
const beach: Outfit[] = [
  'triangle',
  'bandeau',
  'sport_bikini',
  'high_cut',
  'one_piece',
  'sarong',
  'open_blouse',
  'beach_shorts',
  'beach_dress',
];
const hair: HairStyle[] = [
  'long',
  'wavy',
  'bob',
  'high_ponytail',
  'curly',
  'side_swept',
  'bun',
  'beach_waves',
  'ponytail',
];
export const femalePresets: Record<
  FemaleRole,
  {
    weights: readonly number[];
    outfits: readonly Outfit[];
    hair: readonly HairStyle[];
    makeup: readonly Makeup[];
    shoes: readonly ShoeStyle[];
    accessories: readonly Appearance['accessory'][];
  }
> = {
  gogo_dancer: {
    weights: [30, 30, 10, 15, 15],
    outfits: stage,
    hair,
    makeup: ['glamour', 'smoky', 'neon', 'berry'],
    shoes: ['heels', 'boots', 'platforms'],
    accessories: ['necklace', 'choker', 'earrings', 'bracelet', 'bag'],
  },
  club_dancer: {
    weights: [30, 20, 20, 15, 15],
    outfits: ['crop_shorts', 'mini_dress', 'sequin', 'neon', 'leather', 'corset'],
    hair,
    makeup: ['soft_gloss', 'glamour', 'smoky', 'berry'],
    shoes: ['heels', 'platforms', 'boots'],
    accessories: ['necklace', 'earrings', 'bracelet', 'bag'],
  },
  cabaret_dancer: {
    weights: [30, 25, 10, 10, 25],
    outfits: ['cabaret', 'sequin', 'corset', 'mini_dress', 'leather'],
    hair,
    makeup: ['glamour', 'berry', 'smoky'],
    shoes: ['heels', 'platforms', 'boots'],
    accessories: ['necklace', 'choker', 'earrings', 'bracelet'],
  },
  beach_female: {
    weights: [20, 15, 40, 15, 10],
    outfits: beach,
    hair,
    makeup: ['natural', 'natural', 'soft_gloss'],
    shoes: ['flipflops', 'sandals', 'barefoot'],
    accessories: ['none', 'sunglasses', 'hat', 'bag', 'bracelet'],
  },
  pool_party: {
    weights: [25, 20, 30, 15, 10],
    outfits: beach,
    hair,
    makeup: ['natural', 'soft_gloss', 'glamour'],
    shoes: ['sandals', 'barefoot', 'flipflops'],
    accessories: ['sunglasses', 'necklace', 'hat', 'bag', 'bracelet'],
  },
};
export function random(seed: number, salt: number) {
  let h = Math.imul((seed | 0) ^ salt, 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function pick<T>(
  pool: readonly T[],
  seed: number,
  salt: number,
  excluded?: T,
  used: readonly T[] = [],
): T {
  let choices = pool.filter((value) => value !== excluded && !used.includes(value));
  if (!choices.length) choices = pool.filter((value) => value !== excluded);
  return choices[Math.floor(random(seed, salt) * choices.length)]!;
}
export function femaleRole(a: Appearance): FemaleRole | null {
  if (!a.feminine) return null;
  return a.category === 'dancer'
    ? 'gogo_dancer'
    : a.category === 'cabaret'
      ? 'cabaret_dancer'
      : a.category === 'club_guest'
        ? 'club_dancer'
        : a.category === 'beach_guest'
          ? 'beach_female'
          : null;
}
/** Bounded mesh parameters, evaluated at creation; never deform a live rig or its colliders. */
export function buildFemaleAppearance(
  base: Appearance,
  role: FemaleRole,
  previous?: Appearance,
  bodyOverride?: FemaleBody,
  used: readonly Appearance[] = [],
  overrides: Partial<Morphs> = {},
): Appearance {
  const seed = base.seed,
    settings = femalePresets[role],
    keys = Object.keys(profiles) as FemaleBody[];
  const weights = settings.weights.map((weight, i) =>
    keys[i] === previous?.femaleStyle?.bodyPreset ||
    (new Set(used.map((a) => a.femaleStyle?.bodyPreset)).size < 5 &&
      used.some((a) => a.femaleStyle?.bodyPreset === keys[i]))
      ? 0
      : weight,
  );
  let draw = random(seed, 91) * weights.reduce((a, b) => a + b, 0),
    bodyPreset: FemaleBody = keys[0]!;
  for (let i = 0; i < keys.length; i++) {
    draw -= weights[i]!;
    if (draw < 0) {
      bodyPreset = keys[i]!;
      break;
    }
  }
  bodyPreset = bodyOverride ?? bodyPreset;
  const morphs = { ...profiles[bodyPreset] },
    ranges = femaleRanges[role];
  for (const [i, key] of (Object.keys(morphs) as (keyof Morphs)[]).entries()) {
    const [min, max] = ranges[key];
    morphs[key] = Math.min(
      max,
      Math.max(
        min,
        Number.isFinite(overrides[key])
          ? overrides[key]!
          : morphs[key] * (0.98 + random(seed, i + 23) * 0.04),
      ),
    );
  }
  const body: BodyShape = {
    shoulders: 0.44 * morphs.shoulderWidth,
    chest: 0.47,
    waist: 0.34 * morphs.waistWidth,
    hips: 0.51 * morphs.hipWidth,
    depth: 0.32,
    leg: 0.87 * morphs.legLength,
    arm: 0.165 * morphs.armThickness,
    stature: morphs.bodyHeight,
  };
  const outfit = pick(
    settings.outfits,
    seed,
    12,
    previous?.femaleStyle?.outfit,
    used.map((a) => a.femaleStyle!.outfit),
  );
  const isBeach = role === 'beach_female' || role === 'pool_party';
  const a: Appearance = {
    ...base,
    body,
    feminine: true,
    faceAge: 'adult',
    mature: false,
    beard: 'none',
    face: pick(
      [0, 1, 2, 3, 4, 5, 6],
      seed,
      22,
      previous?.face,
      used.map((a) => a.face),
    ),
    hair: pick(
      settings.hair,
      seed,
      33,
      previous?.hair,
      used.map((a) => a.hair),
    ),
    hairColor: pick(
      isBeach
        ? ['#211815', '#43271e', '#865336', '#c39b56', '#a45130']
        : ['#211815', '#43271e', '#865336', '#c39b56', '#a45130', '#694582', '#304f68'],
      seed,
      45,
    ),
    accessory: pick(settings.accessories, seed, 17),
    shoes: pick(settings.shoes, seed, 8),
    top: 'bikini',
    bottom: 'briefs',
    femaleStyle: {
      role,
      bodyPreset,
      morphs,
      outfit,
      makeup: pick(settings.makeup, seed, 36),
      ageYears: 23 + Math.floor(random(seed, 48) * 20),
      animation: Math.floor(random(seed, 55) * 100),
    },
  };
  a.topColor = pick(
    isBeach
      ? ['#36a9a1', '#ee7951', '#397ec1', '#e8bd54', '#b94b6f', '#efe1c0']
      : ['#d74385', '#7f49b3', '#17a9bb', '#d8ac55', '#22232e', '#db493c'],
    seed,
    19,
  );
  a.bottomColor = seed % 3 === 0 ? pick(['#222938', '#3e5a75', '#a4596d'], seed, 20) : a.topColor;
  if (['mini_dress', 'beach_dress', 'sequin', 'cabaret'].includes(outfit)) {
    a.top = 'dress';
    a.bottom = 'skirt';
  }
  if (['crop_shorts', 'bra_hotpants', 'beach_shorts'].includes(outfit)) a.bottom = 'shorts';
  if (outfit === 'sarong') a.bottom = 'sarong';
  if (outfit === 'one_piece') a.top = 'swimsuit';
  if (outfit === 'crop_shorts') a.top = 'crop';
  return a;
}
/** Stable spatial order supplied by the caller; adjacent identities cannot repeat these four features. */
export function diversifyFemaleGroup(looks: readonly Appearance[]): Appearance[] {
  let previous: Appearance | undefined;
  const used: Appearance[] = [];
  return looks.map((a) => {
    const role = femaleRole(a);
    if (!role) return a;
    const result = buildFemaleAppearance(a, role, previous, undefined, used);
    previous = result;
    used.push(result);
    return result;
  });
}
