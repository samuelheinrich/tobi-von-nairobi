/** Minimal GLB reader/writer, enough to inspect a model and drop attributes nothing references.
 *
 * gltf-transform does the heavy lifting; this exists for the two jobs its CLI cannot do:
 * reporting on a file without loading it, and removing the duplicate UV sets Sketchfab exports.
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';

const MAGIC = 0x46546c67;

export function readGlb(path) {
  const buffer = readFileSync(path);
  if (buffer.readUInt32LE(0) !== MAGIC) throw new Error(`${path}: keine GLB-Datei`);
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
  const binStart = 20 + jsonLength;
  const bin =
    buffer.length > binStart + 8
      ? buffer.subarray(binStart + 8, binStart + 8 + buffer.readUInt32LE(binStart))
      : Buffer.alloc(0);
  return { json, bin, bytes: buffer.length };
}

export function writeGlb(path, json, bin) {
  let jsonChunk = Buffer.from(JSON.stringify(json), 'utf8');
  // Both chunks must end on a four-byte boundary: JSON pads with spaces, BIN with zeroes.
  const jsonPad = (4 - (jsonChunk.length % 4)) % 4;
  jsonChunk = Buffer.concat([jsonChunk, Buffer.alloc(jsonPad, 0x20)]);
  const binPad = (4 - (bin.length % 4)) % 4;
  const binChunk = Buffer.concat([bin, Buffer.alloc(binPad)]);
  const total = 12 + 8 + jsonChunk.length + (binChunk.length ? 8 + binChunk.length : 0);
  const out = Buffer.alloc(total);
  out.writeUInt32LE(MAGIC, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsonChunk.length, 12);
  out.write('JSON', 16, 'ascii');
  jsonChunk.copy(out, 20);
  if (binChunk.length) {
    const at = 20 + jsonChunk.length;
    out.writeUInt32LE(binChunk.length, at);
    out.write('BIN\0', at + 4, 'ascii');
    binChunk.copy(out, at + 8);
  }
  writeFileSync(path, out);
  return total;
}

/** Counts what matters for a budget decision without decoding any geometry. */
export function summarise(path) {
  const { json, bytes } = readGlb(path);
  let triangles = 0;
  let vertices = 0;
  let primitives = 0;
  const attributes = new Set();
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      primitives++;
      triangles +=
        prim.indices !== undefined
          ? json.accessors[prim.indices].count / 3
          : json.accessors[prim.attributes.POSITION].count / 3;
      vertices += json.accessors[prim.attributes.POSITION].count;
      for (const key of Object.keys(prim.attributes)) attributes.add(key);
    }
  }
  const images = (json.images ?? []).map((image) => ({
    mime: image.mimeType ?? '?',
    kib:
      image.bufferView !== undefined
        ? Math.round(json.bufferViews[image.bufferView].byteLength / 1024)
        : 0,
  }));
  return {
    path,
    megabytes: bytes / 1048576,
    mtime: statSync(path).mtimeMs,
    triangles: Math.round(triangles),
    vertices,
    primitives,
    meshes: (json.meshes ?? []).length,
    materials: (json.materials ?? []).length,
    images,
    joints: (json.skins ?? []).reduce((sum, skin) => sum + skin.joints.length, 0),
    animations: (json.animations ?? []).map((a) => a.name ?? '?'),
    attributes: [...attributes],
    extensionsRequired: json.extensionsRequired ?? [],
    licence: json.asset?.extras?.license ?? null,
    author: json.asset?.extras?.author ?? null,
  };
}

/** Every texCoord index a material actually samples. */
function usedTexCoords(material) {
  const used = new Set();
  const note = (ref) => {
    if (ref) used.add(ref.texCoord ?? 0);
  };
  const pbr = material?.pbrMetallicRoughness;
  note(pbr?.baseColorTexture);
  note(pbr?.metallicRoughnessTexture);
  note(material?.normalTexture);
  note(material?.occlusionTexture);
  note(material?.emissiveTexture);
  for (const ext of Object.values(material?.extensions ?? {})) {
    for (const value of Object.values(ext ?? {})) {
      if (value && typeof value === 'object' && 'index' in value) note(value);
    }
  }
  if (!used.size) used.add(0);
  return used;
}

/** Drops TEXCOORD_n attributes no material samples. Sketchfab often exports four identical sets.
 *
 * Only the primitive's reference is removed; the orphaned accessors go away with the next
 * `gltf-transform prune`.
 */
export function stripUnusedUVs(inPath, outPath) {
  const { json, bin } = readGlb(inPath);
  let removed = 0;
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      const keep = usedTexCoords(json.materials?.[prim.material]);
      for (const key of Object.keys(prim.attributes)) {
        const match = /^TEXCOORD_(\d+)$/.exec(key);
        if (match && !keep.has(Number(match[1]))) {
          delete prim.attributes[key];
          removed++;
        }
      }
    }
  }
  writeGlb(outPath, json, bin);
  return removed;
}
