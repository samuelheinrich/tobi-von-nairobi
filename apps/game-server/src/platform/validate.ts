import { BadRequestException } from '@nestjs/common';
import type { ZodType } from 'zod';

export function validate<T>(schema: ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new BadRequestException('Ungültige Eingabe.');
  return parsed.data;
}
