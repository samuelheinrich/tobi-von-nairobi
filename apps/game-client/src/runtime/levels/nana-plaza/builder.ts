import '@babylonjs/core/Meshes/instancedMesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { HavokWorld } from '../../physics/havok-world.js';
import { sceneKit } from '../scene-kit.js';
import { box, material } from '../materials.js';

/** Level-local mesh/material caches. Physics is always active, visibility affects graphics only. */
export function nanaBuilder(scene: Scene, world: HavokWorld) {
  const kit = sceneKit(scene, world, '#070e20', {
    fogStart: 85,
    fogEnd: 210,
    ambient: 0.7,
    sun: 0.3,
  });
  const materials = new Map<string, StandardMaterial>();
  const prototypes = new Map<string, Mesh>();
  const palette = (color: string, glow = false) => {
    const key = `${color}-${glow}`;
    let surface = materials.get(key);
    if (!surface) {
      surface = material(scene, `nana-${key}`, color);
      if (glow) {
        surface.emissiveColor = Color3.FromHexString(color).scale(0.8);
        surface.disableLighting = true;
      }
      materials.set(key, surface);
    }
    return surface;
  };
  const solid = (
    name: string,
    size: [number, number, number],
    at: [number, number, number],
    color = '#534650',
    groundObstacle = true,
  ) => {
    const mesh = kit.solid(box(scene, name, size, at, palette(color)));
    mesh.metadata.navigationObstacle = groundObstacle;
    return mesh;
  };
  const prop = (
    name: string,
    size: [number, number, number],
    at: [number, number, number],
    color = '#534650',
    glow = false,
  ) => {
    const key = `${color}-${glow}`;
    let source = prototypes.get(key);
    if (!source) {
      source = box(scene, `nana-prototype-${key}`, [1, 1, 1], [0, -200, 0], palette(color, glow));
      source.isVisible = false;
      source.isPickable = false;
      prototypes.set(key, source);
    }
    const mesh = source.createInstance(name);
    mesh.position.set(...at);
    mesh.scaling.set(...size);
    mesh.isPickable = false;
    mesh.metadata = { collision: { collision: 'none', reason: 'decoration' } };
    return mesh;
  };
  const massive = (...args: Parameters<typeof prop>) => {
    const mesh = prop(...args);
    const handle = world.addCollider(mesh, { collision: 'box', walkable: true })!;
    handle.mesh.metadata.navigationObstacle = args[2][1] - args[1][1] / 2 < 1.5;
    collidersForProps.push(handle.mesh);
    return mesh;
  };
  const collidersForProps = kit.colliders;
  // All signs occupy cells of one atlas and share a single material, including repeated signs.
  const texture = new DynamicTexture(
    'nana-sign-atlas',
    { width: 2048, height: 2048 },
    scene,
    false,
  );
  const ctx = texture.getContext() as CanvasRenderingContext2D;
  const signSurface = new StandardMaterial('nana-sign-atlas', scene);
  signSurface.diffuseTexture = texture;
  signSurface.emissiveColor = Color3.White();
  signSurface.disableLighting = true;
  signSurface.backFaceCulling = true;
  const cells = new Map<string, number>();
  const sign = (
    text: string,
    at: [number, number, number],
    width = 6,
    color = '#f96fb9',
    yaw = 0,
  ) => {
    const key = text + color;
    let cell = cells.get(key);
    if (cell === undefined) {
      cell = cells.size;
      if (cell >= 128) throw new Error('Nana sign atlas exhausted');
      cells.set(key, cell);
      const x = (cell % 4) * 512,
        y = Math.floor(cell / 4) * 64;
      ctx.fillStyle = '#100e1d';
      ctx.fillRect(x, y, 512, 64);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 3, y + 3, 506, 58);
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(text, x + 256, y + 43, 490);
    }
    const u = (cell % 4) / 4,
      v = 1 - (Math.floor(cell / 4) + 1) / 32;
    const mesh = MeshBuilder.CreatePlane(`sign-${text}`, { width, height: width / 8 }, scene);
    mesh.setVerticesData('uv', [u, v, u + 0.25, v, u + 0.25, v + 1 / 32, u, v + 1 / 32]);
    mesh.position.set(...at);
    mesh.rotation.y = yaw;
    mesh.material = signSurface;
    mesh.isPickable = false;
    return mesh;
  };
  return {
    ...kit,
    scene,
    world,
    palette,
    solid,
    prop,
    massive,
    sign,
    finish: () => texture.update(),
  };
}
export type NanaBuilder = ReturnType<typeof nanaBuilder>;
