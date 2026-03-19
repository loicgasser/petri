// Environment zones create ecological niches in the Petri dish
// Each zone has a different effect on creatures within it

export interface Zone {
  x: number;
  y: number;
  radius: number;
  type: ZoneType;
  intensity: number; // 0–1
}

export type ZoneType = 'nutrient' | 'toxic' | 'fertile';

export class Environment {
  zones: Zone[] = [];
  private worldRadius: number;

  constructor(worldRadius: number) {
    this.worldRadius = worldRadius;
    this.generateZones();
  }

  generateZones(): void {
    this.zones = [];
    const wr = this.worldRadius;

    // Create 2-4 random zones
    const count = 2 + Math.floor(Math.random() * 3);
    const types: ZoneType[] = ['nutrient', 'toxic', 'fertile'];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = wr * 0.3 + Math.random() * wr * 0.35;
      this.zones.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        radius: 40 + Math.random() * 60,
        type: types[i % types.length],
        intensity: 0.3 + Math.random() * 0.5,
      });
    }
  }

  // Get zone effect at a given position
  getEffect(x: number, y: number): { foodMultiplier: number; energyCost: number; speedBoost: number } {
    let foodMultiplier = 1;
    let energyCost = 0;
    let speedBoost = 0;

    for (const zone of this.zones) {
      const dx = x - zone.x;
      const dy = y - zone.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > zone.radius) continue;

      const strength = (1 - dist / zone.radius) * zone.intensity;

      switch (zone.type) {
        case 'nutrient':
          // Nutrient-rich: food worth more here
          foodMultiplier += strength * 0.8;
          break;
        case 'toxic':
          // Toxic: drains energy faster
          energyCost += strength * 0.02;
          break;
        case 'fertile':
          // Fertile: creatures move faster, food spawns more
          speedBoost += strength * 0.3;
          foodMultiplier += strength * 0.4;
          break;
      }
    }

    return { foodMultiplier, energyCost, speedBoost };
  }

  // Check if a position is good for food spawning (higher chance in nutrient/fertile zones)
  getFoodSpawnBonus(x: number, y: number): number {
    const effect = this.getEffect(x, y);
    return effect.foodMultiplier;
  }
}
