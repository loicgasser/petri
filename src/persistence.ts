import type { Creature, Food, SimConfig, HallOfFameEntry } from './types';
import type { Zone } from './environment';

interface SaveState {
  version: 1;
  timestamp: string;
  tick: number;
  totalBorn: number;
  totalDied: number;
  creatures: Creature[];
  foods: Food[];
  hallOfFame: HallOfFameEntry[];
  zones: Zone[];
  config: SimConfig;
}

export function saveEcosystem(
  tick: number,
  totalBorn: number,
  totalDied: number,
  creatures: Creature[],
  foods: Food[],
  hallOfFame: HallOfFameEntry[],
  zones: Zone[],
  config: SimConfig,
): void {
  const state: SaveState = {
    version: 1,
    timestamp: new Date().toISOString(),
    tick,
    totalBorn,
    totalDied,
    creatures,
    foods,
    hallOfFame,
    zones,
    config,
  };

  const json = JSON.stringify(state);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `petri-save-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function loadEcosystem(): Promise<SaveState | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      try {
        const text = await file.text();
        const state = JSON.parse(text) as SaveState;
        if (state.version !== 1) {
          alert('Incompatible save file version');
          resolve(null);
          return;
        }
        resolve(state);
      } catch {
        alert('Failed to load save file');
        resolve(null);
      }
    };
    input.click();
  });
}
