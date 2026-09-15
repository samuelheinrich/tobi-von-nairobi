import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { PropAttachmentPreset } from './schema.js';
import type { SkeletonAdapter } from './skeleton-adapter.js';

/** A prop owns its local offset. Reparent with world transform preservation at release. */
export class CharacterAttachments {
  constructor(private readonly rig: SkeletonAdapter) {}
  attach(prop: TransformNode, preset: PropAttachmentPreset): void {
    const joint = this.rig.joints.get(preset.socket === 'right_hand' ? 'rightHand' : 'leftHand')!;
    prop.parent = joint.node;
    prop.position.set(...preset.position);
    prop.rotationQuaternion = Quaternion.FromEulerAngles(...preset.rotation);
    prop.scaling.set(...preset.scale);
  }
  detach(prop: TransformNode): TransformNode {
    const world = prop.computeWorldMatrix(true).clone();
    prop.parent = null;
    prop.rotationQuaternion = Quaternion.Identity();
    world.decompose(prop.scaling, prop.rotationQuaternion, prop.position);
    return prop;
  }
  /** Rotate a prop's local +Y tip toward a target, preserving its hand-space grip position. */
  aimAt(prop: TransformNode, worldTarget: Vector3, amount: number): void {
    if (!(prop.parent instanceof TransformNode)) return;
    const localTarget = Vector3.TransformCoordinates(
      worldTarget,
      Matrix.Invert(prop.parent.computeWorldMatrix(true)),
    );
    const direction = localTarget.subtract(prop.position).normalize();
    const aim = Quaternion.Identity();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction, aim);
    prop.rotationQuaternion = Quaternion.Slerp(
      prop.rotationQuaternion ?? Quaternion.Identity(),
      aim,
      Math.max(0, Math.min(1, amount)),
    );
  }
  position(socket: 'right_hand' | 'left_hand'): Vector3 {
    return this.rig.joints
      .get(socket === 'right_hand' ? 'rightHand' : 'leftHand')!
      .node.getAbsolutePosition()
      .clone();
  }
}
