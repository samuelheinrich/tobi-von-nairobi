export interface NanaVenueDefinition {
  id: string;
  name: string;
  floor: number;
  side: -1 | 1;
  z: number;
  mode: 'facade' | 'shallow' | 'full';
  theme: 'beer' | 'red' | 'violet' | 'rock' | 'led' | 'cabaret';
  color: string;
  signature: boolean;
}
const themes = ['beer', 'red', 'violet', 'rock', 'led', 'cabaret'] as const;
const colors = ['#ffba60', '#ff365c', '#c74dff', '#eab54c', '#37e3ef', '#ff73b9'];
const names = [
  [
    'KARL BEER',
    'GOLDEN BUFFALO',
    'SOI SUNSET',
    'LUCKY GECKO',
    'PALM TAP',
    'MANGO MOON',
    'BAMBOO BAR',
    'TUK TUK TAP',
    'NIGHT OWL',
    'LAST BAHT',
  ],
  ['RED ORBIT', 'VIOLET ROOM', 'IRON GECKO', 'CYAN CIRCUIT', 'VELVET STAGE'],
  ['NANA SUPERNOVA', 'PRISM CABARET', 'MIDNIGHT ORCHID', 'ELECTRIC LOTUS'],
];
export const nanaVenues: readonly NanaVenueDefinition[] = names.flatMap((floorNames, floor) =>
  floorNames.map((name, i) => ({
    id: `nana-venue-${floor}-${i}`,
    name,
    floor,
    side: (i % 2 === 0 ? -1 : 1) as -1 | 1,
    z: 12 + Math.floor(i / 2) * (floor === 0 ? 9 : 16),
    mode:
      floor > 0
        ? ('full' as const)
        : i % 4 === 0
          ? ('facade' as const)
          : i % 3 === 0
            ? ('full' as const)
            : ('shallow' as const),
    theme: themes[floor === 0 ? 0 : 1 + (i % 5)]!,
    color: colors[floor === 0 ? 0 : 1 + (i % 5)]!,
    signature: floor === 2 && i === 0,
  })),
);
export const nanaDrinks = [
  { name: 'BEER', price: 150, energy: 35 },
  { name: 'SHOT', price: 200, energy: 20 },
  { name: 'WATER', price: 80, energy: 60 },
] as const;
