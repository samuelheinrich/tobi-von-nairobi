import { arlesheimBuildings } from '@tobi/game-data';
import type { WorldBuilder } from '../../world/scene-builder.js';
import { buildBuilding } from '../../world/buildings.js';
/** Swiss village dressing is separate from reusable door/roof/furniture collision. */
export function neighbourhoodHouses(b: WorldBuilder) {
  return arlesheimBuildings.map((d, i) => {
    const sector = d.position.z > 10 ? 'village' : 'neighbourhood',
      result = buildBuilding(b, d, sector);
    const { x, z } = d.position,
      h = d.height,
      w = d.width,
      depth = d.depth;
    const roofs: ReturnType<WorldBuilder['prop']>[] = [];
    if (!d.roofWalkable) {
      for (const side of [-1, 1]) {
        const roof = b.prop(
          sector,
          d.id + '-tile-roof',
          [Math.hypot(w / 2 + 0.7, 2), 0.22, depth + 1.2],
          [x + side * (w / 4 + 0.35), h + 1.18, z],
          i % 2 ? '#945546' : '#b07555',
        );
        // Render slope and collider use the same final transform.
        roof.rotation.z = -side * Math.atan2(2, w / 2 + 0.7);
        const collider = b.world.addCollider(roof, { collision: 'box', walkable: true })!;
        b.colliders.push(collider.mesh);
        roofs.push(roof);
      }
    }
    for (const side of [-1, 1]) {
      const wx = x + side * 3.8;
      b.prop(sector, 'window-frame', [2.1, 1.5, 0.12], [wx, 2.05, z - depth / 2 - 0.16], '#f5efdb');
      b.prop(
        sector,
        'window-glass',
        [1.75, 1.2, 0.14],
        [wx, 2.05, z - depth / 2 - 0.24],
        '#536c70',
      );
      for (const offset of [-1.2, 1.2])
        b.prop(
          sector,
          'wooden-shutter',
          [0.48, 1.55, 0.16],
          [wx + offset, 2.05, z - depth / 2 - 0.22],
          i % 2 ? '#647764' : '#824c40',
        );
      b.prop(
        sector,
        'window-mullion',
        [0.07, 1.25, 0.17],
        [wx, 2.05, z - depth / 2 - 0.32],
        '#e5dccc',
      );
      b.prop(
        sector,
        'flower-box',
        [2, 0.25, 0.5],
        [wx, 1.2, z - depth / 2 - 0.35],
        '#76583e',
        true,
      );
      for (let j = 0; j < 5; j++)
        b.prop(
          sector,
          'geranium',
          [0.24, 0.3, 0.24],
          [wx - 0.7 + j * 0.35, 1.47, z - depth / 2 - 0.35],
          j % 2 ? '#bd596d' : '#e9bda9',
          false,
          'sphere',
        );
    }
    b.prop(sector, 'chimney', [0.9, 2.3, 0.9], [x + 3, h + 1.8, z + 2], '#aea293', true);
    b.prop(
      sector,
      'letterbox',
      [0.65, 0.8, 0.42],
      [x + w / 2 + 1.4, 0.75, z - depth / 2 - 1],
      '#767b76',
      true,
    );
    return {
      ...result,
      focus(px: number, py: number, pz: number) {
        result.focus(px, py, pz);
        for (const roof of roofs) roof.isVisible = !(result.contains(px, pz) && py < h);
      },
    };
  });
}
