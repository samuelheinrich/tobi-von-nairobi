import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { LevelDefinition, Position3 } from '@tobi/contracts';
import { box, material } from './materials.js';

/** Decorative bystanders react visually; they have no mission or navigation authority. */
export class BaliCrowd {
  private readonly people: { root: TransformNode; arms: Mesh[]; head: Mesh }[] = [];
  private time = 0;
  public constructor(scene: Scene, level: LevelDefinition, shadows: ShadowGenerator) {
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
      const reacting = Math.hypot(dx, dz) < 9;
      if (reacting) person.root.rotation.y = Math.atan2(dx, dz);
      const dance = Math.sin(this.time * 3 + index);
      person.head.rotation.z = dance * 0.06;
      person.arms.forEach((arm, side) => {
        arm.rotation.z =
          (side === 0 ? 1 : -1) * (reacting && mood > 0.2 ? 1.4 + dance * 0.3 : 0.12);
        arm.rotation.x = dance * 0.16;
      });
    }
  }
  public dispose(): void {
    for (const person of this.people) person.root.dispose();
  }
}
