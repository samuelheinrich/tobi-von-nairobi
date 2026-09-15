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
  none: 'ohne Zuordnung',
};

/** Which role each source file is cast for. Keyed by the original file name, not the reduced one. */
const ROLE_BY_SOURCE: Record<string, ModelRole> = {
  'tobi-1-leather-jacket.glb': 'tobi',
  'tobi-2-traegershirt.glb': 'tobi',
  'tobi-2-traegershirt-drunken-dynamic-face.glb': 'tobi',
  'police.glb': 'police',
  'female_police_v2.glb': 'police',
  'security_guard.glb': 'security',
  'tpose/charter_t-pose.glb': 'security',
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
  'tpose/beige_athleisure_silhouette-woman-sport.glb': 'beach',
  'tpose/basic_model_of_a_female_character__t-pose_asset-beach.glb': 'beach',
  'tpose/t_-_pose-man-beach.glb': 'beach',
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
