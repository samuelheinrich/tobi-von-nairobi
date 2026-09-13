import * as argon2 from 'argon2';
import { ServiceUnavailableException } from '@nestjs/common';

// Bound expensive hash work, including concurrent requests from different addresses.
let active = 0;
const options = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;
async function bounded<T>(operation: () => Promise<T>): Promise<T> {
  if (active >= 4) throw new ServiceUnavailableException('Bitte gleich nochmals versuchen.');
  active++;
  try {
    return await operation();
  } finally {
    active--;
  }
}
export const hashPassword = (password: string): Promise<string> =>
  bounded(() => argon2.hash(password, options));
export const verifyPassword = (hash: string, password: string): Promise<boolean> =>
  bounded(() => argon2.verify(hash, password));
