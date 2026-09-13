import type { GameView } from '@tobi/contracts';

export class GameViewStore {
  private value: GameView = {
    phase: 'loading',
    levelId: 'welcome_to_bali_prototype',
    pursuit: null,
    collected: 0,
    total: 5,
    stamina: 100,
    mood: 0,
    moodLabel: 'NOCH GANZ GERADE',
    score: 0,
    elapsedSeconds: 0,
    objective: 'Sammle 5 Flaschen',
    nearDestination: false,
    canCheckIn: false,
    result: null,
    toast: '',
    error: null,
    debug: false,
    fps: 0,
  };
  private readonly listeners = new Set<() => void>();

  public getSnapshot = (): GameView => this.value;
  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  public update(patch: Partial<GameView>): void {
    const next = { ...this.value, ...patch };
    if (
      Object.keys(patch).every(
        (key) => next[key as keyof GameView] === this.value[key as keyof GameView],
      )
    )
      return;
    this.value = Object.freeze(next);
    for (const listener of this.listeners) listener();
  }
}
