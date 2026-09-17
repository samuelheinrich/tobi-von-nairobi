import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Position3 } from '@tobi/contracts';
import { createNpc, npcPalette, type NpcRig } from '../levels/npc-kit.js';

interface Evacuee {
  rig: NpcRig;
  route: readonly Position3[];
  waypoint: number;
  delay: number;
}

/** Small waypoint evacuation usable by aircraft, ships or buildings. */
export class EvacuationRuntime {
  private readonly people: Evacuee[];
  private active = false;

  constructor(scene: Scene, routes: readonly (readonly Position3[])[]) {
    this.people = routes.map((route, index) => {
      const rig = createNpc(
        scene,
        `airport-evacuee-${index}`,
        npcPalette(scene, 300 + index),
        null,
        false,
        index % 4 === 0 ? 'crew' : 'tourist',
        true,
      );
      rig.root.position.copyFromFloats(route[0]!.x, route[0]!.y, route[0]!.z);
      rig.root.setEnabled(false);
      return { rig, route, waypoint: 1, delay: index * 0.28 };
    });
  }

  start(): void {
    this.active = true;
  }

  update(delta: number): void {
    if (!this.active) return;
    for (const person of this.people) {
      if (person.delay > 0) {
        person.delay -= delta;
        continue;
      }
      person.rig.root.setEnabled(true);
      const target = person.route[person.waypoint];
      if (!target) {
        person.rig.gesture('idle');
        continue;
      }
      const direction = new Vector3(target.x, target.y, target.z).subtract(
        person.rig.root.position,
      );
      direction.y = 0;
      const distance = direction.length();
      if (distance < 0.3) {
        person.waypoint++;
        continue;
      }
      direction.scaleInPlace(1 / distance);
      person.rig.root.position.addInPlace(direction.scale(Math.min(distance, delta * 2.35)));
      person.rig.root.rotation.y = Math.atan2(direction.x, direction.z);
      person.rig.gesture('walk');
    }
  }

  get snapshot() {
    return {
      active: this.active,
      total: this.people.length,
      arrived: this.people.filter((person) => person.waypoint >= person.route.length).length,
    };
  }

  dispose(): void {
    for (const person of this.people) person.rig.dispose();
  }
}
