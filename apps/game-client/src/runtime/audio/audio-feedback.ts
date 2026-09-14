import { SoundBank } from './sound-bank.js';
import type { SoundCue } from './sound-cues.js';

export type { SoundCue } from './sound-cues.js';

interface ToneSpec {
  frequency: number;
  duration: number;
  delay?: number;
  end?: number;
  volume?: number;
  type?: OscillatorType;
  filter?: { type: BiquadFilterType; from: number; to?: number; q?: number };
}
interface NoiseSpec {
  duration: number;
  delay?: number;
  volume?: number;
  type?: BiquadFilterType;
  from: number;
  to?: number;
  q?: number;
}

const MAX_VOICES = 32;

/** Original synthesized foley and ambience, built from oscillators and filtered white noise.
 *
 * Nothing is downloaded at runtime unless a level author drops sample files into
 * `src/assets/audio/`; `SoundBank` then prefers those and this class stays the fallback.
 * One bounded voice pool, no external assets and no timers.
 */
export class AudioFeedback {
  public constructor(
    private readonly createContext: () => AudioContext = () => new AudioContext(),
  ) {}
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private noiseBuffer: AudioBuffer | undefined;
  private readonly voices = new Set<AudioScheduledSourceNode>();
  private readonly bank = new SoundBank();
  private bankRequested = false;
  private readonly loading = new AbortController();
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
    const interval =
      scenery === 'hippie-house'
        ? 1.2
        : scenery === 'street-parade'
          ? 0.46
          : scenery === 'nana-plaza'
            ? 0.42
            : scenery === 'drunk-tank'
              ? 2.6
              : 0.36;
    if (this.beatTime < interval) return;
    this.beatTime = 0;
    this.beat++;
    if (scenery === 'street-parade') {
      this.tone({ frequency: 100, duration: 0.16, end: 40, volume: 0.065 });
      this.tone({
        frequency: this.beat % 4 < 2 ? 165 : 196,
        duration: 0.25,
        delay: 0.12,
        volume: 0.018,
        type: 'triangle',
      });
      if (this.beat % 8 === 0) this.play('cheer');
    }
    if (scenery === 'nana-plaza') {
      // Four on the floor with a hi-hat on the off-beat; the visual lights follow the same pulse.
      this.tone({ frequency: 112, duration: 0.15, end: 44, volume: 0.06 });
      this.noise({ duration: 0.05, delay: 0.21, volume: 0.016, type: 'highpass', from: 6800 });
      if (this.beat % 4 === 2)
        this.tone({ frequency: 220, duration: 0.2, delay: 0.1, volume: 0.014, type: 'sawtooth' });
    }
    if (scenery === 'railway') {
      this.tone({ frequency: 80, duration: 0.07, end: 45, volume: 0.025 });
      this.tone({ frequency: 120, duration: 0.05, delay: 0.12, end: 65, volume: 0.018 });
    }
    if (scenery === 'hippie-house') {
      const note = [196, 247, 294, 247][this.beat % 4]!;
      this.tone({ frequency: note, duration: 0.65, volume: 0.014, type: 'triangle' });
      this.tone({
        frequency: note * 1.5,
        duration: 0.4,
        delay: 0.16,
        volume: 0.009,
        type: 'triangle',
      });
    }
    if (scenery === 'drunk-tank') {
      // A drip, and every so often a door somewhere down the corridor.
      this.tone({ frequency: 1400, duration: 0.05, end: 900, volume: 0.018, type: 'sine' });
      if (this.beat % 5 === 0) {
        this.noise({ duration: 0.3, volume: 0.035, type: 'lowpass', from: 420, to: 160 });
        this.tone({ frequency: 74, duration: 0.34, end: 48, volume: 0.03 });
      }
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
      if (!this.bankRequested) {
        this.bankRequested = true;
        void this.bank.load(this.context, this.loading.signal).catch(() => undefined);
      }
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
    if (this.playSample(cue)) return;
    this.synthesize(cue);
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
      // European two-tone horn: two steady pitches, not a glide.
      for (const [index, frequency] of [660, 880, 660, 880].entries())
        this.tone({
          frequency,
          duration: 0.42,
          delay: index * 0.44,
          volume: 0.026,
          type: 'square',
          filter: { type: 'bandpass', from: frequency, q: 3 },
        });
    }
    this.ambienceTime += delta;
    if (this.ambienceTime >= 5) {
      this.ambienceTime = 0;
      if (night) {
        for (let i = 0; i < 3; i++)
          this.tone({ frequency: 2100, duration: 0.05, delay: i * 0.14, end: 2600, volume: 0.012 });
      } else {
        this.tone({ frequency: 900, duration: 0.28, end: 1250, volume: 0.018 });
        this.tone({ frequency: 1250, duration: 0.35, delay: 0.25, end: 780, volume: 0.014 });
      }
    }
  }

  private synthesize(cue: SoundCue): void {
    switch (cue) {
      case 'pickup':
        this.tone({ frequency: 1100, duration: 0.14, volume: 0.065 });
        this.tone({ frequency: 1650, duration: 0.18, delay: 0.05, volume: 0.055 });
        this.tone({ frequency: 380, duration: 0.13, delay: 0.17, end: 200, volume: 0.05 });
        return;
      case 'drink':
      case 'refill':
        // Glug: five swallows, each a short rising blip over a dull liquid thump.
        for (let i = 0; i < 5; i++) {
          this.tone({
            frequency: 148 + i * 20,
            duration: 0.07,
            delay: i * 0.115,
            end: 238 + i * 24,
            volume: 0.055,
          });
          this.noise({
            duration: 0.06,
            delay: i * 0.115,
            volume: 0.02,
            type: 'lowpass',
            from: 700,
            to: 340,
          });
        }
        if (cue === 'refill') {
          this.tone({ frequency: 520, duration: 0.13, delay: 0.6, end: 880, volume: 0.05 });
          this.tone({ frequency: 880, duration: 0.2, delay: 0.71, end: 1320, volume: 0.04 });
        }
        return;
      case 'throw':
        this.noise({
          duration: 0.22,
          volume: 0.05,
          type: 'bandpass',
          from: 900,
          to: 2600,
          q: 1.2,
        });
        this.tone({ frequency: 480, duration: 0.16, end: 150, volume: 0.03 });
        return;
      case 'smash':
        // Glass: a bright crack, a filtered body, a long shard tail and inharmonic ringing.
        this.noise({
          duration: 0.05,
          volume: 0.09,
          type: 'highpass',
          from: 2500,
          to: 5200,
          q: 0.7,
        });
        this.noise({
          duration: 0.28,
          delay: 0.01,
          volume: 0.055,
          type: 'bandpass',
          from: 3400,
          to: 1400,
          q: 1.6,
        });
        this.noise({
          duration: 0.42,
          delay: 0.05,
          volume: 0.028,
          type: 'highpass',
          from: 4200,
          to: 6800,
          q: 0.5,
        });
        this.tone({ frequency: 90, duration: 0.12, end: 45, volume: 0.05 });
        for (const [index, frequency] of [2870, 3610, 4420, 5310].entries())
          this.tone({
            frequency,
            duration: 0.1 + index * 0.03,
            delay: 0.02 + index * 0.035,
            end: frequency * 0.82,
            volume: 0.02,
            type: 'triangle',
          });
        return;
      case 'powerup':
        this.tone({ frequency: 330, duration: 0.15, end: 660, volume: 0.06 });
        this.tone({ frequency: 660, duration: 0.3, delay: 0.15, end: 1320, volume: 0.05 });
        this.noise({
          duration: 0.4,
          delay: 0.1,
          volume: 0.016,
          type: 'highpass',
          from: 3200,
          to: 7000,
        });
        return;
      case 'jump':
        this.tone({ frequency: 220, duration: 0.18, end: 540, volume: 0.06 });
        return;
      case 'land':
        this.tone({ frequency: 100, duration: 0.12, end: 40, volume: 0.06 });
        this.noise({ duration: 0.1, volume: 0.035, type: 'lowpass', from: 500, to: 180 });
        return;
      case 'step':
        this.tone({ frequency: 95, duration: 0.045, end: 45, volume: 0.022 });
        this.noise({ duration: 0.045, volume: 0.016, type: 'bandpass', from: 1200, to: 600 });
        return;
      case 'hiccup':
        this.noise({ duration: 0.04, volume: 0.05, type: 'bandpass', from: 900, to: 1600, q: 3 });
        this.tone({
          frequency: 200,
          duration: 0.08,
          delay: 0.02,
          end: 470,
          volume: 0.06,
          type: 'triangle',
        });
        this.tone({
          frequency: 160,
          duration: 0.1,
          delay: 0.1,
          end: 110,
          volume: 0.04,
          type: 'triangle',
        });
        return;
      case 'stumble':
        this.tone({ frequency: 340, duration: 0.15, end: 120, volume: 0.055 });
        this.noise({
          duration: 0.22,
          delay: 0.04,
          volume: 0.03,
          type: 'bandpass',
          from: 1800,
          to: 500,
        });
        this.tone({ frequency: 120, duration: 0.08, delay: 0.15, volume: 0.05 });
        return;
      case 'alert':
        this.tone({ frequency: 740, duration: 0.15, volume: 0.065 });
        this.tone({ frequency: 980, duration: 0.2, delay: 0.17, volume: 0.065 });
        return;
      case 'escape':
        this.tone({ frequency: 392, duration: 0.14, volume: 0.065 });
        this.tone({ frequency: 523, duration: 0.14, delay: 0.14, volume: 0.065 });
        this.tone({ frequency: 784, duration: 0.25, delay: 0.28, volume: 0.065 });
        return;
      case 'caught':
        this.tone({ frequency: 330, duration: 0.2, volume: 0.065 });
        this.tone({ frequency: 247, duration: 0.2, delay: 0.2, volume: 0.065 });
        this.tone({ frequency: 165, duration: 0.4, delay: 0.4, volume: 0.065 });
        // Cell door, the transition into the drunk tank.
        this.noise({
          duration: 0.35,
          delay: 0.6,
          volume: 0.045,
          type: 'lowpass',
          from: 520,
          to: 140,
        });
        this.tone({ frequency: 78, duration: 0.4, delay: 0.6, end: 48, volume: 0.05 });
        return;
      case 'provoke':
        this.shout(150, 0.34, 0, 0.055, 720, 1180);
        return;
      case 'grumble':
        this.shout(96, 0.42, 0, 0.05, 400, 260);
        return;
      case 'flirt':
        this.tone({ frequency: 780, duration: 0.12, end: 980, volume: 0.045 });
        this.tone({ frequency: 980, duration: 0.2, delay: 0.12, end: 1240, volume: 0.04 });
        return;
      case 'reject':
        this.tone({ frequency: 620, duration: 0.14, end: 585, volume: 0.045, type: 'triangle' });
        this.tone({
          frequency: 520,
          duration: 0.22,
          delay: 0.14,
          end: 440,
          volume: 0.04,
          type: 'triangle',
        });
        return;
      case 'block':
        this.tone({ frequency: 70, duration: 0.16, end: 45, volume: 0.06 });
        this.noise({ duration: 0.14, volume: 0.04, type: 'lowpass', from: 400, to: 150 });
        return;
      case 'cheer':
        this.noise({ duration: 1.1, volume: 0.04, type: 'bandpass', from: 900, to: 1500, q: 0.6 });
        this.noise({
          duration: 0.9,
          delay: 0.15,
          volume: 0.026,
          type: 'bandpass',
          from: 1800,
          to: 1200,
          q: 0.8,
        });
        return;
      case 'victory':
        this.tone({ frequency: 523, duration: 0.16, volume: 0.065 });
        this.tone({ frequency: 659, duration: 0.16, delay: 0.16, volume: 0.065 });
        this.tone({ frequency: 784, duration: 0.16, delay: 0.32, volume: 0.065 });
        this.tone({ frequency: 1047, duration: 0.4, delay: 0.5, volume: 0.065 });
        return;
    }
  }

  /** Vowel-ish shout: a buzzy source pushed through a moving formant band. */
  private shout(
    base: number,
    duration: number,
    delay: number,
    volume: number,
    from: number,
    to: number,
  ): void {
    this.tone({
      frequency: base,
      duration,
      delay,
      end: base * 0.85,
      volume,
      type: 'sawtooth',
      filter: { type: 'bandpass', from, to, q: 6 },
    });
    this.noise({
      duration: duration * 0.4,
      delay,
      volume: volume * 0.3,
      type: 'bandpass',
      from: from * 1.6,
      to: to * 1.4,
      q: 2,
    });
  }

  private ready(): boolean {
    return !(
      !this.context ||
      !this.master ||
      this.silent ||
      this.paused ||
      this.context.state !== 'running' ||
      this.voices.size >= MAX_VOICES
    );
  }

  private track(source: AudioScheduledSourceNode, ...nodes: AudioNode[]): void {
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      for (const node of nodes) node.disconnect();
    };
  }

  private envelope(volume: number, time: number, duration: number): GainNode {
    const gain = this.context!.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + Math.min(0.012, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    return gain;
  }

  private tone(spec: ToneSpec): void {
    if (!this.ready()) return;
    const context = this.context!;
    const { frequency, duration, delay = 0, end = frequency, volume = 0.04, type = 'sine' } = spec;
    const time = context.currentTime + delay;
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), time + duration);
    const gain = this.envelope(volume, time, duration);
    const extra: AudioNode[] = [gain];
    let head: AudioNode = oscillator;
    if (spec.filter) {
      const band = context.createBiquadFilter();
      band.type = spec.filter.type;
      band.Q.value = spec.filter.q ?? 1;
      band.frequency.setValueAtTime(spec.filter.from, time);
      band.frequency.exponentialRampToValueAtTime(
        Math.max(1, spec.filter.to ?? spec.filter.from),
        time + duration,
      );
      head.connect(band);
      head = band;
      extra.push(band);
    }
    head.connect(gain).connect(this.master!);
    this.track(oscillator, ...extra);
    oscillator.start(time);
    oscillator.stop(time + duration);
  }

  private noise(spec: NoiseSpec): void {
    if (!this.ready()) return;
    const context = this.context!;
    const buffer = this.whiteNoise(context);
    const { duration, delay = 0, volume = 0.03, type = 'bandpass', from, to = from, q = 1 } = spec;
    const time = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const band = context.createBiquadFilter();
    band.type = type;
    band.Q.value = q;
    band.frequency.setValueAtTime(from, time);
    band.frequency.exponentialRampToValueAtTime(Math.max(1, to), time + duration);
    const gain = this.envelope(volume, time, duration);
    source.connect(band).connect(gain).connect(this.master!);
    this.track(source, band, gain);
    source.start(time);
    source.stop(time + duration);
  }

  private whiteNoise(context: BaseAudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate), context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    return buffer;
  }

  private playSample(cue: SoundCue): boolean {
    const buffer = this.bank.get(cue);
    if (!buffer || !this.ready()) return false;
    const context = this.context!;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.7, context.currentTime);
    source.connect(gain).connect(this.master!);
    this.track(source, gain);
    source.start(context.currentTime);
    return true;
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
    this.loading.abort();
    this.clearVoices();
    void this.context?.close().catch(() => undefined);
    this.master?.disconnect();
  }
}
