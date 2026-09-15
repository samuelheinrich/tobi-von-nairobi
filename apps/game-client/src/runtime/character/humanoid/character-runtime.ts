import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import '@babylonjs/loaders/glTF/2.0/glTFLoader.js';
import '@babylonjs/loaders/glTF/2.0/Extensions/EXT_texture_webp.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { AssetContainer } from '@babylonjs/core/assetContainer.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { SkeletonAdapter } from './skeleton-adapter.js';
import { CharacterAttachments } from './attachments.js';
import { CharacterAnimationController } from './animation-controller.js';
import { sampleMotion, motionTiming } from './motion-library.js';
import { ClipSampler } from './clip-sampler.js';
import type {
  AnimationState,
  CharacterConfig,
  HumanoidAction,
  HumanoidBone,
  PropAttachmentPreset,
} from './schema.js';

/** One skinned character, one pose writer, shared action vocabulary and no root-motion gameplay. */
export class HumanoidCharacter {
  readonly attachments: CharacterAttachments;
  readonly controller: CharacterAnimationController;
  readonly clips = new Map<HumanoidAction, ClipSampler>();
  private extraFrom = new Map<string, Quaternion>();
  private serial = -1;
  private blend = 1;
  private from = new Map<HumanoidBone, { rotation: Quaternion; position: Vector3 }>();
  private readonly armNeutral: { left: Quaternion; right: Quaternion };
  private readonly restHipHeight: number;
  private readonly restFootHeight: number;
  private constructor(
    readonly root: TransformNode,
    readonly rig: SkeletonAdapter,
    readonly config: CharacterConfig,
    private readonly container: AssetContainer,
    private readonly scale: number,
  ) {
    this.attachments = new CharacterAttachments(rig);
    this.controller = new CharacterAnimationController(
      config.throwReleaseTime,
      undefined,
      config.motionDurations,
    );
    this.armNeutral = {
      left: rig.neutralArm('left', config.armClearance),
      right: rig.neutralArm('right', config.armClearance),
    };
    const hips = rig.joints.get('hips')!.node;
    hips.computeWorldMatrix(true);
    this.restHipHeight = hips.getAbsolutePosition().y - root.getAbsolutePosition().y;
    const feet = ['leftFoot', 'rightFoot'] as const;
    this.restFootHeight =
      Math.min(
        ...feet.map((key) => {
          const node = rig.joints.get(key)!.node;
          node.computeWorldMatrix(true);
          return node.getAbsolutePosition().y;
        }),
      ) - root.getAbsolutePosition().y;
    for (const [action, name] of Object.entries(config.animations) as [HumanoidAction, string][]) {
      const clip = container.animationGroups.find((c) => c.name === name);
      if (!clip) throw new Error('Configured clip not found: ' + name);
      this.clips.set(action, new ClipSampler(clip));
    }
  }
  static async load(
    scene: Scene,
    parent: TransformNode,
    config: CharacterConfig,
  ): Promise<HumanoidCharacter> {
    const container = await LoadAssetContainerAsync(config.model, scene);
    if (scene.isDisposed || parent.isDisposed()) {
      container.dispose();
      throw new Error('Character load cancelled');
    }
    let mount: TransformNode | undefined;
    try {
      container.addAllToScene();
      for (const group of container.animationGroups) group.stop();
      const source = container.rootNodes[0];
      if (!(source instanceof TransformNode)) throw new Error('Expected glTF root TransformNode');
      source.setEnabled(false);
      const rig = new SkeletonAdapter(source, container.skeletons, config.bones);
      const importedActions = new Map<HumanoidAction, string>();
      if (config.clipSources?.length) {
        const { importRetargetedClips } = await import('./retarget-import.js');
        for (const clipSource of config.clipSources) {
          const retargeted = await importRetargetedClips(scene, source, config.bones, clipSource);
          for (const [action, clip] of retargeted) {
            container.animationGroups.push(clip);
            importedActions.set(action as HumanoidAction, clip.name);
          }
        }
        if (scene.isDisposed || parent.isDisposed()) throw new Error('Character load cancelled');
      }
      let min = new Vector3(Infinity, Infinity, Infinity),
        max = new Vector3(-Infinity, -Infinity, -Infinity);
      for (const mesh of container.meshes) {
        if (!mesh.getTotalVertices()) continue;
        mesh.computeWorldMatrix(true);
        mesh.refreshBoundingInfo({ applySkeleton: true });
        const b = mesh.getBoundingInfo().boundingBox;
        min = Vector3.Minimize(min, b.minimumWorld);
        max = Vector3.Maximize(max, b.maximumWorld);
        mesh.isPickable = false;
      }
      const height = max.y - min.y;
      if (!Number.isFinite(height) || height < 0.01) throw new Error('Invalid character bounds');
      const scale = config.height / height;
      mount = new TransformNode(config.id + '-animated', scene);
      source.parent = mount;
      mount.scaling.setAll(scale);
      mount.position.set(
        -(min.x + max.x) * 0.5 * scale,
        -min.y * scale,
        -(min.z + max.z) * 0.5 * scale,
      );
      mount.rotationQuaternion = Quaternion.FromEulerAngles(...config.rotation);
      // Capture measurements before parenting under the moving gameplay root.
      const result = new HumanoidCharacter(
        mount,
        rig,
        { ...config, animations: { ...config.animations, ...Object.fromEntries(importedActions) } },
        container,
        scale,
      );
      mount.parent = parent;
      mount.setEnabled(false);
      result.pose(0, { speed: 0, grounded: true, sitting: false, drinking: false, holding: false });
      await Promise.all(
        container.meshes
          .filter((mesh) => mesh.getTotalVertices() > 0)
          .map((mesh) => mesh.material?.forceCompilationAsync(mesh)),
      );
      if (scene.isDisposed || parent.isDisposed()) throw new Error('Character load cancelled');
      source.setEnabled(true);
      mount.setEnabled(true);
      return result;
    } catch (error) {
      container.dispose();
      mount?.dispose();
      throw error;
    }
  }
  update(delta: number, state: AnimationState) {
    const events = this.controller.step(
      delta,
      state,
      this.config.walkSpeed,
      this.config.runSpeed,
      this.config.cycleSpeeds,
    );
    this.pose(delta, state);
    return events;
  }
  /** Allows a skin variant to follow the same controller without advancing the clock twice. */
  pose(delta: number, state: AnimationState, controller = this.controller): void {
    if (this.serial !== controller.serial) {
      this.extraFrom = new Map(
        [...this.rig.extraJoints].map(([name, j]) => [name, j.node.rotationQuaternion!.clone()]),
      );
      this.serial = controller.serial;
      this.blend = 0;
      this.from = new Map(
        [...this.rig.joints].map(([key, j]) => [
          key,
          {
            rotation: j.node.rotationQuaternion!.clone(),
            position: j.node.position.clone(),
          },
        ]),
      );
    }
    this.blend = Math.min(1, this.blend + delta / Math.max(0.001, this.config.crossfade));
    const alpha = this.blend * this.blend * (3 - 2 * this.blend);
    const timing = controller.timing(),
      t = timing.loop
        ? controller.time % timing.duration
        : Math.min(controller.time, timing.duration);
    const motion = sampleMotion(
        controller.action,
        (t / timing.duration) * motionTiming[controller.action].duration,
        this.config.armClearance,
      ),
      imported = this.clips.get(controller.action);
    const range = this.config.clipRanges?.[controller.action] ?? [0, 1];
    const clipTime = imported
      ? controller.action === 'idle'
        ? controller.time
        : (range[0] + (t / timing.duration) * (range[1] - range[0])) * imported.duration
      : 0;
    const seatedOverlay =
      state.sitting && !['sit_down', 'sit_idle', 'stand_up'].includes(controller.action);
    imported?.sampleFacial(controller.time, delta);
    if (seatedOverlay) {
      const seated = sampleMotion('sit_idle', t, this.config.armClearance);
      for (const key of ['leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg'] as const)
        motion.rotations[key] = seated.rotations[key]!;
      motion.hipOffset = seated.hipOffset;
    }
    for (const [key, j] of this.rig.joints) {
      let rotation: Quaternion,
        position = j.position.clone();
      if (imported && !(seatedOverlay && (key === 'hips' || /Leg|Foot/.test(key)))) {
        const sampled = imported.sample(j.node, j, clipTime, timing.loop);
        rotation = sampled.rotation;
        if (key === 'hips') position = sampled.position;
      } else {
        let deltaRotation = motion.rotations[key] ?? Quaternion.Identity();
        if (key === 'leftUpperArm') deltaRotation = deltaRotation.multiply(this.armNeutral.left);
        if (key === 'rightUpperArm') deltaRotation = deltaRotation.multiply(this.armNeutral.right);
        if (
          key === 'leftLowerArm' ||
          key === 'leftHand' ||
          key === 'rightLowerArm' ||
          key === 'rightHand'
        ) {
          const neutral = key.startsWith('left') ? this.armNeutral.left : this.armNeutral.right;
          const frame = neutral.multiply(j.frame);
          rotation = j.rest
            .multiply(frame.conjugate().multiply(deltaRotation).multiply(frame))
            .normalize();
        } else rotation = this.rig.rotation(key, deltaRotation);
        if (key === 'hips') {
          let offset = motion.hipOffset;
          if (state.sitting || ['sit_down', 'sit_idle', 'stand_up'].includes(controller.action)) {
            const amount = -motion.hipOffset / 0.5;
            offset =
              (((state.seatHeight ?? 0.42) + this.config.height * 0.075 - this.restHipHeight) /
                this.scale) *
              amount;
          }
          position.y += offset;
        }
      }
      const previous = this.from.get(key)!;
      Quaternion.SlerpToRef(previous.rotation, rotation, alpha, j.node.rotationQuaternion!);
      Vector3.LerpToRef(previous.position, position, alpha, j.node.position);
    }
    // Imported clips also animate clavicles, the intermediate spine and fingers.
    // Restore their bind pose smoothly when returning to a procedural action.
    for (const [name, j] of this.rig.extraJoints) {
      const sampled = imported?.sample(j.node, j, clipTime, timing.loop);
      Quaternion.SlerpToRef(
        this.extraFrom.get(name) ?? j.rest,
        sampled?.rotation ?? j.rest,
        alpha,
        j.node.rotationQuaternion!,
      );
    }
    if (!imported && (controller.action === 'walk' || controller.action === 'run')) {
      const footHeight =
        Math.min(
          ...(['leftFoot', 'rightFoot'] as const).map((key) => {
            const node = this.rig.joints.get(key)!.node;
            node.computeWorldMatrix(true);
            return node.getAbsolutePosition().y;
          }),
        ) - this.root.getAbsolutePosition().y;
      this.rig.joints.get('hips')!.node.position.y +=
        ((this.restFootHeight - footHeight) / this.scale) * alpha;
    }
  }
  attachProp(
    prop: TransformNode,
    preset: PropAttachmentPreset,
    controller = this.controller,
  ): void {
    this.attachments.attach(prop, preset);
    if (controller.action === 'drink') {
      const head = this.rig.joints.get('head')!.node;
      const mouth = Vector3.TransformCoordinates(
        Vector3.FromArray(this.config.mouthOffset),
        head.computeWorldMatrix(true),
      );
      const phase = Math.min(1, controller.time / controller.timing('drink').duration);
      this.attachments.aimAt(prop, mouth, Math.min(1, Math.sin(phase * Math.PI) * 1.5));
    }
  }
  dispose(): void {
    this.container.dispose();
    this.root.dispose();
  }
}
