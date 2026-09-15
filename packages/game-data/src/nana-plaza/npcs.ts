import { nanaVenues } from './venues.js';
export type NanaRole =
  | 'bartender'
  | 'dancer'
  | 'ladyboy dancer'
  | 'security'
  | 'tourist'
  | 'expat'
  | 'street vendor'
  | 'taxi driver';
export const danceNames = [
  'dance_idle_01',
  'dance_idle_02',
  'dance_slow_01',
  'dance_slow_02',
  'dance_pole_01',
  'dance_pole_02',
  'dance_club_01',
  'dance_club_02',
] as const;
export type DanceName = (typeof danceNames)[number];
export type AmbientAction =
  'walk' | 'talk' | 'drink' | 'smoke' | 'phone' | 'sit' | 'dance' | 'cross' | 'hail';
export interface NanaResident {
  id: number;
  x: number;
  y: number;
  z: number;
  role: NanaRole;
  action: AmbientAction;
  dance: DanceName;
  venue?: string;
}
export const nanaResidents: NanaResident[] = [];
const add = (
  x: number,
  y: number,
  z: number,
  role: NanaRole,
  action: AmbientAction,
  venue?: string,
) => {
  const id = nanaResidents.length;
  nanaResidents.push({
    id,
    x,
    y,
    z,
    role,
    action,
    dance: danceNames[id % 8]!,
    ...(venue ? { venue } : {}),
  });
};
const actions: AmbientAction[] = ['walk', 'talk', 'drink', 'smoke', 'phone', 'cross', 'hail'];
/** Ambient crowd density, lowered to three quarters on 15 September 2026.
 *
 * Applied to the group sizes, never by skipping indices: the roles in these loops cycle on the
 * index, so dropping every fourth person wipes out whichever role sits at that position — the
 * taxi drivers vanished entirely on the first attempt. Spacing is stretched by the inverse, so a
 * thinner crowd still covers the same ground instead of leaving the far end of the Soi empty.
 *
 * Bartenders and the two guards are functional and are not scaled.
 */
export const NANA_CROWD_DENSITY = 0.75;
const scaled = (count: number) => Math.max(1, Math.round(count * NANA_CROWD_DENSITY));
const spread = 1 / NANA_CROWD_DENSITY;
const STREET = scaled(40);
const COURTYARD = scaled(40);
// Forty street residents, concentrated along the Soi; destinations never cross building walls.
for (let i = 0; i < STREET; i++)
  add(
    (i % 2 ? -1 : 1) * (2.5 + (i % 3) * 0.7),
    0,
    -42 + Math.floor(i / 2) * 2 * spread,
    (['tourist', 'expat', 'street vendor', 'taxi driver'] as const)[i % 4]!,
    actions[i % actions.length]!,
  );
for (let i = 0; i < COURTYARD; i++)
  add(
    -12 + (i % 8) * 3.3,
    0,
    12 + Math.floor(i / 8) * 8 * spread,
    i % 3 ? 'tourist' : 'expat',
    i % 4 ? 'talk' : 'dance',
  );
for (const venue of nanaVenues) {
  if (venue.mode === 'facade') continue;
  const x = venue.side * 26,
    y = venue.floor * 4.8;
  add(x + venue.side * 3, y, venue.z - 1.5, 'bartender', 'talk', venue.id);
  const depth = venue.floor ? 14 : 8.8;
  // One seated guest per venue instead of a facing pair.
  for (const side of NANA_CROWD_DENSITY < 1 ? [-1] : [-1, 1])
    add(x + 1.5, y, venue.z + side * (depth / 2 - 1.2), 'expat', 'sit', venue.id);
  const count = scaled(venue.signature ? 12 : venue.floor ? 6 : 2);
  for (let i = 0; i < count; i++)
    add(
      x + ((i % 3) - 1) * 1.5,
      y,
      venue.z - 2 + Math.floor(i / 3) * 1.3,
      venue.floor > 0 ? (i % 3 === 0 ? 'ladyboy dancer' : 'dancer') : 'tourist',
      venue.floor ? 'dance' : 'drink',
      venue.id,
    );
}
for (const x of [-5, 5]) add(x, 0, 2, 'security', 'talk');
