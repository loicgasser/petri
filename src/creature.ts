import type { Creature, Genome, SimConfig } from './types';
import { GENOME_RANGES } from './config';
import { randomInRange, nextId, clamp, wrapHue } from './utils';

export function randomGenome(): Genome {
  return {
    speed: randomInRange(GENOME_RANGES.speed.min, GENOME_RANGES.speed.max),
    size: randomInRange(GENOME_RANGES.size.min, GENOME_RANGES.size.max),
    senseRadius: randomInRange(GENOME_RANGES.senseRadius.min, GENOME_RANGES.senseRadius.max),
    hue: randomInRange(0, 360),
    metabolism: randomInRange(GENOME_RANGES.metabolism.min, GENOME_RANGES.metabolism.max),
    aggression: randomInRange(GENOME_RANGES.aggression.min, GENOME_RANGES.aggression.max),
    reproductionThreshold: randomInRange(GENOME_RANGES.reproductionThreshold.min, GENOME_RANGES.reproductionThreshold.max),
  };
}

export function createCreature(
  x: number,
  y: number,
  genome?: Genome,
  generation: number = 0,
  energy?: number,
): Creature {
  const g = genome ?? randomGenome();
  const maxE = g.reproductionThreshold * 1.5;
  return {
    id: nextId(),
    x,
    y,
    vx: (Math.random() - 0.5) * g.speed,
    vy: (Math.random() - 0.5) * g.speed,
    energy: energy ?? g.reproductionThreshold * 0.7,
    maxEnergy: maxE,
    age: 0,
    genome: g,
    generation,
    trail: [],
    lastAte: 0,
    facing: Math.random() * Math.PI * 2,
  };
}

export function steerToward(creature: Creature, tx: number, ty: number): void {
  const dx = tx - creature.x;
  const dy = ty - creature.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.1) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const steerForce = 0.15;
  creature.vx += nx * steerForce * creature.genome.speed;
  creature.vy += ny * steerForce * creature.genome.speed;
}

export function fleeFrom(creature: Creature, tx: number, ty: number): void {
  const dx = creature.x - tx;
  const dy = creature.y - ty;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.1) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const fleeForce = 0.2 * creature.genome.speed;
  creature.vx += nx * fleeForce;
  creature.vy += ny * fleeForce;
}

export function wander(creature: Creature): void {
  creature.facing += (Math.random() - 0.5) * 0.5;
  const wanderForce = 0.05 * creature.genome.speed;
  creature.vx += Math.cos(creature.facing) * wanderForce;
  creature.vy += Math.sin(creature.facing) * wanderForce;
}

export function enforceWorldBoundary(creature: Creature, config: SimConfig): void {
  const dist = Math.sqrt(creature.x * creature.x + creature.y * creature.y);
  const maxDist = config.worldRadius - creature.genome.size;
  if (dist > maxDist && maxDist > 0) {
    // Push back toward center
    const nx = creature.x / dist;
    const ny = creature.y / dist;
    creature.x = nx * maxDist;
    creature.y = ny * maxDist;
    // Reflect velocity
    const dot = creature.vx * nx + creature.vy * ny;
    creature.vx -= 2 * dot * nx;
    creature.vy -= 2 * dot * ny;
    creature.vx *= 0.8;
    creature.vy *= 0.8;
  }
}

export function updateCreaturePhysics(creature: Creature, config: SimConfig): void {
  // Limit velocity
  const maxSpeed = creature.genome.speed * 2;
  const currentSpeed = Math.sqrt(creature.vx * creature.vx + creature.vy * creature.vy);
  if (currentSpeed > maxSpeed) {
    creature.vx = (creature.vx / currentSpeed) * maxSpeed;
    creature.vy = (creature.vy / currentSpeed) * maxSpeed;
  }

  // Apply friction
  creature.vx *= config.friction;
  creature.vy *= config.friction;

  // Move
  creature.x += creature.vx;
  creature.y += creature.vy;

  // Update facing direction
  if (currentSpeed > 0.1) {
    creature.facing = Math.atan2(creature.vy, creature.vx);
  }

  // Boundary
  enforceWorldBoundary(creature, config);

  // Trail
  creature.trail.push({ x: creature.x, y: creature.y, alpha: 1 });
  if (creature.trail.length > config.trailLength) {
    creature.trail.shift();
  }
  for (const t of creature.trail) {
    t.alpha *= 0.85;
  }

  // Age & energy drain
  creature.age++;
  const speedSq = creature.vx * creature.vx + creature.vy * creature.vy;
  const drain = (speedSq * creature.genome.size * creature.genome.metabolism) * 0.0008;
  // Base metabolic cost scales with size² (big creatures need proportionally more energy)
  const baseCost = (creature.genome.size * creature.genome.size * creature.genome.metabolism) * 0.0004;
  // Sense radius has a small energy cost (maintaining awareness)
  const senseCost = creature.genome.senseRadius * 0.0001;
  creature.energy -= drain + baseCost + senseCost;
  creature.energy = clamp(creature.energy, 0, creature.maxEnergy);
}
