import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { characterPose } from '@tobi/game-core';
import { material } from '../levels/materials.js';

/** Articulated procedural rig. The swaying body is a child of the stable collision/camera root. */
export class TobiVisual {
  public readonly root: TransformNode;
  private readonly body: TransformNode;
  private readonly head: TransformNode;
  private readonly legs: TransformNode[] = [];
  private readonly arms: TransformNode[] = [];
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
    const shirt = material(scene, 'tobi-shirt', '#f16747');
    const skin = material(scene, 'tobi-skin', '#e8af7b');
    const shorts = material(scene, 'tobi-shorts', '#344f57');
    const hat = material(scene, 'tobi-hat', '#efe1b8');
    const glasses = material(scene, 'tobi-glasses', '#243b3c');
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
    part('tobi-head', 0.6, [1, 1.1, 1], [0, 0, 0], skin, this.head);
    part('tobi-nose', 0.15, [1, 0.9, 1.2], [0, -0.02, 0.31], skin, this.head);
    part('tobi-hat-brim', 0.93, [1, 0.1, 0.85], [0, 0.29, -0.03], hat, this.head);
    part('tobi-hat-crown', 0.58, [1, 0.55, 0.9], [0, 0.42, -0.03], hat, this.head);
    for (const side of [-1, 1]) {
      part('sunglasses', 0.21, [1.05, 0.7, 0.35], [side * 0.15, 0.05, 0.25], glasses, this.head);
      const leg = pivot('tobi-hip', this.body, side * 0.24, 0.76);
      part('leg', 0.4, [0.8, 1.6, 0.8], [0, -0.32, 0], shorts, leg);
      part('shoe', 0.4, [0.9, 0.5, 1.5], [0, -0.64, 0.1], hat, leg);
      this.legs.push(leg);
      const arm = pivot('tobi-shoulder', this.body, side * 0.58, 1.4);
      part('arm', 0.32, [0.9, 2, 0.9], [side * 0.06, -0.3, 0], skin, arm);
      part('hand', 0.23, [1, 1, 1], [side * 0.06, -0.62, 0], skin, arm);
      this.arms.push(arm);
    }
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
  ): boolean {
    this.time += delta;
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
    this.head.rotation.set(this.pickup * -0.2, pose.headYaw, pose.headRoll);
    this.legs.forEach((leg, index) => {
      leg.rotation.set(
        index === 0 ? pose.leftLeg : pose.rightLeg,
        0,
        (index === 0 ? 1 : -1) * pose.legSpread,
      );
    });
    this.arms.forEach((arm, index) => {
      arm.rotation.set(
        index === 0 ? pose.leftArm : pose.rightArm,
        0,
        (index === 0 ? 1 : -1) * pose.armSpread,
      );
    });
    if (victory) this.root.rotation.y += delta * 1.3;
    return tripped;
  }
  public dispose(): void {
    this.root.dispose(false, true);
  }
}
