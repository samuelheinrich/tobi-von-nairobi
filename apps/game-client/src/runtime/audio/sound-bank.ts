import { isSoundCue, type SoundCue } from './sound-cues.js';

/** Recorded foley, preferred over synthesis whenever a cue has files.
 *
 * Drop CC0 files named after the cue into `apps/game-client/src/assets/audio/`. A bare
 * `smash.ogg` works; `smash.1.ogg`, `smash.2.ogg` … register as **variants** of the same cue and
 * are played in turn, so a repeated sound never machine-guns the identical waveform. Vite resolves
 * the files at build time. Any cue without a file stays synthesized, and so does any file that
 * fails to download or decode.
 *
 * Record source, author, licence and permitted modifications of every file in
 * `assets/licenses/README.md` before committing it.
 */
const files = import.meta.glob<string>('../../assets/audio/*.{ogg,mp3,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** `smash.ogg` and `smash.3.ogg` both belong to the `smash` cue. */
export function cueOfFile(path: string): SoundCue | null {
  const file = path.split('/').pop() ?? '';
  const name = file.replace(/\.(ogg|mp3|wav)$/, '').replace(/\.\d+$/, '');
  return isSoundCue(name) ? name : null;
}

export function sampleUrls(): { cue: SoundCue; url: string }[] {
  const entries: { cue: SoundCue; url: string }[] = [];
  // Sorted so a build produces the same variant order everywhere, including in tests.
  for (const path of Object.keys(files).sort()) {
    const cue = cueOfFile(path);
    if (cue) entries.push({ cue, url: files[path]! });
  }
  return entries;
}

/** Decoded buffers keyed by cue, each with its own rotating variant list. */
export class SoundBank {
  private readonly variants = new Map<SoundCue, AudioBuffer[]>();
  private readonly cursors = new Map<SoundCue, number>();

  /** Next variant for this cue, cycling so the same take never plays twice in a row. */
  public get(cue: SoundCue): AudioBuffer | undefined {
    const takes = this.variants.get(cue);
    if (!takes?.length) return undefined;
    const index = this.cursors.get(cue) ?? 0;
    this.cursors.set(cue, index + 1);
    return takes[index % takes.length];
  }
  /** How many cues have at least one recording. */
  public get size(): number {
    return this.variants.size;
  }
  public countFor(cue: SoundCue): number {
    return this.variants.get(cue)?.length ?? 0;
  }

  public async load(
    context: BaseAudioContext,
    signal?: AbortSignal,
    load: typeof fetch = fetch,
  ): Promise<void> {
    // Decode in parallel, then file the results in declaration order so variant order is stable
    // regardless of which download happens to finish first.
    const decoded = await Promise.all(
      sampleUrls().map(async ({ cue, url }) => {
        try {
          const response = await load(url, signal ? { signal } : {});
          if (!response.ok) return null;
          return { cue, buffer: await context.decodeAudioData(await response.arrayBuffer()) };
        } catch {
          /* A missing or undecodable sample keeps the synthesized cue. */
          return null;
        }
      }),
    );
    for (const entry of decoded) {
      if (!entry) continue;
      const takes = this.variants.get(entry.cue);
      if (takes) takes.push(entry.buffer);
      else this.variants.set(entry.cue, [entry.buffer]);
    }
  }
}
