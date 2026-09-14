import { z } from 'zod';

export const positionSchema = z
  .object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() })
  .strict();

export const pickupSchema = z
  .object({
    id: z.string().min(1),
    itemId: z.literal('bottle'),
    position: positionSchema,
  })
  .strict();

export const objectiveSchema = z.discriminatedUnion('type', [
  z
    .object({
      id: z.string(),
      type: z.literal('collect'),
      itemId: z.literal('bottle'),
      amount: z.number().int().positive(),
      after: z.array(z.string()).default([]),
    })
    .strict(),
  z
    .object({
      id: z.string(),
      type: z.literal('escapePolice'),
      after: z.array(z.string()).default([]),
    })
    .strict(),
  z
    .object({
      id: z.string(),
      type: z.literal('reach'),
      targetId: z.string(),
      after: z.array(z.string()).default([]),
    })
    .strict(),
]);

export const levelSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    worldId: z.enum(['bali', 'bangkok', 'zurich', 'arlesheim']),
    title: z.string(),
    subtitle: z.string(),
    atmosphere: z.enum(['day', 'sunset', 'night']).default('day'),
    scenery: z
      .enum(['village', 'beach-bar', 'night-market', 'railway', 'street-parade', 'hippie-house'])
      .default('village'),
    maxWanted: z.number().int().min(0).max(5),
    chaosPerBottle: z.number().positive().max(30).default(16),
    policeSpeed: z.number().min(2).max(8).default(4.6),
    policeSpawns: z.array(positionSchema).optional(),
    navigationBounds: z
      .object({
        minX: z.number().finite(),
        maxX: z.number().finite(),
        minZ: z.number().finite(),
        maxZ: z.number().finite(),
      })
      .strict()
      .optional(),
    spawn: positionSchema,
    destination: z
      .object({ id: z.string(), position: positionSchema, radius: z.number().positive() })
      .strict(),
    pickups: z.array(pickupSchema).min(1),
    powerups: z
      .array(z.object({ id: z.string().min(1), position: positionSchema }).strict())
      .max(100)
      .default([]),
    objectives: z.array(objectiveSchema).min(1),
  })
  .strict()
  .superRefine((level, ctx) => {
    if (level.maxWanted > 0 && !level.policeSpawns?.length)
      ctx.addIssue({ code: 'custom', message: 'Wanted levels require police spawns' });
    if (level.maxWanted === 0 && level.objectives.some((o) => o.type === 'escapePolice'))
      ctx.addIssue({ code: 'custom', message: 'Escape objective requires pursuit' });
    if (
      level.maxWanted > 0 &&
      (!level.navigationBounds || (level.policeSpawns?.length ?? 0) < level.maxWanted)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Pursuit requires navigation bounds and one spawn per wanted tier',
      });
    const bounds = level.navigationBounds;
    if (
      bounds &&
      (bounds.minX >= bounds.maxX ||
        bounds.minZ >= bounds.maxZ ||
        bounds.maxX - bounds.minX > 256 ||
        bounds.maxZ - bounds.minZ > 256)
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid or oversized navigation bounds' });
    if (
      bounds &&
      level.policeSpawns?.some(
        (p) => p.x < bounds.minX || p.x > bounds.maxX || p.z < bounds.minZ || p.z > bounds.maxZ,
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Police spawn outside navigation bounds' });
    const ids = new Set<string>();
    for (const pickup of level.pickups) {
      if (ids.has(pickup.id))
        ctx.addIssue({ code: 'custom', message: `Duplicate pickup: ${pickup.id}` });
      ids.add(pickup.id);
    }
    for (const powerup of level.powerups) {
      if (ids.has(powerup.id))
        ctx.addIssue({ code: 'custom', message: 'Duplicate pickup or powerup ID' });
      ids.add(powerup.id);
    }
    const objectiveIds = new Set(level.objectives.map((objective) => objective.id));
    if (objectiveIds.size !== level.objectives.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate objective ID' });
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const visit = (id: string): void => {
      if (visiting.has(id)) {
        ctx.addIssue({ code: 'custom', message: 'Objective dependency cycle' });
        return;
      }
      if (visited.has(id)) return;
      const objective = level.objectives.find((entry) => entry.id === id);
      if (!objective) {
        ctx.addIssue({ code: 'custom', message: `Unknown objective: ${id}` });
        return;
      }
      visiting.add(id);
      for (const dependency of objective.after) visit(dependency);
      visiting.delete(id);
      visited.add(id);
    };
    for (const objective of level.objectives) {
      visit(objective.id);
      if (objective.type === 'collect' && objective.amount > level.pickups.length)
        ctx.addIssue({ code: 'custom', message: 'Not enough pickups for collect objective' });
      if (objective.type === 'reach' && objective.targetId !== level.destination.id)
        ctx.addIssue({ code: 'custom', message: 'Unknown destination' });
    }
  });

export type LevelDefinition = z.infer<typeof levelSchema>;
export type MissionObjective = z.infer<typeof objectiveSchema>;
