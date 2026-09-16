import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { WorldBuilder } from './scene-builder.js';
type Flag = 'swiss' | 'baselstab' | 'peace';
const palettes = new WeakMap<Scene, Map<Flag, StandardMaterial>>();
/** Shared small textures drawn locally; no remote images or material per flag. */
function flagMaterial(scene: Scene, type: Flag): StandardMaterial {
  let cache = palettes.get(scene);
  if (!cache) {
    cache = new Map();
    palettes.set(scene, cache);
  }
  const previous = cache.get(type);
  if (previous) return previous;
  const texture = new DynamicTexture(`flag-${type}`, 256, scene, false),
    c = texture.getContext() as CanvasRenderingContext2D;
  c.fillStyle = type === 'swiss' ? '#d92332' : '#fff9e9';
  c.fillRect(0, 0, 256, 256);
  if (type === 'swiss') {
    c.fillStyle = '#ffffff';
    c.fillRect(98, 42, 60, 172);
    c.fillRect(42, 98, 172, 60);
  } else if (type === 'baselstab') {
    // Stylised red Basel-Landschaft crozier, distinct from Arlesheim's municipal wing.
    c.strokeStyle = '#cf263b';
    c.fillStyle = '#cf263b';
    c.lineWidth = 17;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(112, 199);
    c.lineTo(112, 79);
    c.bezierCurveTo(112, 27, 196, 25, 196, 74);
    c.bezierCurveTo(196, 103, 160, 104, 160, 80);
    c.stroke();
    c.beginPath();
    c.moveTo(82, 218);
    c.lineTo(96, 191);
    c.lineTo(128, 191);
    c.lineTo(142, 218);
    c.closePath();
    c.fill();
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI + (i * Math.PI) / 6;
      c.beginPath();
      c.arc(155 + 60 * Math.cos(a), 72 + 60 * Math.sin(a), 6, 0, Math.PI * 2);
      c.fill();
    }
  } else {
    ['#b93f68', '#e29b48', '#e7cf67', '#69a776', '#598ba7', '#8f77a0'].forEach((color, i) => {
      c.fillStyle = color;
      c.fillRect(0, i * 43, 256, 43);
    });
    c.strokeStyle = '#fff9e9';
    c.lineWidth = 12;
    c.beginPath();
    c.arc(128, 128, 78, 0, Math.PI * 2);
    c.moveTo(128, 50);
    c.lineTo(128, 206);
    c.moveTo(128, 128);
    c.lineTo(73, 183);
    c.moveTo(128, 128);
    c.lineTo(183, 183);
    c.stroke();
  }
  texture.update();
  const m = new StandardMaterial(`flag-${type}`, scene);
  m.diffuseTexture = texture;
  m.backFaceCulling = false;
  m.specularColor = Color3.Black();
  m.emissiveColor = new Color3(0.18, 0.18, 0.18);
  cache.set(type, m);
  return m;
}
export function placeFlag(
  b: WorldBuilder,
  sector: string,
  type: Flag,
  x: number,
  z: number,
  height = 5,
) {
  b.prop(sector, 'flagpole', [0.09, height, 0.09], [x, height / 2, z], '#c6c8c1', true);
  const flag = MeshBuilder.CreateGround(
    `flag-${type}`,
    { width: 2, height: 2, subdivisions: 4 },
    b.scene,
  );
  flag.rotation.x = -Math.PI / 2;
  flag.position.set(x + 1, height - 1.15, z);
  flag.material = flagMaterial(b.scene, type);
  flag.metadata = { collision: { collision: 'none' } };
  b.sectors.add(sector, flag);
  return flag;
}
