import { speechLanguage, type SpeechTopic } from '@tobi/game-core';
import { isNoveltyVoice, voiceProfile } from './voice-profiles.js';

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
      // Novelty voices are dropped here so no later step can accidentally select one.
      this.voices = (this.synth?.getVoices() ?? []).filter((voice) => !isNoveltyVoice(voice.name));
    } catch {
      this.voices = [];
    }
  };

  public get available(): boolean {
    if (!this.synth) return false;
    // The list can still be empty on the first frames; ask again rather than give up for good.
    if (!this.voices.length) this.collectVoices();
    return this.voices.length > 0;
  }

  /** Usable voices for a language, most preferred first. */
  private candidates(language: 'de' | 'en'): SpeechSynthesisVoice[] {
    const matching = this.voices.filter((voice) => voice.lang.toLowerCase().startsWith(language));
    // Local voices avoid a network round trip and keep the line in sync with its plate.
    const local = matching.filter((voice) => voice.localService);
    return local.length ? local : matching;
  }

  /** The best voice for this profile, or undefined when the language has none at all. */
  private pick(
    language: 'de' | 'en',
    profile: { prefer: readonly string[]; spread?: boolean },
    speaker: number,
  ): SpeechSynthesisVoice | undefined {
    const pool = this.candidates(language);
    if (!pool.length) return undefined;
    const named = (wanted: string): SpeechSynthesisVoice[] =>
      pool.filter((voice) => voice.name.toLowerCase().startsWith(wanted.toLowerCase()));
    if (profile.spread) {
      // A role played by many people uses its whole preference list, so a row of NPCs does not
      // share one throat. Only voices actually installed on this machine take part.
      // One preferred name can match several installed variants of the same voice; without
      // dedupe those would take two slots and crowd out the rest of the list.
      const installed = [
        ...new Map(profile.prefer.flatMap(named).map((v) => [v.name, v])).values(),
      ];
      if (installed.length) return installed[Math.abs(speaker) % installed.length];
    } else {
      // A single character keeps one voice: the best one available, every time.
      for (const wanted of profile.prefer) {
        const matches = named(wanted);
        if (matches.length) return matches[0];
      }
    }
    // No preferred voice installed: any real voice for the language beats staying silent.
    return pool[Math.abs(speaker) % pool.length];
  }

  /**
   * Speaks one line in the voice its topic calls for. `speaker` keeps two NPCs of the same kind
   * from sounding identical. A new line cancels the previous one rather than queueing: in a crowd
   * the backlog would otherwise drift seconds behind what is on screen.
   */
  public say(topic: SpeechTopic, text: string, speaker = 0, now = performance.now()): boolean {
    if (!this.enabled || !this.synth || !this.available) return false;
    // Two lines within a third of a second are a crowd reacting at once; speak only the first.
    if (now - this.lastSpokenAt < 330) return false;
    const profile = voiceProfile(topic);
    const voice = this.pick(speechLanguage(topic), profile, speaker);
    // Never fall back to a bare language tag: with no matching voice the browser reaches for its
    // own default, which on macOS is English — that is how German lines ended up sounding English.
    if (!voice) return false;
    try {
      const utterance = new SpeechSynthesisUtterance(
        // Guillemets and ellipses are punctuation for the eye; some voices read them out.
        text.replace(/[«»]/g, '').replace(/…/g, '.').trim(),
      );
      utterance.voice = voice;
      utterance.lang = voice.lang;
      // A small per-speaker detune on top of the profile keeps a row of NPCs from sounding cloned.
      utterance.pitch = clamp(profile.pitch + ((Math.abs(speaker) % 5) - 2) * 0.04, 0, 2);
      utterance.rate = clamp(profile.rate + ((Math.abs(speaker) % 3) - 1) * 0.03, 0.1, 10);
      utterance.volume = profile.volume;
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

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));
