import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type {
  AnimationGroup,
  TargetedAnimation,
} from '@babylonjs/core/Animations/animationGroup.js';
import { MorphTarget } from '@babylonjs/core/Morph/morphTarget.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Joint } from './skeleton-adapter.js';

/** Import boundary for authored/retargeted clips. Never runs a second animation clock.
 * External tracks must already target this model's linked nodes (retarget in the import step). */
export class ClipSampler {
  readonly duration: number;
  private readonly facial: TargetedAnimation[] = [];
  private readonly tracks = new Map<TransformNode, TargetedAnimation[]>();
  constructor(clip: AnimationGroup) {
    for (const track of clip.targetedAnimations)
      if (track.target instanceof TransformNode) {
        const tracks = this.tracks.get(track.target) ?? [];
        tracks.push(track);
        this.tracks.set(track.target, tracks);
      }
    this.facial = clip.targetedAnimations.filter(
      (t) => t.target instanceof MorphTarget && t.animation.targetProperty === 'influence',
    );
    this.duration = Math.max(
      ...clip.targetedAnimations.map((t) => {
        const keys = t.animation.getKeys();
        return (keys.at(-1)!.frame - keys[0]!.frame) / t.animation.framePerSecond;
      }),
      0.01,
    );
  }
  sampleFacial(time: number, delta: number): void {
    for (const track of this.facial) {
      const target = track.target as MorphTarget,
        first = track.animation.getKeys()[0]!.frame;
      const value: unknown = track.animation.evaluate(
        first + (time % this.duration) * track.animation.framePerSecond,
      );
      if (typeof value === 'number')
        target.influence += (value - target.influence) * Math.min(1, delta * 16);
    }
  }
  sample(
    node: TransformNode,
    joint: Joint,
    time: number,
    loop = true,
  ): { rotation: Quaternion; position: Vector3 } {
    let rotation = joint.rest.clone();
    const position = joint.position.clone();
    for (const track of this.tracks.get(node) ?? []) {
      const keys = track.animation.getKeys(),
        first = keys[0]!.frame;
      const frame =
        first +
        (loop ? time % this.duration : Math.min(time, this.duration)) *
          track.animation.framePerSecond;
      const value: unknown = track.animation.evaluate(frame);
      if (track.animation.targetProperty === 'rotationQuaternion' && value instanceof Quaternion)
        rotation = value.clone();
      // In-place: horizontal root motion is ignored; only hips may bob relative to their first key.
      if (track.animation.targetProperty === 'position' && value instanceof Vector3) {
        const initial: unknown = track.animation.evaluate(first);
        if (initial instanceof Vector3) position.y += value.y - initial.y;
      }
    }
    return { rotation, position };
  }
}
