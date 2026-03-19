import type { Creature, Food, Particle, SimConfig, HallOfFameEntry } from './types';
import { SpatialGrid } from './spatial';
import { steerToward, wander, fleeFrom, updateCreaturePhysics, createCreature, randomGenome } from './creature';
import { spawnFood, updateFood, createFood } from './food';
import { tryReproduce } from './evolution';
import { distance, randomPointInCircle } from './utils';
import { INITIAL_CREATURES, INITIAL_FOOD, PREY_ENERGY_GAIN } from './config';
import { Environment } from './environment';

const HALL_OF_FAME_SIZE = 5;

export class World {
  creatures: Creature[] = [];
  foods: Food[] = [];
  particles: Particle[] = [];
  tick: number = 0;
  totalBorn: number = 0;
  totalDied: number = 0;
  hallOfFame: HallOfFameEntry[] = [];
  environment!: Environment;

  private creatureGrid = new SpatialGrid<Creature>();
  private foodGrid = new SpatialGrid<Food>();

  private recordDeath(creature: Creature, cause: HallOfFameEntry['cause']): void {
    const entry: HallOfFameEntry = {
      id: creature.id,
      age: creature.age,
      generation: creature.generation,
      genome: { ...creature.genome },
      cause,
      diedAtTick: this.tick,
    };

    // Only keep top N by age
    this.hallOfFame.push(entry);
    this.hallOfFame.sort((a, b) => b.age - a.age);
    if (this.hallOfFame.length > HALL_OF_FAME_SIZE) {
      this.hallOfFame.pop();
    }
  }

  init(config: SimConfig): void {
    this.creatures = [];
    this.foods = [];
    this.particles = [];
    this.tick = 0;
    this.totalBorn = 0;
    this.totalDied = 0;
    this.hallOfFame = [];
    this.environment = new Environment(config.worldRadius);

    // Spawn initial creatures
    for (let i = 0; i < INITIAL_CREATURES; i++) {
      const pos = randomPointInCircle(config.worldRadius * 0.7);
      this.creatures.push(createCreature(pos.x, pos.y));
      this.totalBorn++;
    }

    // Spawn initial food
    for (let i = 0; i < INITIAL_FOOD; i++) {
      this.foods.push(createFood(config.worldRadius));
    }
  }

  addCreature(config: SimConfig): void {
    const pos = randomPointInCircle(config.worldRadius * 0.7);
    this.creatures.push(createCreature(pos.x, pos.y));
    this.totalBorn++;
  }

  addFoodBurst(config: SimConfig, count: number = 50): void {
    for (let i = 0; i < count; i++) {
      if (this.foods.length < config.maxFood * 2) {
        this.foods.push(createFood(config.worldRadius));
      }
    }
  }

