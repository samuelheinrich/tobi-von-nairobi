/** Remember the character's last movement direction, independently of the orbit camera. */
export class CharacterFacing {
  public yaw = 0;
  public update(velocity: { x: number; z: number }): void {
    if (Math.hypot(velocity.x, velocity.z) > 0.1) this.yaw = Math.atan2(velocity.x, velocity.z);
  }
}
