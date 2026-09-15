/* global structuredClone */
/** Build a small retargetable GLB: one chosen clip + bind skeleton + minimal skinned proxy.
 * No original geometry/textures. The proxy preserves the glTF skin for Babylon's importer.
 * Usage: node tools/characters/extract-animation.mjs source.glb output.glb sourceClip actionName */
import { existsSync, linkSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { readGlb, writeGlb } from '../models/glb.mjs';
const [input, output, clipName, action] = process.argv.slice(2);
if (!input || !output || !clipName || !action)
  throw new Error('Expected source.glb output.glb sourceClip actionName');
const target = resolve(output);
if (resolve(input) === target || existsSync(target)) throw new Error('Choose a new output file');
const { json: source, bin } = readGlb(input);
const selected = source.animations?.find((a) => a.name === clipName);
if (!selected) throw new Error('Clip not found: ' + clipName);
if (source.skins?.length !== 1) throw new Error('Expected exactly one humanoid skin');
const d = structuredClone(source);
d.animations = [structuredClone(selected)];
d.animations[0].name = action;
d.animations[0].channels = d.animations[0].channels.filter((c) => c.target.path !== 'weights');
delete d.materials;
delete d.images;
delete d.textures;
delete d.samplers;
delete d.extensionsUsed;
delete d.extensionsRequired;
for (const n of d.nodes) {
  delete n.mesh;
  delete n.weights;
  delete n.extensions;
}
// Canonical joint names, so any rig of the same family can use this clip.
//
// A model that went through FBX comes back with numbered joints — `mixamorig:Hips_64`. A clip
// carrying those names only retargets onto the exact model it came from, because the retargeter
// looks its source nodes up by name. Stripping the number makes the clip portable; it is skipped
// when that would make two joints share a name.
const jointIds = new Set(d.skins[0].joints);
const canonical = (name) => (name ?? '').replace(/_\d+$/, '');
const renamed = [...jointIds].map((i) => canonical(d.nodes[i].name));
if (new Set(renamed).size === renamed.length) {
  let changed = 0;
  for (const i of jointIds) {
    const next = canonical(d.nodes[i].name);
    if (next !== d.nodes[i].name) changed++;
    d.nodes[i].name = next;
  }
  if (changed) console.log(`${changed} Gelenknamen auf die kanonische Form gebracht`);
} else {
  console.warn('Gelenknamen bleiben unverändert: kanonische Namen wären nicht eindeutig');
}

const meshNode = d.nodes.find((n) => n.skin === 0);
if (!meshNode) throw new Error('Skin has no mesh node');
for (const n of d.nodes) if (n !== meshNode) delete n.skin;
meshNode.mesh = 0;
const chunks = [],
  views = [],
  accessors = [],
  map = new Map();
let length = 0;
function append(bytes, accessor) {
  const padding = (4 - (length % 4)) % 4;
  if (padding) {
    chunks.push(Buffer.alloc(padding));
    length += padding;
  }
  const vi = views.length;
  views.push({ buffer: 0, byteOffset: length, byteLength: bytes.length });
  chunks.push(bytes);
  length += bytes.length;
  const ai = accessors.length;
  accessors.push({ ...accessor, bufferView: vi, byteOffset: 0 });
  return ai;
}
function copy(id) {
  if (map.has(id)) return map.get(id);
  const a = source.accessors[id],
    v = source.bufferViews[a.bufferView];
  if (a.sparse || v.byteStride) throw new Error('Decode sparse/strided animation accessors first');
  const sizes = { 5126: 4, 5123: 2, 5121: 1, 5125: 4, 5122: 2, 5120: 1 };
  const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const start = (v.byteOffset ?? 0) + (a.byteOffset ?? 0),
    size = a.count * sizes[a.componentType] * components[a.type];
  const out = append(bin.subarray(start, start + size), a);
  map.set(id, out);
  return out;
}
for (const sampler of d.animations[0].samplers) {
  sampler.input = copy(sampler.input);
  sampler.output = copy(sampler.output);
}
d.skins[0].inverseBindMatrices = copy(d.skins[0].inverseBindMatrices);
function floats(values, type, count, extras = {}) {
  return append(Buffer.from(new Float32Array(values).buffer), {
    componentType: 5126,
    type,
    count,
    ...extras,
  });
}
const position = floats([0, 0, 0, 0.0001, 0, 0, 0, 0.0001, 0], 'VEC3', 3, {
  min: [0, 0, 0],
  max: [0.0001, 0.0001, 0],
});
const weights = floats([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 'VEC4', 3);
const joints = append(Buffer.alloc(24), { componentType: 5123, type: 'VEC4', count: 3 });
d.meshes = [
  {
    name: 'animation-skin-proxy',
    primitives: [{ attributes: { POSITION: position, WEIGHTS_0: weights, JOINTS_0: joints } }],
  },
];
d.accessors = accessors;
d.bufferViews = views;
d.buffers = [{ byteLength: length }];
d.asset.extras = {
  ...d.asset.extras,
  animationSource: input,
  sourceClip: clipName,
  action,
  geometry: 'minimal skin proxy; no source character mesh',
};
mkdirSync(dirname(target), { recursive: true });
const staging = mkdtempSync(join(dirname(target), '.clip-export-'));
try {
  const temp = join(staging, 'animation.glb');
  writeGlb(temp, d, Buffer.concat(chunks));
  linkSync(temp, target);
  console.log(action + ': ' + (length / 1024).toFixed(1) + ' KiB binary data -> ' + output);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
