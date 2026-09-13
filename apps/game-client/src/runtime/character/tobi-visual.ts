import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { material } from '../levels/materials.js';

/** Original procedural placeholder. Visual wobble never changes the collision capsule. */
export class TobiVisual {
  public readonly root: TransformNode;
  private readonly torso: Mesh;
  private readonly legs: Mesh[] = [];
  private readonly arms: Mesh[] = [];
  private time = 0;

  public constructor(scene: Scene, shadows: ShadowGenerator) {
    this.root = new TransformNode('tobi', scene);
    const shirt = material(scene, 'tobi-shirt', '#f16747');
    const skin = material(scene, 'tobi-skin', '#e8af7b');
    const shorts = material(scene, 'tobi-shorts', '#344f57');
    const hat = material(scene, 'tobi-hat', '#efe1b8');
    const glasses = material(scene, 'tobi-glasses', '#243b3c');
    const part = (
      name: string,
      diameter: number,
      size: [number, number, number],
      position: [number, number, number],
      surface = shirt,
    ): Mesh => {
      const mesh = MeshBuilder.CreateSphere(name, { diameter, segments: 6 }, scene);
      mesh.scaling.set(...size);
      mesh.position.set(...position);
      mesh.material = surface;
      mesh.parent = this.root;
      shadows.addShadowCaster(mesh);
      return mesh;
    };
    this.torso = part('tobi-shirt', 1, [1.08, 0.98, 0.83], [0, 1.1, 0]);
    part('tobi-head', 0.6, [1, 1.1, 1], [0, 1.85, 0.03], skin);
    part('tobi-nose', 0.15, [1, 0.9, 1.2], [0, 1.83, 0.34], skin);
    part('tobi-hat-brim', 0.93, [1, 0.1, 0.85], [0, 2.14, 0], hat);
    part('tobi-hat-crown', 0.58, [1, 0.55, 0.9], [0, 2.27, 0], hat);
    for (const side of [-1, 1]) {
      part('sunglasses', 0.21, [1.05, 0.7, 0.35], [side * 0.15, 1.9, 0.28], glasses);
      this.legs.push(part('leg', 0.4, [0.8, 1.6, 0.8], [side * 0.24, 0.44, 0], shorts));
      part('shoe', 0.4, [0.9, 0.5, 1.5], [side * 0.24, 0.12, 0.1], hat);
      this.arms.push(part('arm', 0.32, [0.9, 2, 0.9], [side * 0.64, 1.04, 0], skin));
    }
  }

  public animate(delta: number, speed: number, grounded: boolean, victory = false): void {
    this.time += delta * (victory ? 9 : speed * 2.8 + 1);
    const swing = Math.sin(this.time) * (victory ? 0.6 : Math.min(speed / 7.5, 1) * 0.55);
    this.legs.forEach((leg, index) => {
      leg.rotation.x = grounded ? swing * (index === 0 ? 1 : -1) : -0.3;
    });
    this.arms.forEach((arm, index) => {
      arm.rotation.x = -swing * (index === 0 ? 1 : -1);
      arm.rotation.z = victory ? (index === 0 ? 1 : -1) * 2 : 0;
    });
    this.torso.rotation.z = swing * 0.08;
    if (victory) this.root.rotation.y += delta;
  }

  public dispose(): void {
    this.root.dispose(false, true);
  }
}
