import { z } from 'zod';

export const credentialsSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(40)
      .regex(/^[a-zA-Z0-9_-]+$/),
    password: z.string().min(12).max(128),
  })
  .strict();
export const userSchema = z.object({ id: z.string().uuid(), username: z.string() }).strict();
export const authSchema = z
  .object({ user: userSchema.nullable(), csrfToken: z.string().nullable() })
  .strict();
export const startRunSchema = z
  .object({ requestId: z.string().uuid(), levelId: z.string().min(1).max(80) })
  .strict();
export const runSchema = z
  .object({
    id: z.string().uuid(),
    levelId: z.string(),
    contentVersion: z.string(),
    status: z.enum(['active', 'completed', 'abandoned']),
  })
  .strict();
export const completionSchema = z
  .object({
    pickupIds: z.array(z.string().min(1).max(80)).min(1).max(100),
    elapsedMs: z.number().int().min(1000).max(900000),
    escapes: z.number().int().min(0).max(50),
    debugUsed: z.boolean(),
  })
  .strict();
export const receiptSchema = z
  .object({
    runId: z.string().uuid(),
    score: z.number().int().nonnegative(),
    elapsedMs: z.number().int().positive(),
  })
  .strict();
export const progressSchema = z
  .object({
    saveId: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    score: z.number().int().nonnegative(),
    levels: z.array(
      z
        .object({
          levelId: z.string(),
          bestScore: z.number().int().nonnegative(),
          bestTimeMs: z.number().int().positive(),
          completions: z.number().int().positive(),
        })
        .strict(),
    ),
    activeRun: runSchema.nullable(),
  })
  .strict();
export type AuthResponse = z.infer<typeof authSchema>;
export type PublicUser = z.infer<typeof userSchema>;
export type Credentials = z.infer<typeof credentialsSchema>;
export type RunResponse = z.infer<typeof runSchema>;
export type Completion = z.infer<typeof completionSchema>;
export type Progress = z.infer<typeof progressSchema>;
export type Receipt = z.infer<typeof receiptSchema>;

export const pendingCompletionSchema = z
  .object({
    userId: z.string().uuid(),
    runId: z.string().uuid(),
    result: completionSchema,
    createdAt: z.number().finite().positive(),
  })
  .strict();
export type PendingCompletion = z.infer<typeof pendingCompletionSchema>;
