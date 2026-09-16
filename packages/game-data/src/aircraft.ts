/** A380-inspired, enlarged arcade cabin. Seat grouping is authentic; dimensions are playable,
 * not an engineering model. Positive Z is the nose, main deck Y=0, upper deck Y=4.4.
 */
const lowerRows = [-32, -29, -26, -23, -20, -17, -10, -7, -4, 3, 6, 9, 16, 19, 22, 25];
const lowerColumns = [-6.7, -5.55, -4.4, -1.85, -0.62, 0.62, 1.85, 4.4, 5.55, 6.7];
const upperRows = [-29, -25, -21, -17, -9, -5, 0, 5, 10, 26, 30];
const upperColumns = [-5.3, -0.9, 0.9, 5.3];
const spot = (id: string, label: string, x: number, y: number, z: number, exitX: number) => ({
  id,
  label,
  kind: 'seat' as const,
  position: { x, y: y + 0.9, z },
  seatHeight: 0.48,
  exit: { x: exitX, y: y + 1.1, z },
  yaw: 0,
});
export const aircraftLayout = {
  floorHeight: 4.4,
  halfWidth: 8,
  lowerRows,
  lowerColumns,
  upperRows,
  upperColumns,
  seats: [
    spot('tobi-seat', 'TOBIS PLATZ 42C', -4.4, 0, -32, -3.05),
    spot('seat-hide', 'FREIER SITZ 39C', -4.4, 0, -23, -3.05),
    spot('upper-seat', 'BUSINESS 8A', -5.3, 4.4, 10, -3.2),
    {
      id: 'toilet-hide',
      label: 'WC · VERSTECKEN',
      kind: 'toilet' as const,
      position: { x: -6.4, y: 1.1, z: -0.5 },
      exit: { x: -3.05, y: 1.1, z: -0.5 },
      yaw: Math.PI / 2,
    },
  ],
  puzzle: {
    upperFloor: 4.4,
    finishZ: 28,
    consoleWaypoint: { x: 0, y: 5.5, z: 12 },
    routes: [
      {
        id: 'rear-service',
        x: -3.05,
        floor: 0,
        minZ: -29,
        maxZ: -15,
        speed: 1.7,
        start: -17,
        direction: -1 as const,
      },
      {
        id: 'galley-service',
        x: -3.05,
        floor: 0,
        minZ: -11,
        maxZ: 12,
        speed: 1.5,
        start: 7,
        direction: -1 as const,
      },
      {
        id: 'upper-service',
        x: -3.2,
        floor: 4.4,
        minZ: 13,
        maxZ: 32,
        speed: 1.7,
        start: 24,
        direction: -1 as const,
      },
    ],
    hidingSequence: [
      {
        spotId: 'seat-hide',
        crewId: 'rear-service',
        hint: '1/3 · E am freien Sitz 39C. Warte, bis die Crew vorbeigeht.',
      },
      {
        spotId: 'toilet-hide',
        crewId: 'galley-service',
        hint: '2/3 · E am WC in der Mitte. Bleib drin, bis der Service vorbei ist.',
      },
    ],
  },
} as const;
