import { PhysicsShapeCapsule } from '@babylonjs/core/Physics/v2/physicsShape.js';
import type { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin.js';
import { ProximityCastResult } from '@babylonjs/core/Physics/proximityCastResult.js';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Position3 } from '@tobi/contracts';
import { CollisionLayer, groundMask } from './collision-layers.js';

/** Probe starts near the authored feet, never above the next storey. */
export function groundBelow(scene: Scene, feet: Position3, rise = 0.3, drop = 1.2) {
  const engine = scene.getPhysicsEngine();
  if (!engine || engine.getPluginVersion() !== 2) return null;
  const hit = engine.raycast(
    new Vector3(feet.x, feet.y + rise, feet.z),
    new Vector3(feet.x, feet.y - drop, feet.z),
    {
      membership: CollisionLayer.NPC,
      collideWith: groundMask,
      shouldHitTriggers: false,
    },
  );
  if (
    !hit.hasHit ||
    hit.hitNormalWorld.y < Math.cos(Math.PI / 4) ||
    hit.body?.transformNode.metadata?.collision?.walkable === false
  )
    return null;
  return hit;
}
/** Mutates a FOOT position, never a model-centre or seated pelvis position. */
export function snapCharacterToGround(
  scene: Scene,
  feet: Vector3,
  rise = 0.3,
  drop = 1.2,
): boolean {
  const ground = groundBelow(scene, feet, rise, drop);
  if (!ground) return false;
  feet.y = ground.hitPointWorld.y + 0.015;
  return true;
}

/** Cheap crowd path check for far/ambient agents. Near agents additionally use capsule casts.
 * Three height bands and side rays keep shoulders clear of furniture; no floor-Y constants. */
export function crowdMove(scene: Scene, from: Vector3, desired: Vector3, radius = 0.28): Vector3 {
  const engine = scene.getPhysicsEngine();
  if (!engine || engine.getPluginVersion() !== 2) return from.clone();
  const delta = desired.subtract(from),
    distance = Math.hypot(delta.x, delta.z);
  if (distance < 0.001) return from.clone();
  const forward = new Vector3(delta.x / distance, 0, delta.z / distance),
    side = new Vector3(forward.z, 0, -forward.x);
  for (const height of [0.35, 0.9, 1.55])
    for (const offset of [-radius, 0, radius]) {
      const a = from.add(side.scale(offset)).add(new Vector3(0, height, 0));
      const b = a.add(forward.scale(distance + radius));
      const hit = engine.raycast(a, b, {
        membership: CollisionLayer.NPC,
        collideWith: groundMask,
        shouldHitTriggers: false,
      });
      if (hit.hasHit) return from.clone();
    }
  const next = desired.clone();
  return snapCharacterToGround(scene, next, 0.3, 0.6) ? next : from.clone();
}

const spawnShapes = new WeakMap<Scene, Map<string, PhysicsShapeCapsule>>();
function spawnShape(scene: Scene, height: number, radius: number): PhysicsShapeCapsule {
  let shapes = spawnShapes.get(scene);
  if (!shapes) {
    shapes = new Map();
    spawnShapes.set(scene, shapes);
    const owned = shapes;
    scene.onDisposeObservable.addOnce(() => {
      for (const shape of owned.values()) shape.dispose();
    });
  }
  const key = height + ':' + radius;
  let shape = shapes.get(key);
  if (!shape) {
    shape = new PhysicsShapeCapsule(
      new Vector3(0, radius + 0.03, 0),
      new Vector3(0, height - radius, 0),
      radius,
      scene,
    );
    shape.filterMembershipMask = CollisionLayer.NPC;
    shape.filterCollideMask = groundMask;
    shapes.set(key, shape);
  }
  return shape;
}
/** Reject solid volumes intersecting a standing capsule, then search a small same-floor ring.
 * Used once at spawn/pool reassignment, not for per-frame navigation. */
export function findGroundedSpawn(
  scene: Scene,
  foot: Vector3,
  height = 1.8,
  radius = 0.3,
): Vector3 | null {
  const candidates = [foot.clone()];
  for (const distance of [0.6, 1.2, 1.8])
    for (let i = 0; i < 8; i++)
      candidates.push(
        foot.add(
          new Vector3(
            Math.sin((i * Math.PI) / 4) * distance,
            0,
            Math.cos((i * Math.PI) / 4) * distance,
          ),
        ),
      );
  for (const candidate of candidates) {
    if (!snapCharacterToGround(scene, candidate, 0.16, 0.6)) continue;
    const engine = scene.getPhysicsEngine();
    if (!engine || engine.getPluginVersion() !== 2) continue;
    const shape = spawnShape(scene, height, radius),
      input = new ProximityCastResult(),
      hit = new ProximityCastResult();
    (engine.getPhysicsPlugin() as HavokPlugin).shapeProximity(
      {
        shape,
        position: candidate,
        rotation: Quaternion.Identity(),
        maxDistance: 0,
        shouldHitTriggers: false,
      },
      input,
      hit,
    );
    const blocked = hit.hasHit && hit.hitDistance < -0.025;
    if (!blocked) return candidate;
  }
  return null;
}

/** Render feet remove the solver's contact skin only while supported. The capsule is unchanged. */
export function groundedVisualFeet(scene: Scene, capsuleFeet: Vector3, grounded: boolean): Vector3 {
  const result = capsuleFeet.clone();
  if (grounded) {
    const hit = groundBelow(scene, capsuleFeet, 0.04, 0.22);
    if (hit) result.y = hit.hitPointWorld.y + 0.01;
  }
  return result;
}
