import measured from './glb-catalogue.json';

/** What lies in the owner's local `models/` folder, which role each file is meant for, and what
 * the reduced version costs.
 *
 * The measurements come from `glb-catalogue.json`, which `tools/models/reduce.mjs` regenerates on
 * every run — never edit that file by hand. Only the two maps below are hand-kept: which role a
 * model is cast for, and anything a licence does not settle.
 *
 * A new model needs three steps: drop the GLB into `models/`, run the reducer, then give it a
 * role here. Without a role it still loads, it is just listed as unassigned.
 *
 * The files themselves are not in the repository. `models/` is gitignored; the dev server serves
 * it, and nothing is built into the production bundle.
 */

/** Roles the game casts. `none` marks a file that has no place yet. */
export type ModelRole =
  | 'tobi'
  | 'police'
  | 'security'
  | 'dancer'
  | 'bargirl'
  | 'tourist'
  | 'resident'
  | 'yoga'
  | 'beach'
  | 'adult'
  | 'none';

export const ROLE_LABEL: Record<ModelRole, string> = {
  tobi: 'Tobi',
  police: 'Polizei',
  security: 'Security',
  dancer: 'Tänzerin',
  bargirl: 'Bardame',
  tourist: 'Tourist / Expat',
  resident: 'WG-Bewohner',
  yoga: 'Yogagruppe',
  beach: 'Strandgäste',
  adult: '18+ · Geheimclub',
  none: 'ohne Zuordnung',
};

/** Which role each source file is cast for. Keyed by the original file name, not the reduced one. */
const ROLE_BY_SOURCE: Record<string, ModelRole> = {
  'tobi-1-leather-jacket.glb': 'tobi',
  'tobi-2-traegershirt.glb': 'tobi',
  'tobi-2-traegershirt-drunken-dynamic-face.glb': 'tobi',
  'police.glb': 'police',
  'security_guard.glb': 'security',
  'kayla-dancer.glb': 'dancer',
  'locker_room_glamour-dancer.glb': 'dancer',
  'nina-dancer.glb': 'dancer',
  'redhead_party_dress_girl.glb': 'bargirl',
  'bargirl-sitting.glb': 'bargirl',
  'pink_halter_dress_portrait-bar-girl.glb': 'bargirl',
  'realistic_girl_in_dress.glb': 'bargirl',
  'tpose/elegance_in_leather-woman.glb': 'bargirl',
  'sam.glb': 'tourist',
  'tpose/japanese_woman_t-pose.glb': 'tourist',
  'tpose/young_woman._t-posed.glb': 'tourist',
  'tpose/open_arms_in_the_park-jeans-woman.glb': 'tourist',
  'tpose/rigged_t-pose_human_male_w_50_face_blendshapes.glb': 'tourist',
  'hippie_zombie.glb': 'resident',
  'hippie_female.glb': 'resident',
  'tpose/fra_paolo_da_divago_-_t_pose-hippie-moench.glb': 'resident',
  'yoga-girl-naked-sitting.glb': 'yoga',
  'female-sporty1.glb': 'beach',
  // Für den versteckten Club in Nana Plaza. Nicht in den normalen Levelbesetzungen verwenden.
  'girl_sexy.glb': 'adult',
  'sexy_nurse_002.glb': 'adult',
  'tpose/18+/bdsm_naked_women_milf_t-pose.glb': 'adult',
  'tpose/18+/female_nude_3d_model_in_t_pose.glb': 'adult',
  'tpose/18+/nude_woman_hip_hop_dancing.glb': 'adult',
  'tpose/18+/sexy_girl_dancing.glb': 'adult',
  'tpose/beige_athleisure_silhouette-woman-sport.glb': 'beach',
  'tpose/basic_model_of_a_female_character__t-pose_asset-beach.glb': 'beach',
  'hippie/worker_man_rigged.glb': 'resident',
  'cop/indian_police_cop_3d_model_rigged.glb': 'police',
  'normal-ppl/casual_male_char__rigged.glb': 'tourist',
  'normal-ppl/xander_model_character_man_rigged_realisitc.glb': 'tourist',
  'party/female_rigged_character_free.glb': 'dancer',
  'party/sexy_girl_in_black_suit.glb': 'dancer',
  'skellet-rigged/party/anita_female_gabber_from_the_90s.glb': 'dancer',
  'skellet-rigged/party/character_male_sci-fi.glb': 'dancer',
  'skellet-rigged/party/cyberpunk_girl.glb': 'dancer',
  'skellet-rigged/party/dutch_male_gabber_from_the_90s.glb': 'dancer',
  'skellet-rigged/party/female_dutch_gabber_from_the_90s.glb': 'dancer',
  'skellet-rigged/party/female_rigged_character_free.glb': 'dancer',
  'skellet-rigged/party/sexy_girl_in_black_suit.glb': 'dancer',
  'skellet-rigged/party/sjonnie_dutch_male_gabber_from_the_90s.glb': 'dancer',
  'skellet-rigged/cop.glb': 'police',
  'skellet-rigged/cop/indian_police_cop_3d_model_rigged.glb': 'police',
  'bar/yinn_-_young_asian_female_-_rigged.glb': 'bargirl',
  'bar/rigged_female_fashion_character_in_ruffle_dress.glb': 'bargirl',
};

