import type { Creature, Genome, SimConfig } from './types';
import { GENOME_RANGES, REPRODUCTION_ENERGY_COST, OFFSPRING_ENERGY_SHARE } from './config';
import { createCreature } from './creature';
import { clamp, wrapHue, randomInRange } from './utils';

function mutateGene(
  value: number,
  min: number,
  max: number,
  rate: number,
  strength: number,
): number {
  if (Math.random() > rate) return value;
  const range = max - min;
  const delta = (Math.random() - 0.5) * 2 * strength * range;
  return clamp(value + delta, min, max);
}

function mutateGenome(parent: Genome, config: SimConfig): Genome {
  const r = config.mutationRate;
  const s = config.mutationStrength;
  return {
    speed: mutateGene(parent.speed, GENOME_RANGES.speed.min, GENOME_RANGES.speed.max, r, s),
    size: mutateGene(parent.size, GENOME_RANGES.size.min, GENOME_RANGES.size.max, r, s),
    senseRadius: mutateGene(parent.senseRadius, GENOME_RANGES.senseRadius.min, GENOME_RANGES.senseRadius.max, r, s),
    hue: wrapHue(parent.hue + (Math.random() > r ? 0 : (Math.random() - 0.5) * 60)),
    metabolism: mutateGene(parent.metabolism, GENOME_RANGES.metabolism.min, GENOME_RANGES.metabolism.max, r, s),
    aggression: mutateGene(parent.aggression, GENOME_RANGES.aggression.min, GENOME_RANGES.aggression.max, r, s),
    reproductionThreshold: mutateGene(
      parent.reproductionThreshold,
      GENOME_RANGES.reproductionThreshold.min,
      GENOME_RANGES.reproductionThreshold.max,
      r, s,
    ),
  };
}

export function tryReproduce(
  creature: Creature,
  config: SimConfig,
): Creature | null {
  if (creature.energy < creature.genome.reproductionThreshold) return null;

  const childEnergy = creature.energy * OFFSPRING_ENERGY_SHARE;
  creature.energy *= (1 - REPRODUCTION_ENERGY_COST);

  const childGenome = mutateGenome(creature.genome, config);
  const offset = creature.genome.size * 2 + 5;
  const angle = Math.random() * Math.PI * 2;
  const cx = creature.x + Math.cos(angle) * offset;
  const cy = creature.y + Math.sin(angle) * offset;

  return createCreature(cx, cy, childGenome, creature.generation + 1, childEnergy);
}
