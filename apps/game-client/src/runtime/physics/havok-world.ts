import { CharacterController } from './character-controller.js';
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent.js';
import '@babylonjs/core/Physics/v2/physicsEngineComponent.js';
import HavokPhysics from '@babylonjs/havok';
import wasmUrl from '@babylonjs/havok/lib/esm/HavokPhysics.wasm?url';
import { CharacterSupportedState } from '@babylonjs/core/Physics/v2/characterController.js';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { createCollider, type ColliderConfig, type ColliderHandle } from './collider-factory.js';
import { CollisionLayer, CollisionMask, type CollisionGroup } from './collision-layers.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Position3 } from '@tobi/contracts';
import { movement } from '@tobi/game-data';

let havok: ReturnType<typeof HavokPhysics> | undefined;

export async function preparePhysics(): Promise<Awaited<ReturnType<typeof HavokPhysics>>> {
  havok ??= HavokPhysics({ locateFile: () => wasmUrl }).catch((error: unknown) => {
    havok = undefined;
    throw error;
  });
  return havok;
}

/** Owns the single physics world. Scene.render must never perform a second simulation step. */
const worlds = new WeakMap<Scene, HavokWorld>();
export function physicsWorld(scene: Scene): HavokWorld | undefined {
  return worlds.get(scene);
}

export class HavokWorld {
  public readonly colliders: ColliderHandle[] = [];
  private readonly registered = new Map<AbstractMesh, ColliderHandle>();
  public constructor(
    private readonly scene: Scene,
    module: Awaited<ReturnType<typeof HavokPhysics>>,
  ) {
    scene.enablePhysics(new Vector3(0, movement.gravity, 0), new HavokPlugin(false, module));
    scene.physicsEnabled = false;
    worlds.set(scene, this);
  }

  public addCollider(mesh: AbstractMesh, config: ColliderConfig): ColliderHandle | null {
    const existing = this.registered.get(mesh);
    if (existing) return existing;
    const handle = createCollider(this.scene, mesh, config);
    if (handle) {
      this.colliders.push(handle);
      this.registered.set(mesh, handle);
      mesh.onDisposeObservable.addOnce(() => this.remove(handle));
    }
    return handle;
  }

  /** Every solid body in the level, as plain numbers.
   *
   * Level geometry is built, never described: it exists only as Babylon meshes inside a running
   * scene, so nothing outside the browser could check it. Railings, open edges, doorway widths
   * and vehicle routes through walls were all unverifiable for that reason.
   *
   * This reads the bodies back out of the finished scene. `tools/levels/capture-geometry.mjs`
   * snapshots it per level and the validator checks the snapshot offline.
   */
  public describeGeometry(): {
    name: string;
    walkable: boolean;
    min: [number, number, number];
    max: [number, number, number];
  }[] {
    const out = [];
    for (const handle of this.colliders) {
      const mesh = handle.source;
      if (!mesh || mesh.isDisposed()) continue;
      mesh.computeWorldMatrix(true);
      const box = mesh.getBoundingInfo().boundingBox;
      const round = (v: { x: number; y: number; z: number }): [number, number, number] => [
        Number(v.x.toFixed(2)),
        Number(v.y.toFixed(2)),
        Number(v.z.toFixed(2)),
      ];
      out.push({
        name: mesh.name,
        walkable: mesh.metadata?.collision?.walkable === true,
        min: round(box.minimumWorld),
        max: round(box.maximumWorld),
      });
    }
    return out;
  }
  public remove(handle: ColliderHandle): void {
    this.registered.delete(handle.source);
    const index = this.colliders.indexOf(handle);
    if (index >= 0) this.colliders.splice(index, 1);
    handle.dispose();
  }
  public addStatic(mesh: Mesh): void {
    this.addCollider(mesh, { collision: 'box', layer: 'WORLD_STATIC' });
  }
  /** GLTF extras.collision or explicit per-mesh sidecars; no name heuristics. */
  public registerAsset(
    meshes: readonly AbstractMesh[],
    configs: Readonly<Record<string, ColliderConfig>> = {},
  ): void {
    for (const mesh of meshes) {
      const extras = mesh.metadata?.gltf?.extras;
      const raw = configs[mesh.name] ?? extras?.collision;
      if (!raw)
        throw new Error(
          `World asset ${mesh.name} needs explicit collision metadata (use none for decoration).`,
        );
      this.addCollider(
        mesh,
        typeof raw === 'string'
          ? {
              collision: raw,
              ...(typeof extras?.walkable === 'boolean' ? { walkable: extras.walkable } : {}),
            }
          : raw,
      );
    }
  }

