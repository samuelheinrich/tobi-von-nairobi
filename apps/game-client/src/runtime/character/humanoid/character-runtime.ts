import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import '@babylonjs/loaders/glTF/2.0/glTFLoader.js';
import '@babylonjs/loaders/glTF/2.0/Extensions/EXT_texture_webp.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { AssetContainer } from '@babylonjs/core/assetContainer.js';
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
import type { SeatAnchor } from '../seating/seat-anchor.js';
import { resolveLoopTime } from './animation-metadata.js';

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
  private readonly neutralRootPosition: Vector3;
  private rootMotionSerial = -1;
  private rootMotionTime = 0;
  private constructor(
    readonly root: TransformNode,
    readonly rig: SkeletonAdapter,
    readonly config: CharacterConfig,
    private readonly container: AssetContainer,
    private readonly scale: number,
  ) {
    this.attachments = new CharacterAttachments(rig);
    this.neutralRootPosition = root.position.clone();
    this.controller = new CharacterAnimationController(
      config.throwReleaseTime,
      undefined,
      config.motionDurations,
      config.animationMetadata,
      config.crossfade,
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
        // Retargeting looks its target nodes up by exact name, so hand it the names the adapter
        // actually resolved. A config may say `Hips` where the asset calls the bone `Hips_51`.
        const resolvedBones = Object.fromEntries(
          [...rig.joints].map(([key, joint]) => [key, joint.node.name]),
        ) as typeof config.bones;
        const imports = await Promise.all(
          config.clipSources.map((clipSource) =>
            importRetargetedClips(scene, source, resolvedBones, clipSource),
          ),
        );
        for (const retargeted of imports) {
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
      const sourceHeightAxis = config.sourceHeightAxis ?? 'y';
      const height = sourceHeightAxis === 'z' ? max.z - min.z : max.y - min.y;
      if (!Number.isFinite(height) || height < 0.01) throw new Error('Invalid character bounds');
      const scale = config.height / height;
      mount = new TransformNode(config.id + '-animated', scene);
      source.parent = mount;
      mount.scaling.setAll(scale);
      if (sourceHeightAxis === 'z') {
        // A few Sketchfab showcases store a standing person along +Z. With a -90° X correction,
        // source Z becomes world Y and source Y becomes -world Z.
        mount.position.set(
          -(min.x + max.x) * 0.5 * scale,
          -min.z * scale,
          (min.y + max.y) * 0.5 * scale,
        );
      } else {
        mount.position.set(
          -(min.x + max.x) * 0.5 * scale,
          -min.y * scale,
          -(min.z + max.z) * 0.5 * scale,
        );
      }
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
  /** Reuse geometry/materials and retargeted clips, but give each NPC its own skeleton/clock. */
  instantiate(parent: TransformNode): HumanoidCharacter {
    const scene = parent.getScene();
    // Babylon identifies container roots through parent === null. The normalised game mount
    // is outside that container; detach only during the synchronous cloning operation.
    const roots = this.container.rootNodes.map((node) => ({ node, parent: node.parent }));
    let instance;
    try {
      for (const { node } of roots) node.parent = null;
      instance = this.container.instantiateModelsToScene((name) => name, false, {
        doNotInstantiate: true,
      });
    } finally {
      for (const { node, parent: owner } of roots) node.parent = owner;
    }
    const source = instance.rootNodes[0];
    if (!(source instanceof TransformNode)) {
      instance.dispose();
      throw new Error('Character instance has no transform root');
    }
    const container = new AssetContainer(scene);
    container.rootNodes = instance.rootNodes;
    container.meshes = source.getChildMeshes();
    container.transformNodes = [source, ...source.getChildTransformNodes()];
    container.skeletons = instance.skeletons;
    container.animationGroups = instance.animationGroups;
    const mount = new TransformNode(this.config.id + '-npc', scene);
    try {
      source.parent = mount;
      source.setEnabled(true);
      mount.position.copyFrom(this.root.position);
      mount.scaling.copyFrom(this.root.scaling);
      mount.rotationQuaternion = this.root.rotationQuaternion!.clone();
      const rig = new SkeletonAdapter(source, container.skeletons, this.config.bones);
      const result = new HumanoidCharacter(mount, rig, this.config, container, this.scale);
      mount.parent = parent;
      return result;
    } catch (error) {
      container.dispose();
      mount.dispose();
      throw error;
    }
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
    const policy = controller.policy();
    this.blend = Math.min(1, this.blend + delta / Math.max(0.001, policy.crossfadeDuration));
    const alpha = this.blend * this.blend * (3 - 2 * this.blend);
    const timing = controller.timing(),
      loop = resolveLoopTime(
        controller.time,
        timing.duration,
        timing.loop ? policy.loopMode : 'once',
      ),
      t = loop.time;
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
      state.sitting &&
      !['sit_down', 'sit_idle', 'sit_idle_alt', 'sit_talk', 'stand_up'].includes(controller.action);
    if (this.rootMotionSerial !== controller.serial) {
      this.rootMotionSerial = controller.serial;
      this.rootMotionTime = controller.time;
    } else if (
      imported &&
      policy.rootMotion &&
      !policy.inPlace &&
      state.applyRootMotion !== false &&
      !state.sitting
    ) {
      // A few exporters animate both a scene root and Hips. Accumulate the complete ancestor
      // chain so extracting root motion exactly replaces what was removed from the sampled pose.
      const deltaMotion = this.rig
        .chainFrom('hips')
        .filter((joint) => imported.hasTranslation(joint.node))
        .reduce(
          (sum, joint) =>
            sum.addInPlace(
              imported.rootMotionDelta(
                joint.node,
                joint,
                this.rootMotionTime,
                controller.time,
                timing.duration,
                range,
                policy.loopMode,
              ),
            ),
          Vector3.Zero(),
        );
      const parent = this.root.parent;
      if (parent instanceof TransformNode && deltaMotion.lengthSquared() > 0) {
        const parentRotation =
          parent.rotationQuaternion ?? Quaternion.FromEulerVector(parent.rotation);
        const modelRotation =
          this.root.rotationQuaternion ?? Quaternion.FromEulerVector(this.root.rotation);
        const transform = Matrix.Compose(
          this.root.scaling,
          parentRotation.multiply(modelRotation),
          Vector3.Zero(),
        );
        parent.position.addInPlace(Vector3.TransformNormal(deltaMotion, transform));
      }
      this.rootMotionTime = controller.time;
    } else this.rootMotionTime = controller.time;
    imported?.sampleFacial(
      clipTime,
      delta,
      timing.loop && policy.loopMode === 'repeat',
      policy.crossfadeDuration,
    );
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
        const sampled = imported.sample(
          j.node,
          j,
          clipTime,
          timing.loop && policy.loopMode === 'repeat',
          policy.crossfadeDuration,
        );
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
          if (
            !state.anchoredSeat &&
            (state.sitting ||
              ['sit_down', 'sit_idle', 'sit_idle_alt', 'sit_talk', 'stand_up'].includes(
                controller.action,
              ))
          ) {
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
      const sampled = imported?.sample(
        j.node,
        j,
        clipTime,
        timing.loop && policy.loopMode === 'repeat',
        policy.crossfadeDuration,
      );
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

  /** Restore the normalised model mount before it is reused by another gameplay character. */
  mount(parent: TransformNode): void {
    this.root.parent = parent;
    this.root.position.copyFrom(this.neutralRootPosition);
  }

  /** Sampled pose first, exact pelvis-to-seat solve second. Bone names come from SkeletonAdapter. */
  alignToSeat(anchor: SeatAnchor, attach = true): void {
    anchor.alignPelvis(this.root, this.rig.joints.get('hips')!.node, attach);
  }

  get bodyMetrics(): Readonly<{ height: number; hipsToGround: number }> {
    return {
      height: this.config.height,
      hipsToGround: this.restHipHeight - this.restFootHeight,
    };
  }

  /** Source-space trajectory used by the Animation Studio; gameplay uses the same joint chain. */
  rootMotionTrajectory(action: HumanoidAction, samples = 48): Vector3[] {
    const clip = this.clips.get(action);
    if (!clip) return [Vector3.Zero(), Vector3.Zero()];
    const range = this.config.clipRanges?.[action] ?? [0, 1];
    const sources = this.rig.chainFrom('hips').filter((joint) => clip.hasTranslation(joint.node));
    const combined = Array.from({ length: samples + 1 }, () => Vector3.Zero());
    for (const joint of sources) {
      const points = clip.trajectory(joint.node, joint, samples, range);
      const first = points[0]!;
      for (const [index, point] of points.entries())
        combined[index]!.addInPlace(point.subtract(first));
    }
    return combined;
  }

  rootMotionBoneNames(action: HumanoidAction): string[] {
    const clip = this.clips.get(action);
    return clip
      ? this.rig
          .chainFrom('hips')
          .filter((joint) => clip.hasTranslation(joint.node))
          .map((joint) => joint.node.name)
      : [];
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
