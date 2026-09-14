import type { InputActions, Position3 } from '@tobi/contracts';

export interface MovementConfig {
  walkSpeed: number;
  sprintSpeed: number;
  acceleration: number;
  gravity: number;
  jumpSpeed: number;
  coyoteSeconds: number;
  jumpBufferSeconds: number;
  maxStamina: number;
  staminaDrainPerSecond: number;
  staminaRegenPerSecond: number;
  staminaRegenDelay: number;
  staminaRestartThreshold: number;
}

/** Pure movement intention. Collision and support are provided by a CharacterMotor adapter. */
export class Locomotion {
  public stamina: number;
  public velocity: Position3 = { x: 0, y: 0, z: 0 };
  public sprinting = false;
  private exhausted = false;
  private recoveryDelay = 0;
  private coyote = 0;
  private jumpBuffer = 0;
  private jumpConsumed = false;

  public constructor(private readonly config: MovementConfig) {
    this.stamina = config.maxStamina;
  }

  /** A fresh bottle clears exhaustion and the regeneration delay, not only the stamina number. */
  public refill(): void {
    this.stamina = this.config.maxStamina;
    this.exhausted = false;
    this.recoveryDelay = 0;
  }

  public step(actions: InputActions, yaw: number, grounded: boolean, delta: number): Position3 {
    const c = this.config;
    if (!grounded) this.jumpConsumed = false;
    this.coyote =
      grounded && !this.jumpConsumed ? c.coyoteSeconds : Math.max(0, this.coyote - delta);
    this.jumpBuffer = actions.jumpPressed
      ? c.jumpBufferSeconds
      : Math.max(0, this.jumpBuffer - delta);
    const length = Math.hypot(actions.moveX, actions.moveZ);
    const divisor = Math.max(1, length);
    const x = actions.moveX / divisor;
    const z = actions.moveZ / divisor;
    if (this.exhausted && this.stamina >= c.staminaRestartThreshold) this.exhausted = false;
    this.sprinting = actions.sprintHeld && length > 0.01 && !this.exhausted && this.stamina > 0;
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - c.staminaDrainPerSecond * delta);
      this.recoveryDelay = c.staminaRegenDelay;
      if (this.stamina === 0) this.exhausted = true;
    } else {
      this.recoveryDelay = Math.max(0, this.recoveryDelay - delta);
      if (this.recoveryDelay === 0)
        this.stamina = Math.min(c.maxStamina, this.stamina + c.staminaRegenPerSecond * delta);
    }
    const speed = this.sprinting ? c.sprintSpeed : c.walkSpeed;
    const targetX = (x * Math.cos(yaw) + z * Math.sin(yaw)) * speed;
    const targetZ = (-x * Math.sin(yaw) + z * Math.cos(yaw)) * speed;
    const approach = (value: number, target: number): number =>
      value + Math.max(-c.acceleration * delta, Math.min(c.acceleration * delta, target - value));
    this.velocity.x = approach(this.velocity.x, targetX);
    this.velocity.z = approach(this.velocity.z, targetZ);
    if (grounded && this.velocity.y <= 0) this.velocity.y = 0;
    if (this.jumpBuffer > 0 && this.coyote > 0 && !this.jumpConsumed) {
      this.velocity.y = c.jumpSpeed;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.jumpConsumed = true;
    } else if (!grounded) this.velocity.y += c.gravity * delta;
    return { ...this.velocity };
  }

  public reset(): void {
    this.velocity = { x: 0, y: 0, z: 0 };
    this.stamina = this.config.maxStamina;
    this.sprinting = false;
    this.exhausted = false;
    this.recoveryDelay = this.coyote = this.jumpBuffer = 0;
    this.jumpConsumed = false;
  }
}
