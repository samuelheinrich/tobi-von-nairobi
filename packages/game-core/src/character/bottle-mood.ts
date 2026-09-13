/** Cartoon intoxication, bounded per run. Does not alter locomotion, physics or the camera. */
export class BottleMood {
  private bottles = 0;
  public constructor(private readonly bottlesToMaximum = 12) {
    if (!Number.isFinite(bottlesToMaximum) || bottlesToMaximum <= 0)
      throw new Error('Positive bottle limit required');
  }
  public collect(): void {
    this.bottles++;
  }
  public get amount(): number {
    return Math.min(1, this.bottles / this.bottlesToMaximum);
  }
  public get label(): string {
    return this.amount >= 0.85
      ? 'VOLLE SCHLAGSEITE'
      : this.amount >= 0.5
        ? 'ORDENTLICH SCHWANKEND'
        : this.amount > 0
          ? 'LEICHT ANGESCHICKERT'
          : 'NOCH GANZ GERADE';
  }
}

export interface CharacterPoseInput {
  time: number;
  gait: number;
  speed: number;
  grounded: boolean;
  mood: number;
  stamina: number;
  pickup: number;
  stumble: number;
  victory: boolean;
}

/** Pure pose calculation keeps exaggerated motion independent of the Babylon rig. */
export function characterPose(input: CharacterPoseInput) {
  const mood = Math.max(0, Math.min(1, input.mood));
  const moving = Math.min(1, input.speed / 7.5);
  const sway = Math.sin(input.time * 2.1) * mood;
  const stride = Math.sin(input.gait) * (input.victory ? 0.7 : moving);
  const tired = input.stamina < 20 && input.grounded ? 0.13 : 0;
  return {
    bodyRoll: sway * (0.07 + moving * 0.13) + input.stumble * 0.25,
    bodyPitch: tired + moving * 0.07 + input.stumble * 0.24,
    bodyX: sway * 0.16,
    bodyY:
      Math.abs(stride) * (0.035 + mood * 0.045) +
      (input.victory ? Math.abs(Math.sin(input.time * 7)) * 0.12 : 0),
    headRoll: -sway * 0.18,
    headYaw: Math.sin(input.time * 1.7) * (0.06 + mood * 0.2),
    leftLeg: input.grounded ? stride * (0.55 + mood * 0.25) : -0.55,
    rightLeg: input.grounded ? -stride * (0.55 + mood * 0.13) : 0.25,
    legSpread: mood * (0.08 + Math.abs(stride) * 0.09),
    leftArm: input.victory ? -2.4 : !input.grounded ? -1.4 : -stride * 0.65 - input.pickup * 1.7,
    rightArm: input.victory ? -2.4 : !input.grounded ? -1.4 : stride * 0.65 - input.stumble,
    armSpread: input.victory ? 0.8 : 0.1 + mood * 0.38 + input.stumble * 0.4,
  };
}
