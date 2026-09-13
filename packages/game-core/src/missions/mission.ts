import type { GameplayEvent, MissionObjective } from '@tobi/contracts';

export interface ObjectiveHandler {
  type: MissionObjective['type'];
  /** Only active objectives receive events; returns completed state. */
  handle(
    objective: MissionObjective,
    event: GameplayEvent,
    count: number,
  ): { count: number; complete: boolean };
}

export const collectHandler: ObjectiveHandler = {
  type: 'collect',
  handle(objective, event, count) {
    if (objective.type !== 'collect') return { count, complete: false };
    const next =
      count + Number(event.type === 'itemCollected' && event.itemId === objective.itemId);
    return { count: next, complete: next >= objective.amount };
  },
};

export const reachHandler: ObjectiveHandler = {
  type: 'reach',
  handle(objective, event, count) {
    return {
      count,
      complete:
        objective.type === 'reach' &&
        event.type === 'zoneReached' &&
        event.targetId === objective.targetId,
    };
  },
};

/** Data-driven objective graph. Callers deliver confirmed, deduplicated gameplay events. */
export class Mission {
  private readonly completed = new Set<string>();
  private readonly counts = new Map<string, number>();
  private readonly handlers: Map<MissionObjective['type'], ObjectiveHandler>;

  public constructor(
    private readonly objectives: readonly MissionObjective[],
    handlers: readonly ObjectiveHandler[],
  ) {
    this.handlers = new Map(handlers.map((handler) => [handler.type, handler]));
    for (const objective of objectives)
      if (!this.handlers.has(objective.type)) throw new Error(`No handler for ${objective.type}`);
  }

  public onEvent(event: GameplayEvent): void {
    const active = this.objectives.filter(
      (objective) =>
        !this.completed.has(objective.id) && objective.after.every((id) => this.completed.has(id)),
    );
    for (const objective of active) {
      const result = this.handlers
        .get(objective.type)
        ?.handle(objective, event, this.counts.get(objective.id) ?? 0);
      if (!result) continue;
      this.counts.set(objective.id, result.count);
      if (result.complete) this.completed.add(objective.id);
    }
  }

  public get isComplete(): boolean {
    return this.completed.size === this.objectives.length;
  }
  public get active(): MissionObjective | undefined {
    return this.objectives.find(
      (objective) =>
        !this.completed.has(objective.id) && objective.after.every((id) => this.completed.has(id)),
    );
  }
}