/** Correction for models the automatic sizing gets wrong, keyed by source file name.
 *
 * Both viewers scale an import so its bounding box is 1,78 m tall. That is right for a figure
 * standing upright and wrong for every other pose: a seated model ends up as tall sitting as
 * everyone else is standing. The factor here is applied afterwards.
 *
 * This lives in the catalogue rather than in the GLB on purpose — `tools/models/reduce.mjs`
 * rebuilds those files from their originals, so a baked-in scale would not survive the next run.
 */
const SCALE_CORRECTION: Record<string, number> = {
  // Sitzt im Schneidersitz; auf Sitzhöhe normiert wäre sie überlebensgross.
  'yoga-girl-naked-sitting.glb': 0.5,
};

/** Things a licence does not settle, keyed by source file name. */
const CAVEATS: Record<string, string> = {
  'tobi-2-traegershirt-drunken-dynamic-face.glb':
    'Trägt Morph-Targets fürs Gesicht: 10,5 MiB trotz nur 20 678 Dreiecken.',
  'redhead_party_dress_girl.glb':
    'Skelett vorhanden, aber kein Clip — eine Animation muss zugeliefert werden.',
  'nina-dancer.glb':
    'Von Hand gerigged und animiert, siehe docs/development/nina-dancer-optimierung.md. Der Reduzierer baut diese Datei nicht neu.',
  'girl_sexy.glb': 'Nutzt KHR_materials_unlit und ignoriert damit die Szenenbeleuchtung.',
  'party/female_rigged_character_free.glb':
    'Mit 23 MiB trotz Reduktion sehr schwer; wird pro Level höchstens einmal besetzt und lazy geladen.',
  'party/sexy_girl_in_black_suit.glb':
    'Mit 8 MiB ein Near-LOD-Partymodell; nur in Nightlife-Rollen verwenden.',
  'skellet-rigged/party/anita_female_gabber_from_the_90s.glb':
    'Showcase mit mehreren Figuren; im Spiel nur die isolierte stehende Skin verwenden.',
  'skellet-rigged/party/dutch_male_gabber_from_the_90s.glb':
    'Showcase mit mehreren Figuren; im Spiel nur die isolierte stehende Skin verwenden.',
  'skellet-rigged/party/female_dutch_gabber_from_the_90s.glb':
    'Showcase mit mehreren Figuren; im Spiel nur die isolierte stehende Skin verwenden.',
  'skellet-rigged/party/sjonnie_dutch_male_gabber_from_the_90s.glb':
    'Showcase mit mehreren Figuren und +Z-Körperachse; im Spiel nur die isolierte stehende Skin verwenden.',
  'cop/indian_police_cop_3d_model_rigged.glb':
    'CC-BY-NC-4.0: nur für die nichtkommerzielle Projektfassung verwenden.',
};

export interface CatalogueEntry {
  /** Reduced file, as served under `/models/…`. */
  file: string;
  /** Original download it was built from. */
  source: string;
  title: string;
  author: string | null;
  licence: string | null;
  role: ModelRole;
  megabytes: number;
  triangles: number;
  sourceTriangles: number;
  /** 0 when the file is a single static mesh. */
  joints: number;
  animation: string | null;
  /** Multiplier applied after height normalisation; 1 for everything that stands upright. */
  scale: number;
  caveat?: string;
}

/** Turns `tpose/young_woman._t-posed.glb` into `Young woman. t posed`. */
function titleFor(source: string): string {
  const stem = source
    .split('/')
    .pop()!
    .replace(/\.glb$/i, '');
  const words = stem.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const CATALOGUE: readonly CatalogueEntry[] = measured
  .map((m): CatalogueEntry => {
    const caveat = CAVEATS[m.source];
    return {
      file: m.file,
      source: m.source,
      title: titleFor(m.source),
      author: m.author,
      licence: m.licence,
      role: ROLE_BY_SOURCE[m.source] ?? 'none',
      megabytes: m.megabytes,
      triangles: m.triangles,
      sourceTriangles: m.sourceTriangles,
      joints: m.joints,
      animation: m.animations[0] ?? null,
      scale: SCALE_CORRECTION[m.source] ?? 1,
      ...(caveat ? { caveat } : {}),
    };
  })
  .sort((a, b) => a.triangles - b.triangles);

export function entriesForRole(role: ModelRole): readonly CatalogueEntry[] {
  return CATALOGUE.filter((entry) => entry.role === role);
}

export function entryFor(file: string): CatalogueEntry | undefined {
  return CATALOGUE.find((entry) => entry.file === file);
}
