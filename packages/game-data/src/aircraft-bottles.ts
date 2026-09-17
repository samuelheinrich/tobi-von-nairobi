import { distributeBottles, type BottleSpot } from './bottles.js';
import { aircraftLayout } from './aircraft.js';

/** Bottles on the A380.
 *
 * The level shipped with none. The galley worktops carry most of them — that is where the drinks
 * are on a plane — with the rest on tray tables down the cabin and a few in the storage bays for
 * anyone who goes rummaging.
 */
const { floorHeight, lowerRows, lowerColumns, upperRows, upperColumns } = aircraftLayout;

const spots: BottleSpot[] = [];

// Galley worktops: main deck at z 12, upper deck at z 19, plus the side storage bays.
for (const [deck, z] of [
  [0, 12],
  [floorHeight, 19],
] as const) {
  for (const along of [-1, 0, 1])
    spots.push({ kind: 'galley', position: { x: along * 1.4, y: deck + 2.35, z }, maxCount: 2 });
  for (const side of [-1, 1])
    spots.push({
      kind: 'hidden',
      position: { x: side * 6.2, y: deck + 1.85, z: deck > 0 ? 36 : -13 },
      maxCount: 1,
    });
}

// Tray tables: every fourth row, aisle seats only, so the cabin does not read as a bottle store.
const tray = (rows: readonly number[], columns: readonly number[], y: number) => {
  for (const [index, z] of rows.entries()) {
    if (index % 4) continue;
    for (const x of [columns[1], columns[columns.length - 2]])
      if (x !== undefined) spots.push({ kind: 'table', position: { x, y, z }, maxCount: 1 });
  }
};
tray(lowerRows, lowerColumns, 1.02);
tray(upperRows, upperColumns, floorHeight + 1.02);

export const aircraftPickups = distributeBottles(spots, {
  minimum: 16,
  idPrefix: 'fly_high_bottle',
});
