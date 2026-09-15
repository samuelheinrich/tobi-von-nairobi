import { buildFemaleAppearance, femaleRole, type FemaleStyle } from './female/presets.js';
import type { FaceAge } from './face-profile.js';
export type CharacterCategory =
  | 'local'
  | 'tourist'
  | 'expat'
  | 'dancer'
  | 'cabaret'
  | 'bartender'
  | 'vendor'
  | 'taxi'
  | 'hotel'
  | 'crew'
  | 'security'
  | 'police'
  | 'beach_guest'
  | 'club_guest';
export type HairStyle =
  | 'short'
  | 'bob'
  | 'long'
  | 'ponytail'
  | 'bun'
  | 'curly'
  | 'bald'
  | 'undercut'
  | 'wavy'
  | 'high_ponytail'
  | 'side_swept'
  | 'beach_waves';
export type TopStyle =
  | 'tee'
  | 'polo'
  | 'shirt'
  | 'tank'
  | 'crop'
  | 'blouse'
  | 'dress'
  | 'bikini'
  | 'swimsuit'
  | 'uniform';
export type BottomStyle = 'jeans' | 'trousers' | 'shorts' | 'skirt' | 'sarong' | 'briefs';
export type ShoeStyle =
  'sneakers' | 'boots' | 'heels' | 'sandals' | 'business' | 'flipflops' | 'platforms' | 'barefoot';
