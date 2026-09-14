import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { characterPose } from '@tobi/game-core';
import { createTobiLikeness } from './tobi-likeness.js';
import { CigaretteSmoke } from './cigarette-smoke.js';
import { createBottleModel } from '../items/bottle-model.js';
import { material } from '../levels/materials.js';

/** Articulated procedural rig. The swaying body is a child of the stable collision/camera root. */
export class TobiVisual {
  public readonly root: TransformNode;
  private readonly body: TransformNode;
  private readonly head: TransformNode;
  private readonly legs: TransformNode[] = [];
  private readonly knees: TransformNode[] = [];
  private readonly arms: TransformNode[] = [];
  private readonly heldBottle: TransformNode;
  private readonly smoke: CigaretteSmoke;
  private throwing = 0;
  private time = 0;
  private gait = 0;
  private pickup = 0;
  private stumble = 0;
  private stumbleClock = 0;

  public constructor(scene: Scene, shadows: ShadowGenerator) {
    this.root = new TransformNode('tobi', scene);
    const pivot = (
      name: string,
      parent: TransformNode,
      x: number,
      y: number,
      z = 0,
    ): TransformNode => {
      const node = new TransformNode(name, scene);
      node.parent = parent;
      node.position.set(x, y, z);
      return node;
    };
    this.body = pivot('tobi-body-rig', this.root, 0, 0);
    this.head = pivot('tobi-head-rig', this.body, 0, 1.85, 0.03);
    const shirt = material(scene, 'tobi-shirt', '#202b32');
    const skin = material(scene, 'tobi-skin', '#e8af7b');
    const shorts = material(scene, 'tobi-shorts', '#202b32');
    const shoes = material(scene, 'tobi-shoes', '#225b9d');
    const part = (
      name: string,
      diameter: number,
      size: [number, number, number],
      position: [number, number, number],
      surface = shirt,
      parent = this.body,
    ): Mesh => {
      const mesh = MeshBuilder.CreateSphere(name, { diameter, segments: 6 }, scene);
      mesh.scaling.set(...size);
      mesh.position.set(...position);
      mesh.material = surface;
      mesh.parent = parent;
      shadows.addShadowCaster(mesh);
      return mesh;
    };
    part('tobi-shirt', 1, [1.08, 0.98, 0.83], [0, 1.1, 0]);
    part('tobi-head', 0.6, [1.12, 1.13, 1.03], [0, 0, 0], skin, this.head);
    part('tobi-nose', 0.15, [1, 0.9, 1.2], [0, -0.02, 0.31], skin, this.head);
    for (const side of [-1, 1]) {
      const leg = pivot('tobi-hip', this.body, side * 0.24, 0.76);
      part('thigh', 0.4, [0.8, 0.9, 0.8], [0, -0.16, 0], shorts, leg);
      const knee = pivot('tobi-knee', leg, 0, -0.32);
      part('shin', 0.4, [0.7, 0.8, 0.7], [0, -0.14, 0], skin, knee);
      part('shoe', 0.4, [0.9, 0.5, 1.5], [0, -0.32, 0.1], shoes, knee);
      this.knees.push(knee);
      this.legs.push(leg);
      const arm = pivot('tobi-shoulder', this.body, side * 0.58, 1.4);
      part('arm', 0.32, [0.9, 2, 0.9], [side * 0.06, -0.3, 0], skin, arm);
      part('hand', 0.23, [1, 1, 1], [side * 0.06, -0.62, 0], skin, arm);
      this.arms.push(arm);
    }
    this.smoke = new CigaretteSmoke(scene, createTobiLikeness(scene, this.body, this.head));
    this.heldBottle = createBottleModel(scene, 'tobi-held-bottle');
    this.heldBottle.parent = this.arms[0]!;
    this.heldBottle.position.set(-0.06, -0.62, 0.13);
    this.heldBottle.setEnabled(false);
  }

  public throwBottle(): void {
    this.throwing = 1;
  }

  public celebratePickup(): void {
    this.pickup = 1;
  }

  /** Returns a one-shot stumble cue; callers may pair it with audio. */
  public animate(
    delta: number,
    speed: number,
    grounded: boolean,
    victory = false,
    mood = 0,
    stamina = 100,
    holding = false,
    drinking = 0,
    sitting = false,
  ): boolean {
    this.time += delta;
    this.smoke.update(delta);
    this.throwing = Math.max(0, this.throwing - delta * 3);
    this.heldBottle.setEnabled(holding);
    this.gait += delta * (victory ? 9 : speed * 2.8);
    this.pickup = Math.max(0, this.pickup - delta * 1.8);
    this.stumble = Math.max(0, this.stumble - delta * 2.8);
    let tripped = false;
    if (grounded && speed > 0.5 && mood >= 0.4 && !victory) {
      this.stumbleClock += delta;
      if (this.stumbleClock >= 7 - mood * 3) {
        this.stumbleClock = 0;
        this.stumble = 1;
        tripped = true;
      }
    }
    const pose = characterPose({
      time: this.time,
      gait: this.gait,
      speed,
      grounded,
      victory,
      mood,
      stamina,
      pickup: this.pickup,
      stumble: this.stumble,
    });
    this.body.rotation.set(pose.bodyPitch, 0, pose.bodyRoll);
    this.body.position.set(pose.bodyX, pose.bodyY, 0);
    this.head.rotation.set(drinking * -0.22, pose.headYaw, pose.headRoll);
    this.legs.forEach((leg, index) => {
      leg.rotation.set(
        index === 0 ? pose.leftLeg : pose.rightLeg,
        0,
        (index === 0 ? 1 : -1) * pose.legSpread,
      );
    });
    this.arms.forEach((arm, index) => {
      arm.rotation.set(
        index === 0 ? pose.leftArm - drinking * 1.7 - this.throwing * 2.5 : pose.rightArm,
        0,
        (index === 0 ? 1 : -1) * pose.armSpread + (index === 0 ? drinking * 0.9 : 0),
      );
    });
    if (sitting) {
      this.body.position.set(0, -0.68, 0);
      this.body.rotation.set(-0.08, 0, 0);
      for (const leg of this.legs) leg.rotation.set(-Math.PI / 2, 0, 0);
      for (const arm of this.arms) arm.rotation.x = -0.4;
    }
    for (const knee of this.knees) knee.rotation.x = sitting ? Math.PI / 2 : 0;
    // Aim the bottle neck at the mouth in hand space, including head/body sway.
    if (drinking > 0) {
      const mouth = Vector3.TransformCoordinates(
        new Vector3(0, -0.15, 0.345),
        this.head.computeWorldMatrix(true),
      );
      const mouthInHand = Vector3.TransformCoordinates(
        mouth,
        Matrix.Invert(this.arms[0]!.computeWorldMatrix(true)),
      );
      const drinkRotation = Quaternion.Identity();
      Quaternion.FromUnitVectorsToRef(
        Vector3.Up(),
        mouthInHand.subtract(this.heldBottle.position).normalize(),
        drinkRotation,
      );
      this.heldBottle.rotationQuaternion = Quaternion.Slerp(
        Quaternion.Identity(),
        drinkRotation,
        drinking,
      );
    } else this.heldBottle.rotationQuaternion = null;
    if (victory) this.root.rotation.y += delta * 1.3;
    return tripped;
  }
  public dispose(): void {
    this.smoke.dispose();
    this.root.dispose(false, true);
  }
}
