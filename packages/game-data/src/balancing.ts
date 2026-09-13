export const movement = Object.freeze({
  walkSpeed: 4.2,
  sprintSpeed: 7.5,
  acceleration: 24,
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
});
