export type LessonMetric =
  | 'distance'
  | 'camera'
  | 'jumps'
  | 'sprint'
  | 'bottles'
  | 'drinks'
  | 'throws'
  | 'taunts'
  | 'celebrates'
  | 'cover'
  | 'seated'
  | 'stoodUp';
export interface TutorialLesson {
  id: string;
  metric: LessonMetric;
  threshold: number;
  cumulative?: boolean;
  title: string;
  body: string;
  key: string;
}
export type LessonSignals = Record<LessonMetric, number>;
/** Lessons observe confirmed gameplay, never raw key codes or elapsed wall-clock timers. */
export class Tutorial {
  public index = 0;
  private baseline = 0;
  private readonly totals: LessonSignals = {
    distance: 0,
    camera: 0,
    jumps: 0,
    sprint: 0,
    bottles: 0,
    drinks: 0,
    throws: 0,
    taunts: 0,
    celebrates: 0,
    cover: 0,
    seated: 0,
    stoodUp: 0,
  };
  public constructor(public readonly lessons: readonly TutorialLesson[]) {}
  public get active(): TutorialLesson | null {
    return this.lessons[this.index] ?? null;
  }
  public get complete(): boolean {
    return this.index >= this.lessons.length;
  }
  public observe(deltas: Partial<LessonSignals>): void {
    for (const key of Object.keys(deltas) as LessonMetric[]) this.totals[key] += deltas[key] ?? 0;
    const lesson = this.active;
    if (!lesson) return;
    const amount = this.totals[lesson.metric] - (lesson.cumulative ? 0 : this.baseline);
    if (amount >= lesson.threshold) {
      this.index++;
      this.baseline = this.active ? this.totals[this.active.metric] : 0;
    }
  }
}
