import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { box, material } from './materials.js';

export interface NpcPalette {
  skin: StandardMaterial;
  top: StandardMaterial;
  bottom: StandardMaterial;
  hair: StandardMaterial;
}

export interface NpcRig {
  root: TransformNode;
  head: Mesh;
  arms: TransformNode[];
  legs: TransformNode[];
}

/** Reusable palette so a level builds dozens of extras from a handful of materials. */
export function npcPalette(scene: Scene, index: number, neon = false): NpcPalette {
  const skins = ['#c1855c', '#e6b78f', '#9c6844', '#f0c9a4'];
  const tops = neon
    ? ['#ff5fc0', '#4ff0ff', '#ffd24f', '#c07dff']
    : ['#4fc6aa', '#b28ace', '#ef7a8c', '#f0c24a', '#6f9bd8', '#8ecb6a'];
  const bottoms = ['#355265', '#5b4a63', '#2f4a42', '#6a4530'];
  const hairs = ['#221812', '#3f2a1c', '#5c4632', '#0f0c0a'];
  return {
    skin: material(scene, `npc-skin-${index % skins.length}`, skins[index % skins.length]!),
    top: material(scene, `npc-top-${index % tops.length}`, tops[index % tops.length]!),
    bottom: material(
      scene,
      `npc-bottom-${index % bottoms.length}`,
      bottoms[index % bottoms.length]!,
    ),
    hair: material(scene, `npc-hair-${index % hairs.length}`, hairs[index % hairs.length]!),
  };
}

/** One articulated low-poly extra. `seated` folds the hips and shortens the stance for benches. */
export function createNpc(
  scene: Scene,
  name: string,
  palette: NpcPalette,
  shadows: ShadowGenerator | null,
  seated = false,
): NpcRig {
  const root = new TransformNode(name, scene);
  const hip = seated ? 0.5 : 0.72;
  const part = (
    label: string,
    size: [number, number, number],
    position: [number, number, number],
    surface: StandardMaterial,
    parent: TransformNode = root,
  ): Mesh => {
    const mesh = box(scene, `${name}-${label}`, size, position, surface);
    mesh.parent = parent;
    mesh.isPickable = false;
    shadows?.addShadowCaster(mesh);
    return mesh;
  };
  part('torso', [0.56, 0.78, 0.36], [0, hip + 0.39, 0], palette.top);
  const head = part('head', [0.4, 0.44, 0.4], [0, hip + 1.0, 0], palette.skin);
  part('hair', [0.44, 0.16, 0.44], [0, hip + 1.19, -0.02], palette.hair);
  const arms: TransformNode[] = [];
  const legs: TransformNode[] = [];
  for (const side of [-1, 1]) {
    const shoulder = new TransformNode(`${name}-shoulder`, scene);
    shoulder.parent = root;
    shoulder.position.set(side * 0.4, hip + 0.68, 0);
    part('arm', [0.18, 0.62, 0.22], [0, -0.31, 0], palette.skin, shoulder);
    arms.push(shoulder);
    const knee = new TransformNode(`${name}-hip`, scene);
    knee.parent = root;
    knee.position.set(side * 0.16, hip, 0);
    part('leg', [0.22, 0.66, 0.26], [0, -0.33, seated ? 0.2 : 0], palette.bottom, knee);
    if (seated) knee.rotation.x = -1.35;
    legs.push(knee);
  }
  return { root, head, arms, legs };
}
