import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { InputActions } from '@tobi/contracts';

export interface AircraftControllerConfig {
  initialSpeed: number;
  initialAltitude: number;
  minSpeed: number;
  maxSpeed: number;
  cruiseSpeed: number;
  thrustAcceleration: number;
  drag: number;
  gravity: number;
  maxPitch: number;
  maxRoll: number;
  pitchRate: number;
  rollRate: number;
  yawRate: number;
  landingDuration: number;
  touchdownAltitude: number;
  touchdownZ: number;
}

/** Lightweight arcade flight model. It is kinematic by design and reusable by aircraft scenes. */
export class AircraftController {
  readonly position: Vector3;
  speed: number;
  throttle = 0.64;
  pitch = 0;
  roll = 0;
  heading = 0;
  verticalSpeed = 0;
  gearDown = true;
  active = false;
  landing = false;
  landed = false;
  landingProgress = 0;
  private landingAltitude = 0;
  private landingZ = 0;

  constructor(
    private readonly root: TransformNode,
    private readonly config: AircraftControllerConfig,
  ) {
    this.position = new Vector3(0, config.initialAltitude, 0);
    this.speed = config.initialSpeed;
  }

  start(): void {
    this.active = true;
    this.root.position.copyFrom(this.position);
    this.root.setEnabled(true);
  }

  beginLanding(): void {
    if (!this.active || this.landing || this.landed) return;
    this.landing = true;
    this.gearDown = true;
    this.landingAltitude = this.position.y;
    this.landingZ = this.position.z;
    this.landingProgress = 0;
  }

  step(delta: number, input: InputActions): void {
    if (!this.active) return;
    if (this.landed) return;
    if (this.landing) {
      this.stepLanding(delta);
      return;
    }
    this.throttle = Math.max(
      0.18,
      Math.min(
        1,
        this.throttle +
          (input.sprintHeld ? 0.34 : 0) * delta -
          (input.jumpPressed ? 0.38 : 0) * delta,
      ),
    );
    const pitchTarget = Math.max(-1, Math.min(1, -input.moveZ)) * this.config.maxPitch;
    const rollTarget = Math.max(-1, Math.min(1, -input.moveX)) * this.config.maxRoll;
    const approach = (value: number, target: number, rate: number) =>
      value + Math.max(-rate * delta, Math.min(rate * delta, target - value));
    this.pitch = approach(this.pitch, pitchTarget, this.config.pitchRate);
    this.roll = approach(this.roll, rollTarget, this.config.rollRate);
    this.heading +=
      Math.sin(-this.roll) * this.config.yawRate * delta * (this.speed / this.config.cruiseSpeed);

    const thrust = this.throttle * this.config.thrustAcceleration;
    const drag = this.config.drag * this.speed * (0.65 + this.speed / this.config.maxSpeed);
    this.speed = Math.max(
      this.config.minSpeed,
      Math.min(this.config.maxSpeed, this.speed + (thrust - drag) * delta),
    );
    const liftBalance = (this.speed / this.config.cruiseSpeed) ** 2 - 1;
    const targetVertical =
      Math.sin(this.pitch) * this.speed + liftBalance * this.config.gravity * 1.8;
    this.verticalSpeed += (targetVertical - this.verticalSpeed) * (1 - Math.exp(-delta * 1.4));
    this.position.x += Math.sin(this.heading) * Math.cos(this.pitch) * this.speed * delta;
    this.position.z += Math.cos(this.heading) * Math.cos(this.pitch) * this.speed * delta;
    this.position.y = Math.max(45, this.position.y + this.verticalSpeed * delta);
    this.root.position.copyFrom(this.position);
    this.root.rotationQuaternion = Quaternion.FromEulerAngles(this.pitch, this.heading, this.roll);
  }

  private stepLanding(delta: number): void {
    this.landingProgress = Math.min(1, this.landingProgress + delta / this.config.landingDuration);
    const progress = this.landingProgress;
    const smooth = progress * progress * (3 - 2 * progress);
    const flare = progress > 0.82 ? (progress - 0.82) / 0.18 : 0;
    const pitchTarget = -0.075 * (1 - flare) + 0.035 * flare;
    const blend = 1 - Math.exp(-delta * 2.2);
    this.pitch += (pitchTarget - this.pitch) * blend;
    this.roll += (0 - this.roll) * blend;
    this.heading += (0 - this.heading) * (1 - Math.exp(-delta * 0.8));
    this.throttle += (0.32 - this.throttle) * blend;
    const targetSpeed = 66 - flare * 18;
    this.speed += (targetSpeed - this.speed) * (1 - Math.exp(-delta * 0.7));
    this.position.x += (0 - this.position.x) * (1 - Math.exp(-delta * 0.35));
    this.position.z =
      this.landingZ + (this.config.touchdownZ - this.landingZ) * (progress * (2 - progress));
    this.position.y =
      this.landingAltitude + (this.config.touchdownAltitude - this.landingAltitude) * smooth;
    this.verticalSpeed =
      ((this.config.touchdownAltitude - this.landingAltitude) * 6 * progress * (1 - progress)) /
      this.config.landingDuration;
    if (progress === 1) {
      this.position.y = this.config.touchdownAltitude;
      this.speed = 0;
      this.verticalSpeed = 0;
      this.pitch = 0;
      this.roll = 0;
      this.landing = false;
      this.landed = true;
    }
    this.root.position.copyFrom(this.position);
    this.root.rotationQuaternion = Quaternion.FromEulerAngles(this.pitch, this.heading, this.roll);
  }

  get snapshot() {
    return {
      speed: this.speed,
      altitude: this.position.y,
      pitch: this.pitch,
      roll: this.roll,
      heading: this.heading,
      throttle: this.throttle,
      gearDown: this.gearDown,
      landingProgress: this.landingProgress,
      landed: this.landed,
    };
  }
}
