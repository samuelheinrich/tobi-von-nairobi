/** Stable bit flags shared by bodies and queries. Decoration has no physical representation. */
export const CollisionLayer = {
  PLAYER: 1,
  NPC: 2,
  WORLD_STATIC: 4,
  WORLD_DYNAMIC: 8,
  VEHICLE: 16,
  PROP: 32,
  PROJECTILE: 64,
  TRIGGER: 128,
  DECORATION: 256,
} as const;
export type CollisionGroup = keyof typeof CollisionLayer;
const L = CollisionLayer;
const solid = L.WORLD_STATIC | L.WORLD_DYNAMIC | L.VEHICLE | L.PROP;
export const CollisionMask: Record<CollisionGroup, number> = {
  PLAYER: solid | L.NPC | L.TRIGGER,
  NPC: solid | L.PLAYER | L.PROJECTILE,
  WORLD_STATIC: L.PLAYER | L.NPC | L.WORLD_DYNAMIC | L.VEHICLE | L.PROP | L.PROJECTILE,
  WORLD_DYNAMIC: solid | L.PLAYER | L.NPC | L.PROJECTILE,
  VEHICLE: solid | L.PLAYER | L.NPC | L.PROJECTILE,
  PROP: solid | L.PLAYER | L.NPC | L.PROJECTILE,
  PROJECTILE: solid | L.NPC,
  TRIGGER: L.PLAYER,
  DECORATION: 0,
};
export const groundMask = solid;