  public step(delta: number): void {
    // Version-pinned Babylon adapter: the engine interface exposes _step for a custom loop.
    this.scene.getPhysicsEngine()?._step(delta);
  }

  public dispose(): void {
    for (const handle of [...this.colliders]) this.remove(handle);
    worlds.delete(this.scene);
  }
}

export class HavokCharacterMotor {
  private readonly controller: CharacterController;
  public grounded = false;
  public readonly inheritedVelocity = Vector3.Zero();
  public surfaceVelocity = Vector3.Zero();
  private wasSupported = false;
  private readonly gravity = new Vector3(0, movement.gravity, 0);

  public constructor(
    scene: Scene,
    spawn: Position3,
    private readonly height: number = movement.capsuleHeight,
    radius: number = movement.capsuleRadius,
    private readonly layer: CollisionGroup = 'PLAYER',
  ) {
    this.controller = new CharacterController(
      new Vector3(spawn.x, spawn.y, spawn.z),
      {
        capsuleHeight: height,
        capsuleRadius: radius,
      },
      scene,
    );
    this.controller.shape.filterMembershipMask = CollisionLayer[layer];
    this.controller.shape.filterCollideMask = CollisionMask[layer];
    this.controller.maxSlopeCosine = Math.cos(Math.PI / 4);
    this.controller.maxStepHeight = 0.3;
  }

  public support(delta: number): boolean {
    this.grounded =
      this.controller.checkSupport(delta, Vector3.Down()).supportedState ===
      CharacterSupportedState.SUPPORTED;
    return this.grounded;
  }

  public move(velocity: Position3, delta: number): void {
    this.controller.contacts.length = 0;
    const support = this.controller.checkSupport(delta, Vector3.Down());
    const supported = support.supportedState === CharacterSupportedState.SUPPORTED;
    const jumping = supported && velocity.y > 0.1;
    this.surfaceVelocity.copyFrom(support.averageSurfaceVelocity);
    if (supported && !jumping) this.inheritedVelocity.copyFrom(this.surfaceVelocity);
    // Retain contact velocity through takeoff; no parenting and no double accumulation.
    if (jumping) this.inheritedVelocity.copyFrom(this.surfaceVelocity);
    if (!supported && !this.wasSupported) this.surfaceVelocity.setAll(0);
    const desired = new Vector3(velocity.x, velocity.y, velocity.z);
    desired.addInPlace(this.inheritedVelocity);
    this.controller.setVelocity(desired);
    this.wasSupported = supported && !jumping;
    this.controller.integrate(delta, support, this.gravity);
  }

  /** A seated vehicle driver is represented by the vehicle body, not a second overlapping capsule. */
  public setCollisionEnabled(enabled: boolean): void {
    this.controller.shape.filterMembershipMask = enabled ? CollisionLayer[this.layer] : 0;
    this.controller.shape.filterCollideMask = enabled ? CollisionMask[this.layer] : 0;
  }

  public debugContacts(enabled: boolean): void {
    this.controller.debugContacts = enabled;
  }
  public get contacts() {
    return this.controller.contacts;
  }
  public get shape() {
    return this.controller.shape;
  }
  public get feet(): Vector3 {
    return this.position.subtract(new Vector3(0, this.height / 2, 0));
  }
  public get relativeVelocity(): Vector3 {
    return this.velocity.subtract(this.inheritedVelocity);
  }
  public get position(): Vector3 {
    return this.controller.getPosition().clone();
  }
  public get velocity(): Vector3 {
    return this.controller.getVelocity().clone();
  }
  public teleport(position: Position3): void {
    this.inheritedVelocity.setAll(0);
    this.surfaceVelocity.setAll(0);
    this.wasSupported = false;
    this.controller.setPosition(new Vector3(position.x, position.y, position.z));
    this.controller.setVelocity(Vector3.Zero());
  }
  public dispose(): void {
    this.controller.dispose();
  }
}