export interface BodyShape {
  shoulders: number;
  chest: number;
  waist: number;
  hips: number;
  depth: number;
  leg: number;
  arm: number;
  stature: number;
}
export const bodies: Record<string, BodyShape> = {
  lean: {
    shoulders: 0.46,
    chest: 0.43,
    waist: 0.32,
    hips: 0.36,
    depth: 0.28,
    leg: 0.83,
    arm: 0.15,
    stature: 1,
  },
  average: {
    shoulders: 0.53,
    chest: 0.51,
    waist: 0.43,
    hips: 0.41,
    depth: 0.34,
    leg: 0.82,
    arm: 0.18,
    stature: 1,
  },
  athletic: {
    shoulders: 0.64,
    chest: 0.59,
    waist: 0.37,
    hips: 0.4,
    depth: 0.37,
    leg: 0.85,
    arm: 0.23,
    stature: 1.03,
  },
  sturdy: {
    shoulders: 0.64,
    chest: 0.64,
    waist: 0.6,
    hips: 0.51,
    depth: 0.47,
    leg: 0.77,
    arm: 0.25,
    stature: 1,
  },
  tall: {
    shoulders: 0.51,
    chest: 0.48,
    waist: 0.35,
    hips: 0.39,
    depth: 0.31,
    leg: 0.99,
    arm: 0.17,
    stature: 1.04,
  },
  petite: {
    shoulders: 0.39,
    chest: 0.41,
    waist: 0.28,
    hips: 0.43,
    depth: 0.29,
    leg: 0.71,
    arm: 0.14,
    stature: 0.96,
  },
  feminine: {
    shoulders: 0.43,
    chest: 0.48,
    waist: 0.32,
    hips: 0.53,
    depth: 0.34,
    leg: 0.84,
    arm: 0.16,
    stature: 1,
  },
  curvy: {
    shoulders: 0.48,
    chest: 0.59,
    waist: 0.4,
    hips: 0.62,
    depth: 0.41,
    leg: 0.8,
    arm: 0.2,
    stature: 1,
  },
};
export interface Appearance {
  femaleStyle?: FemaleStyle;
  category: CharacterCategory;
  seed: number;
  feminine: boolean;
  body: BodyShape;
  face: number;
  faceAge?: FaceAge;
  skin: string;
  hairColor: string;
  eye: string;
  topColor: string;
  bottomColor: string;
  hair: HairStyle;
  beard: 'none' | 'stubble' | 'moustache' | 'beard';
  top: TopStyle;
  bottom: BottomStyle;
  shoes: ShoeStyle;
  accessory:
    | 'none'
    | 'glasses'
    | 'sunglasses'
    | 'backpack'
    | 'necklace'
    | 'hat'
    | 'bag'
    | 'watch'
    | 'choker'
    | 'earrings'
    | 'bracelet';
  pattern: number;
  mature: boolean;
  thai: boolean;
}
const skins = ['#e8be9f', '#d9a079', '#bd8159', '#995e40', '#744633', '#f3d1b8'];
const hairs = ['#251b19', '#4b3026', '#84502d', '#c19d60', '#777775', '#18202b'];
const colors = [
  '#3c9992',
  '#da7d64',
  '#778ab4',
  '#dbb75b',
  '#f3e4ca',
  '#673f75',
  '#db5388',
  '#304759',
];
/** Stable seeds: wardrobe restrictions live here, never in an animation or level's AI. */
export function appearance(
  category: CharacterCategory,
  seed: number,
  female?: boolean,
  thai = false,
): Appearance {
  const n = Math.abs(Math.floor(seed));
  const feminine = female ?? (['dancer', 'cabaret', 'crew'].includes(category) || n % 2 === 1);
  const uniform = category === 'police' || category === 'security';
  const bodyNames = feminine
    ? ['feminine', 'petite', 'curvy', 'feminine']
    : ['average', 'lean', 'athletic', 'sturdy', 'tall'];
  const civilianTops: TopStyle[] = feminine
    ? ['blouse', 'tee', 'tank', 'dress', 'crop']
    : ['tee', 'polo', 'shirt', 'tank'];
  const civilianBottoms: BottomStyle[] = feminine
    ? ['jeans', 'skirt', 'shorts', 'trousers']
    : ['jeans', 'shorts', 'trousers'];
  const a: Appearance = {
    category,
    seed: n,
    feminine,
    body: bodies[uniform ? (n % 2 ? 'athletic' : 'sturdy') : bodyNames[n % bodyNames.length]!]!,
    face: n % 7,
    skin: skins[n % skins.length]!,
    hairColor: hairs[Math.floor(n / 2) % hairs.length]!,
    eye: ['#30231c', '#654331', '#807042', '#567553', '#4e728e', '#7b8283'][Math.floor(n / 3) % 6]!,
    topColor: colors[n % colors.length]!,
    bottomColor: ['#31445f', '#5b5049', '#a49a83', '#332b43'][n % 4]!,
    hair: (feminine
      ? ['bob', 'long', 'ponytail', 'curly', 'bun']
      : ['short', 'undercut', 'curly', 'bald', 'ponytail'])[n % 5] as HairStyle,
    beard: feminine ? 'none' : (['none', 'stubble', 'moustache', 'beard'] as const)[n % 4]!,
    top: civilianTops[n % civilianTops.length]!,
    bottom: civilianBottoms[n % civilianBottoms.length]!,
    shoes: n % 3 ? 'sneakers' : 'sandals',
    accessory: (
      ['none', 'glasses', 'sunglasses', 'backpack', 'necklace', 'hat', 'watch', 'bag'] as const
    )[n % 8]!,
    pattern: n % 3,
    mature: n % 7 === 0,
    thai,
  };
  if (category === 'dancer' || category === 'cabaret') {
    a.top = (['bikini', 'crop', 'dress', 'tank'] as const)[n % 4]!;
    a.bottom = n % 2 ? 'shorts' : 'briefs';
    a.shoes = n % 3 ? 'heels' : 'boots';
    a.accessory = 'necklace';
    a.topColor = ['#dc3588', '#7c49bd', '#1ebbb9', '#e4bc57'][n % 4]!;
  }
  if (category === 'beach_guest') {
    a.top = feminine ? (n % 2 ? 'swimsuit' : 'bikini') : 'tank';
    a.bottom = feminine ? 'sarong' : 'shorts';
    a.shoes = 'flipflops';
    a.accessory = 'sunglasses';
  }
  if (['bartender', 'vendor', 'taxi', 'hotel', 'crew'].includes(category)) {
    a.top = category === 'crew' ? 'blouse' : 'shirt';
    a.bottom = category === 'crew' ? 'skirt' : 'trousers';
    a.shoes = 'business';
  }
  if (category === 'crew') {
    a.topColor = '#604b7e';
    a.bottomColor = '#323647';
    a.accessory = 'watch';
  }
  if (uniform) {
    a.top = category === 'police' ? 'uniform' : 'polo';
    a.bottom = 'trousers';
    a.shoes = 'boots';
    a.topColor = category === 'security' ? '#202a30' : thai ? '#78624e' : '#263a59';
    a.bottomColor = a.topColor;
    a.hair = n % 2 ? 'short' : 'bald';
    a.accessory = 'watch';
    a.pattern = 0;
  }
  const role = femaleRole(a);
  return role ? buildFemaleAppearance(a, role) : a;
}
export function categoryFromName(name: string): CharacterCategory {
  if (/security/.test(name)) return 'security';
  if (/police|cell-guard/.test(name)) return 'police';
  if (/crew|steward/.test(name)) return 'crew';
  if (/conductor|hotel/.test(name)) return 'hotel';
  if (/bartender|bargirl/.test(name)) return 'bartender';
  if (/dancer/.test(name)) return 'dancer';
  if (/passenger|guest/.test(name)) return 'tourist';
  return 'local';
}

/** Shared role mapping keeps distant impostor colours consistent with the detailed wardrobe. */
export const nanaCategory = {
  dancer: 'dancer',
  'ladyboy dancer': 'cabaret',
  bartender: 'bartender',
  tourist: 'tourist',
  expat: 'expat',
  'street vendor': 'vendor',
  'taxi driver': 'taxi',
  security: 'security',
} as const;
