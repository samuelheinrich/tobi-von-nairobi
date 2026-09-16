import type { LevelNpcs } from './level-npcs.js';
import type { Position3 } from '@tobi/contracts';
/** Compose indoor residents and street populations without a second session integration. */
export class NpcGroup implements LevelNpcs {
  constructor(private readonly groups: readonly LevelNpcs[]) {}
  get targets() {
    return this.groups.flatMap((g) => g.targets);
  }
  get blocked() {
    return this.groups.some((g) => g.blocked);
  }
  context(chaos: number, mood?: number) {
    for (const g of this.groups) g.context?.(chaos, mood);
  }
  update(delta: number, p: Position3) {
    for (const g of this.groups) g.update(delta, p);
  }
  taunt(p: Position3) {
    return this.groups.reduce((n, g) => n + g.taunt(p), 0);
  }
  flirt(p: Position3) {
    return this.groups.some((g) => g.flirt(p));
  }
  resolve(p: Position3) {
    for (const g of this.groups) {
      const result = g.resolve(p);
      if (result) return result;
    }
    return null;
  }
  takeReply() {
    let reply = null;
    for (const g of this.groups) reply = g.takeReply() ?? reply;
    return reply;
  }
  dispose() {
    for (const g of this.groups) g.dispose();
  }
}
