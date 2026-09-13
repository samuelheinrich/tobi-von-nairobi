import '@babylonjs/core/Physics/joinedPhysicsEngineComponent.js';
import '@babylonjs/core/Physics/v2/physicsEngineComponent.js';
import HavokPhysics from '@babylonjs/havok';
import wasmUrl from '@babylonjs/havok/lib/esm/HavokPhysics.wasm?url';
import {
  CharacterSupportedState,
  PhysicsCharacterController,
} from '@babylonjs/core/Physics/v2/characterController.js';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin.js';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate.js';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin.js';
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
export class HavokWorld {
  private readonly bodies: PhysicsAggregate[] = [];
  public constructor(
    private readonly scene: Scene,
    module: Awaited<ReturnType<typeof HavokPhysics>>,
  ) {
    scene.enablePhysics(new Vector3(0, movement.gravity, 0), new HavokPlugin(false, module));
    scene.physicsEnabled = false;
  }

  public addStatic(mesh: Mesh): void {
    mesh.computeWorldMatrix(true);
    this.bodies.push(
      new PhysicsAggregate(
        mesh,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.6, restitution: 0 },
        this.scene,
      ),
    );
    mesh.metadata = { ...mesh.metadata, cameraObstacle: true };
  }

  public step(delta: number): void {
    // Version-pinned Babylon adapter: the engine interface exposes _step for a custom loop.
    this.scene.getPhysicsEngine()?._step(delta);
  }

  public dispose(): void {
    for (const body of this.bodies) body.dispose();
  }
}

export class HavokCharacterMotor {
  private readonly controller: PhysicsCharacterController;
  public grounded = false;
  private readonly gravity = new Vector3(0, movement.gravity, 0);

  public constructor(scene: Scene, spawn: Position3) {
    this.controller = new PhysicsCharacterController(
      new Vector3(spawn.x, spawn.y, spawn.z),
      {
        capsuleHeight: movement.capsuleHeight,
        capsuleRadius: movement.capsuleRadius,
      },
      scene,
    );
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
    const support = this.controller.checkSupport(delta, Vector3.Down());
    this.controller.setVelocity(new Vector3(velocity.x, velocity.y, velocity.z));
    this.controller.integrate(delta, support, this.gravity);
  }

  public get position(): Vector3 {
    return this.controller.getPosition().clone();
  }
  public get velocity(): Vector3 {
    return this.controller.getVelocity().clone();
  }
  public teleport(position: Position3): void {
    this.controller.setPosition(new Vector3(position.x, position.y, position.z));
    this.controller.setVelocity(Vector3.Zero());
  }
  public dispose(): void {
    this.controller.dispose();
  }
}
