import { outwardArmAngle, restingArmClearance } from './arm-pose.js';
import { buildDistant } from './distant.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { buildLimbs } from './limbs.js';
import { buildHead } from './head.js';
import { buildBody } from './body.js';
import { appearance, type Appearance, type CharacterCategory } from './presets.js';

export interface CharacterRig {
  root: TransformNode;
  head: Mesh;
  blink: Mesh | null;
  arms: TransformNode[];
  legs: TransformNode[];
  elbows: TransformNode[];
  knees: TransformNode[];
  visual: TransformNode;
  distant: TransformNode;
  skirts: Mesh[];
  details: Mesh[];
  appearance: Appearance;
  dress(category: CharacterCategory, seed: number, female?: boolean, thai?: boolean): void;
  dressAppearance(next: Appearance): void;
  gesture(action: string): void;
  dispose(): void;
}
const populations = new WeakMap<Scene, Set<CharacterRig>>();
/** Single secondary-animation/LOD observer per scene, automatically removed with the scene. */
function register(scene: Scene, rig: CharacterRig) {
  let population = populations.get(scene);
  if (!population) {
    population = new Set();
    populations.set(scene, population);
    let visualTime = 0;
    scene.onBeforeRenderObservable.add(() => {
      visualTime += Math.min(0.05, scene.getEngine().getDeltaTime() / 1000);
      const camera = scene.activeCamera;
      if (!camera) return;
      for (const person of population!) {
        if (!person.root.isEnabled()) continue;
        const distance = Math.hypot(
          person.root.position.x - camera.position.x,
          person.root.position.y - camera.position.y,
          person.root.position.z - camera.position.z,
        );
        const visible =
          !scene.frustumPlanes ||
          scene.frustumPlanes.every((plane) => plane.dotCoordinate(person.root.position) >= -3);
        person.visual.setEnabled(visible && distance < 28);
        person.distant.setEnabled(visible && distance >= 28 && distance < 80);
        for (const mesh of person.details) mesh.visibility = distance < 14 && visible ? 1 : 0;
        if (person.blink) {
          const beat =
            (visualTime + person.appearance.seed * 0.73) %
            (3.2 + (person.appearance.seed % 5) * 0.43);
          const amount = beat < 0.18 ? Math.sin((beat / 0.18) * Math.PI) : 0;
          person.blink.setEnabled(visible && distance < 14 && amount > 0.03);
          person.blink.scaling.y = Math.max(0.001, amount * 1.15);
        }
        if (!visible || distance > 28) continue;
        for (const [i, elbow] of person.elbows.entries()) {
          const arm = person.arms[i]!;
          // A final rig-level guard also covers legacy level-specific animation writers.
          arm.rotation.z = outwardArmAngle(
            i,
            (i === 0 ? -1 : 1) * arm.rotation.z,
            restingArmClearance(person.appearance.body),
          );
          elbow.rotation.x = -0.12 - Math.max(0, -arm.rotation.x) * 0.55;
        }
        for (const skirt of person.skirts)
          skirt.rotation.x = person.legs.every((leg) => leg.rotation.x < -0.9) ? -1.15 : 0;
        for (const [i, knee] of person.knees.entries()) {
          const leg = person.legs[i]!;
          knee.rotation.x = leg.rotation.x < -0.9 ? 1.35 : Math.max(0, leg.rotation.x) * 0.7;
        }
      }
    });
  }
  population.add(rig);
  rig.root.onDisposeObservable.add(() => population!.delete(rig));
}
export function createCharacter(
  scene: Scene,
  name: string,
  spec: Appearance,
  shadows: ShadowGenerator | null,
  seated = false,
): CharacterRig {
  const root = new TransformNode(name, scene);
  let model = new TransformNode(`${name}-wardrobe`, scene);
  model.parent = root;
  let props: { action: string; node: TransformNode }[] = [];
  type Wardrobe = {
    model: TransformNode;
    distant: TransformNode;
    head: Mesh;
    blink: Mesh | null;
    arms: TransformNode[];
    legs: TransformNode[];
    elbows: TransformNode[];
    knees: TransformNode[];
    skirts: Mesh[];
    details: Mesh[];
    appearance: Appearance;
    props: typeof props;
  };
  const wardrobe = new Map<string, Wardrobe>();
  const key = (a: Appearance) =>
    `${a.category}:${a.seed}:${a.feminine}:${a.thai}:${a.face}:${a.hair}:${JSON.stringify(a.femaleStyle)}`;
  function remember() {
    wardrobe.set(key(rig.appearance), {
      model,
      distant: rig.distant,
      head: rig.head,
      blink: rig.blink,
      arms: rig.arms,
      legs: rig.legs,
      elbows: rig.elbows,
      knees: rig.knees,
      details: rig.details,
      skirts: rig.skirts,
      appearance: rig.appearance,
      props,
    });
    // At most two assembled outfits per pool slot; revisits reuse geometry and joints.
    while (wardrobe.size > 2) {
      const oldest = wardrobe.keys().next().value!;
      wardrobe.get(oldest)!.model.dispose();
      wardrobe.get(oldest)!.distant.dispose();
      wardrobe.delete(oldest);
    }
  }
  let currentHead: Mesh;
  const rig: CharacterRig = {
    root,
    visual: model,
    distant: buildDistant(scene, root, spec, seated),
    get head() {
      return currentHead;
    },
    set head(value: Mesh) {
      currentHead = value;
    },
    blink: null,
    arms: [],
    legs: [],
    elbows: [],
    knees: [],
    details: [],
    skirts: [],
    appearance: spec,
    dress(category, seed, female, thai) {
      rig.dressAppearance(appearance(category, seed, female, thai));
    },
    dressAppearance(next) {
      if (key(next) === key(rig.appearance)) return;
      model.setEnabled(false);
      rig.distant.setEnabled(false);
      const cached = wardrobe.get(key(next));
      if (cached) {
        model = cached.model;
        props = cached.props;
        Object.assign(rig, {
          visual: model,
          distant: cached.distant,
          head: cached.head,
          blink: cached.blink,
          arms: cached.arms,
          legs: cached.legs,
          elbows: cached.elbows,
          knees: cached.knees,
          details: cached.details,
          skirts: cached.skirts,
          appearance: cached.appearance,
        });
        wardrobe.delete(key(next));
        model.setEnabled(true);
      } else {
        model = new TransformNode(`${name}-wardrobe`, scene);
        model.parent = root;
        props = [];
        rig.arms = [];
        rig.legs = [];
        rig.elbows = [];
        rig.knees = [];
        rig.details = [];
        rig.appearance = next;
        rig.visual = model;
        rig.distant = buildDistant(scene, root, next, seated);
        build();
      }
      root.scaling.setAll(next.body.stature);
      remember();
    },
    gesture(action) {
      for (const prop of props) prop.node.setEnabled(prop.action === action);
    },
    dispose: () => root.dispose(),
  };
  function build() {
    const a = rig.appearance,
      b = a.body;
    const body = buildBody(scene, model, a);
    rig.skirts = body.skirts;
    const head = buildHead(scene, model, a);
    head.head.position.y = body.headY;
    rig.head = head.head;
    rig.blink = head.blink;
    rig.details.push(...body.details, ...head.details, ...(head.blink ? [head.blink] : []));
    root.scaling.setAll(b.stature);
    props = buildLimbs(scene, name, model, rig, body, seated);
    // Keep the historical seated hip anchor used by the train's authored bench positions.
    if (seated)
      for (const node of model.getChildren() as TransformNode[]) node.position.y -= b.leg - 0.5;
    if (shadows)
      for (const mesh of model.getChildMeshes())
        if (!rig.details.includes(mesh as Mesh)) shadows.addShadowCaster(mesh);
  }
  build();
  remember();
  register(scene, rig);
  return rig;
}
