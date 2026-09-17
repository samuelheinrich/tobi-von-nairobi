import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type {
  AnimationGroup,
  TargetedAnimation,
} from '@babylonjs/core/Animations/animationGroup.js';
import { MorphTarget } from '@babylonjs/core/Morph/morphTarget.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Joint } from './skeleton-adapter.js';
import type { AnimationLoopMode } from './schema.js';

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
  sampleFacial(time: number, delta: number, loop = true, crossfadeDuration = 0): void {
    for (const track of this.facial) {
      const target = track.target as MorphTarget,
        first = track.animation.getKeys()[0]!.frame,
        phase = loop ? time % this.duration : Math.max(0, Math.min(this.duration, time));
      let value: unknown = track.animation.evaluate(first + phase * track.animation.framePerSecond);
      if (
        typeof value === 'number' &&
        loop &&
        crossfadeDuration > 0 &&
        phase > this.duration - crossfadeDuration
      ) {
        const initial: unknown = track.animation.evaluate(first);
        if (typeof initial === 'number')
          value +=
            (initial - value) * ((phase - (this.duration - crossfadeDuration)) / crossfadeDuration);
      }
      if (typeof value === 'number')
        target.influence += (value - target.influence) * Math.min(1, delta * 16);
    }
  }
  sample(
    node: TransformNode,
    joint: Joint,
    time: number,
    loop = true,
    crossfadeDuration = 0,
  ): { rotation: Quaternion; position: Vector3 } {
    let rotation = joint.rest.clone();
    const position = joint.position.clone();
    for (const track of this.tracks.get(node) ?? []) {
      const keys = track.animation.getKeys(),
        first = keys[0]!.frame;
      const phase = loop ? time % this.duration : Math.min(time, this.duration);
      const frame = first + phase * track.animation.framePerSecond;
      const value: unknown = track.animation.evaluate(frame);
      if (track.animation.targetProperty === 'rotationQuaternion' && value instanceof Quaternion) {
        rotation = value.clone();
        if (loop && crossfadeDuration > 0 && phase > this.duration - crossfadeDuration) {
          const initial: unknown = track.animation.evaluate(first);
          if (initial instanceof Quaternion)
            rotation = Quaternion.Slerp(
              rotation,
              initial,
              (phase - (this.duration - crossfadeDuration)) / crossfadeDuration,
            );
        }
      }
      // In-place: horizontal root motion is ignored; only hips may bob relative to their first key.
      if (track.animation.targetProperty === 'position' && value instanceof Vector3) {
        const initial: unknown = track.animation.evaluate(first);
        if (initial instanceof Vector3) position.y += value.y - initial.y;
      }
    }
    return { rotation, position };
  }

  private translation(node: TransformNode, joint: Joint, time: number): Vector3 {
    for (const track of this.tracks.get(node) ?? []) {
      if (track.animation.targetProperty !== 'position') continue;
      const keys = track.animation.getKeys();
      const first = keys[0]!.frame;
      const value: unknown = track.animation.evaluate(
        first + Math.max(0, Math.min(this.duration, time)) * track.animation.framePerSecond,
      );
      if (value instanceof Vector3) return value.clone();
    }
    return joint.position.clone();
  }

  hasTranslation(node: TransformNode): boolean {
    return (this.tracks.get(node) ?? []).some(
      (track) => track.animation.targetProperty === 'position',
    );
  }

  /** Horizontal source-space travel with completed loops accumulated rather than discarded. */
  rootMotionDelta(
    node: TransformNode,
    joint: Joint,
    before: number,
    after: number,
    actionDuration: number,
    range: readonly [number, number],
    mode: AnimationLoopMode,
  ): Vector3 {
    const segmentStart = range[0] * this.duration;
    const segmentDuration = Math.max(0.0001, (range[1] - range[0]) * this.duration);
    const actionToClip = (time: number) =>
      (Math.max(0, time) / Math.max(0.0001, actionDuration)) * segmentDuration;
    const start = this.translation(node, joint, segmentStart);
    const end = this.translation(node, joint, segmentStart + segmentDuration);
    const travel = end.subtract(start);
    const continuous = (elapsed: number) => {
      if (mode === 'once')
        return this.translation(node, joint, segmentStart + Math.min(segmentDuration, elapsed));
      if (mode === 'pingpong') {
        const leg = Math.floor(elapsed / segmentDuration);
        const phase = elapsed % segmentDuration;
        return this.translation(
          node,
          joint,
          segmentStart + (leg % 2 ? segmentDuration - phase : phase),
        );
      }
      const cycle = Math.floor(elapsed / segmentDuration);
      const phase = elapsed % segmentDuration;
      return this.translation(node, joint, segmentStart + phase).add(travel.scale(cycle));
    };
    const delta = continuous(actionToClip(after)).subtract(continuous(actionToClip(before)));
    delta.y = 0;
    return delta;
  }

  trajectory(
    node: TransformNode,
    joint: Joint,
    samples = 24,
    range: readonly [number, number] = [0, 1],
  ): Vector3[] {
    const start = range[0] * this.duration;
    const span = (range[1] - range[0]) * this.duration;
    return Array.from({ length: samples + 1 }, (_, index) =>
      this.translation(node, joint, start + (span * index) / samples),
    );
  }
}
