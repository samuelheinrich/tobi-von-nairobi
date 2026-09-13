/** Small original synthesized cues; audio starts only after a user gesture. */
export class AudioFeedback {
  private context: AudioContext | undefined;
  public muted = false;

  public start(): void {
    this.context ??= new AudioContext();
    void this.context.resume().catch(() => undefined);
  }

  public pickup(): void {
    this.tone(740, 0.1);
  }
  public victory(): void {
    this.tone(523, 0.15);
    this.tone(659, 0.15, 0.15);
    this.tone(784, 0.35, 0.3);
  }
  private tone(frequency: number, duration: number, delay = 0): void {
    if (!this.context || this.muted || this.context.state !== 'running') return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const time = this.context.currentTime + delay;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.045, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(time);
    oscillator.stop(time + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  public dispose(): void {
    void this.context?.close().catch(() => undefined);
  }
}
