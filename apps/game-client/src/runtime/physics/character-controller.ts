import { PhysicsCharacterController } from '@babylonjs/core/Physics/v2/characterController.js';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

/** Babylon 9.26's animated-body constraint estimates velocity from render-frame IDs.
 * Our simulation may run multiple ticks per render (or no render in tests). Use Havok's
 * actual rigid-body velocity at the contact instead. Everything else stays in Babylon's solver. */
export class CharacterController extends PhysicsCharacterController {
  public debugContacts = false;
  public readonly contacts: Vector3[] = [];
  protected override _createSurfaceConstraint(
    ...args: Parameters<PhysicsCharacterController['_createSurfaceConstraint']>
  ): ReturnType<PhysicsCharacterController['_createSurfaceConstraint']> {
    const constraint = super._createSurfaceConstraint(...args);
    const contact = args[1],
      body = contact.bodyB.body;
    if (this.debugContacts && contact.distance < 0.08 && this.contacts.length < 8)
      this.contacts.push(contact.position.clone());
    if (body.getMotionType(contact.bodyB.index) === PhysicsMotionType.ANIMATED) {
      const linear = body.getLinearVelocity(contact.bodyB.index);
      const angular = body.getAngularVelocity(contact.bodyB.index);
      const centre = Vector3.TransformCoordinates(
        body.getMassProperties().centerOfMass ?? Vector3.Zero(),
        body.transformNode.computeWorldMatrix(true),
      );
      constraint.velocity
        .copyFrom(linear)
        .addInPlace(Vector3.Cross(angular, contact.position.subtract(centre)));
      constraint.angularVelocity.copyFrom(angular);
      constraint.planeDistance =
        contact.distance - Vector3.Dot(constraint.velocity, constraint.planeNormal) * args[2];
      constraint.priority = 1;
    }
    return constraint;
  }
}
