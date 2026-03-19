import type { SimConfig } from './types';

export const DEFAULT_CONFIG: SimConfig = {
  worldRadius: 350,
  foodSpawnRate: 0.3,
  maxFood: 200,
  mutationRate: 0.15,
  mutationStrength: 0.1,
  friction: 0.97,
  speedMultiplier: 1,
  maxCreatures: 300,
  trailLength: 10,
  autoRecover: true,
};

export const GENOME_RANGES = {
  speed: { min: 0.5, max: 5.0 },
  size: { min: 3, max: 20 },
  senseRadius: { min: 20, max: 150 },
  hue: { min: 0, max: 360 },
  metabolism: { min: 0.5, max: 2.0 },
  aggression: { min: 0, max: 1 },
  reproductionThreshold: { min: 60, max: 150 },
} as const;

export const INITIAL_CREATURES = 30;
export const INITIAL_FOOD = 100;
export const GRID_CELL_SIZE = 40;
export const STATS_INTERVAL = 10; // ticks between stats snapshots
export const MAX_SNAPSHOTS = 500;
export const FOOD_BASE_VALUE_MIN = 10;
export const FOOD_BASE_VALUE_MAX = 30;
export const ENERGY_DRAIN_FACTOR = 0.001;
export const REPRODUCTION_ENERGY_COST = 0.6; // parent keeps 40%, offspring gets 40%
export const OFFSPRING_ENERGY_SHARE = 0.4;
export const PREY_ENERGY_GAIN = 0.7; // fraction of prey energy gained
