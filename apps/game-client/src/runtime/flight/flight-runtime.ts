import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Position3 } from '@tobi/contracts';
import { CabinPuzzle, type RestSpot } from '@tobi/game-core';
import { aircraftLayout } from '@tobi/game-data';
import type { LevelScene } from '../levels/create-level-scene.js';
import { createNpc, npcPalette } from '../levels/npc-kit.js';
import { box, material } from '../levels/materials.js';

/** Babylon perception and character presentation for the engine-free cabin rules. */
export class FlightRuntime {
  public readonly puzzle = new CabinPuzzle(aircraftLayout.puzzle);
  private readonly rigs;
  private time = 0;
  public constructor(
    private readonly scene: Scene,
    private readonly environment: LevelScene,
  ) {
    const uniform = material(scene, 'flight-crew-uniform', '#8e2853');
    const scarf = material(scene, 'flight-crew-scarf', '#f4c975');
    this.rigs = this.puzzle.crew.map((member) => {
      const palette = npcPalette(scene, 1);
      const rig = createNpc(
        scene,
        member.route.id,
        { ...palette, top: uniform, bottom: uniform },
        environment.shadows,
      );
      const hat = box(scene, 'crew-hat', [0.5, 0.16, 0.45], [0, 2.02, 0], uniform);
      hat.parent = rig.root;
      const neck = box(scene, 'crew-scarf', [0.35, 0.14, 0.4], [0, 1.44, 0], scarf);
      neck.parent = rig.root;
      rig.root.position.set(member.position.x, member.route.floor, member.position.z);
      rig.root.rotation.y = member.direction > 0 ? 0 : Math.PI;
      for (const mesh of rig.root.getChildMeshes()) mesh.isVisible = member.route.floor === 0;
      return rig;
    });
  }
  public step(
    delta: number,
    position: Position3,
    hiding: RestSpot | null,
  ): 'caught' | 'disruptive' | null {
    const result = this.puzzle.step(delta, position, hiding, (from, to) => {
      const start = new Vector3(from.x, from.y + 0.4, from.z);
      const target = new Vector3(to.x, to.y + 0.2, to.z);
      const ray = target.subtract(start);
      const length = ray.length();
      return !this.scene.pickWithRay(new Ray(start, ray.normalize(), length), (mesh) =>
        this.environment.colliders.some((collider) => collider === mesh),
      )?.hit;
    });
    this.time += delta;
    for (const [i, rig] of this.rigs.entries()) {
      const member = this.puzzle.crew[i]!;
      rig.root.position.set(member.position.x, member.route.floor, member.position.z);
      rig.root.rotation.y = member.direction > 0 ? 0 : Math.PI;
      for (const mesh of rig.root.getChildMeshes())
        mesh.isVisible = member.route.floor < position.y - 0.2;
      rig.legs.forEach((leg, j) => (leg.rotation.x = Math.sin(this.time * 5) * (j ? 0.4 : -0.4)));
      rig.arms.forEach((arm, j) => (arm.rotation.x = Math.sin(this.time * 5) * (j ? -0.25 : 0.25)));
    }
    return result;
  }
  public dispose() {
    for (const rig of this.rigs) rig.root.dispose();
  }
}
