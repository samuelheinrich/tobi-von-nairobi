import { restingArmClearance } from './arm-pose.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { CharacterRig } from './rig.js';
import { Parts } from './geometry.js';

/** Limbs retain the original shoulder/hip animation pivots and add elbow/knee articulation. */
export function buildLimbs(
  scene: Scene,
  name: string,
  model: TransformNode,
  rig: CharacterRig,
  body: { hip: number; shoulderY: number },
  seated: boolean,
) {
  const a = rig.appearance,
    b = a.body;
  const thighSize = a.femaleStyle?.morphs.thighSize ?? 1,
    calfSize = a.femaleStyle?.morphs.calfSize ?? 1;
  const props: { action: string; node: TransformNode }[] = [];
  for (const side of [-1, 1]) {
    const shoulder = new TransformNode(`${name}-shoulder`, scene);
    shoulder.parent = model;
    shoulder.position.set(side * (b.shoulders * 0.5 + b.arm * 0.28), body.shoulderY, 0);
    shoulder.rotation.z = side * restingArmClearance(b);
    const elbow = new TransformNode(`${name}-elbow`, scene);
    elbow.parent = shoulder;
    elbow.position.y = -0.3;
    const upper = new Parts(scene),
      lower = new Parts(scene),
      hand = new Parts(scene);
    const sleeve =
      ['tee', 'polo', 'shirt', 'blouse', 'uniform'].includes(a.top) ||
      a.femaleStyle?.outfit === 'open_blouse';
    const sleeveColor = a.femaleStyle?.outfit === 'open_blouse' ? '#f0e7d4' : a.topColor;
    upper.oval(
      'shoulder',
      [b.arm * 1.1, 0.16, b.arm * 1.1],
      [0, -0.06, 0],
      sleeve ? sleeveColor : a.skin,
      sleeve ? 'cloth' : 'skin',
    );
    upper.profile(
      'upper-arm',
      [
        [-0.33, b.arm * 0.78, b.arm * 0.8],
        [-0.24, b.arm, b.arm],
        [-0.08, b.arm * 1.06, b.arm],
        [0.015, b.arm * 0.9, b.arm * 0.9],
      ],
      sleeve ? sleeveColor : a.skin,
      sleeve ? 'cloth' : 'skin',
    );
    lower.oval('elbow', [b.arm * 0.88, 0.105, b.arm * 0.9], [0, 0, 0], a.skin, 'skin');
    lower.profile(
      'forearm',
      [
        [-0.285, b.arm * 0.48, b.arm * 0.48],
        [-0.19, b.arm * 0.66, b.arm * 0.65],
        [-0.075, b.arm * 0.87, b.arm * 0.82],
        [0.02, b.arm * 0.8, b.arm * 0.8],
      ],
      a.skin,
      'skin',
    );
    lower.oval('palm', [0.092, 0.12, 0.065], [0, -0.31, 0.006], a.skin, 'skin');
    lower.oval('thumb', [0.04, 0.082, 0.046], [-side * 0.055, -0.3, 0.016], a.skin, 'skin', [
      0,
      0,
      side * 0.45,
    ]);
    for (let finger = 0; finger < 3; finger++)
      hand.oval(
        'finger',
        [0.023, 0.065, 0.035],
        [(finger - 1) * 0.025, -0.376, 0.012],
        a.skin,
        'skin',
      );
    if ((a.accessory === 'watch' || a.accessory === 'bracelet') && side < 0)
      hand.oval('watch', [0.105, 0.06, 0.065], [0, -0.255, -0.01], '#afb3b8', 'metal');
    upper.bake('upper-arm', shoulder);
    lower.bake('forearm', elbow);
    rig.details.push(...hand.bake('hand-details', elbow));
    if (side > 0) {
      for (const action of ['drink', 'phone', 'smoke']) {
        const node = new TransformNode(`${name}-${action}`, scene);
        node.parent = elbow;
        node.position.set(0, -0.32, 0.055);
        const prop = new Parts(scene);
        if (action === 'drink') {
          prop.profile(
            'glass',
            [
              [-0.08, 0.045, 0.045],
              [0.09, 0.06, 0.06],
            ],
            '#c08a35',
            'satin',
          );
          prop.oval('foam', [0.06, 0.02, 0.06], [0, 0.085, 0], '#f5dfb4');
        } else if (action === 'phone') {
          prop.oval('phone', [0.065, 0.105, 0.018], [0, 0, 0], '#232734', 'leather');
          prop.oval('screen', [0.05, 0.08, 0.01], [0, 0, 0.014], '#54aebb', 'satin');
        } else {
          prop.oval('cigarette', [0.012, 0.012, 0.1], [0, 0, 0.06], '#e9e1cd');
          prop.oval('ember', [0.014, 0.014, 0.018], [0, 0, 0.15], '#ed783e');
        }
        rig.details.push(...prop.bake(action, node));
        node.setEnabled(false);
        props.push({ action, node });
      }
    }
    const hip = new TransformNode(`${name}-hip`, scene);
    hip.parent = model;
    hip.position.set(side * b.hips * 0.25, body.hip, 0);
    const knee = new TransformNode(`${name}-knee`, scene);
    knee.parent = hip;
    knee.position.y = -b.leg * 0.47;
    const thigh = new Parts(scene),
      shin = new Parts(scene);
    const bare =
      (!!a.femaleStyle && a.bottom === 'shorts') ||
      a.bottom === 'briefs' ||
      a.bottom === 'skirt' ||
      a.bottom === 'sarong' ||
      a.top === 'dress';
    thigh.profile(
      'thigh',
      [
        [-b.leg * 0.49, b.hips * 0.29, 0.145],
        [-b.leg * 0.33, b.hips * 0.36 * thighSize, b.depth * 0.58],
        [-b.leg * 0.12, b.hips * 0.46 * thighSize, b.depth * 0.76],
        [0.035, b.hips * 0.42, b.depth * 0.7],
      ],
      bare ? a.skin : a.bottomColor,
      bare ? 'skin' : 'cloth',
    );
    if (a.femaleStyle && a.bottom === 'shorts')
      thigh.profile(
        'hotpants',
        [
          [-0.16, b.hips * 0.45, b.depth * 0.77],
          [0.02, b.hips * 0.45, b.depth * 0.73],
        ],
        a.bottomColor,
        'cloth',
      );
    const trousers = ['jeans', 'trousers'].includes(a.bottom) && a.top !== 'dress';
    shin.oval(
      'knee',
      [b.hips * 0.31, 0.14, 0.145],
      [0, -0.01, 0.012],
      trousers ? a.bottomColor : a.skin,
      trousers ? 'cloth' : 'skin',
    );
    shin.profile(
      'calf',
      [
        [-b.leg * 0.44, 0.095, 0.11],
        [-b.leg * 0.29, b.hips * 0.26 * calfSize, 0.16],
        [-b.leg * 0.12, b.hips * 0.31 * calfSize, 0.17],
        [0.025, b.hips * 0.29, 0.145],
      ],
      trousers ? a.bottomColor : a.skin,
      trousers ? 'cloth' : 'skin',
    );
    const shoeY = -b.leg * 0.47;
    const shoeColor =
      a.shoes === 'sneakers'
        ? '#f0e7d9'
        : a.shoes === 'sandals' || a.shoes === 'flipflops' || a.shoes === 'barefoot'
          ? a.skin
          : '#292833';
    shin.oval('shoe', [0.16, 0.12, 0.3], [0, shoeY + 0.025, 0.073], shoeColor, 'leather');
    if (a.shoes !== 'barefoot')
      shin.oval(
        'sole',
        a.shoes === 'heels' ? [0.15, 0.025, 0.13] : [0.17, 0.035, 0.31],
        [0, shoeY - 0.035, a.shoes === 'heels' ? 0.16 : 0.075],
        a.shoes === 'sneakers' ? '#cec9ba' : '#323037',
        'leather',
      );
    if (a.shoes === 'platforms')
      shin.oval('platform', [0.18, 0.11, 0.32], [0, shoeY, 0.075], '#35313d', 'leather');
    if (a.shoes === 'boots')
      shin.oval('boot-shaft', [0.17, 0.25, 0.19], [0, shoeY + 0.17, 0.015], '#30313a', 'leather');
    if (a.shoes === 'heels')
      shin.oval('heel', [0.035, 0.14, 0.045], [0, shoeY + 0.02, -0.04], '#302e35', 'leather');
    if (a.shoes === 'sandals' || a.shoes === 'flipflops')
      for (const dz of [0.06, 0.13])
        shin.oval('sandal-strap', [0.17, 0.03, 0.04], [0, shoeY + 0.08, dz], '#8d614b', 'leather');
    if (a.shoes === 'sneakers')
      for (let lace = 0; lace < 3; lace++)
        shin.oval(
          'laces',
          [0.095, 0.014, 0.017],
          [0, shoeY + 0.09, 0.025 + lace * 0.027],
          '#a7afaf',
        );
    thigh.bake('thigh', hip);
    shin.bake('shin-shoe', knee);
    if (seated) {
      hip.rotation.x = -1.35;
      knee.rotation.x = 1.35;
    }
    rig.arms.push(shoulder);
    rig.elbows.push(elbow);
    rig.legs.push(hip);
    rig.knees.push(knee);
  }
  return props;
}
