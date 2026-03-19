export interface Genome {
  speed: number;
  size: number;
  senseRadius: number;
  hue: number;
  metabolism: number;
  aggression: number;
  reproductionThreshold: number;
}

export interface Creature {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  maxEnergy: number;
  age: number;
  genome: Genome;
  generation: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
  lastAte: number;
  facing: number; // angle in radians
}

export interface Food {
  id: number;
  x: number;
  y: number;
  value: number;
  age: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
  size: number;
  type: 'death' | 'eat' | 'birth';
}

export interface SimConfig {
  worldRadius: number;
  foodSpawnRate: number;
  maxFood: number;
  mutationRate: number;
  mutationStrength: number;
  friction: number;
  speedMultiplier: number;
  maxCreatures: number;
  trailLength: number;
  autoRecover: boolean;
}

export interface HallOfFameEntry {
  id: number;
  age: number;
  generation: number;
  genome: Genome;
  cause: 'starved' | 'eaten' | 'culled';
  diedAtTick: number;
}

export interface StepResult {
  ate: number;
  died: number;
  born: number;
}

export interface PopulationSnapshot {
  tick: number;
  count: number;
  avgSpeed: number;
  avgSize: number;
  avgAggression: number;
  avgMetabolism: number;
  diversityIndex: number;
}
