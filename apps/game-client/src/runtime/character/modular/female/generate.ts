import { appearance, type Appearance } from '../presets.js';
import { buildFemaleAppearance, type FemaleBody, type FemaleRole, type Morphs } from './presets.js';
export const femaleArchetypes = {
  gogo_slim: ['gogo_dancer', 'slim_glamour'],
  gogo_busty: ['gogo_dancer', 'slim_busty'],
  gogo_glamour: ['gogo_dancer', 'glamour_curvy'],
  club_dancer: ['club_dancer', 'slim_glamour'],
  cabaret_dancer: ['cabaret_dancer', 'glamour_curvy'],
  beach_slim: ['beach_female', 'slim_glamour'],
  beach_busty: ['beach_female', 'slim_busty'],
  beach_athletic: ['beach_female', 'athletic_beach'],
  pool_party: ['pool_party', 'athletic_beach'],
  beach_glamour: ['beach_female', 'glamour_curvy'],
} as const;
export function generateFemaleNPC(options: {
  role: FemaleRole;
  seed: number;
  previous?: Appearance;
  body?: FemaleBody;
  used?: readonly Appearance[];
  morphs?: Partial<Morphs>;
}): Appearance {
  const category =
    options.role === 'beach_female' || options.role === 'pool_party'
      ? 'beach_guest'
      : options.role === 'club_dancer'
        ? 'club_guest'
        : options.role === 'cabaret_dancer'
          ? 'cabaret'
          : 'dancer';
  return buildFemaleAppearance(
    appearance(category, options.seed, true),
    options.role,
    options.previous,
    options.body,
    options.used,
    options.morphs,
  );
}

export function generateFemalePreset(
  name: keyof typeof femaleArchetypes,
  seed: number,
  previous?: Appearance,
): Appearance {
  const [role, body] = femaleArchetypes[name];
  return generateFemaleNPC({ role, body, seed, ...(previous ? { previous } : {}) });
}
