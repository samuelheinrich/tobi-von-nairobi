import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';

export type SeatType =
  'chair' | 'bench' | 'sofa' | 'barstool' | 'train' | 'airplane' | 'vehicle' | 'floor';

export interface SeatSurfaceOptions {
  id: string;
  /** Neutral transform at the centre of the top face. Parent it to a coach/vehicle to make it move. */
  parent?: TransformNode;
  position: readonly [number, number, number];
  rotation?: Quaternion;
  width: number;
  depth: number;
  collider?: AbstractMesh;
}

/** Authored top face of a solid piece of furniture. It is separate from render geometry. */
export class SeatSurface {
  readonly node: TransformNode;
  readonly width: number;
  readonly depth: number;
  readonly collider: AbstractMesh | undefined;

  constructor(scene: Scene, options: SeatSurfaceOptions) {
    this.node = new TransformNode(`${options.id}-surface`, scene);
    this.node.parent = options.parent ?? null;
    this.node.position.set(...options.position);
    this.node.rotationQuaternion = options.rotation?.clone() ?? Quaternion.Identity();
    this.width = options.width;
    this.depth = options.depth;
    this.collider = options.collider;
    if (this.collider)
      this.collider.metadata = {
        ...this.collider.metadata,
        sittable: true,
        seatSurface: { id: options.id, width: options.width, depth: options.depth },
      };
  }

  /** Position in surface space. Useful for authoring checks without assumptions about world axes. */
  localPoint(world: Vector3): Vector3 {
    return Vector3.TransformCoordinates(world, this.node.computeWorldMatrix(true).clone().invert());
  }

  get worldPosition(): Vector3 {
    this.node.computeWorldMatrix(true);
    return this.node.getAbsolutePosition().clone();
  }
}

export interface SeatAnchorOptions {
  id: string;
  type: SeatType;
  surface: SeatSurface;
  /** Pelvis target relative to the centre of the seat surface. */
  position: readonly [number, number, number];
  /** Character forward direction relative to the seat surface. */
  yaw: number;
  footTargetLeft?: readonly [number, number, number];
  footTargetRight?: readonly [number, number, number];
}

/** A gameplay seat targets the animated pelvis, never the character/model origin. */
export class SeatAnchor {
  readonly id: string;
  readonly type: SeatType;
  readonly surface: SeatSurface;
  readonly yaw: number;
  readonly node: TransformNode;
  readonly footTargetLeft: TransformNode | undefined;
  readonly footTargetRight: TransformNode | undefined;
  private owner: string | null = null;

  constructor(options: SeatAnchorOptions) {
    this.id = options.id;
    this.type = options.type;
    this.surface = options.surface;
    this.yaw = options.yaw;
    const { surface } = options;
    const scene = surface.node.getScene();
    this.node = new TransformNode(`${this.id}-pelvis`, scene);
    this.node.parent = surface.node;
    this.node.position.set(...options.position);
    this.node.rotationQuaternion = Quaternion.FromEulerAngles(0, options.yaw, 0);
    this.footTargetLeft = this.marker(scene, 'left-foot', options.footTargetLeft);
    this.footTargetRight = this.marker(scene, 'right-foot', options.footTargetRight);
  }

  private marker(
    scene: Scene,
    suffix: string,
    position: readonly [number, number, number] | undefined,
  ): TransformNode | undefined {
    if (!position) return undefined;
    const marker = new TransformNode(`${this.id}-${suffix}`, scene);
    marker.parent = this.surface.node;
    marker.position.set(...position);
    return marker;
  }

  get worldPosition(): Vector3 {
    this.node.computeWorldMatrix(true);
    return this.node.getAbsolutePosition().clone();
  }

  /** Stable ownership prevents two characters from being assigned to the same authored place. */
  get occupiedBy(): string | null {
    return this.owner;
  }

  get occupied(): boolean {
    return this.owner !== null;
  }

  /** Compatibility for old level builders while they migrate to named ownership. */
  set occupied(value: boolean) {
    if (!value) this.owner = null;
    else if (!this.owner) this.owner = '__legacy__';
  }

  claim(characterId: string): boolean {
    if (this.owner && this.owner !== characterId && this.owner !== '__legacy__') return false;
    this.owner = characterId;
    return true;
  }

  release(characterId: string): void {
    if (this.owner === characterId || this.owner === '__legacy__') this.owner = null;
  }

  /**
   * Makes the sampled hips pose meet the authored pelvis target exactly. When `attach` is true the
   * visual mount becomes a child of the anchor, so moving trains and vehicles carry it naturally.
   */
  alignPelvis(visualRoot: TransformNode, hips: TransformNode, attach = true): void {
    if (attach && visualRoot.parent !== this.node) visualRoot.parent = this.node;
    visualRoot.computeWorldMatrix(true);
    hips.computeWorldMatrix(true);
    const correction = this.worldPosition.subtract(hips.getAbsolutePosition());
    visualRoot.setAbsolutePosition(visualRoot.getAbsolutePosition().add(correction));
    visualRoot.computeWorldMatrix(true);
    hips.computeWorldMatrix(true);
  }

  /** Debug-only authoring checks. They report bad data; they never move a character. */
  validate(): string[] {
    const local = this.surface.localPoint(this.worldPosition);
    const warnings: string[] = [];
    if (Math.abs(local.x) > this.surface.width / 2 + 0.02)
      warnings.push(`${this.id}: pelvis target lies outside seat width`);
    if (Math.abs(local.z) > this.surface.depth / 2 + 0.02)
      warnings.push(`${this.id}: pelvis target lies outside seat depth`);
    if (local.y < 0) warnings.push(`${this.id}: pelvis target lies below seat surface`);
    return warnings;
  }

  dispose(): void {
    this.footTargetLeft?.dispose();
    this.footTargetRight?.dispose();
    this.node.dispose();
  }
}
