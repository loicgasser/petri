import type { Food, SimConfig } from './types';
import { FOOD_BASE_VALUE_MIN, FOOD_BASE_VALUE_MAX } from './config';
import { randomPointInCircle, randomInRange, nextId } from './utils';

export function createFood(worldRadius: number): Food {
  const pos = randomPointInCircle(worldRadius * 0.9);
  return {
    id: nextId(),
    x: pos.x,
    y: pos.y,
    value: randomInRange(FOOD_BASE_VALUE_MIN, FOOD_BASE_VALUE_MAX),
    age: 0,
  };
}

export function spawnFood(foods: Food[], config: SimConfig): Food | null {
  if (foods.length >= config.maxFood) return null;
  if (Math.random() < config.foodSpawnRate) {
    // 20% chance to spawn near existing food (clustering)
    if (foods.length > 5 && Math.random() < 0.2) {
      const nearby = foods[Math.floor(Math.random() * foods.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 30;
      const food: Food = {
        id: nextId(),
        x: nearby.x + Math.cos(angle) * dist,
        y: nearby.y + Math.sin(angle) * dist,
        value: randomInRange(FOOD_BASE_VALUE_MIN, FOOD_BASE_VALUE_MAX),
        age: 0,
      };
      // Keep within bounds
      const r = Math.sqrt(food.x * food.x + food.y * food.y);
      if (r < config.worldRadius * 0.9) {
        foods.push(food);
        return food;
      }
    }
    const food = createFood(config.worldRadius);
    foods.push(food);
    return food;
  }
  return null;
}

export function updateFood(foods: Food[]): void {
  for (const food of foods) {
    food.age++;
  }
}
