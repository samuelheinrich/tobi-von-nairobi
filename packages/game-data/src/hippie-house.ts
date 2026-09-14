/** Authoring dimensions in metres; each storey contains six separated rooms plus hall/stairs. */
export const hippieHouseLayout = {
  floorHeight: 4.5,
  roomColumns: [-9, 9],
  roomRows: [-10, 0, 10],
  floors: [
    {
      name: 'ERDGESCHOSS',
      color: '#8ab8a0',
      rooms: [
        'KUECHE',
        'ESSZIMMER',
        'PLATTENZIMMER',
        'PFLANZENZIMMER',
        'VELO-WERKSTATT',
        'WOHNZIMMER',
      ],
    },
    {
      name: '1. OBERGESCHOSS',
      color: '#d19ba8',
      rooms: ['ATELIER', 'YOGA', 'BIBLIOTHEK', 'MUSIKZIMMER', 'TEESTUBE', 'GEMEINSCHAFTSBAD'],
    },
    {
      name: '2. OBERGESCHOSS',
      color: '#c4af76',
      rooms: [
        'TOBIS ZIMMER',
        'MEDITATION',
        'NAEHSTUBE',
        'TRAUMZIMMER',
        'GAESTEZIMMER',
        'DACHLOUNGE',
      ],
    },
  ],
} as const;
