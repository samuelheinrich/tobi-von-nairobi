import { describe, expect, it } from 'vitest';
import { allSpeechTopics, NpcVoices, speechOptions } from './npc-speech.js';

describe('spoken lines', () => {
  it('gives every topic several distinct, non-empty lines', () => {
    for (const topic of allSpeechTopics()) {
      const options = speechOptions(topic);
      expect(options.length, topic).toBeGreaterThanOrEqual(6);
      expect(new Set(options).size, `${topic} repeats a line`).toBe(options.length);
      expect(
        options.every((line) => line.trim().length > 0),
        `${topic} has a blank line`,
      ).toBe(true);
    }
  });

  it('walks a speaker through its whole list before repeating', () => {
    const voices = new NpcVoices();
    const options = speechOptions('tobiTaunt');
    const heard = options.map(() => voices.next('tobiTaunt', 'tobi'));
    expect(new Set(heard).size).toBe(options.length);
    // The next line wraps around to the one it started on, so the cycle is closed.
    expect(voices.next('tobiTaunt', 'tobi')).toBe(heard[0]);
  });

  it('starts neighbouring speakers on different lines so a row never answers in unison', () => {
    const voices = new NpcVoices();
    const firstWords = [0, 1, 2, 3].map((id) => voices.next('crowd', id));
    expect(new Set(firstWords).size).toBe(4);
  });

  it('keeps each speaker on its own thread', () => {
    const voices = new NpcVoices();
    const a1 = voices.next('resident', 'anna');
    const b1 = voices.next('resident', 'bruno');
    expect(b1).toBe(a1);
    expect(voices.next('resident', 'anna')).not.toBe(a1);
    // Bruno has not spoken since, so he continues from his own position, not Anna's.
    expect(voices.next('resident', 'bruno')).not.toBe(b1);
  });

  it('resets back to the opening lines', () => {
    const voices = new NpcVoices();
    const first = voices.next('yoga', 'teacher');
    voices.next('yoga', 'teacher');
    voices.reset();
    expect(voices.next('yoga', 'teacher')).toBe(first);
  });
});
