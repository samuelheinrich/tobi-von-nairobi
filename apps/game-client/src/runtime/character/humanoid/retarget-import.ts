import { AnimatorAvatar } from '@babylonjs/core/Animations/animatorAvatar.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup.js';
import { normaliseBoneName, type BoneMap, type ClipSource } from './schema.js';

/** Import-stage retargeting only, never per-frame. Source assets and their bind poses stay intact.
 * Babylon adjusts bind-frame differences; our clip sampler subsequently removes horizontal root motion. */
export async function importRetargetedClips(
  scene: Scene,
  target: TransformNode,
  targetBones: BoneMap,
  source: ClipSource,
): Promise<Map<string, AnimationGroup>> {
  const container = await LoadAssetContainerAsync(source.model, scene);
  const result = new Map<string, AnimationGroup>();
  try {
    for (const group of container.animationGroups) group.stop();
    const avatar = new AnimatorAvatar('retarget-target', target, false, false);
    const mapNodeNames = new Map(
      Object.entries(source.bones).map(([key, name]) => [name, targetBones[key as keyof BoneMap]]),
    );
    // Mixamo exports the same humanoid hierarchy with a different namespace per upload. Map
    // compatible shoulders, toes and fingers as well as the 17 gameplay bones so shared clips do
    // not discard their detailed tracks merely because one file says `mixamorig7:`.
    const targetByCanonical = new Map<string, string>();
    for (const node of [target, ...target.getChildTransformNodes(false)]) {
      const key = normaliseBoneName(node.name);
      if (!targetByCanonical.has(key)) targetByCanonical.set(key, node.name);
    }
    for (const node of container.transformNodes) {
      const match = targetByCanonical.get(normaliseBoneName(node.name));
      if (match && !mapNodeNames.has(node.name)) mapNodeNames.set(node.name, match);
    }
    for (const [action, name] of Object.entries(source.animations)) {
      const clip = container.animationGroups.find((c) => c.name === name);
      if (!clip) throw new Error('Source clip missing: ' + name);
      // Do not ask Babylon to retarget fingers/toes that the target rig does not expose. Besides
      // producing no useful motion, each absent track emitted a warning for every source clip and
      // made loading Character Creator/Blender rigs needlessly noisy and slower.
      for (const track of [...clip.targetedAnimations])
        if (track.target instanceof TransformNode && !mapNodeNames.has(track.target.name))
          clip.removeTargetedAnimation(track.animation);
      const retargeted = avatar.retargetAnimationGroup(clip, {
        animationGroupName: action,
        mapNodeNames,
        fixAnimations: true,
        retargetAnimationKeys: true,
        fixRootPosition: true,
        rootNodeName: source.bones.hips,
        groundReferenceNodeName: source.bones.leftFoot,
        groundReferenceVerticalAxis: 'Y',
      });
      retargeted.stop();
      // Blender's armature wrapper is not a humanoid joint and differs between exported bodies.
      // Keeping its track makes every later NPC instance emit a missing-bone warning; locomotion
      // and vertical hip motion come from Hips, so the wrapper track is deliberately discarded.
      for (const track of [...retargeted.targetedAnimations])
        if (normaliseBoneName(track.target?.name ?? '') === 'armature')
          retargeted.removeTargetedAnimation(track.animation);
      if (!retargeted.targetedAnimations.length) {
        retargeted.dispose();
        throw new Error('Retarget produced no tracks: ' + name);
      }
      result.set(action, retargeted);
    }
    return result;
  } catch (error) {
    for (const clip of result.values()) clip.dispose();
    throw error;
  } finally {
    container.dispose();
  }
}
