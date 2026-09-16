import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { CharacterRig } from '../character/modular/rig.js';
import { HavokCharacterMotor, physicsWorld } from './havok-world.js';
import type { ColliderHandle } from './collider-factory.js';
import { findGroundedSpawn, groundedVisualFeet } from './ground-detection.js';

interface Agent {
  rig: CharacterRig;
  seated: boolean;
  motor?: HavokCharacterMotor | undefined;
  proxy?: Mesh | undefined;
  body?: ColliderHandle | undefined;
  last: Vector3;
  identity: number;
  grounded: boolean;
  sitting?: boolean;
}
const populations = new WeakMap<Scene, NpcGrounding>();
/** One bounded near-physics pool. AI supplies desired feet; Havok resolves the actual movement.
 * No limb bodies. Seated occupants use an upper-body capsule clear of their own furniture. */
class NpcGrounding {
  private agents: Agent[] = [];
  public delta: number | null = null;
  constructor(private readonly scene: Scene) {
    scene.onBeforeRenderObservable.add(() => this.update());
    scene.onDisposeObservable.add(() => {
      for (const a of this.agents) this.release(a);
    });
  }
  add(rig: CharacterRig, seated: boolean): void {
    const a: Agent = {
      rig,
      seated,
      last: rig.root.position.clone(),
      identity: -1,
      grounded: false,
    };
    this.agents.push(a);
    rig.root.onDisposeObservable.addOnce(() => {
      this.release(a);
      this.agents = this.agents.filter((entry) => entry !== a);
    });
  }
  private release(a: Agent): void {
    a.motor?.dispose();
    a.motor = undefined;
    if (a.body) physicsWorld(this.scene)?.remove(a.body);
    a.proxy?.dispose();
    a.proxy = undefined;
    a.body = undefined;
  }
  private update(): void {
    const world = physicsWorld(this.scene),
      camera = this.scene.activeCamera;
    if (!world || !camera) return;
    const delta = this.delta ?? Math.min(0.05, this.scene.getEngine().getDeltaTime() / 1000);
    if (delta <= 0) return;
    let count = 0;
    const nearby = this.agents
      .filter((a) => a.rig.root.isEnabled() && a.rig.head.isVisible)
      .sort(
        (a, b) =>
          Vector3.DistanceSquared(a.rig.root.position, camera.globalPosition) -
          Vector3.DistanceSquared(b.rig.root.position, camera.globalPosition),
      );
    const active = new Set(
      nearby
        .filter(
          (a) => Vector3.DistanceSquared(a.rig.root.position, camera.globalPosition) < 35 ** 2,
        )
        .slice(0, 40),
    );
    for (const a of this.agents) {
      const foot = a.rig.root.position;
      const seated = a.seated || a.rig.action === 'sit';
      if (a.identity !== a.rig.appearance.seed || a.sitting !== seated) {
        this.release(a);
        a.identity = a.rig.appearance.seed;
        a.grounded = false;
        a.sitting = seated;
      }
      if (!a.grounded) {
        if (!seated && a.rig.root.isEnabled()) {
          const spawn = findGroundedSpawn(this.scene, foot);
          if (spawn) foot.copyFrom(spawn);
        }
        a.last.copyFrom(foot);
        a.grounded = true;
      }
      if (!active.has(a)) {
        if (a.body) this.release(a);
        continue;
      }
      count++;
      const height = (seated ? 0.9 : 1.75) * Math.max(0.7, a.rig.root.scaling.y);
      if (!a.proxy) {
        a.proxy = MeshBuilder.CreateCapsule(
          'npc-capsule',
          { height, radius: 0.28, tessellation: 8 },
          this.scene,
        );
        a.proxy.isVisible = false;
        a.proxy.isPickable = false;
        const initialCentre = a.rig.seatAnchor
          ? a.rig.seatAnchor.surface.worldPosition.add(new Vector3(0, height / 2, 0))
          : foot.add(
              new Vector3(
                0,
                seated ? (a.rig.seatHeight ?? 0.5) + height / 2 : height / 2,
                0,
              ),
            );
        a.proxy.position.copyFrom(initialCentre);
        a.body = world.addCollider(a.proxy, {
          collision: 'capsule',
          layer: 'NPC',
          motion: 'animated',
          walkable: false,
        })!;
        // NPC query shapes ignore fellow crowd bodies, avoiding crowded door deadlocks.
        if (!seated)
          a.motor = new HavokCharacterMotor(
            this.scene,
            foot.add(new Vector3(0, height / 2, 0)),
            height,
            0.28,
            'NPC',
          );
      }
      if (a.motor && !seated && delta > 0) {
        const desired = foot.subtract(a.last);
        if (desired.length() > 3) a.motor.teleport(foot.add(new Vector3(0, height / 2, 0)));
        else {
          const y = a.motor.support(delta) ? -0.3 : Math.max(-12, a.motor.velocity.y - 18 * delta);
          a.motor.move({ x: desired.x / delta, y, z: desired.z / delta }, delta);
          foot.copyFrom(groundedVisualFeet(this.scene, a.motor.feet, a.motor.grounded));
        }
      }
      a.last.copyFrom(foot);
      const centre = a.rig.seatAnchor
        ? a.rig.seatAnchor.surface.worldPosition.add(new Vector3(0, height / 2, 0))
        : foot.add(
            new Vector3(0, seated ? (a.rig.seatHeight ?? 0.5) + height / 2 : height / 2, 0),
          );
      a.body!.aggregate.body.setTargetTransform(
        centre,
        a.proxy.rotationQuaternion ?? Quaternion.Identity(),
      );
    }
    this.scene.metadata = { ...this.scene.metadata, npcPhysicsCount: count };
  }
}
export function registerNpcGrounding(scene: Scene, rig: CharacterRig, seated: boolean): void {
  let population = populations.get(scene);
  if (!population) {
    population = new NpcGrounding(scene);
    populations.set(scene, population);
  }
  population.add(rig, seated);
}

export function setNpcPhysicsDelta(scene: Scene, delta: number): void {
  const population = populations.get(scene);
  if (population) population.delta = delta;
}
