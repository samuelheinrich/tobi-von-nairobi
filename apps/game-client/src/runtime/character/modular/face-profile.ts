import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Appearance } from './presets.js';

export const faceShapes = ['oval', 'round', 'narrow', 'square', 'heart', 'broad', 'long'] as const;
export type FaceAge = 'young-adult' | 'adult' | 'older';
/** Independent dimensions, deliberately not coupled to skin colour or gender. All cast members are adults. */
const shapes = [
  [0.19, 0.165, 0.09, 0.245, 0.095],
  [0.212, 0.19, 0.112, 0.229, 0.098],
  [0.169, 0.14, 0.074, 0.254, 0.081],
  [0.203, 0.195, 0.124, 0.24, 0.098],
  [0.199, 0.146, 0.067, 0.247, 0.091],
  [0.222, 0.202, 0.11, 0.235, 0.109],
  [0.181, 0.155, 0.085, 0.282, 0.086],
] as const;
export function faceProfile(a: Appearance) {
  const n = a.seed,
    shape = shapes[a.face % shapes.length]!;
  const random = (salt: number) => {
    const value = Math.sin((n + 1) * 127.1 + salt * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const age: FaceAge =
    a.faceAge ?? (a.mature ? 'older' : random(11) < 0.35 ? 'young-adult' : 'adult');
  return {
    name: faceShapes[a.face % faceShapes.length]!,
    age,
    temple: shape[0],
    jaw: shape[1],
    chin: shape[2],
    crown: shape[3],
    eyeSpacing: shape[4],
    cheek: shape[0] * (1 + random(2) * 0.04),
    noseWidth: 0.026 + random(3) * 0.019,
    noseLength: 0.072 + random(4) * 0.041,
    noseProjection: 0.034 + random(5) * 0.037,
    eyeWidth: 0.067 + random(6) * 0.012,
    eyeHeight: (0.019 + random(7) * 0.01) * (age === 'older' ? 0.85 : 1),
    eyeTilt: (random(8) - 0.3) * 0.012,
    mouthWidth: 0.09 + random(9) * 0.039,
    lipFullness: 0.009 + random(10) * 0.009,
    browArch: random(12) * 0.015,
    browWeight: 0.005 + random(13) * 0.005,
    hairline: age === 'older' ? 0.014 + random(14) * 0.027 : random(14) * 0.015,
    freckles: random(15) < 0.24,
    mole: random(16) < 0.18,
  };
}
export type FaceProfile = ReturnType<typeof faceProfile>;
export const tint = (skin: string, target: string, amount: number) =>
  Color3.Lerp(Color3.FromHexString(skin), Color3.FromHexString(target), amount).toHexString();
export const gauss = (x: number, y: number, sx: number, sy: number) =>
  Math.exp(-((x * x) / (sx * sx) + (y * y) / (sy * sy)) * 2);
/** Anatomical cross sections: chin, jaw, cheek, temple, forehead, cranium. */
const sectionCache = new WeakMap<
  FaceProfile,
  readonly (readonly [number, number, number, number])[]
>();
export function sections(p: FaceProfile): readonly (readonly [number, number, number, number])[] {
  const cached = sectionCache.get(p);
  if (cached) return cached;
  const rows: readonly (readonly [number, number, number, number])[] = [
    [-0.258, 0.008, 0.016, 0.02],
    [-0.235, p.chin * 0.65, 0.088, 0.064],
    [-0.203, p.chin, 0.128, 0.1],
    [-0.15, p.jaw, 0.142, 0.134],
    [-0.078, p.cheek, 0.154, 0.16],
    [0.015, p.temple * 0.99, 0.148, 0.177],
    [0.091, p.temple * 0.96, 0.158, 0.18],
    [0.16, p.temple, 0.165, 0.178],
    [p.crown - 0.035, p.temple * 0.77, 0.126, 0.13],
    [p.crown, p.temple * 0.3, 0.05, 0.051],
    [p.crown + 0.012, 0.001, 0.001, 0.001],
  ];
  sectionCache.set(p, rows);
  return rows;
}
export function sectionAt(y: number, p: FaceProfile): number[] {
  const rows = sections(p);
  let i = 0;
  while (i < rows.length - 2 && y > rows[i + 1]![0]) i++;
  const a = rows[i]!,
    b = rows[i + 1]!,
    t = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0])));
  // Cubic Hermite interpolation preserves a continuous slope across anatomical sections.
  const before = rows[Math.max(0, i - 1)]!,
    after = rows[Math.min(rows.length - 1, i + 2)]!,
    h = b[0] - a[0];
  const result = [1, 2, 3].map((j) => {
    const m0 = (b[j]! - before[j]!) / (b[0] - before[0]),
      m1 = (after[j]! - a[j]!) / (after[0] - a[0]);
    return Math.max(
      0.001,
      (2 * t * t * t - 3 * t * t + 1) * a[j]! +
        (t * t * t - 2 * t * t + t) * h * m0 +
        (-2 * t * t * t + 3 * t * t) * b[j]! +
        (t * t * t - t * t) * h * m1,
    );
  });
  if (y > 0.17) {
    const cap = Math.sqrt(Math.max(0.00001, 1 - ((y - 0.17) / (p.crown + 0.012 - 0.17)) ** 2));
    return [p.temple * 0.985 * cap, 0.162 * cap, 0.171 * cap];
  }
  if (y < -0.218) {
    const cap = Math.sqrt(Math.max(0.00001, 1 - ((y + 0.218) / 0.04) ** 2));
    return [p.chin * 0.89 * cap, 0.113 * cap, 0.087 * cap];
  }
  return result;
}
export function faceSurface(x: number, y: number, p: FaceProfile): number {
  const [width, front] = sectionAt(y, p) as [number, number, number];
  let z = front * Math.sqrt(Math.max(0, 1 - (x / width) ** 2));
  if (p.age === 'older') z -= 0.006 * gauss(Math.abs(x) - p.temple * 0.81, y - 0.08, 0.035, 0.04);
  z +=
    0.014 *
    gauss(Math.abs(x) - p.cheek * 0.55, y + (p.age === 'older' ? 0.063 : 0.052), 0.065, 0.063); // cheek pads
  z -= 0.02 * gauss(Math.abs(x) - p.eyeSpacing, y - 0.038, 0.055, 0.039); // orbital recess
  z += 0.009 * gauss(Math.abs(x) - p.eyeSpacing, y - 0.092, 0.062, 0.024); // brow ridge
  z += p.noseProjection * 0.7 * gauss(x, y - 0.002, p.noseWidth * 0.7, p.noseLength); // blended bridge
  z += p.noseProjection * gauss(x, y + p.noseLength * 0.58, p.noseWidth, 0.027); // tip
  z += 0.012 * gauss(Math.abs(x) - p.noseWidth * 0.64, y + p.noseLength * 0.59, 0.019, 0.023); // alae
  z += 0.009 * gauss(x, y + 0.123, 0.065, 0.038); // orbicularis / muzzle
  z -= 0.004 * gauss(x, y + 0.096, 0.009, 0.018); // philtrum
  return z;
}
