import type { Position3 } from '@tobi/contracts';
export interface AmbientZone extends Position3 {
  id: string;
  radius: number;
  kind: 'music' | 'traffic' | 'train' | 'voices' | 'surf' | 'nature';
  tempo: number;
  note: number;
  volume: number;
}
export interface AmbientBeat {
  zone: AmbientZone;
  gain: number;
  beat: number;
}
/** Engine-free zone mixer. Smoothed distance weights, top four voices and a shared timeline. */
export class SpatialAmbience {
  private readonly states = new Map<string, { gain: number; clock: number; beat: number }>();
  public step(delta: number, listener: Position3, zones: readonly AmbientZone[]): AmbientBeat[] {
    const ranked = zones
      .map((zone) => ({
        zone,
        weight:
          Math.max(
            0,
            1 -
              Math.hypot(listener.x - zone.x, listener.z - zone.z, (listener.y - zone.y) * 3) /
                zone.radius,
          ) ** 2,
      }))
      .sort((a, b) => b.weight - a.weight);
    const dominant = new Set(ranked.slice(0, 4).map((v) => v.zone.id));
    const beats: AmbientBeat[] = [];
    for (const { zone, weight } of ranked) {
      let state = this.states.get(zone.id);
      if (!state) {
        state = { gain: 0, clock: 0, beat: 0 };
        this.states.set(zone.id, state);
      }
      state.gain +=
        ((dominant.has(zone.id) ? weight : 0) - state.gain) * (1 - Math.exp(-delta * 3));
      state.clock += delta;
      if (state.clock >= zone.tempo) {
        state.clock %= zone.tempo;
        state.beat++;
        if (state.gain > 0.015)
          beats.push({ zone, gain: state.gain * zone.volume, beat: state.beat });
      }
    }
    return beats;
  }
}
