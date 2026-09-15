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
// Forty street residents, concentrated along the Soi; destinations never cross building walls.
for (let i = 0; i < 40; i++)
  add(
    (i % 2 ? -1 : 1) * (2.5 + (i % 3) * 0.7),
    0,
    -42 + Math.floor(i / 2) * 2,
    (['tourist', 'expat', 'street vendor', 'taxi driver'] as const)[i % 4]!,
    actions[i % actions.length]!,
  );
for (let i = 0; i < 40; i++)
  add(
    -12 + (i % 8) * 3.3,
    0,
    12 + Math.floor(i / 8) * 8,
    i % 3 ? 'tourist' : 'expat',
    i % 4 ? 'talk' : 'dance',
  );
for (const venue of nanaVenues) {
  if (venue.mode === 'facade') continue;
  const x = venue.side * 26,
    y = venue.floor * 4.8;
  add(x + venue.side * 3, y, venue.z - 1.5, 'bartender', 'talk', venue.id);
  const depth = venue.floor ? 14 : 8.8;
  for (const side of [-1, 1])
    add(x + 1.5, y, venue.z + side * (depth / 2 - 1.2), 'expat', 'sit', venue.id);
  const count = venue.signature ? 12 : venue.floor ? 6 : 2;
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
