import type { CharacterConfig } from '../humanoid/schema.js';
import {
  chrisConfig,
  copConfig,
  elyConfig,
  fitnessConfig,
  hipHopConfig,
  ladyboyConfig,
  miaConfig,
  samConfig,
  valeryConfig,
} from './cast.js';
import { dancerBeachConfig, dancerClubConfig, dancerSlipConfig } from './dancers.js';
import { townsfolkConfigs } from './townsfolk.js';

/** Which model plays which part, and how often it may appear.
 *
 * Roles are the ones the levels already cast. Most are filled by placeholders — the point is that
 * a level can be populated and looked at, not that the part is dressed correctly yet.
 */
export type CastRole =
  | 'police'
  | 'security'
  | 'conductor'
  | 'cellGuard'
  | 'flightAttendant'
  | 'tourist'
  | 'expat'
  | 'bargirl'
  | 'dancer'
  | 'ladyboyDancer'
  | 'vendor'
  | 'taxi'
  | 'resident'
  | 'passenger'
  | 'yoga'
  | 'beach'
  | 'raver';

export interface CastMember {
  config: CharacterConfig;
  /** At most one of these on screen per level: they are portraits of specific people. */
  unique?: boolean;
  /** Set when the model does not fit the part and is only standing in. */
  placeholder?: boolean;
}

const stand = (config: CharacterConfig): CastMember => ({ config, placeholder: true });
const one = (config: CharacterConfig): CastMember => ({ config, unique: true, placeholder: true });

/** The uniformed roles all share the one model that actually wears a uniform. */
const uniformed: CastMember[] = [{ config: copConfig }];

export const cast: Record<CastRole, CastMember[]> = {
  police: uniformed,
  security: uniformed,
  conductor: uniformed,
  cellGuard: uniformed,
  // Meant to be the captain model, which turned out to have no skeleton at all. Standing in until
  // a rigged crew model exists.
  flightAttendant: [stand(valeryConfig)],
  tourist: [stand(townsfolkConfigs[2]!), stand(townsfolkConfigs[3]!), one(chrisConfig)],
  expat: [stand(townsfolkConfigs[0]!), stand(townsfolkConfigs[1]!), one(samConfig)],
  bargirl: [
    { config: miaConfig },
    { config: hipHopConfig },
    { config: elyConfig },
    stand(valeryConfig),
  ],
  dancer: [
    { config: dancerBeachConfig },
    { config: dancerClubConfig },
    { config: dancerSlipConfig },
    { config: hipHopConfig },
    { config: elyConfig },
  ],
  ladyboyDancer: [{ config: ladyboyConfig }],
  vendor: [stand(townsfolkConfigs[2]!), stand(valeryConfig)],
  taxi: [stand(townsfolkConfigs[3]!)],
  resident: [stand(townsfolkConfigs[0]!), stand(townsfolkConfigs[1]!)],
  passenger: [stand(townsfolkConfigs[1]!), stand(townsfolkConfigs[2]!)],
  yoga: [stand(fitnessConfig)],
  beach: [{ config: fitnessConfig }, stand(townsfolkConfigs[0]!)],
  // Street Parade. Thin instances carry the route; these are the figures near the camera.
  //
  // The four gabbers and the pole dancer are *not* cast, although their configs still exist. Their
  // rest pose lies flat along Z — head at +3.6, feet at -4.0 — and only the animation stands them
  // up. The runtime measures a character at rest to scale it, so it reads a height of 0.36 and
  // scales by five: they rendered between 3.4 and 9 metres tall. Splitting them differently, an
  // FBX round-trip and baking the wrapper rotation all left it unchanged, so the flat rest pose is
  // in the downloads themselves. They need re-exporting with a standing rest pose before they can
  // come back. Placeholders hold the part meanwhile.
  raver: [stand(townsfolkConfigs[2]!), stand(townsfolkConfigs[3]!), stand(dancerBeachConfig)],
};

/** Tracks which one-per-level models a level has already handed out. */
export class Casting {
  private readonly spent = new Set<string>();

  /** Picks a model for `role`, deterministically for a given seed.
   *
   * A `unique` member is offered once per level and then withdrawn, so Sam and Chris appear as
   * themselves rather than as a crowd. When only unique members remain and all are spent, the
   * result is null and the caller keeps whatever it was using.
   */
  public pick(role: CastRole, seed: number): CharacterConfig | null {
    const members = cast[role];
    const available = members.filter((m) => !m.unique || !this.spent.has(m.config.id));
    if (!available.length) return null;
    // Unique members are rare on purpose: they only come up on a seed that lands exactly on them.
    const chosen = available[Math.abs(Math.trunc(seed)) % available.length]!;
    if (chosen.unique) this.spent.add(chosen.config.id);
    return chosen.config;
  }

  /** True once this level has used up the given one-per-level model. */
  public spentOn(id: string): boolean {
    return this.spent.has(id);
  }

  public reset(): void {
    this.spent.clear();
  }
}
