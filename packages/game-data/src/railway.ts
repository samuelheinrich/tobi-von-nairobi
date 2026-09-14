/** Authoring dimensions in metres for the five-carriage train, front of the train at rising z. */
export const railwayLayout = {
  carriageCentres: [-38, -19, 0, 19, 38],
  /** Middle carriage is the bar; the remaining four keep their seat rows. */
  barCarriageIndex: 2,
  halfLength: 8.5,
  seatOffsets: [-6, -2, 2, 6],
  seatColumns: [-2.8, 2.8],
  laneHalfWidth: 3.2,
  endWallZ: 47.5,
  conductor: {
    patrolMin: -30,
    patrolMax: 34,
    laneMin: -1.2,
    laneMax: 1.2,
    patrolSpeed: 1.5,
    interceptSpeed: 4.4,
    noticeRange: 9,
    bodyRadius: 0.95,
    shoutSeconds: 3.4,
    relentSeconds: 5,
    standAsideSeconds: 7,
    asideX: 1.8,
    blockSide: 1,
  },
} as const;
