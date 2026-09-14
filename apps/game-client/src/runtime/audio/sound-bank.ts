import { isSoundCue, type SoundCue } from './sound-cues.js';

/** Optional recorded foley. The prototype ships none, so every cue falls back to synthesis.
 *
 * To adopt real effects, drop CC0 files named after the cue (`smash.ogg`, `drink.ogg`, …) into
 * `apps/game-client/src/assets/audio/`. Vite resolves them at build time and the bank prefers
 * them over the synthesized version, with no change to calling code. Document source, author and
 * licence of every file in `assets/licenses/README.md` before committing it.
 */
const files = import.meta.glob<string>('../../assets/audio/*.{ogg,mp3,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export function sampleUrls(): { cue: SoundCue; url: string }[] {
  const entries: { cue: SoundCue; url: string }[] = [];
  for (const [path, url] of Object.entries(files)) {
    const name =
      path
        .split('/')
        .pop()
        ?.replace(/\.(ogg|mp3|wav)$/, '') ?? '';
    if (isSoundCue(name)) entries.push({ cue: name, url });
  }
  return entries;
}

/** Decoded buffers keyed by cue. A failed download simply leaves that cue synthesized. */
export class SoundBank {
  private readonly buffers = new Map<SoundCue, AudioBuffer>();

  public get(cue: SoundCue): AudioBuffer | undefined {
    return this.buffers.get(cue);
  }
  public get size(): number {
    return this.buffers.size;
  }

  public async load(
    context: BaseAudioContext,
    signal?: AbortSignal,
    load: typeof fetch = fetch,
  ): Promise<void> {
    await Promise.all(
      sampleUrls().map(async ({ cue, url }) => {
        try {
          const response = await load(url, signal ? { signal } : {});
          if (!response.ok) return;
          this.buffers.set(cue, await context.decodeAudioData(await response.arrayBuffer()));
        } catch {
          /* A missing or undecodable sample keeps the synthesized cue. */
        }
      }),
    );
  }
}
