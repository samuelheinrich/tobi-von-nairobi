#!/usr/bin/env node
/** Removes morph targets from a GLB.
 *
 * Face blendshapes dominate the size of some scanned avatars — one placeholder here carried 26 MiB
 * of them — and nothing in the game drives them. Dropping the targets, the per-mesh weights and any
 * animation channel that animates weights leaves the geometry and the skeleton untouched.
 *
 *   node tools/models/strip-morphs.mjs in.glb out.glb
 *
 * Run `gltf-transform prune` afterwards to drop the accessors this orphans.
 */
import { readGlb, writeGlb } from './glb.mjs';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Aufruf: strip-morphs.mjs <in.glb> <out.glb>');

const { json, bin } = readGlb(input);
let targets = 0;
for (const mesh of json.meshes ?? []) {
  for (const primitive of mesh.primitives ?? []) {
    targets += (primitive.targets ?? []).length;
    delete primitive.targets;
    delete primitive.extras?.targetNames;
  }
  delete mesh.weights;
  delete mesh.extras?.targetNames;
}
for (const node of json.nodes ?? []) delete node.weights;
let channels = 0;
for (const animation of json.animations ?? []) {
  const before = animation.channels.length;
  animation.channels = animation.channels.filter((c) => c.target.path !== 'weights');
  channels += before - animation.channels.length;
}
// An animation whose only channels drove weights has nothing left to do.
json.animations = (json.animations ?? []).filter((a) => a.channels.length);

writeGlb(output, json, bin);
console.log(
  `${targets} Morph-Targets und ${channels} Weight-Kanäle entfernt → ${output}\n` +
    'Danach `gltf-transform prune` ausführen, um die verwaisten Accessors zu löschen.',
);
