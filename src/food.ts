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
