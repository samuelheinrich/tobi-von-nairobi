#!/usr/bin/env node
/** Read-only GLB analysis. Outputs NEW JSON only; geometry and originals are never rewritten. */
import { readGlb } from '../models/glb.mjs';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const [input, output, kind = 'prop'] = process.argv.slice(2);
if (
  !input ||
  !output ||
  !['prop', 'furniture', 'building', 'character', 'vehicle'].includes(kind)
) {
  console.error(
    'Usage: node tools/physics/generate-colliders.mjs source.glb NEW-output.json [prop|furniture|building|character|vehicle]',
  );
  process.exit(1);
}
if (resolve(input) === resolve(output)) throw new Error('Source must never be overwritten.');
const { json } = readGlb(input);
const meshes = {};
for (const [nodeIndex, node] of (json.nodes ?? []).entries()) {
  if (node.mesh === undefined) continue;
  const mesh = json.meshes?.[node.mesh];
  if (!mesh) throw new Error(`Node ${nodeIndex}: missing mesh.`);
  for (const [primitiveIndex, primitive] of mesh.primitives.entries()) {
    const bounds = json.accessors[primitive.attributes.POSITION];
    if (!bounds?.min || !bounds?.max)
      throw new Error(`Node ${nodeIndex}: missing POSITION bounds; inspect/decode locally first.`);
    const size = bounds.max.map((v, k) => +Math.max(0.04, v - bounds.min[k]).toFixed(5));
    const position = bounds.min.map((v, k) => +((v + bounds.max[k]) / 2).toFixed(5));
    // Babylon names render meshes after nodes; multi-primitive nodes get suffixes.
    const name =
      (node.name || `node${nodeIndex}`) +
      (mesh.primitives.length > 1 ? `_primitive${primitiveIndex}` : '');
    if (Object.hasOwn(meshes, name))
      throw new Error(`Duplicate runtime name ${name}; rename nodes in an asset copy first.`);
    const config = {
      collision: kind === 'character' ? 'none' : 'box',
      layer: kind === 'vehicle' ? 'VEHICLE' : 'WORLD_STATIC',
      walkable: kind !== 'character',
      ...(kind === 'character' ? {} : { size, position }),
    };
    if (kind === 'character')
      config.note = 'Use the shared character capsule, never bind-pose bounds as a body.';
    if (kind === 'building')
      config.note = 'Box proposal only: author doors/floors as compound parts before integration.';
    if (kind === 'vehicle') config.motion = 'animated';
    meshes[name] = config;
  }
}
writeFileSync(
  output,
  JSON.stringify(
    {
      source: input,
      reviewRequired: true,
      coordinateSpace: 'mesh-local (runtime applies node transforms)',
      meshes,
    },
    null,
    2,
  ) + '\n',
  { flag: 'wx' },
);
console.log(`Created ${output}; ${Object.keys(meshes).length} proposals. Original untouched.`);
