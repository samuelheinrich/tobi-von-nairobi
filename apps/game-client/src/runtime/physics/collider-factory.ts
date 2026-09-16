import { PhysicsShapeBox, PhysicsShapeContainer } from '@babylonjs/core/Physics/v2/physicsShape.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate.js';
import {
  PhysicsMotionType,
  PhysicsShapeType,
} from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { CollisionLayer, CollisionMask, type CollisionGroup } from './collision-layers.js';

export interface ColliderConfig {
  collision: 'none' | 'box' | 'capsule' | 'convex' | 'mesh';
  layer?: CollisionGroup;
  walkable?: boolean;
  motion?: 'static' | 'animated' | 'dynamic';
  mass?: number;
  friction?: number;
  restitution?: number;
  /** Optional local bounding-box override, useful for GLB sidecar configs. */
  size?: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  mask?: number;
  /** Compound primitive parts in asset-local coordinates; one body, several boxes. */
  parts?: {
    size: [number, number, number];
    position: [number, number, number];
    rotation?: [number, number, number];
  }[];
}
export interface ColliderHandle {
  source: AbstractMesh;
  mesh: Mesh;
  aggregate: PhysicsAggregate;
  config: ColliderConfig;
  dispose(): void;
}

/** Render visibility and pickability never control physical solidity. */
export function createCollider(
  scene: Scene,
  source: AbstractMesh,
  config: ColliderConfig,
): ColliderHandle | null {
  if (!['none', 'box', 'capsule', 'convex', 'mesh'].includes(config.collision))
    throw new Error(`Unknown collision shape for ${source.name}`);
  if (config.layer && !(config.layer in CollisionLayer)) throw new Error('Unknown collision layer');
  for (const value of [
    config.size,
    config.position,
    config.rotation,
    ...(config.parts ?? []).flatMap((p) => [p.size, p.position, p.rotation]),
  ])
    if (value && (value.length !== 3 || value.some((n) => !Number.isFinite(n))))
      throw new Error('Collider transforms require three finite values');
  for (const size of [config.size, ...(config.parts ?? []).map((p) => p.size)])
    if (size?.some((n) => n <= 0)) throw new Error('Collider dimensions must be positive');
  if (config.mass !== undefined && (!Number.isFinite(config.mass) || config.mass <= 0))
    throw new Error('Dynamic mass must be positive');
  if (
    (config.collision === 'mesh' || config.collision === 'convex') &&
    (config.size || config.position || config.rotation)
  )
    throw new Error(
      'Mesh/convex colliders use the authored mesh transform; use primitive overrides for manual size/offsets.',
    );
  if (config.parts?.length && (config.size || config.position || config.rotation))
    throw new Error('Compound transforms belong on the source mesh or individual parts.');
  if (config.collision === 'none') {
    source.metadata = { ...source.metadata, collision: config };
    return null;
  }
  if (config.collision === 'mesh' && config.motion && config.motion !== 'static')
    throw new Error(
      'Triangle-mesh colliders must be static; use primitives or convex for moving objects.',
    );
  if (!(source instanceof Mesh) && ['mesh', 'convex'].includes(config.collision))
    throw new Error('For convex/mesh collision supply the source Mesh, not an instance.');
  source.computeWorldMatrix(true);
  const proxy =
    !(source instanceof Mesh) ||
    !!config.parts?.length ||
    !!config.size ||
    !!config.position ||
    !!config.rotation;
  let mesh: Mesh;
  if (proxy) {
    const bounds = source.getBoundingInfo().boundingBox;
    const size = config.size ? Vector3.FromArray(config.size) : bounds.extendSize.scale(2);
    mesh = MeshBuilder.CreateBox(
      `collider:${source.name}`,
      { width: size.x, height: size.y, depth: size.z },
      scene,
    );
    const scale = new Vector3(),
      rotation = new Quaternion(),
      translation = new Vector3();
    source.getWorldMatrix().decompose(scale, rotation, translation);
    mesh.scaling.copyFrom(scale);
    mesh.rotationQuaternion = rotation.multiply(
      Quaternion.FromEulerAngles(...(config.rotation ?? [0, 0, 0])),
    );
    mesh.position.copyFrom(
      Vector3.TransformCoordinates(
        config.position ? Vector3.FromArray(config.position) : bounds.center,
        source.getWorldMatrix(),
      ),
    );
    if (config.parts?.length) {
      // Compound part coordinates are relative to the asset origin, not its bounding-box centre.
      mesh.bakeTransformIntoVertices(
        Matrix.Translation(bounds.center.x, bounds.center.y, bounds.center.z),
      );
      mesh.position.copyFrom(translation);
    }
    mesh.isVisible = false;
    mesh.isPickable = false;
  } else mesh = source;
  const shape = {
    box: PhysicsShapeType.BOX,
    capsule: PhysicsShapeType.CAPSULE,
    convex: PhysicsShapeType.CONVEX_HULL,
    mesh: PhysicsShapeType.MESH,
  }[config.collision];
  const children: PhysicsShapeBox[] = [];
  let compound: PhysicsShapeContainer | undefined;
  if (config.parts?.length) {
    compound = new PhysicsShapeContainer(scene);
    const scale = new Vector3();
    mesh.computeWorldMatrix(true).decompose(scale);
    for (const part of config.parts) {
      const child = new PhysicsShapeBox(
        Vector3.FromArray(part.position).multiply(scale),
        Quaternion.FromEulerAngles(...(part.rotation ?? [0, 0, 0])),
        Vector3.FromArray(part.size).multiply(scale),
        scene,
      );
      children.push(child);
      compound.addChild(child);
    }
  }
  const aggregate = new PhysicsAggregate(
    mesh,
    compound ?? shape,
    {
      mass: config.motion === 'dynamic' ? (config.mass ?? 1) : 0,
      friction: config.friction ?? 0.6,
      restitution: config.restitution ?? 0,
    },
    scene,
  );
  if (config.motion === 'animated') aggregate.body.setMotionType(PhysicsMotionType.ANIMATED);
  const layer = config.layer ?? 'WORLD_STATIC';
  aggregate.shape.filterMembershipMask = CollisionLayer[layer];
  aggregate.shape.filterCollideMask = config.mask ?? CollisionMask[layer];
  for (const child of children) {
    child.filterMembershipMask = CollisionLayer[layer];
    child.filterCollideMask = config.mask ?? CollisionMask[layer];
  }
  aggregate.shape.isTrigger = layer === 'TRIGGER';
  const resolved = { ...config, layer, walkable: config.walkable ?? true };
  source.metadata = {
    ...source.metadata,
    collision: resolved,
    cameraObstacle: layer === 'WORLD_STATIC' || layer === 'VEHICLE',
  };
  mesh.metadata = { ...mesh.metadata, collision: resolved };
  let disposed = false;
  return {
    source,
    mesh,
    aggregate,
    config: resolved,
    dispose() {
      if (disposed) return;
      disposed = true;
      aggregate.dispose();
      compound?.dispose();
      for (const child of children) child.dispose();
      if (proxy) mesh.dispose();
    },
  };
}
