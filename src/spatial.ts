import type { Creature, Food } from './types';
import { GRID_CELL_SIZE } from './config';

// Simple spatial hash grid for O(n) collision detection instead of O(n²)

export class SpatialGrid<T extends { x: number; y: number }> {
  private cells = new Map<string, T[]>();
  private cellSize: number;

  constructor(cellSize: number = GRID_CELL_SIZE) {
    this.cellSize = cellSize;
  }

  private key(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  clear(): void {
    this.cells.clear();
  }

  insert(item: T): void {
    const k = this.key(item.x, item.y);
    const cell = this.cells.get(k);
    if (cell) {
      cell.push(item);
    } else {
      this.cells.set(k, [item]);
    }
  }

  insertAll(items: T[]): void {
    for (const item of items) {
      this.insert(item);
    }
  }

  query(x: number, y: number, radius: number): T[] {
    const results: T[] = [];
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    const r2 = radius * radius;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.cells.get(`${cx},${cy}`);
        if (!cell) continue;
        for (const item of cell) {
          const dx = item.x - x;
          const dy = item.y - y;
          if (dx * dx + dy * dy <= r2) {
            results.push(item);
          }
        }
      }
    }
    return results;
  }
}
