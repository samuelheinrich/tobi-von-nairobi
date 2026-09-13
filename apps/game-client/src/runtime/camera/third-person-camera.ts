import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { prototypeBalance } from '@tobi/game-data';

/** Follow rig with a multi-probe camera clearance test and damped obstacle recovery. */
export class ThirdPersonCamera {
  public readonly camera: FreeCamera;
  public yaw = 0;
  private pitch = 0.34;
  private distance: number = prototypeBalance.cameraDistance;

  public constructor(private readonly scene: Scene) {
    this.camera = new FreeCamera('third-person', new Vector3(0, 4, -25), scene);
    this.camera.minZ = 0.15;
    this.camera.maxZ = 180;
    this.camera.fov = (65 * Math.PI) / 180;
    this.camera.inputs.clear();
  }

  public look(x: number, y: number): void {
    this.yaw += x;
    this.pitch = Math.max(-0.1, Math.min(1.05, this.pitch + y));
  }

  public update(position: Vector3, delta: number, snap = false): void {
    const pivot = position.add(new Vector3(0, 0.65, 0));
    const direction = new Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    let allowed: number = prototypeBalance.cameraDistance;
    // Five parallel probes approximate a camera radius and cover wall edges in this blockout.
    for (const offset of [
      Vector3.Zero(),
      new Vector3(0.25, 0, 0),
      new Vector3(-0.25, 0, 0),
      new Vector3(0, 0.25, 0),
      new Vector3(0, -0.25, 0),
    ]) {
      const hit = this.scene.pickWithRay(
        new Ray(pivot.add(offset), direction, allowed),
        (mesh) => mesh.metadata?.cameraObstacle === true,
      );
      if (hit?.hit) allowed = Math.max(0.15, Math.min(allowed, hit.distance - 0.3));
    }
    this.distance =
      snap || allowed < this.distance
        ? allowed
        : this.distance + (allowed - this.distance) * (1 - Math.exp(-delta * 5));
    const next = pivot.add(direction.scale(this.distance));
    this.camera.position.copyFrom(next);
    this.camera.setTarget(pivot);
  }

  public reset(): void {
    this.yaw = 0;
    this.pitch = 0.34;
    this.distance = prototypeBalance.cameraDistance;
  }
}
