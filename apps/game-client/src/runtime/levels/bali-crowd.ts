import { NavigationGrid } from '@tobi/game-core';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { LevelDefinition, Position3 } from '@tobi/contracts';
import { box, material } from './materials.js';
import { navigationObstacles } from './nav-obstacles.js';

/** Decorative bystanders react visually; they have no mission or navigation authority. */
export class BaliCrowd {
  private readonly people: { root: TransformNode; arms: Mesh[]; head: Mesh }[] = [];
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
  public taunt(position: Position3): number {
    let count = 0;
    for (const [id, p] of this.people.entries())
      if (
        Math.hypot(p.root.position.x - position.x, p.root.position.z - position.z) < 8 &&
        this.nav.clear(position, p.root.position)
      ) {
        this.frightened.set(id, 3);
        count++;
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
    const skins = [
      material(scene, 'crowd-skin-a', '#b67b56'),
      material(scene, 'crowd-skin-b', '#e5b18c'),
    ];
    const shirts = [
      material(scene, 'crowd-mint', '#4fc6aa'),
      material(scene, 'crowd-lilac', '#b28ace'),
    ];
    const trousers = material(scene, 'crowd-trousers', '#355265');
    for (const [index, point] of positions.entries()) {
      const root = new TransformNode(`bystander-${index}`, scene);
      root.position.set(point[0]!, 0, point[1]!);
      const skin = skins[index % 2]!,
        shirt = shirts[index % 2]!;
      const part = (
        name: string,
        size: [number, number, number],
        position: [number, number, number],
        surface = shirt,
      ): Mesh => {
        const mesh = box(scene, `bystander-${name}`, size, position, surface);
        mesh.parent = root;
        shadows.addShadowCaster(mesh);
        return mesh;
      };
      part('body', [0.58, 0.8, 0.38], [0, 1, 0]);
      const head = part('head', [0.4, 0.45, 0.4], [0, 1.65, 0], skin);
      const arms = [];
      for (const side of [-1, 1]) {
        part('leg', [0.22, 0.65, 0.26], [side * 0.17, 0.325, 0], trousers);
        arms.push(part('arm', [0.19, 0.65, 0.22], [side * 0.42, 1.02, 0], skin));
      }
      this.people.push({ root, arms, head });
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
      const dance = Math.sin(this.time * 3 + index);
      person.head.rotation.z = dance * 0.06;
      person.arms.forEach((arm, side) => {
        arm.rotation.z =
          (side === 0 ? 1 : -1) *
          ((reacting && mood > 0.2) || scared > 0 ? 1.4 + dance * 0.3 : 0.12);
        arm.rotation.x = dance * 0.16;
      });
    }
  }
  public dispose(): void {
    for (const person of this.people) person.root.dispose();
  }
}
