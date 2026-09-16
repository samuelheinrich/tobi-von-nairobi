import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { physicsWorld } from './havok-world.js';

/** Reusable detached prop with a small primitive body; the original held mesh is retained. */
export function dynamicProp(scene: Scene, node: TransformNode, velocity: Vector3) {
  const world = physicsWorld(scene);
  if (!world) throw new Error('Dynamic props require the shared HavokWorld.');
  const proxy = MeshBuilder.CreateCapsule(
    'projectile-capsule',
    { height: 0.56, radius: 0.1, tessellation: 8 },
    scene,
  );
  proxy.isVisible = false;
  proxy.isPickable = false;
  node.computeWorldMatrix(true);
  const scale = new Vector3(),
    rotation = new Quaternion(),
    position = new Vector3();
  node.getWorldMatrix().decompose(scale, rotation, position);
  proxy.position.copyFrom(position);
  proxy.rotationQuaternion = rotation;
  proxy.scaling.copyFrom(scale);
  node.parent = proxy;
  node.position.setAll(0);
  node.rotation.setAll(0);
  node.rotationQuaternion = Quaternion.Identity();
  node.scaling.setAll(1);
  const collider = world.addCollider(proxy, {
    collision: 'capsule',
    layer: 'PROJECTILE',
    motion: 'dynamic',
    mass: 0.4,
    restitution: 0.18,
    friction: 0.6,
    walkable: false,
  })!;
  collider.aggregate.body.setLinearVelocity(velocity);
  collider.aggregate.body.setAngularVelocity(new Vector3(10, 2, 1));
  let contact = false;
  collider.aggregate.body.setCollisionCallbackEnabled(true);
  collider.aggregate.body.getCollisionObservable().add(() => {
    contact = true;
  });
  return {
    proxy,
    collider,
    get contacted() {
      return contact;
    },
    dispose() {
      world.remove(collider);
      proxy.dispose();
    },
  };
}
export type DynamicProp = ReturnType<typeof dynamicProp>;
