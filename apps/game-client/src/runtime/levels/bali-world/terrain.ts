import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { baliTerrainHeight, baliSeaLevel } from '@tobi/game-data';
import type { BaliBuilder } from './builder.js';
/** Coarse shared collision heightfield, coloured coastal bands and submerged edges. */
export function buildTerrain(b: BaliBuilder) {
  const positions: number[] = [],
    indices: number[] = [],
    colors: number[] = [],
    normals: number[] = [];
  const minX = -300,
    minZ = -200,
    nx = 68,
    nz = 65,
    step = 8;
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const x = minX + i * step,
        z = minZ + j * step,
        y = baliTerrainHeight(x, z);
      positions.push(x, y, z);
      const sand = x < -35 || y < 0;
      const shade = 0.96 + Math.sin(x * 0.7 + z) * 0.04;
      colors.push(
        (sand ? 0.82 : 0.32) * shade,
        (sand ? 0.73 : 0.49) * shade,
        (sand ? 0.51 : 0.27) * shade,
        1,
      );
    }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      indices.push(a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1);
    }
  VertexData.ComputeNormals(positions, indices, normals);
  const mesh = new Mesh('bali-coastal-heightfield', b.scene),
    data = new VertexData();
  Object.assign(data, { positions, indices, normals, colors });
  data.applyToMesh(mesh);
  mesh.material = b.palette('#ffffff');
  mesh.receiveShadows = true;
  b.world.addCollider(mesh, { collision: 'mesh', walkable: true });
  mesh.metadata.navigationObstacle = false;
  b.colliders.push(mesh);
  const sea = b.prop('roads', 'bali-ocean', [1900, 0.15, 1900], [-50, baliSeaLevel, 20], '#248d9e');
  // Ocean is background and must remain visible even when its sector is distant.
  const waves = Array.from({ length: 24 }, (_, i) =>
    b.prop(
      'beach',
      'wave-foam',
      [15 + (i % 3) * 7, 0.03, 0.45],
      [-104 + (i % 4) * 9, -0.48, -115 + Math.floor(i / 4) * 18],
      '#bce4d6',
    ),
  );
  const backgrounds: ReturnType<BaliBuilder['prop']>[] = [];
  for (const [id, x, z, w, h, d] of [
    ['island_2', -350, 220, 110, 46, 95],
    ['island_3', 240, -220, 140, 50, 90],
    ['jungle', 135, 280, 120, 65, 75],
  ] as const)
    backgrounds.push(b.prop(id, 'distant-land', [w, h, d], [x, -6, z], '#597963', false, 'sphere'));
  return (time: number) => {
    sea.setEnabled(true);
    for (const land of backgrounds) land.setEnabled(true);
    for (const [i, wave] of waves.entries()) {
      wave.position.y = -0.45 + Math.sin(time * 1.7 + i) * 0.07;
      wave.position.x += Math.sin(time + i) * 0.003;
    }
  };
}
