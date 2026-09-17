import { distributeBottles, type BottleSpot } from './bottles.js';
import { railwayLayout } from './railway.js';

/** Bottles on the Phuket train.
 *
 * The level shipped with none, which left Tobi without energy for the whole ride. They sit where
 * a bottle would actually stand on a moving train: the bar counter and its tables first, then the
 * seat-row armrests, then a couple in the vestibules for anyone who searches.
 */
const { carriageCentres, barCarriageIndex, seatOffsets, seatColumns, halfLength } = railwayLayout;

const spots: BottleSpot[] = [];
const barZ = carriageCentres[barCarriageIndex]!;

// Bar counter along both sides of the middle carriage.
for (const side of [-1, 1])
  for (const along of [-4.5, -1.5, 1.5, 4.5])
    spots.push({ kind: 'bar', position: { x: side * 2.6, y: 1.06, z: barZ + along }, maxCount: 1 });

// Standing tables down the middle of the bar carriage.
for (const along of [-3, 0, 3])
  spots.push({ kind: 'dining', position: { x: 0, y: 1.02, z: barZ + along }, maxCount: 2 });

// Seat rows in the four remaining carriages: a bottle on the armrest of the aisle seats.
for (const [index, centre] of carriageCentres.entries()) {
  if (index === barCarriageIndex) continue;
  for (const offset of seatOffsets)
    for (const column of seatColumns)
      spots.push({ kind: 'seating', position: { x: column * 0.72, y: 0.92, z: centre + offset } });
}

// Vestibules between carriages reward looking around rather than sitting down.
for (let i = 0; i + 1 < carriageCentres.length; i++)
  spots.push({
    kind: 'hidden',
    position: { x: -2.3, y: 0.55, z: (carriageCentres[i]! + carriageCentres[i + 1]!) / 2 },
    maxCount: 1,
  });

void halfLength;

export const railwayPickups = distributeBottles(spots, {
  minimum: 14,
  idPrefix: 'thailand_railway_bottle',
});
