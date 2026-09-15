import { AnimatorAvatar } from '@babylonjs/core/Animations/animatorAvatar.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup.js';
import type { BoneMap, ClipSource } from './schema.js';

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
    for (const [action, name] of Object.entries(source.animations)) {
      const clip = container.animationGroups.find((c) => c.name === name);
      if (!clip) throw new Error('Source clip missing: ' + name);
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
