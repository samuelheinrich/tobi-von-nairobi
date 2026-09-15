import type { Scene } from '@babylonjs/core/scene.js';
import type { Appearance } from './presets.js';
import type { Parts, V3, Finish } from './geometry.js';
import { patch as meshPatch, ribbon } from './face-mesh.js';
import { faceSurface, tint, type FaceProfile } from './face-profile.js';

const patch = (
  scene: Scene,
  parts: Parts,
  name: string,
  rows: number,
  columns: number,
  point: (u: number, v: number) => V3,
  color: string,
  finish: Finish = 'skin',
) => meshPatch(scene, parts, name, rows, columns, point, color, finish, undefined, true);

export function facialFeatures(
  scene: Scene,
  core: Parts,
  micro: Parts,
  a: Appearance,
  p: FaceProfile,
  blink?: Parts,
) {
  const shade = tint(a.skin, '#51372f', 0.19),
    lid = tint(a.skin, '#a36b60', 0.11);
  const style = a.femaleStyle?.makeup;
  const makeup = style
    ? !['natural', 'soft_gloss'].includes(style)
    : a.category === 'cabaret' || a.category === 'dancer';
  const lip = tint(
    a.skin,
    style === 'neon' ? '#a14489' : style === 'berry' ? '#84334c' : makeup ? '#823548' : '#995b57',
    makeup ? 0.65 : 0.27,
  );
  const at = (x: number, y: number, offset = 0.001): V3 => [x, y, faceSurface(x, y, p) + offset];
  for (const side of [-1, 1]) {
    const cx = side * p.eyeSpacing,
      cy = 0.038,
      half = p.eyeWidth / 2;
    const edge = (t: number, upper: boolean): V3 => {
      const x = cx + (t * 2 - 1) * half;
      const arc = Math.sin(t * Math.PI) ** 0.8;
      const y =
        cy +
        (upper ? p.eyeHeight * 0.56 : -p.eyeHeight * 0.42) * arc +
        (t - 0.5) * side * p.eyeTilt;
      return [x, y, faceSurface(x, y, p) + 0.006];
    };
    // An almond patch, rather than an exposed sphere, defines the visible eye aperture.
    patch(
      scene,
      core,
      'sclera',
      6,
      16,
      (u, v) => {
        const lo = edge(u, false),
          hi = edge(u, true);
        return [
          lo[0],
          lo[1] + (hi[1] - lo[1]) * v,
          faceSurface(lo[0], lo[1] + (hi[1] - lo[1]) * v, p) +
            0.006 +
            Math.sin(v * Math.PI) * Math.sin(u * Math.PI) * 0.002,
        ];
      },
      '#e6ded2',
      'eye',
    );
    if (blink)
      patch(
        scene,
        blink,
        'blink-lid',
        4,
        16,
        (u, v) => {
          const lo = edge(u, false),
            hi = edge(u, true),
            y = lo[1] + (hi[1] - lo[1]) * v;
          return [lo[0], y - 0.038, faceSurface(lo[0], y, p) + 0.014];
        },
        a.skin,
      );
    const irisRadius = p.eyeHeight * 0.41;
    for (const [name, radius, color, z] of [
      ['iris', irisRadius, a.eye, 0.002],
      ['pupil', irisRadius * 0.43, '#171b1d', 0.0024],
    ] as const)
      patch(
        scene,
        core,
        name,
        4,
        20,
        (u, v) => {
          const angle = u * Math.PI * 2,
            r = radius * v;
          const x = cx + Math.cos(angle) * r,
            y = cy + Math.sin(angle) * r;
          return [x, y, faceSurface(x, y, p) + 0.008 + z - r * r * 0.7];
        },
        color,
        'eye',
      );
    for (const upper of [true, false]) {
      ribbon(
        scene,
        core,
        upper ? 'upper-lid' : 'lower-lid',
        (t) => edge(t, upper),
        (t) => (upper ? 0.0048 : 0.0031) * Math.sin(t * Math.PI) + 0.001,
        0.0027,
        lid,
      );
      // Skin between the eyelid and orbital margin conceals eye edges inside the socket.
      patch(
        scene,
        core,
        'orbital-lid',
        3,
        16,
        (u, v) => {
          const e = edge(u, upper),
            y = e[1] + (upper ? 0.017 : -0.012) * v * Math.sin(u * Math.PI);
          return [e[0], y, e[2] * (1 - v) + faceSurface(e[0], y, p) * v];
        },
        a.skin,
      );
    }
    ribbon(
      scene,
      micro,
      'upper-lid-fold',
      (t) => {
        const e = edge(t, true);
        return at(e[0], e[1] + 0.015, 0.0015);
      },
      (t) => 0.0015 * Math.sin(t * Math.PI),
      0.0008,
      shade,
    );
    const browY = 0.085;
    ribbon(
      scene,
      core,
      'eyebrow',
      (t) => {
        const x = cx + (t * 2 - 1) * (half + 0.009),
          y = browY + Math.sin(t * Math.PI) * p.browArch + (t - 0.5) * side * 0.005;
        return at(x, y, 0.004);
      },
      (t) => p.browWeight * (0.2 + 0.8 * Math.sin(t * Math.PI)),
      0.003,
      a.hairColor,
    );
    if (makeup)
      ribbon(
        scene,
        micro,
        'eyeliner',
        (t) => {
          const e = edge(t, true);
          e[2] += 0.002;
          return e;
        },
        (t) => 0.0017 * Math.sin(t * Math.PI),
        0.0008,
        '#483137',
      );
    if (style && makeup)
      ribbon(
        scene,
        micro,
        'eyeshadow',
        (t) => {
          const e = edge(t, true);
          return at(e[0], e[1] + 0.01, 0.002);
        },
        (t) => 0.003 * Math.sin(t * Math.PI),
        0.001,
        style === 'neon' ? '#697cab' : style === 'smoky' ? '#554652' : '#a67d7d',
      );
    // Warm, shallow nostril crescents under the sculpted alae, never black dots.
    ribbon(
      scene,
      core,
      'nostril',
      (t) => {
        const x = side * (p.noseWidth * 0.47 + (t - 0.5) * 0.019),
          y = -p.noseLength * 0.62 - 0.006 - Math.sin(t * Math.PI) * 0.003;
        return at(x, y, 0.0018);
      },
      (t) => 0.002 * Math.sin(t * Math.PI),
      0.001,
      tint(a.skin, '#4b342e', 0.35),
      'skin',
      8,
    );
    // Ear helix, concha and lobe; coherent colours and curved geometry.
    core.oval(
      'ear-concha',
      [0.054, 0.113, 0.043],
      [side * (p.temple + 0.008), -0.018, -0.009],
      shade,
      'skin',
    );
    core.oval(
      'ear-lobe',
      [0.043, 0.043, 0.035],
      [side * (p.temple + 0.016), -0.067, 0.001],
      a.skin,
      'skin',
    );
    ribbon(
      scene,
      core,
      'ear-helix',
      (t) => {
        const angle = t * Math.PI * 2;
        return [
          side * (p.temple + 0.011 + Math.sin(angle) * 0.023),
          -0.015 + Math.cos(angle) * 0.057,
          0.015 + Math.sin(angle) * 0.002,
        ];
      },
      () => 0.006,
      0.006,
      tint(a.skin, '#c97c6b', 0.075),
      'skin',
      20,
    );
    ribbon(
      scene,
      micro,
      'ear-antihelix',
      (t) => [side * (p.temple + 0.009 + Math.sin(t * Math.PI) * 0.009), -0.043 + t * 0.07, 0.018],
      () => 0.003,
      0.003,
      a.skin,
      'skin',
      8,
    );
    if (p.age !== 'young-adult') {
      ribbon(
        scene,
        micro,
        'under-eye',
        (t) => at(cx + (t * 2 - 1) * half, cy - 0.023 - Math.sin(t * Math.PI) * 0.006, 0.001),
        (t) => 0.0011 * Math.sin(t * Math.PI),
        0.0006,
        shade,
      );
      if (p.age === 'older')
        for (let j = 0; j < 2; j++)
          ribbon(
            scene,
            micro,
            'crows-foot',
            (t) => at(cx + side * (half + t * 0.018), cy - 0.002 - j * 0.008 - t * 0.006, 0.001),
            (t) => 0.001 * (1 - t),
            0.0007,
            shade,
            'skin',
            6,
          );
    }
  }
  // Cupid's bow + full lower lip, tapered continuously into the corners.
  const mouthY = -0.128,
    half = p.mouthWidth / 2;
  const seam = (t: number) => mouthY + Math.cos((t - 0.5) * Math.PI * 2) * 0.0015;
  for (const upper of [true, false])
    patch(
      scene,
      core,
      upper ? 'upper-lip' : 'lower-lip',
      4,
      24,
      (u, v) => {
        const x = (u * 2 - 1) * half,
          taper = Math.sin(u * Math.PI) ** 0.7;
        const cupid = upper ? 0.7 + 0.3 * Math.sin(u * Math.PI * 3) ** 2 : 1;
        const y = seam(u) + (upper ? 1 : -1) * p.lipFullness * taper * cupid * v;
        return [x, y, faceSurface(x, y, p) + 0.002 + Math.sin(v * Math.PI) * 0.004 * taper];
      },
      lip,
      !upper && style && style !== 'natural' ? 'satin' : 'skin',
    );
  ribbon(
    scene,
    core,
    'mouth-seam',
    (t) => at((t * 2 - 1) * half, seam(t), 0.003),
    (t) => 0.0008 * Math.sin(t * Math.PI),
    0.0006,
    tint(lip, '#49342f', 0.12),
  );
  for (const side of [-1, 1])
    ribbon(
      scene,
      micro,
      'philtrum',
      (t) => at(side * 0.008, -0.103 + t * 0.019, 0.001),
      () => 0.001,
      0.0008,
      lid,
      'skin',
      6,
    );
  if (p.age === 'older')
    for (let i = 0; i < 2; i++)
      ribbon(
        scene,
        micro,
        'forehead-crease',
        (t) => at((t * 2 - 1) * 0.1, 0.124 + i * 0.018 + Math.sin(t * Math.PI) * 0.004, 0.001),
        (t) => 0.0008 * Math.sin(t * Math.PI),
        0.0006,
        shade,
        'skin',
        14,
      );
  if (p.freckles)
    for (let i = 0; i < 14; i++) {
      const side = i % 2 ? 1 : -1,
        x = side * (0.043 + (i % 7) * 0.014),
        y = -0.034 - Math.sin(i * 2.4) * 0.018;
      micro.oval(
        'freckle',
        [0.0025 + (i % 3) * 0.001, 0.0025, 0.001],
        at(x, y, 0.001),
        tint(a.skin, '#79452d', 0.26),
        'skin',
      );
    }
  if (p.mole)
    micro.oval(
      'mole',
      [0.004, 0.004, 0.0015],
      at(0.12, -0.097, 0.001),
      tint(a.skin, '#49372d', 0.42),
      'skin',
    );
}
