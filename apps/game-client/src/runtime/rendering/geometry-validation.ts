import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { Scene } from '@babylonjs/core/scene.js';

export interface SurfaceAuditEntry {
  name: string;
  uniqueId: number;
  topY: number;
  bounds: {
    min: readonly [number, number, number];
    max: readonly [number, number, number];
  };
  material: string | null;
  parent: string | null;
  collider: boolean;
  visibility: number;
}

export interface CoplanarConflict {
  first: SurfaceAuditEntry;
  second: SurfaceAuditEntry;
  yDifference: number;
  overlapArea: number;
}

function entry(mesh: AbstractMesh): SurfaceAuditEntry {
  mesh.computeWorldMatrix(true);
  const box = mesh.getBoundingInfo().boundingBox;
  return {
    name: mesh.name,
    uniqueId: mesh.uniqueId,
    topY: box.maximumWorld.y,
    bounds: {
      min: [box.minimumWorld.x, box.minimumWorld.y, box.minimumWorld.z],
      max: [box.maximumWorld.x, box.maximumWorld.y, box.maximumWorld.z],
    },
    material: mesh.material?.name ?? null,
    parent: mesh.parent?.name ?? null,
    collider: !!mesh.metadata?.collision,
    visibility: mesh.visibility,
  };
}

/** Finds broad coplanar horizontal surfaces. It reports geometry; it never hides or offsets it. */
export function auditCoplanarSurfaces(scene: Scene, tolerance = 0.0015): CoplanarConflict[] {
  const surfaces = scene.meshes
    .filter((mesh) => {
      const collision = mesh.metadata?.collision as
        { collision?: string; walkable?: boolean } | undefined;
      const authoredSurface =
        /(?:floor|ground|road|asphalt|sidewalk|platform|stage|tile|deck|runway|apron|landing|terrace|pavement)/i.test(
          mesh.name,
        );
      return (
        mesh.isEnabled() &&
        mesh.isVisible &&
        mesh.visibility > 0.001 &&
        mesh.getTotalVertices() > 0 &&
        (authoredSurface ||
          (collision?.collision !== undefined &&
            collision.collision !== 'none' &&
            collision.walkable !== false))
      );
    })
    .map(entry)
    .filter((surface) => {
      const width = surface.bounds.max[0] - surface.bounds.min[0];
      const height = surface.bounds.max[1] - surface.bounds.min[1];
      const depth = surface.bounds.max[2] - surface.bounds.min[2];
      return width > 0.5 && depth > 0.5 && height <= 1.2;
    });
  const conflicts: CoplanarConflict[] = [];
  for (let i = 0; i < surfaces.length; i++) {
    const first = surfaces[i]!;
    for (let j = i + 1; j < surfaces.length; j++) {
      const second = surfaces[j]!;
      const yDifference = Math.abs(first.topY - second.topY);
      if (yDifference > tolerance) continue;
      const overlapX =
        Math.min(first.bounds.max[0], second.bounds.max[0]) -
        Math.max(first.bounds.min[0], second.bounds.min[0]);
      const overlapZ =
        Math.min(first.bounds.max[2], second.bounds.max[2]) -
        Math.max(first.bounds.min[2], second.bounds.min[2]);
      if (overlapX <= 0.05 || overlapZ <= 0.05) continue;
      conflicts.push({ first, second, yDifference, overlapArea: overlapX * overlapZ });
    }
  }
  return conflicts.sort((a, b) => b.overlapArea - a.overlapArea);
}

/** Updates the developer inspection payload after level construction or async asset loading. */
export function updateGeometryAudit(scene: Scene): CoplanarConflict[] {
  const conflicts = auditCoplanarSurfaces(scene);
  scene.metadata = { ...scene.metadata, coplanarConflicts: conflicts };
  return conflicts;
}
