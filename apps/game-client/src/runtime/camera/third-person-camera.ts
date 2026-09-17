import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { prototypeBalance } from '@tobi/game-data';
import type { VehicleKind } from '@tobi/contracts';

export type CameraMode = 'follow' | 'railway' | 'interior' | 'cell';

/** Per-mode orbit envelope. Yaw is never clamped: every rig turns the full circle around Tobi,
 * which is what makes the narrow WG corridors and the train aisle readable from both ends.
 */
const profiles: Record<CameraMode, { distance: number; pitch: number; min: number; max: number }> =
  {
    follow: { distance: prototypeBalance.cameraDistance, pitch: 0.34, min: -0.35, max: 1.15 },
    railway: { distance: 8, pitch: 0.9, min: 0.05, max: 1.25 },
    interior: { distance: 6, pitch: 0.95, min: 0.3, max: 1.25 },
    // A five by seven metre room with a ceiling: anything further out ends up inside a wall.
    cell: { distance: 3.2, pitch: 0.32, min: -0.1, max: 0.9 },
  };

/** Follow rig with a multi-probe camera clearance test and damped obstacle recovery. */
export class ThirdPersonCamera {
  public readonly camera: FreeCamera;
  public yaw = 0;
  private currentPitch: number;
  private distance: number;
  private vehicleDistance: number | null = null;
  private vehicleKind: VehicleKind | 'aircraft' | null = null;
  public setVehicle(kind: VehicleKind | 'aircraft' | null): void {
    if (kind !== this.vehicleKind) {
      if (kind === 'aircraft') this.currentPitch = 0.32;
      else if (this.vehicleKind === 'aircraft') this.currentPitch = this.profile.pitch;
      this.vehicleKind = kind;
    }
    this.vehicleDistance =
      kind === 'aircraft'
        ? 78
        : kind === 'boat'
          ? 11
          : kind === 'tuk-tuk'
            ? 10
            : kind === 'scooter'
              ? 8
              : null;
  }
  private mode: CameraMode;
  private profile: (typeof profiles)[CameraMode];

  public constructor(
    private readonly scene: Scene,
    mode: CameraMode = 'follow',
  ) {
    this.mode = mode;
    this.profile = profiles[mode];
    this.currentPitch = this.profile.pitch;
    this.distance = this.profile.distance;
    this.camera = new FreeCamera('third-person', new Vector3(0, 4, -25), scene);
    this.camera.minZ = 0.15;
    this.camera.maxZ = 900;
    this.camera.fov = (65 * Math.PI) / 180;
    this.camera.inputs.clear();
  }

  public setMode(mode: CameraMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.profile = profiles[mode];
    this.currentPitch = this.profile.pitch;
  }
  public get pitch(): number {
    return this.currentPitch;
  }

  public look(x: number, y: number): void {
    // Full 360° orbit; wrapping keeps the accumulated yaw numerically small over a long run.
    this.yaw = (this.yaw + x) % (Math.PI * 2);
    this.currentPitch = Math.max(
      this.profile.min,
      Math.min(this.profile.max, this.currentPitch + y),
    );
  }

  public update(position: Vector3, delta: number, snap = false): void {
    const pivot = position.add(new Vector3(0, 0.65, 0));
    const direction = new Vector3(
      -Math.sin(this.yaw) * Math.cos(this.currentPitch),
      Math.sin(this.currentPitch),
      -Math.cos(this.yaw) * Math.cos(this.currentPitch),
    );
    let allowed: number = this.vehicleDistance ?? this.profile.distance;
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
    this.currentPitch = this.profile.pitch;
    this.distance = this.profile.distance;
  }
}
