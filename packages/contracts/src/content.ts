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
    worldId: z.literal('bali'),
    title: z.string(),
    subtitle: z.string(),
    maxWanted: z.literal(0),
    spawn: positionSchema,
    destination: z
      .object({ id: z.string(), position: positionSchema, radius: z.number().positive() })
      .strict(),
    pickups: z.array(pickupSchema).min(1),
    objectives: z.array(objectiveSchema).min(1),
  })
  .strict()
  .superRefine((level, ctx) => {
    const ids = new Set<string>();
    for (const pickup of level.pickups) {
      if (ids.has(pickup.id))
        ctx.addIssue({ code: 'custom', message: `Duplicate pickup: ${pickup.id}` });
      ids.add(pickup.id);
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
