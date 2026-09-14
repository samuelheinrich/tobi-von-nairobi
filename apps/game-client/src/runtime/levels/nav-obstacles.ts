import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Obstacle } from '@tobi/game-core';

/** The one rule that turns level colliders into ground-navigation blockers.
 * Excluded are the ground plate and purely visual meshes, so police, dancers and bystanders
 * all see exactly the same walkable world.
 */
export function navigationObstacles(colliders: readonly Mesh[]): Obstacle[] {
  return colliders
    .filter(
      (mesh) =>
        mesh.metadata?.navigationObstacle ?? (mesh.name !== 'island-ground' && mesh.isVisible),
    )
    .map((mesh) => {
      mesh.computeWorldMatrix(true);
      const bounds = mesh.getBoundingInfo().boundingBox;
      return {
        minX: bounds.minimumWorld.x,
        maxX: bounds.maximumWorld.x,
        minZ: bounds.minimumWorld.z,
        maxZ: bounds.maximumWorld.z,
      };
    });
}

/** Sight-blocking meshes, matched to the same set the navigation grid treats as solid. */
export function sightBlockers(colliders: readonly Mesh[]): Set<Mesh> {
  return new Set(
    colliders.filter(
      (mesh) =>
        mesh.metadata?.navigationObstacle ?? (mesh.name !== 'island-ground' && mesh.isVisible),
    ),
  );
}
