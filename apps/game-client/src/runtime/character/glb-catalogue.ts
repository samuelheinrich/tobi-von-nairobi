/** What lies in the owner's local `models/` folder, which role each file is meant for, and what
 * it costs.
 *
 * The numbers are read out of the files themselves (glTF header: accessor counts, skin joints,
 * animation names) and written down here so a table can be shown before anything is downloaded —
 * several of these files are tens of megabytes.
 *
 * The files are not in the repository. `models/` is gitignored; the dev server serves it.
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

export interface CatalogueEntry {
  file: string;
  title: string;
  author: string;
  /** Licence as the file declares it in `asset.extras`. */
  licence: string;
  role: ModelRole;
  megabytes: number;
  triangles: number;
  /** 0 when the file is a single static mesh. */
  joints: number;
  animation: string | null;
  /** Set when something beyond the licence needs a decision before use. */
  caveat?: string;
}

const CC = 'CC-BY-4.0';

export const CATALOGUE: readonly CatalogueEntry[] = [
  // — Gerigged: die einzigen, die sich wie Spielfiguren verhalten —
  {
    file: 'sam.glb',
    title: 'Sam',
    author: 'Avaturn · Eigentümer',
    licence: 'eigenes Abbild',
    role: 'tourist',
    megabytes: 3.9,
    triangles: 21362,
    joints: 52,
    animation: 'IdleV4.2',
  },
  {
    file: 'security_guard.glb',
    title: 'Security Guard – Rigged',
    author: 'Q.SARDOR',
    licence: CC,
    role: 'security',
    megabytes: 1.7,
    triangles: 13235,
    joints: 66,
    animation: 'idle',
  },
  {
    file: 'redhead_party_dress_girl.glb',
    title: 'Redhead Party Dress Girl',
    author: 'Toni García Vilche',
    licence: CC,
    role: 'bargirl',
    megabytes: 6.2,
    triangles: 44886,
    joints: 153,
    animation: null,
    caveat: 'Skelett vorhanden, aber kein Clip — Animation muss zugeliefert werden.',
  },

  // — Statisch: brauchbare Optik, aber ohne Skelett keine Spielfigur —
  {
    file: 'police.glb',
    title: 'Police',
    author: 'Tech developers',
    licence: CC,
    role: 'police',
    megabytes: 0.5,
    triangles: 7814,
    joints: 0,
    animation: null,
  },
  {
    file: 'female_police_v2.glb',
    title: 'Female police v2',
    author: 'Michael Constantine',
    licence: CC,
    role: 'police',
    megabytes: 1.3,
    triangles: 34252,
    joints: 0,
    animation: null,
  },
  {
    file: 'hippie_zombie.glb',
    title: 'Hippie Zombie',
    author: 'maicollgdalpiaz',
    licence: CC,
    role: 'resident',
    megabytes: 3.8,
    triangles: 9964,
    joints: 0,
    animation: null,
  },
  {
    file: 'hippie_female.glb',
    title: 'Hippie Dance Moves',
    author: 'huvava9992',
    licence: CC,
    role: 'resident',
    megabytes: 8.8,
    triangles: 9991,
    joints: 0,
    animation: null,
  },
  {
    file: 'bargirl-sitting.glb',
    title: 'Woman Sitting V7',
    author: 'Fadly.W',
    licence: CC,
    role: 'bargirl',
    megabytes: 6.4,
    triangles: 99999,
    joints: 0,
    animation: null,
  },
  {
    file: 'kayla-dancer.glb',
    title: 'Kayla',
    author: 'Zizian1987',
    licence: CC,
    role: 'dancer',
    megabytes: 10.1,
    triangles: 187707,
    joints: 0,
    animation: null,
  },
  {
    file: 'pink_halter_dress_portrait-bar-girl.glb',
    title: 'Pink Halter Dress Portrait',
    author: 'Zizian1987',
    licence: CC,
    role: 'bargirl',
    megabytes: 14.2,
    triangles: 262468,
    joints: 0,
    animation: null,
  },
  {
    file: 'locker_room_glamour-dancer.glb',
    title: 'Locker Room Glamour',
    author: 'Zizian1987',
    licence: CC,
    role: 'dancer',
    megabytes: 16.5,
    triangles: 294270,
    joints: 0,
    animation: null,
  },
  {
    file: 'nina-dancer.glb',
    title: 'NIna',
    author: 'Zizian1987',
    licence: CC,
    role: 'dancer',
    megabytes: 23.9,
    triangles: 465635,
    joints: 0,
    animation: null,
  },
  {
    file: 'realistic_girl_in_dress.glb',
    title: 'Realistic Girl in Dress',
    author: '120320',
    licence: CC,
    role: 'bargirl',
    megabytes: 25.1,
    triangles: 511796,
    joints: 0,
    animation: null,
  },
  {
    file: 'hippie-yoga.glb',
    title: 'JOKOWI BALANCE DANCE POSE',
    author: 'Yud347',
    licence: CC,
    role: 'yoga',
    megabytes: 34.6,
    triangles: 311275,
    joints: 0,
    animation: null,
    caveat:
      'Bildnis von Joko Widodo, Ex-Präsident Indonesiens. CC deckt das Modell, nicht das Persönlichkeitsrecht einer realen Person.',
  },
  {
    file: 'sexy_nurse_002.glb',
    title: 'Sexy Nurse 002',
    author: 'SinfulBrain',
    licence: CC,
    role: 'none',
    megabytes: 39.1,
    triangles: 749370,
    joints: 0,
    animation: null,
  },
  {
    file: 'yoga-girl-naked-sitting.glb',
    title: 'Selene Hart, cross-legged pose',
    author: 'XRProfXR',
    licence: CC,
    role: 'yoga',
    megabytes: 51.8,
    triangles: 831198,
    joints: 0,
    animation: null,
  },
  {
    file: 'girl_sexy.glb',
    title: 'Girl sexy',
    author: 'tr.onurdk1',
    licence: CC,
    role: 'none',
    megabytes: 65.8,
    triangles: 1499876,
    joints: 0,
    animation: null,
    caveat: 'Nutzt KHR_materials_unlit und ignoriert damit die Szenenbeleuchtung.',
  },
  {
    file: 'female-sporty1.glb',
    title: 'Female',
    author: 'SYMXY_',
    licence: CC,
    role: 'beach',
    megabytes: 103.8,
    triangles: 1970634,
    joints: 0,
    animation: null,
  },
];

export function entriesForRole(role: ModelRole): readonly CatalogueEntry[] {
  return CATALOGUE.filter((entry) => entry.role === role);
}

export function entryFor(file: string): CatalogueEntry | undefined {
  return CATALOGUE.find((entry) => entry.file === file);
}
