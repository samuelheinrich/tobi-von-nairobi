import { outwardArmAngle } from '../character/modular/arm-pose.js';
import { animateCharacter } from '../character/modular/animation.js';
import { NavigationGrid } from '@tobi/game-core';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { LevelDefinition, Position3 } from '@tobi/contracts';
import { createNpc, npcPalette, type NpcRig } from './npc-kit.js';
import { navigationObstacles } from './nav-obstacles.js';

/** Decorative bystanders react visually; they have no mission or navigation authority. */
export class BaliCrowd {
  private readonly people: NpcRig[] = [];
  private readonly nav: NavigationGrid;
  private time = 0;
  private readonly frightened = new Map<number, number>();
  public get targets() {
    return this.people.map((p, id) => ({
      position: { x: p.root.position.x, y: 1.2, z: p.root.position.z },
      radius: 0.65,
      hit: () => {
        this.frightened.set(id, 3);
      },
    }));
  }
  private lastResponder: TransformNode | null = null;
  /** Head height of the nearest bystander who reacted, for a speech plate. */
  public get responder(): Position3 | null {
    const at = this.lastResponder?.position;
    return at ? { x: at.x, y: 1.9, z: at.z } : null;
  }
  public taunt(position: Position3): number {
    let count = 0;
    let nearest = Infinity;
    this.lastResponder = null;
    for (const [id, p] of this.people.entries()) {
      const distance = Math.hypot(p.root.position.x - position.x, p.root.position.z - position.z);
      if (distance >= 8 || !this.nav.clear(position, p.root.position)) continue;
      this.frightened.set(id, 3);
      count++;
      if (distance < nearest) {
        nearest = distance;
        this.lastResponder = p.root;
      }
    }
    return count;
  }
  public constructor(
    scene: Scene,
    level: LevelDefinition,
    shadows: ShadowGenerator,
    colliders: Mesh[] = [],
  ) {
    this.nav = new NavigationGrid(
      level.navigationBounds ?? { minX: -30, maxX: 30, minZ: -34, maxZ: 34 },
      navigationObstacles(colliders),
      0.3,
    );
    const positions =
      level.scenery === 'beach-bar'
        ? [
            [24, -20],
            [26, -14],
            [26, 4],
          ]
        : level.scenery === 'night-market'
          ? [
              [8, -18],
              [-4, -18],
              [8, 1],
              [-4, 13],
            ]
          : [];
    for (const [index, point] of positions.entries()) {
      const rig = createNpc(
        scene,
        `bystander-${index}`,
        npcPalette(scene, index),
        shadows,
        false,
        level.scenery === 'beach-bar' ? 'beach_guest' : 'local',
      );
      rig.root.position.set(point[0]!, 0, point[1]!);
      this.people.push(rig);
    }
  }
  public update(delta: number, player: Position3, mood: number): void {
    if (delta <= 0) return;
    this.time += delta;
    for (const [index, person] of this.people.entries()) {
      const dx = player.x - person.root.position.x,
        dz = player.z - person.root.position.z;
      const scared = this.frightened.get(index) ?? 0;
      this.frightened.set(index, Math.max(0, scared - delta));
      if (scared > 0) {
        const distance = Math.hypot(dx, dz) || 1;
        const next = {
          x: person.root.position.x - (dx / distance) * delta * 2,
          z: person.root.position.z - (dz / distance) * delta * 2,
        };
        if (this.nav.clear(person.root.position, next)) {
          person.root.position.x = next.x;
          person.root.position.z = next.z;
        }
      }
      const reacting = Math.hypot(dx, dz) < 9;
      if (reacting) person.root.rotation.y = Math.atan2(dx, dz);
      if (person.appearance.femaleStyle && !scared && mood <= 0.2) {
        animateCharacter(person, 'idle', this.time, index);
        continue;
      }
      const dance = Math.sin(this.time * 3 + index);
      person.head.rotation.z = dance * 0.06;
      person.arms.forEach((arm, side) => {
        arm.rotation.z = outwardArmAngle(
          side,
          (reacting && mood > 0.2) || scared > 0 ? 1.4 + dance * 0.3 : 0.12,
        );
        arm.rotation.x = dance * 0.16;
      });
    }
  }
  public dispose(): void {
    for (const person of this.people) person.root.dispose();
  }
}
