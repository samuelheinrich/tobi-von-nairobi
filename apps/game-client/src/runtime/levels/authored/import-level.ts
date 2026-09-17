import type { Scene } from '@babylonjs/core/scene.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Quaternion } from '@babylonjs/core/Maths/math.vector.js';
import { loadWorldAsset } from '../../physics/world-asset.js';
import { physicsWorld } from '../../physics/havok-world.js';
import type { ColliderConfig } from '../../physics/collider-factory.js';

type Triple = [number, number, number];
export interface LevelMarker {
  id: string;
  position: Triple;
  points?: Triple[];
}
export interface AuthoredLevelMetadata {
  schemaVersion: 1;
  levelId: string;
  coordinateSystem: 'babylon-left-handed-y-up';
  renderNodes: string[];
  cutawayNodes: string[];
  doors: LevelMarker[];
  bottleSpawns: LevelMarker[];
  vehicleSpawns: LevelMarker[];
  vehicleRoutes: LevelMarker[];
  roofAccess: LevelMarker[];
  missionTriggers: LevelMarker[];
  playerSpawns: LevelMarker[];
  navigationRoutes: LevelMarker[];
  walkableAreas: { id: string; min: Triple; max: Triple }[];
}
interface AuthoredCollider {
  id: string;
  renderId: string;
  shape: 'box' | 'capsule' | 'convex' | 'mesh';
  position: Triple;
  size: Triple;
  rotation: [number, number, number, number];
  walkable: boolean;
  layer: 'WORLD_STATIC';
  vertices?: number[];
  indices?: number[];
}
function record(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a level metadata object.');
}
function vector(value: unknown, length: number): boolean {
  return Array.isArray(value) && value.length === length && value.every(Number.isFinite);
}
async function json(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Level metadata ${url}: HTTP ${response.status}`);
  return response.json();
}
function header(value: unknown): asserts value is Record<string, unknown> {
  record(value);
  if (
    value.schemaVersion !== 1 ||
    value.coordinateSystem !== 'babylon-left-handed-y-up' ||
    typeof value.levelId !== 'string'
  )
    throw new Error('Unsupported level format/coordinate system.');
}
function metadata(value: unknown): AuthoredLevelMetadata {
  header(value);
  if (!Array.isArray(value.renderNodes) || !value.renderNodes.every((v) => typeof v === 'string'))
    throw new Error('Missing render node manifest.');
  if (!Array.isArray(value.cutawayNodes) || !value.cutawayNodes.every((v) => typeof v === 'string'))
    throw new Error('Invalid cutaway manifest.');
  for (const key of [
    'doors',
    'bottleSpawns',
    'vehicleSpawns',
    'vehicleRoutes',
    'roofAccess',
    'missionTriggers',
    'playerSpawns',
    'navigationRoutes',
  ]) {
    const list = value[key];
    if (!Array.isArray(list)) throw new Error(`Missing marker list: ${key}`);
    for (const marker of list) {
      record(marker);
      if (
        typeof marker.id !== 'string' ||
        !vector(marker.position, 3) ||
        (marker.points !== undefined &&
          (!Array.isArray(marker.points) || !marker.points.every((v) => vector(v, 3))))
      )
        throw new Error(`Invalid marker in ${key}`);
    }
  }
  if (!Array.isArray(value.walkableAreas)) throw new Error('Missing walkable areas.');
  for (const area of value.walkableAreas) {
    record(area);
    if (typeof area.id !== 'string' || !vector(area.min, 3) || !vector(area.max, 3))
      throw new Error('Invalid walkable area.');
  }
  return value as unknown as AuthoredLevelMetadata;
}
function colliders(value: unknown, levelId: string): AuthoredCollider[] {
  header(value);
  if (value.levelId !== levelId || !Array.isArray(value.colliders))
    throw new Error('Wrong collision sidecar.');
  const ids = new Set();
  for (const item of value.colliders) {
    record(item);
    if (
      typeof item.id !== 'string' ||
      ids.has(item.id) ||
      typeof item.renderId !== 'string' ||
      !['box', 'capsule', 'convex', 'mesh'].includes(String(item.shape)) ||
      item.layer !== 'WORLD_STATIC' ||
      typeof item.walkable !== 'boolean' ||
      !vector(item.position, 3) ||
      !vector(item.size, 3) ||
      !vector(item.rotation, 4)
    )
      throw new Error('Invalid/duplicate collider.');
    ids.add(item.id);
    if ((item.size as number[]).some((n) => n <= 0)) throw new Error('Invalid collider size.');
    if (item.shape === 'convex' || item.shape === 'mesh') {
      if (
        !Array.isArray(item.vertices) ||
        !item.vertices.length ||
        item.vertices.length % 3 ||
        !item.vertices.every(Number.isFinite) ||
        !Array.isArray(item.indices) ||
        !item.indices.length ||
        item.indices.length % 3 ||
        !item.indices.every(
          (n) => Number.isInteger(n) && n >= 0 && n < (item.vertices as number[]).length / 3,
        )
      )
        throw new Error('Invalid collision geometry.');
    }
  }
  return value.colliders as AuthoredCollider[];
}

/** GLB carries only visuals. Typed sidecars create the same Havok bodies used by code-built levels.
 * No Blender prefixes or gameplay logic are interpreted at runtime. */
export async function loadAuthoredLevel(scene: Scene, baseUrl: string) {
  if (scene.useRightHandedSystem)
    throw new Error('Authored sidecars require the game left-handed scene.');
  const world = physicsWorld(scene);
  if (!world) throw new Error('Create HavokWorld before importing an authored level.');
  const [rawMetadata, rawCollision] = await Promise.all([
    json(`${baseUrl}.runtime.json`),
    json(`${baseUrl}.collision.json`),
  ]);
  const data = metadata(rawMetadata);
  const definitions = colliders(rawCollision, data.levelId);
  const configs: Record<string, ColliderConfig> = Object.fromEntries(
    data.renderNodes.map((name) => [name, { collision: 'none' as const }]),
  );
  const container = await loadWorldAsset(scene, `${baseUrl}.glb`, configs);
  const proxies: Mesh[] = [];
  try {
    const renderNames = new Set(
      container.meshes.filter((m) => m.getTotalVertices()).map((m) => m.name),
    );
    if (data.renderNodes.some((id) => !renderNames.has(id)))
      throw new Error('GLB does not match render manifest.');
    for (const def of definitions) {
      if (!renderNames.has(def.renderId)) throw new Error(`Orphan collider ${def.id}`);
      let mesh: Mesh;
      if (def.shape === 'box' || def.shape === 'capsule') {
        mesh = MeshBuilder.CreateBox(
          def.id,
          { width: def.size[0], height: def.size[1], depth: def.size[2] },
          scene,
        );
        mesh.position.set(...def.position);
        mesh.rotationQuaternion = Quaternion.FromArray(def.rotation);
      } else {
        mesh = new Mesh(def.id, scene);
        const vertices = new VertexData();
        vertices.positions = def.vertices!;
        vertices.indices = def.indices!;
        vertices.applyToMesh(mesh);
      }
      mesh.metadata = { ...mesh.metadata, renderId: def.renderId };
      proxies.push(mesh);
      mesh.isVisible = false;
      mesh.isPickable = false;
      world.addCollider(mesh, { collision: def.shape, walkable: def.walkable, layer: def.layer });
    }
    return {
      metadata: data,
      container,
      proxies,
      dispose() {
        for (const mesh of proxies) mesh.dispose();
        container.dispose();
      },
    };
  } catch (error) {
    for (const mesh of proxies) mesh.dispose();
    container.dispose();
    throw error;
  }
}
