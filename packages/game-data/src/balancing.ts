/** Metres, seconds and metres per second. Tobi moves at a brisk arcade pace, not a walking sim. */
export const movement = Object.freeze({
  walkSpeed: 5.8,
  sprintSpeed: 10.2,
  acceleration: 30,
  gravity: -22,
  jumpSpeed: 7.8,
  coyoteSeconds: 0.1,
  jumpBufferSeconds: 0.12,
  maxStamina: 100,
  staminaDrainPerSecond: 22,
  staminaRegenPerSecond: 16,
  staminaRegenDelay: 0.8,
  staminaRestartThreshold: 20,
  capsuleHeight: 1.8,
  capsuleRadius: 0.42,
});

export const prototypeBalance = Object.freeze({
  pickupRadius: 1.8,
  bottlePoints: 100,
  completionBonus: 500,
  fixedStep: 1 / 60,
  maxSubSteps: 5,
  cameraDistance: 7,
  cameraHeight: 1.8,
  cameraSensitivity: 0.0025,
  /** Throwing follows the camera, so the pitch limits below define the reachable arc. */
  throwSpeed: 18,
  throwPitchMin: -0.55,
  throwPitchMax: 0.95,
});

/** Shared reaction ranges for NPCs that talk back instead of calling the police. */
export const socialBalance = Object.freeze({
  tauntRange: 8,
  flirtRange: 5,
  flirtCooldownSeconds: 1.2,
  replySeconds: 3.2,
});
