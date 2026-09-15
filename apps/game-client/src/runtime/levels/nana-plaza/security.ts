import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Position3 } from '@tobi/contracts';
import { NavigationGrid, NpcVoices, type Point2 } from '@tobi/game-core';
import { createNpc, npcPalette } from '../npc-kit.js';
import { navigationObstacles } from '../nav-obstacles.js';
import type { SpeechBubbles } from '../speech-bubbles.js';

/** Courtyard security escorts through real movement; it cannot arrest or chase into the city. */
export class NanaSecurity {
  private readonly nav: NavigationGrid;
  private readonly guards;
  private readonly voices = new NpcVoices();
  private elapsed = 1;
  private cooldown = 0;
  private warned = false;
  private escort: Point2[] | null = null;
  public state: 'quiet' | 'watching' | 'chasing' | 'escorting' = 'quiet';
  public constructor(
    scene: Scene,
    colliders: Mesh[],
    private readonly bubbles: SpeechBubbles,
  ) {
    this.nav = new NavigationGrid(
      { minX: -32, maxX: 32, minZ: -8, maxZ: 65 },
      navigationObstacles(colliders),
    );
    const palette = npcPalette(scene, 2);
    this.guards = [-5, 5].map((x, i) => {
      const rig = createNpc(scene, `nana-security-${i}`, palette, null);
      rig.root.position.set(x, 0, 7);
      return { rig, home: { x, z: 7 }, route: [] as Point2[] };
    });
  }
  public step(delta: number, player: Position3, chaos: number): void {
    this.elapsed += delta;
    this.cooldown = Math.max(0, this.cooldown - delta);
    if (this.escort) {
      while (
        this.escort[0] &&
        Math.hypot(player.x - this.escort[0].x, player.z - this.escort[0].z) < 0.7
      )
        this.escort.shift();
      if (!this.escort.length) {
        this.escort = null;
        this.cooldown = 18;
        this.state = 'watching';
      }
      return;
    }
    const inside = player.y < 2 && player.z > 3 && player.z < 52 && Math.abs(player.x) < 22;
    this.state =
      chaos >= 41 && inside && !this.cooldown ? 'chasing' : chaos >= 21 ? 'watching' : 'quiet';
    if (chaos < 21) this.warned = false;
    if (inside && this.state !== 'quiet' && !this.warned) {
      this.warned = true;
      const text = this.voices.next('nanaSecurity', 'entrance');
      this.bubbles.say(new Vector3(-5, 2.7, 7), text, 4, { topic: 'nanaSecurity', speaker: 800 });
    }
    const repath = this.elapsed >= 0.5;
    if (repath) this.elapsed = 0;
    for (const guard of this.guards) {
      const p = guard.rig.root.position;
      const chase =
        this.state === 'chasing' &&
        Math.hypot(p.x - player.x, p.z - player.z) < 15 &&
        this.nav.clear(p, player);
      if (repath) guard.route = this.nav.path(p, chase ? player : guard.home);
      const target = guard.route[0];
      if (target) {
        const dx = target.x - p.x,
          dz = target.z - p.z,
          length = Math.hypot(dx, dz);
        const step = Math.min(length, delta * (chase ? 5.5 : 2.5));
        if (length > 0) {
          p.x += (dx / length) * step;
          p.z += (dz / length) * step;
          guard.rig.root.rotation.y = Math.atan2(dx, dz);
        }
        if (length <= step + 0.05) guard.route.shift();
        for (const [i, leg] of guard.rig.legs.entries())
          leg.rotation.x = Math.sin(performance.now() / 100 + i * Math.PI) * 0.35;
      }
      if (chase && Math.hypot(p.x - player.x, p.z - player.z) < 1.1) {
        const route = this.nav.path(player, { x: 0, z: -6 });
        if (route.length) {
          this.escort = route;
          this.state = 'escorting';
          this.bubbles.say(
            p.add(new Vector3(0, 2.7, 0)),
            'Outside, please. Come back when you are calm.',
            5,
            { topic: 'nanaSecurity', speaker: 800 },
          );
        }
        break;
      }
    }
  }
  /** World-space movement intent; the player's regular Havok motor still handles every wall. */
  public movement(player: Position3): Point2 | null {
    const next = this.escort?.[0];
    if (!next) return null;
    const dx = next.x - player.x,
      dz = next.z - player.z,
      length = Math.hypot(dx, dz);
    return length > 0.05 ? { x: dx / length, z: dz / length } : { x: 0, z: 0 };
  }
  public dispose(): void {
    for (const guard of this.guards) guard.rig.root.dispose();
  }
}
