import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { characterPose } from '@tobi/game-core';
import { createTobiLikeness } from './tobi-likeness.js';
import { CigaretteSmoke } from './cigarette-smoke.js';
import { createBottleModel } from '../items/bottle-model.js';
import { material } from '../levels/materials.js';
import { TobiAvatar } from './tobi-avatar.js';
import { CharacterAnimationController } from './humanoid/animation-controller.js';
import { tobiConfig } from './characters/tobi.js';

/** How long Tobi stays visibly drunk after a bottle.
 *
 * Counted in the same clamped animation time as the sway, the stumble and the pickup cue, so on a
 * machine that drops below ten frames a second the phase outlasts thirty wall-clock seconds. That
 * is deliberate: every other timer in this class behaves the same way, and a purely visual state
 * has no business running on a different clock than the pose it belongs to.
 */
const DRUNK_SECONDS = 30;

/** True when `mesh` sits anywhere below `ancestor` in the scene graph. */
function isUnder(mesh: AbstractMesh, ancestor: TransformNode): boolean {
  for (let node = mesh.parent; node; node = node.parent) if (node === ancestor) return true;
  return false;
}

/** Articulated procedural rig. The swaying body is a child of the stable collision/camera root. */
export class TobiVisual {
  public readonly root: TransformNode;
  private readonly body: TransformNode;
  private readonly head: TransformNode;
  private readonly legs: TransformNode[] = [];
  private readonly knees: TransformNode[] = [];
  private readonly arms: TransformNode[] = [];
  private heldBottle: TransformNode;
  private readonly animation = new CharacterAnimationController(
    tobiConfig.throwReleaseTime,
    undefined,
    tobiConfig.motionDurations,
  );
  private releaseThrow: ((prop: TransformNode) => void) | null = null;
  public get canThrow(): boolean {
    return !this.animation.busy && !this.releaseThrow;
  }
  private readonly smoke: CigaretteSmoke;
  private throwing = 0;
  private time = 0;
  private gait = 0;
  private pickup = 0;
  private stumble = 0;
  private stumbleClock = 0;
  /** The scanned avatars, once they have loaded. Null means the procedural figure is on screen. */
  private avatar: TobiAvatar | null = null;
  private readonly procedural: AbstractMesh[] = [];
  private drunkFor = 0;

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
      const mesh = MeshBuilder.CreateSphere(name, { diameter, segments: 12 }, scene);
      mesh.scaling.set(...size);
      mesh.position.set(...position);
      mesh.material = surface;
      mesh.parent = parent;
      shadows.addShadowCaster(mesh);
      this.procedural.push(mesh);
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
      part('thumb', 0.1, [0.75, 1.35, 0.8], [side * -0.025, -0.64, 0.035], skin, arm);
      part('fingers', 0.12, [1.25, 0.6, 0.8], [side * 0.06, -0.72, 0.025], skin, arm);
      this.arms.push(arm);
    }
    this.smoke = new CigaretteSmoke(scene, createTobiLikeness(scene, this.body, this.head));
    this.heldBottle = createBottleModel(scene, 'tobi-held-bottle');
    this.heldBottle.parent = this.arms[0]!;
    this.heldBottle.position.set(-0.06, -0.62, 0.13);
    this.heldBottle.setEnabled(false);
    // The likeness adds its own meshes under body and head; they have to hide with the rest.
    for (const mesh of this.body.getChildMeshes()) {
      if (!this.procedural.includes(mesh) && !isUnder(mesh, this.heldBottle)) {
        this.procedural.push(mesh);
      }
    }
    void this.loadAvatar(scene);
  }

  /** Swaps the procedural skin for the scanned avatars, quietly doing nothing if they fail. */
  private async loadAvatar(scene: Scene): Promise<void> {
    // Fitted to the figure it replaces, so camera, collision and reach stay as tuned.
    const avatar = await TobiAvatar.load(scene, this.body);
    if (!avatar) return;
    if (this.root.isDisposed()) {
      avatar.dispose();
      return;
    }
    this.avatar = avatar;
    for (const mesh of this.procedural) mesh.isVisible = false;
    // The cigarette is part of the procedural head; without it the smoke has no source.
    this.smoke.dispose();
  }

  public throwBottle(release: (prop: TransformNode) => void): void {
    if (!this.canThrow) return;
    this.throwing = 1;
    this.animation.play('throw_bottle');
    this.releaseThrow = release;
  }

  public taunt(): void {
    this.animation.play('taunt');
  }

  public celebrate(): boolean {
    return this.animation.play('celebrate', true);
  }

  public celebratePickup(): void {
    this.pickup = 1;
    if (!['pickup', 'drink'].includes(this.animation.action))
      this.animation.playSequence(['pickup', 'drink']);
    // Every bottle restarts the half minute; they do not add up.
    this.drunkFor = DRUNK_SECONDS;
  }

  /** Seconds of visible drunkenness left, for the HUD or a test to read. */
  public get drunkSeconds(): number {
    return this.drunkFor;
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
    seatHeight = 0.42,
  ): boolean {
    this.time += delta;
    if (this.drunkFor > 0) {
      this.drunkFor = Math.max(0, this.drunkFor - delta);
      this.avatar?.setDrunk(this.drunkFor > 0);
    }
    if (!this.avatar) this.smoke.update(delta);
    this.throwing = Math.max(0, this.throwing - delta * 3);
    this.heldBottle.setEnabled(holding || this.releaseThrow !== null);
    const dancing = victory || this.animation.action === 'celebrate';
    this.gait += delta * (dancing ? 9 : speed * 2.8);
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
      victory: dancing,
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
    const animationState = {
      speed,
      grounded,
      sitting,
      drinking: drinking > 0.001,
      holding,
      seatHeight,
      victory,
    };
    const markers = this.animation.step(
      delta,
      animationState,
      tobiConfig.walkSpeed,
      tobiConfig.runSpeed,
      tobiConfig.cycleSpeeds,
    );
    if (this.avatar) {
      // The GLB skeleton owns posture; applying the old proxy pose too would bend/lower it twice.
      this.body.position.setAll(0);
      this.body.rotation.setAll(0);
      this.avatar.animate(delta, animationState, this.animation);
      this.avatar.attach(this.heldBottle, this.animation);
    }
    for (const marker of markers) {
      if (marker.name !== 'release' || !this.releaseThrow) continue;
      const released = this.heldBottle;
      if (this.avatar) this.avatar.detach(released);
      else {
        const world = released.computeWorldMatrix(true).clone();
        released.parent = null;
        released.rotationQuaternion = Quaternion.Identity();
        world.decompose(released.scaling, released.rotationQuaternion, released.position);
      }
      const release = this.releaseThrow;
      this.releaseThrow = null;
      this.heldBottle = createBottleModel(this.root.getScene(), 'tobi-held-bottle');
      this.heldBottle.parent = this.arms[0]!;
      this.heldBottle.position.set(-0.06, -0.62, 0.13);
      this.heldBottle.setEnabled(holding);
      if (this.avatar) this.avatar.attach(this.heldBottle, this.animation);
      release(released);
    }
    if (victory) this.root.rotation.y += delta * 1.3;
    return tripped;
  }
  public dispose(): void {
    this.avatar?.dispose();
    this.smoke.dispose();
    this.root.dispose(false, true);
  }
}
