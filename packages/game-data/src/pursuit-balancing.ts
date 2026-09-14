/** Seconds and metres. Chase speed tracks Tobi's walk so sprinting stays the way out, and the
 * time windows are scaled by the same factor: a faster game must not silently mean a patrol that
 * covers far more ground inside the escape timer.
 */
export const pursuitBalance = Object.freeze({
  chaosPerBottle: 16,
  provokeChaos: 20,
  provokeCooldown: 3,
  chaosDecayDelay: 10,
  chaosDecayPerSecond: 1.5,
  wantedThresholds: [41, 61, 71, 81, 95] as readonly number[],
  escapeDuration: 9,
  sightRange: 15,
  suspicionDuration: 0.6,
  chaseSpeed: 6.1,
  patrolSpeed: 2.4,
  captureRadius: 1.25,
  captureDuration: 1.6,
  searchDuration: 9,
  aiInterval: 0.1,
  repathInterval: 0.6,
  escapeBonus: 500,
});
