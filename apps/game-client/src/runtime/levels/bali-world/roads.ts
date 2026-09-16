import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector.js';
import { baliRoads, baliTerrainHeight } from '@tobi/game-data';
import type { BaliBuilder } from './builder.js';
export function buildRoads(b: BaliBuilder) {
  for (const road of baliRoads)
    for (let i = 1; i < road.points.length; i++) {
      const from = road.points[i - 1]!,
        to = road.points[i]!;
      const a = new Vector3(from[0], baliTerrainHeight(from[0], from[1]) + 0.025, from[1]),
        c = new Vector3(to[0], baliTerrainHeight(to[0], to[1]) + 0.025, to[1]);
      // Subdivided strips follow terrain; primitive collision remains the underlying heightfield.
      const segments = Math.ceil(Vector3.Distance(a, c) / 4);
      for (let j = 0; j < segments; j++) {
        const p = Vector3.Lerp(a, c, j / segments),
          q = Vector3.Lerp(a, c, (j + 1) / segments);
        p.y = baliTerrainHeight(p.x, p.z) + 0.035;
        q.y = baliTerrainHeight(q.x, q.z) + 0.035;
        const mesh = MeshBuilder.CreateBox(
          road.id,
          { width: road.width, height: 0.045, depth: Vector3.Distance(p, q) + 0.15 },
          b.scene,
        );
        mesh.position.copyFrom(p.add(q).scale(0.5));
        const delta = q.subtract(p);
        mesh.rotationQuaternion = Quaternion.FromEulerAngles(
          -Math.atan2(delta.y, Math.hypot(delta.x, delta.z)),
          Math.atan2(delta.x, delta.z),
          0,
        );
        mesh.material = b.palette(road.kind === 'dirt' ? '#a39265' : '#666c65');
        mesh.metadata = { collision: { collision: 'none' } };
        b.sectors.add('roads', mesh);
      }
    }
  for (const [x, z, label] of [
    [-35, -65, 'TOWN / PASAR →'],
    [-60, 29, '← HARBOUR / ISLAND'],
    [25, 102, 'TEMPLE ↑ / SAWAH ←'],
    [80, 186, 'PURA / TEMPLE ↑'],
  ] as const)
    b.sign('roads', label, x, baliTerrainHeight(x, z) + 2.4, z, 9);
}
