import type { TrainJourney } from './train-journey.js';

export interface RailwayEnvironment {
  journey: TrainJourney;
  objective: string;
  allowsCompletion: boolean;
}
