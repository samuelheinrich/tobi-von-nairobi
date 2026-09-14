export type SoundCue =
  | 'drink'
  | 'throw'
  | 'smash'
  | 'powerup'
  | 'pickup'
  | 'jump'
  | 'land'
  | 'step'
  | 'hiccup'
  | 'stumble'
  | 'alert'
  | 'escape'
  | 'caught'
  | 'provoke'
  | 'victory';
type Note = readonly [frequency: number, duration: number, delay?: number, endFrequency?: number];
const cues: Record<SoundCue, readonly Note[]> = {
  drink: [
    [160, 0.12, 0, 290],
    [210, 0.14, 0.12, 140],
  ],
  throw: [[500, 0.18, 0, 150]],
  smash: [
    [1900, 0.1, 0, 300],
    [2700, 0.14, 0.025, 700],
  ],
  powerup: [
    [330, 0.15, 0, 660],
    [660, 0.3, 0.15, 1320],
  ],
  pickup: [
    [1100, 0.14],
    [1650, 0.18, 0.05],
    [380, 0.13, 0.17, 200],
  ],
  jump: [[220, 0.18, 0, 540]],
  land: [[100, 0.12, 0, 40]],
  step: [[95, 0.045, 0, 45]],
  hiccup: [
    [210, 0.09, 0, 430],
    [170, 0.1, 0.09, 120],
  ],
  stumble: [
    [340, 0.15, 0, 120],
    [120, 0.08, 0.15],
  ],
  alert: [
    [740, 0.15],
    [980, 0.2, 0.17],
  ],
  escape: [
    [392, 0.14],
    [523, 0.14, 0.14],
    [784, 0.25, 0.28],
  ],
  caught: [
    [330, 0.2],
    [247, 0.2, 0.2],
    [165, 0.4, 0.4],
  ],
  provoke: [
    [180, 0.13, 0, 300],
    [240, 0.16, 0.15, 160],
  ],
  victory: [
    [523, 0.16],
    [659, 0.16, 0.16],
    [784, 0.16, 0.32],
    [1047, 0.4, 0.5],
  ],
};

/** Original synthesized foley and ambience. One bounded voice pool, no external assets or timers. */
export class AudioFeedback {
  public constructor(
    private readonly createContext: () => AudioContext = () => new AudioContext(),
  ) {}
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private readonly voices = new Set<OscillatorNode>();
  private silent = false;
  private paused = false;
  private disposed = false;
  private ambienceTime = 0;
  private sirenTime = 0;
  private stepDistance = 0;
  private beatTime = 0;
  private beat = 0;
  public environment(delta: number, scenery: string): void {
    if (this.paused || this.silent) return;
    this.beatTime += delta;
    if (this.beatTime < (scenery === 'street-parade' ? 0.46 : 0.36)) return;
    this.beatTime = 0;
    this.beat++;
    if (scenery === 'street-parade') {
      this.tone(100, 0.16, 0, 40, 0.065);
      this.tone(this.beat % 4 < 2 ? 165 : 196, 0.25, 0.12, 165, 0.018, 'triangle');
    }
    if (scenery === 'railway') {
      this.tone(80, 0.07, 0, 45, 0.025);
      this.tone(120, 0.05, 0.12, 65, 0.018);
    }
  }
  public get muted(): boolean {
    return this.silent;
  }
  public set muted(value: boolean) {
    this.silent = value;
    if (this.master && this.context)
      this.master.gain.setValueAtTime(value || this.paused ? 0 : 0.6, this.context.currentTime);
    if (value) this.clearVoices();
  }
  /** Must be called synchronously from a click/key gesture, before any login/run network request. */
  public start(): void {
    if (this.disposed) return;
    try {
      if (!this.context) {
        this.context = this.createContext();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
      }
      this.paused = false;
      this.muted = this.silent;
      void this.context.resume().catch(() => undefined);
    } catch {
      /* Audio support is optional; gameplay continues. */
    }
  }
  public pause(): void {
    this.paused = true;
    this.clearVoices();
    if (this.context && this.master) {
      this.master.gain.setValueAtTime(0, this.context.currentTime);
      void this.context.suspend().catch(() => undefined);
    }
  }
  public play(cue: SoundCue): void {
    for (const [frequency, duration, delay = 0, end = frequency] of cues[cue])
      this.tone(
        frequency,
        duration,
        delay,
        end,
        cue === 'step' ? 0.026 : 0.065,
        cue === 'hiccup' || cue === 'provoke' ? 'triangle' : 'sine',
      );
  }
  public pickup(): void {
    this.play('pickup');
  }
  public victory(): void {
    this.play('victory');
  }
  public update(
    delta: number,
    speed: number,
    grounded: boolean,
    wanted: number,
    night: boolean,
  ): void {
    if (this.paused || this.silent) return;
    if (grounded && speed > 0.5) {
      this.stepDistance += speed * delta;
      if (this.stepDistance >= 1.6) {
        this.stepDistance %= 1.6;
        this.play('step');
      }
    } else this.stepDistance = 0;
    this.sirenTime += delta;
    if (wanted > 0 && this.sirenTime >= 1.8) {
      this.sirenTime = 0;
      this.tone(540, 0.65, 0, 850, 0.026);
      this.tone(850, 0.65, 0.65, 540, 0.026);
    }
    this.ambienceTime += delta;
    if (this.ambienceTime >= 5) {
      this.ambienceTime = 0;
      if (night) {
        for (let i = 0; i < 3; i++) this.tone(2100, 0.05, i * 0.14, 2600, 0.012);
      } else {
        this.tone(900, 0.28, 0, 1250, 0.018);
        this.tone(1250, 0.35, 0.25, 780, 0.014);
      }
    }
  }
  private tone(
    frequency: number,
    duration: number,
    delay = 0,
    end = frequency,
    volume = 0.04,
    type: OscillatorType = 'sine',
  ): void {
    if (
      !this.context ||
      !this.master ||
      this.silent ||
      this.paused ||
      this.context.state !== 'running' ||
      this.voices.size >= 24
    )
      return;
    const oscillator = this.context.createOscillator(),
      gain = this.context.createGain();
    const time = this.context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(end, time + duration);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + Math.min(0.012, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain).connect(this.master);
    this.voices.add(oscillator);
    oscillator.onended = () => {
      this.voices.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(time);
    oscillator.stop(time + duration);
  }
  private clearVoices(): void {
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {
        /* already stopped */
      }
    }
  }
  public dispose(): void {
    this.disposed = true;
    this.clearVoices();
    void this.context?.close().catch(() => undefined);
    this.master?.disconnect();
  }
}
