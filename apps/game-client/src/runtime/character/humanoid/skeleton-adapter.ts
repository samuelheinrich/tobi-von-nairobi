import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Skeleton } from '@babylonjs/core/Bones/skeleton.js';
import type { BoneMap, HumanoidBone } from './schema.js';

export interface Joint {
  node: TransformNode;
  rest: Quaternion;
  position: Vector3;
  /** Rest orientation in the source model coordinate system, without glTF handedness conversion. */
  frame: Quaternion;
}
/** Resolves linked glTF nodes once. Rotations are always relative to the original bind pose. */
export class SkeletonAdapter {
  readonly extraJoints = new Map<string, Joint>();
  readonly joints = new Map<HumanoidBone, Joint>();
  constructor(
    readonly root: TransformNode,
    skeletons: readonly Skeleton[],
    map: BoneMap,
  ) {
    for (const skeleton of skeletons) skeleton.returnToRest();
    const nodes = root.getChildTransformNodes(false);
    for (const [key, name] of Object.entries(map) as [HumanoidBone, string][]) {
      const node =
        skeletons
          .flatMap((s) => s.bones)
          .find((b) => b.name === name)
          ?.getTransformNode() ?? nodes.find((n) => n.name === name);
      if (!node) throw new Error('Humanoid bone missing: ' + key + ' -> ' + name);
      const rest = node.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(node.rotation);
      node.rotationQuaternion = rest.clone();
      let frame = rest.clone();
      for (let p = node.parent; p && p !== root; p = p.parent) {
        if ('rotation' in p) {
          const parent = p as TransformNode;
          frame = (
            parent.rotationQuaternion ?? Quaternion.FromEulerVector(parent.rotation)
          ).multiply(frame);
        }
      }
      this.joints.set(key, { node, rest, position: node.position.clone(), frame });
    }
    const mapped = new Set([...this.joints.values()].map((j) => j.node));
    for (const bone of skeletons.flatMap((s) => s.bones)) {
      const node = bone.getTransformNode();
      if (!node || mapped.has(node)) continue;
      const rest = node.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(node.rotation);
      node.rotationQuaternion = rest.clone();
      this.extraJoints.set(bone.name, {
        node,
        rest,
        position: node.position.clone(),
        frame: rest.clone(),
      });
    }
  }
  /** Convert a rotation expressed in character space to this joint's bind frame. */
  rotation(key: HumanoidBone, delta: Quaternion): Quaternion {
    const j = this.joints.get(key)!;
    return j.rest.multiply(j.frame.conjugate().multiply(delta).multiply(j.frame)).normalize();
  }
  neutralArm(side: 'left' | 'right', clearance: number): Quaternion {
    const upper = this.joints.get(side === 'left' ? 'leftUpperArm' : 'rightUpperArm')!;
    const lower = this.joints.get(side === 'left' ? 'leftLowerArm' : 'rightLowerArm')!;
    const from = lower.position.rotateByQuaternionToRef(upper.frame, new Vector3()).normalize();
    const to = new Vector3(side === 'left' ? clearance : -clearance, -1, 0).normalize();
    const q = Quaternion.Identity();
    Quaternion.FromUnitVectorsToRef(from, to, q);
    return q;
  }
}
