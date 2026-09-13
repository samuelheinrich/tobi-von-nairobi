import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { LevelDefinition } from '@tobi/contracts';
import { prototypeBalance } from '@tobi/game-data';
import { material } from '../levels/materials.js';

export class BottlePickups {
  private readonly pickups = new Map<string, TransformNode>();
  private time = 0;

  public constructor(scene: Scene, level: LevelDefinition, shadows: ShadowGenerator) {
    const green = material(scene, 'bottle-green', '#3d977a');
    green.emissiveColor = Color3.FromHexString('#103322');
    const label = material(scene, 'bottle-label', '#fff0cf');
    const gold = material(scene, 'pickup-gold', '#ffca57');
    gold.emissiveColor = Color3.FromHexString('#685025');
    for (const pickup of level.pickups) {
      const root = new TransformNode(pickup.id, scene);
      root.position.set(pickup.position.x, 0.65, pickup.position.z);
      const body = MeshBuilder.CreateCylinder(
        'bottle',
        { diameter: 0.26, height: 0.52, tessellation: 8 },
        scene,
      );
      body.material = green;
      body.parent = root;
      const neck = MeshBuilder.CreateCylinder(
        'bottle-neck',
        { diameter: 0.1, height: 0.22, tessellation: 8 },
        scene,
      );
      neck.position.y = 0.36;
      neck.material = green;
      neck.parent = root;
      const band = MeshBuilder.CreateCylinder(
        'bottle-label',
        { diameter: 0.27, height: 0.19, tessellation: 8 },
        scene,
      );
      band.material = label;
      band.parent = root;
      const ring = MeshBuilder.CreateTorus(
        'pickup-marker',
        { diameter: 0.95, thickness: 0.035, tessellation: 24 },
        scene,
      );
      ring.position.y = -0.47;
      ring.material = gold;
      ring.parent = root;
      shadows.addShadowCaster(body);
      this.pickups.set(pickup.id, root);
    }
  }

  public update(delta: number): void {
    this.time += delta;
    for (const pickup of this.pickups.values()) {
      pickup.rotation.y += delta * 1.2;
      pickup.position.y = 0.7 + Math.sin(this.time * 2.5 + pickup.position.z) * 0.08;
    }
  }

  public nearby(position: Vector3): string[] {
    return [...this.pickups]
      .filter(
        ([, pickup]) =>
          Math.hypot(pickup.position.x - position.x, pickup.position.z - position.z) <
            prototypeBalance.pickupRadius && Math.abs(position.y - pickup.position.y) < 2,
      )
      .map(([id]) => id);
  }

  public collect(id: string): void {
    const pickup = this.pickups.get(id);
    pickup?.dispose();
    this.pickups.delete(id);
  }
  public dispose(): void {
    for (const pickup of this.pickups.values()) pickup.dispose();
    this.pickups.clear();
  }
}
