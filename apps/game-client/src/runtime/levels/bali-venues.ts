import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { LevelDefinition } from '@tobi/contracts';
import { box, material } from './materials.js';

/** Venue dressing shares the level collision registration used by physics, camera and police. */
export function createBaliVenue(
  scene: Scene,
  level: LevelDefinition,
  solid: (mesh: Mesh) => Mesh,
): void {
  if (level.scenery === 'village') return;
  const wood = material(scene, 'venue-wood', '#815245');
  const pink = material(scene, 'venue-coral', '#f4798a');
  const teal = material(scene, 'venue-teal', '#41bdb6');
  const gold = material(scene, 'venue-gold', '#ffe9a0');
  gold.emissiveColor = Color3.FromHexString('#bfa057');
  const sign = (text: string, x: number, y: number, z: number, color: string): void => {
    const texture = new DynamicTexture(
      `venue-sign-${text}`,
      { width: 512, height: 128 },
      scene,
      false,
    );
    texture.drawText(text, null, 83, 'bold 45px sans-serif', color, '#233d48', true);
    const surface = new StandardMaterial(`venue-sign-${text}`, scene);
    surface.diffuseTexture = texture;
    surface.emissiveColor = new Color3(0.75, 0.75, 0.75);
    const board = MeshBuilder.CreatePlane('venue-sign', { width: 5, height: 1.25 }, scene);
    board.position.set(x, y, z);
    board.material = surface;
  };
  if (level.scenery === 'beach-bar') {
    solid(box(scene, 'beach-bar-counter', [4, 1.2, 2], [25, 0.6, -27], wood));
    box(scene, 'bar-canopy', [6, 0.3, 4], [25, 3.3, -27], pink);
    for (const x of [22.5, 27.5])
      solid(box(scene, 'bar-pillar', [0.2, 3.2, 0.2], [x, 1.6, -27], wood));
    sign('KARLS BEACH BAR', 25, 2.5, -28.1, '#ffdf95');
    for (const z of [-21, -10, 1]) {
      solid(box(scene, 'bar-table', [1.7, 0.8, 1.7], [28, 0.4, z], teal));
      for (const x of [27, 29]) box(scene, 'bar-stool', [0.6, 0.5, 0.6], [x, 0.25, z - 1.4], wood);
    }
  } else {
    for (const z of [-23, -13, -3, 7]) {
      for (const x of [-5, 6]) {
        solid(box(scene, 'market-stall', [2.5, 1.5, 3.5], [x, 0.75, z], wood));
        box(scene, 'market-canopy', [3.2, 0.25, 4], [x, 2.7, z], x < 0 ? pink : teal);
        for (const offset of [-0.7, 0.7])
          box(scene, 'market-goods', [0.5, 0.35, 2.6], [x + offset, 1.65, z], gold);
      }
    }
    sign('NIGHT MARKET', 0, 4.2, -25, '#79efce');
    sign('KONTO LEER. NACHT VOLL.', 0, 4.2, 10, '#ffb1c3');
    for (const z of [-24, -14, -4, 6, 16]) {
      box(scene, 'lantern-wire', [15, 0.035, 0.035], [1, 4.8, z], wood);
      for (let x = -6; x <= 8; x += 2) {
        const lantern = MeshBuilder.CreateSphere(
          'market-lantern',
          { diameter: 0.36, segments: 6 },
          scene,
        );
        lantern.position.set(x, 4.55, z);
        lantern.material = gold;
      }
    }
  }
}
