import { readGlb, summarise } from '../models/glb.mjs';
import {
  boneAliases,
  suggestBoneMap,
} from '../../apps/game-client/src/runtime/character/humanoid/schema.ts';

/** Read-only inspection of uncompressed glTF accessors; fails explicitly for unsupported layouts. */
function accessor(json, bin, id) {
  const a = json.accessors[id],
    v = json.bufferViews[a.bufferView];
  if (!v || a.sparse) throw new Error('Sparse/missing accessor: decode before weight validation.');
  const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const formats = { 5126: [4, 'readFloatLE'], 5123: [2, 'readUInt16LE'], 5121: [1, 'readUInt8'] };
  const [size, read] = formats[a.componentType] ?? [];
  if (!size) throw new Error('Unsupported accessor component type');
  const stride = v.byteStride ?? size * components,
    start = (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
  return Array.from({ length: a.count }, (_, i) =>
    Array.from({ length: components }, (_, j) => {
      const n = bin[read](start + i * stride + j * size);
      return a.normalized ? n / (a.componentType === 5121 ? 255 : 65535) : n;
    }),
  );
}
export function report(file) {
  const { json: d, bin } = readGlb(file);
  const joints = [...new Set((d.skins ?? []).flatMap((s) => s.joints))];
  const names = joints.map((i) => d.nodes[i].name ?? String(i));
  const bones = suggestBoneMap(names);
  let weightedVertices = 0,
    invalidWeights = 0,
    invalidJoints = 0;
  for (const node of d.nodes ?? []) {
    if (node.skin === undefined || node.mesh === undefined) continue;
    for (const p of d.meshes[node.mesh].primitives) {
      if (p.attributes.WEIGHTS_0 === undefined || p.attributes.JOINTS_0 === undefined) {
        invalidWeights++;
        continue;
      }
      const weights = accessor(d, bin, p.attributes.WEIGHTS_0);
      const indices = accessor(d, bin, p.attributes.JOINTS_0);
      weightedVertices += weights.length;
      weights.forEach((w, i) => {
        if (
          w.some((x) => !Number.isFinite(x) || x < 0) ||
          Math.abs(w.reduce((a, b) => a + b, 0) - 1) > 0.02
        )
          invalidWeights++;
        if (indices[i].some((j, k) => w[k] > 0 && j >= d.skins[node.skin].joints.length))
          invalidJoints++;
      });
    }
  }
  const childJoints = new Set(
    joints.flatMap((i) => d.nodes[i].children ?? []).filter((i) => joints.includes(i)),
  );
  return {
    ...summarise(file),
    triangles: (d.meshes ?? [])
      .flatMap((m) => m.primitives)
      .reduce((sum, p) => {
        const count = d.accessors[p.indices ?? p.attributes.POSITION].count,
          mode = p.mode ?? 4;
        return (
          sum +
          (mode === 4
            ? Math.floor(count / 3)
            : mode === 5 || mode === 6
              ? Math.max(0, count - 2)
              : 0)
        );
      }, 0),
    skeletonPresent: joints.length > 0,
    boneCount: joints.length,
    boneNames: names,
    rootBones: joints.filter((i) => !childJoints.has(i)).map((i) => d.nodes[i].name),
    roots: (d.scenes[d.scene ?? 0]?.nodes ?? []).map((i) => d.nodes[i]),
    boneMap: bones,
    missing: Object.keys(boneAliases).filter((k) => !bones[k]),
    skinning: { weightedVertices, invalidWeights, invalidJoints },
    clips: (d.animations ?? []).map((a) => {
      const times = a.samplers.flatMap((s) => {
        const ac = d.accessors[s.input];
        return ac.min && ac.max ? [ac.min[0], ac.max[0]] : accessor(d, bin, s.input).flat();
      });
      const rotationTracks = a.channels.flatMap((channel) => {
        if (channel.target.path !== 'rotation') return [];
        const sampler = a.samplers[channel.sampler],
          values = accessor(d, bin, sampler.output),
          first = values[0],
          last = values.at(-1),
          firstLength = Math.hypot(...first),
          lastLength = Math.hypot(...last),
          dot = Math.min(
            1,
            Math.abs(
              first.reduce((sum, value, index) => sum + value * last[index], 0) /
                Math.max(0.000001, firstLength * lastLength),
            ),
          );
        return [
          {
            node: d.nodes[channel.target.node]?.name ?? String(channel.target.node),
            endpointAngle: 2 * Math.acos(dot),
          },
        ];
      });
      return {
        name: a.name,
        duration: Math.max(...times) - Math.min(...times),
        channels: a.channels.length,
        translationTracks: a.channels.flatMap((channel) => {
          if (channel.target.path !== 'translation') return [];
          const sampler = a.samplers[channel.sampler],
            values = accessor(d, bin, sampler.output),
            first = values[0],
            last = values.at(-1),
            delta = last.map((value, index) => value - first[index]);
          return [
            {
              node: d.nodes[channel.target.node]?.name ?? String(channel.target.node),
              start: first,
              end: last,
              delta,
              horizontal: Math.hypot(delta[0] ?? 0, delta[2] ?? 0),
            },
          ];
        }),
        maximumRotationSeam: rotationTracks.reduce(
          (maximum, track) => Math.max(maximum, track.endpointAngle),
          0,
        ),
        worstRotationSeams: rotationTracks
          .sort((left, right) => right.endpointAngle - left.endpointAngle)
          .slice(0, 5),
      };
    }),
    geometryBounds: (d.meshes ?? []).flatMap((m) =>
      m.primitives.map((p) => {
        const a = d.accessors[p.attributes.POSITION];
        return { mesh: m.name, min: a.min, max: a.max };
      }),
    ),
  };
}
export function run(command) {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node tools/characters/' + command + '.mjs path/to/model.glb');
  const r = report(file);
  const output =
    command === 'generate-bone-map'
      ? r.boneMap
      : command === 'list-animations'
        ? r.clips
        : command === 'validate-humanoid'
          ? {
              missing: r.missing,
              skinning: r.skinning,
              valid:
                r.skeletonPresent &&
                !r.missing.length &&
                r.skinning.weightedVertices > 0 &&
                !r.skinning.invalidWeights &&
                !r.skinning.invalidJoints,
            }
          : r;
  console.log(JSON.stringify(output, null, 2));
  if (command === 'validate-humanoid' && !output.valid) process.exitCode = 1;
}
