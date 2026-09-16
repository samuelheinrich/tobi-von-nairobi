import '@babylonjs/core/Meshes/instancedMesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { HavokWorld } from '../physics/havok-world.js';
import { material } from '../levels/materials.js';
import { sceneKit, sceneSign } from '../levels/scene-kit.js';
import { WorldSectors } from './sectors.js';
import type { WorldSectorDefinition } from '@tobi/contracts';
export function createWorldBuilder(
  scene: Scene,
  world: HavokWorld,
  definitions: readonly WorldSectorDefinition[],
  sky = '#cfddd5',
) {
  const kit = sceneKit(scene, world, sky, {
    fogStart: 260,
    fogEnd: 650,
    shadowMap: 1024,
    ambient: 0.85,
    sun: 0.65,
  });
  const sectors = new WorldSectors(definitions),
    surfaces = new Map<string, ReturnType<typeof material>>(),
    templates = new Map<string, Mesh>();
  const palette = (color: string) => {
    let m = surfaces.get(color);
    if (!m) {
      m = material(scene, 'world-' + color, color);
      surfaces.set(color, m);
    }
    return m;
  };
  function prop(
    sector: string,
    name: string,
    size: readonly [number, number, number],
    at: readonly [number, number, number],
    color: string,
    solid = false,
    shape: 'box' | 'sphere' = 'box',
  ) {
    const key = color + shape;
    let base = templates.get(key);
    if (!base) {
      base =
        shape === 'box'
          ? MeshBuilder.CreateBox('template-' + key, { size: 1 }, scene)
          : MeshBuilder.CreateSphere('template-' + key, { diameter: 1, segments: 6 }, scene);
      base.material = palette(color);
      base.isVisible = false;
      base.isPickable = false;
      templates.set(key, base);
    }
    const mesh = base.createInstance(name);
    mesh.position.set(...at);
    mesh.scaling.set(...size);
    mesh.receiveShadows = true;
    mesh.metadata = { collision: { collision: 'none' }, cameraObstacle: false };
    if (solid) {
      const c = world.addCollider(mesh, { collision: 'box', walkable: true })!;
      c.mesh.metadata.navigationObstacle = false;
      kit.colliders.push(c.mesh);
    }
    sectors.add(sector, mesh);
    return mesh;
  }
  function sign(sector: string, text: string, x: number, y: number, z: number, width = 7) {
    const mesh = sceneSign(scene, text, x, y, z, width, { ink: '#f4e1a0', plate: '#314e46' });
    sectors.add(sector, mesh);
    return mesh;
  }
  return { ...kit, scene, world, sectors, palette, prop, sign };
}
export type WorldBuilder = ReturnType<typeof createWorldBuilder>;