  private spawnParticles(x: number, y: number, hue: number, type: Particle['type'], count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 20 + Math.random() * 20,
        hue,
        size: 1 + Math.random() * 3,
        type,
      });
    }
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= 1 / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  step(config: SimConfig): void {
    this.tick++;

    // Spawn food
    spawnFood(this.foods, config);
    updateFood(this.foods);

    // Build spatial grids
    this.creatureGrid.clear();
    this.creatureGrid.insertAll(this.creatures);
    this.foodGrid.clear();
    this.foodGrid.insertAll(this.foods);

    const newCreatures: Creature[] = [];
    const eatenFoodIds = new Set<number>();
    const deadCreatureIds = new Set<number>();

    // Update each creature
    for (const creature of this.creatures) {
      if (deadCreatureIds.has(creature.id)) continue;

      // Find nearest food
      const nearbyFoods = this.foodGrid.query(
        creature.x, creature.y, creature.genome.senseRadius,
      );
      let nearestFood: Food | null = null;
      let nearestFoodDist = Infinity;
      for (const f of nearbyFoods) {
        if (eatenFoodIds.has(f.id)) continue;
        const d = distance(creature.x, creature.y, f.x, f.y);
        if (d < nearestFoodDist) {
          nearestFoodDist = d;
          nearestFood = f;
        }
      }

      // Find nearby creatures (for predation and fleeing)
      const nearbyCreatures = this.creatureGrid.query(
        creature.x, creature.y, creature.genome.senseRadius,
      );

      let target: Creature | Food | null = nearestFood;
      let shouldFlee = false;
      let fleeX = 0;
      let fleeY = 0;

      // Check for threats (bigger aggressive creatures)
      for (const other of nearbyCreatures) {
        if (other.id === creature.id || deadCreatureIds.has(other.id)) continue;
        if (other.genome.aggression > 0.5 && other.genome.size > creature.genome.size * 1.2) {
          const d = distance(creature.x, creature.y, other.x, other.y);
          if (d < creature.genome.senseRadius * 0.7) {
            shouldFlee = true;
            fleeX = other.x;
            fleeY = other.y;
            break;
          }
        }
      }

      // Predators look for prey
      if (!shouldFlee && creature.genome.aggression > 0.5) {
        for (const other of nearbyCreatures) {
          if (other.id === creature.id || deadCreatureIds.has(other.id)) continue;
          if (other.genome.size < creature.genome.size * 0.8) {
            const d = distance(creature.x, creature.y, other.x, other.y);
            if (d < nearestFoodDist * 0.7) {
              target = other;
              break;
            }
          }
        }
      }

      // Steer
      if (shouldFlee) {
        fleeFrom(creature, fleeX, fleeY);
      } else if (target) {
        steerToward(creature, target.x, target.y);
      } else {
        wander(creature);
      }

      // Apply environment effects
      const envEffect = this.environment.getEffect(creature.x, creature.y);
      if (envEffect.energyCost > 0) {
        creature.energy -= envEffect.energyCost;
      }

      // Physics
      updateCreaturePhysics(creature, config);

      // Check food eating
      for (const f of nearbyFoods) {
        if (eatenFoodIds.has(f.id)) continue;
        const d = distance(creature.x, creature.y, f.x, f.y);
        if (d < creature.genome.size + 3) {
          const foodBonus = this.environment.getFoodSpawnBonus(f.x, f.y);
          creature.energy += f.value * foodBonus;
          creature.lastAte = this.tick;
          eatenFoodIds.add(f.id);
          this.spawnParticles(f.x, f.y, 120, 'eat', 4);
        }
      }

      // Check creature eating (predation)
      if (creature.genome.aggression > 0.5) {
        const nearbyCreatures = this.creatureGrid.query(
          creature.x, creature.y, creature.genome.size + 5,
        );
        for (const other of nearbyCreatures) {
          if (other.id === creature.id || deadCreatureIds.has(other.id)) continue;
          if (other.genome.size < creature.genome.size * 0.8) {
            const d = distance(creature.x, creature.y, other.x, other.y);
            if (d < creature.genome.size + other.genome.size) {
              creature.energy += other.energy * PREY_ENERGY_GAIN;
              creature.lastAte = this.tick;
              deadCreatureIds.add(other.id);
              this.spawnParticles(other.x, other.y, other.genome.hue, 'death', 8);
              this.recordDeath(other, 'eaten');
              this.totalDied++;
            }
          }
        }
      }

      // Reproduction
      if (creature.energy >= creature.genome.reproductionThreshold) {
        const child = tryReproduce(creature, config);
        if (child) {
          newCreatures.push(child);
          this.totalBorn++;
          this.spawnParticles(creature.x, creature.y, creature.genome.hue, 'birth', 6);
        }
      }
    }

    // Remove eaten food
    this.foods = this.foods.filter(f => !eatenFoodIds.has(f.id));

    // Remove dead creatures (energy <= 0 or eaten)
    this.creatures = this.creatures.filter(c => {
      if (deadCreatureIds.has(c.id)) return false;
      if (c.energy <= 0) {
        this.spawnParticles(c.x, c.y, c.genome.hue, 'death', 6);
        this.recordDeath(c, 'starved');
        this.totalDied++;
        return false;
      }
      return true;
    });

    // Add new creatures
    this.creatures.push(...newCreatures);

    // Population cap: remove lowest energy if over limit
    if (this.creatures.length > config.maxCreatures) {
      this.creatures.sort((a, b) => b.energy - a.energy);
      const removed = this.creatures.splice(config.maxCreatures);
      for (const c of removed) {
        this.recordDeath(c, 'culled');
      }
      this.totalDied += removed.length;
    }

    // Auto-recovery: if population drops to 0, spawn new creatures
    if (config.autoRecover && this.creatures.length === 0 && this.tick > 100) {
      for (let i = 0; i < 10; i++) {
        const pos = randomPointInCircle(config.worldRadius * 0.5);
        this.creatures.push(createCreature(pos.x, pos.y));
        this.totalBorn++;
      }
      // Also add some food
      this.addFoodBurst(config, 30);
    }

    // Update particles
    this.updateParticles();
  }
}
