/** Speaks NPC lines aloud through the browser's own speech synthesiser.
 *
 * Why the Web Speech API rather than generated audio files: it costs nothing to ship, needs no
 * licence, no API key and no network at runtime, and every current browser has it. Pre-rendering
 * roughly 130 lines to OGG would add megabytes and would have to be regenerated whenever a line
 * changes. The trade-off is that voice quality and availability depend on the player's operating
 * system, so this is strictly an enhancement layered on top of the speech plates — the text is
 * always readable even when nothing is spoken.
 *
 * Everything here degrades quietly: no API, no voices, a refusing browser or a thrown error all
 * end with the line simply not being spoken.
 */
export class SpokenLines {
  private voices: SpeechSynthesisVoice[] = [];
  private ready = false;
  private lastSpokenAt = 0;
  public enabled = true;

  public constructor(
    /** Pass `null` for a browser without speech support; omit it to use this browser's. */
    private readonly synth: SpeechSynthesis | null = typeof window === 'undefined'
      ? null
      : (window.speechSynthesis ?? null),
  ) {
    this.collectVoices();
    // Voice lists load asynchronously in Chrome and arrive after the first call returns empty.
    this.synth?.addEventListener?.('voiceschanged', this.collectVoices);
  }

  private collectVoices = (): void => {
    try {
      this.voices = this.synth?.getVoices() ?? [];
      this.ready = this.voices.length > 0;
    } catch {
      this.ready = false;
    }
  };

  public get available(): boolean {
    return Boolean(this.synth) && this.ready;
  }

  /** Voices for a language, most preferred first: local ones avoid a network round trip. */
  private pick(language: 'de' | 'en', speaker: number): SpeechSynthesisVoice | undefined {
    const matching = this.voices.filter((voice) => voice.lang.toLowerCase().startsWith(language));
    if (!matching.length) return undefined;
    const local = matching.filter((voice) => voice.localService);
    const pool = local.length ? local : matching;
    // A stable index per speaker keeps one character sounding like itself across a run.
    return pool[Math.abs(speaker) % pool.length];
  }

  /**
   * Speaks one line. `speaker` only varies pitch and voice choice, so two NPCs standing next to
   * each other do not sound identical. A new line cancels the previous one rather than queueing:
   * in a crowd the backlog would otherwise drift seconds behind what is on screen.
   */
  public say(text: string, language: 'de' | 'en', speaker = 0, now = performance.now()): boolean {
    if (!this.enabled || !this.synth || !this.available) return false;
    // Two lines within a third of a second are a crowd reacting at once; speak only the first.
    if (now - this.lastSpokenAt < 330) return false;
    try {
      const utterance = new SpeechSynthesisUtterance(
        // Guillemets and ellipses are punctuation for the eye; some voices read them out.
        text.replace(/[«»]/g, '').replace(/…/g, '.').trim(),
      );
      const voice = this.pick(language, speaker);
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang ?? (language === 'de' ? 'de-CH' : 'en-US');
      utterance.rate = 1.08;
      utterance.pitch = 0.85 + (Math.abs(speaker) % 5) * 0.09;
      utterance.volume = 0.85;
      this.synth.cancel();
      this.synth.speak(utterance);
      this.lastSpokenAt = now;
      return true;
    } catch {
      /* Speech is optional; the plate on screen already carries the line. */
      return false;
    }
  }

  public silence(): void {
    try {
      this.synth?.cancel();
    } catch {
      /* nothing to cancel */
    }
  }

  public dispose(): void {
    this.silence();
    this.synth?.removeEventListener?.('voiceschanged', this.collectVoices);
  }
}
