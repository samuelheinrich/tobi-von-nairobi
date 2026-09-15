import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Position3 } from '@tobi/contracts';
import { CabinPuzzle, type RestSpot } from '@tobi/game-core';
import { aircraftLayout } from '@tobi/game-data';
import type { LevelScene } from '../levels/create-level-scene.js';
import { createNpc, npcPalette } from '../levels/npc-kit.js';

/** Babylon perception and character presentation for the engine-free cabin rules. */
export class FlightRuntime {
  public readonly puzzle = new CabinPuzzle(aircraftLayout.puzzle);
  private readonly rigs;
  private time = 0;
  public constructor(
    private readonly scene: Scene,
    private readonly environment: LevelScene,
  ) {
    this.rigs = this.puzzle.crew.map((member, index) => {
      const rig = createNpc(
        scene,
        member.route.id,
        npcPalette(scene, index + 1),
        environment.shadows,
        false,
        'crew',
        true,
      );
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
