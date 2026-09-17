export type TrainJourneyState = 'RUNNING' | 'BRAKING' | 'STOPPED' | 'DOORS_OPEN';

export interface TrainJourneyConfig {
  cruiseSpeed: number;
  brakeDuration: number;
}

/** Engine-independent train ride state shared by scenery, audio, doors and passenger reactions. */
export class TrainJourney {
  state: TrainJourneyState = 'RUNNING';
  speed: number;
  brakeProgress = 0;
  distance = 0;

  constructor(private readonly config: TrainJourneyConfig) {
    this.speed = config.cruiseSpeed;
  }

  pullEmergencyBrake(): boolean {
    if (this.state !== 'RUNNING') return false;
    this.state = 'BRAKING';
    this.brakeProgress = 0;
    return true;
  }

  openDoors(): boolean {
    if (this.state !== 'STOPPED') return false;
    this.state = 'DOORS_OPEN';
    return true;
  }

  step(delta: number): void {
    if (this.state === 'BRAKING') {
      this.brakeProgress = Math.min(1, this.brakeProgress + delta / this.config.brakeDuration);
      const remaining = 1 - this.brakeProgress;
      this.speed = this.config.cruiseSpeed * remaining * remaining;
      if (this.brakeProgress === 1) {
        this.speed = 0;
        this.state = 'STOPPED';
      }
    }
    this.distance += this.speed * delta;
  }

  get vibration(): number {
    if (this.state === 'BRAKING') return 0.4 + Math.sin(this.brakeProgress * Math.PI) * 0.6;
    return this.state === 'RUNNING' ? 0.18 : 0;
  }

  get snapshot() {
    return {
      state: this.state,
      speed: this.speed,
      brakeProgress: this.brakeProgress,
      distance: this.distance,
      vibration: this.vibration,
    };
  }
}
