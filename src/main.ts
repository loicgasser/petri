import { DEFAULT_CONFIG } from './config';
import { World } from './world';
import { Renderer } from './renderer';
import { Stats } from './stats';
import { UI } from './ui';
import { EventSystem } from './events';
import type { SimConfig } from './types';

const config: SimConfig = { ...DEFAULT_CONFIG };
const world = new World();
const stats = new Stats();
const events = new EventSystem();
let renderer: Renderer;
let ui: UI;

function reset(): void {
  world.init(config);
  stats.reset();
  renderer.selectedCreatureId = null;
}

function init(): void {
  const mainCanvas = document.getElementById('petri-canvas') as HTMLCanvasElement;
  const chartCanvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
  const evoCanvas = document.getElementById('evolution-chart') as HTMLCanvasElement;

  renderer = new Renderer(mainCanvas);
  stats.initChart(chartCanvas);
  stats.initEvoChart(evoCanvas);

  ui = new UI(config, world, stats, () => {
    reset();
  });

  // Click to select creature
  mainCanvas.addEventListener('click', (e) => {
    const creature = renderer.handleClick(e.clientX, e.clientY, world.creatures);
    ui.updateSelectedCreature(creature);
  });

  reset();

  window.addEventListener('resize', () => {
    renderer.resize();
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    switch (e.key) {
      case ' ':
        e.preventDefault();
        document.getElementById('btn-play')?.click();
        break;
      case '1':
        document.querySelector<HTMLElement>('[data-speed="1"]')?.click();
        break;
      case '2':
        document.querySelector<HTMLElement>('[data-speed="2"]')?.click();
        break;
      case '5':
        document.querySelector<HTMLElement>('[data-speed="5"]')?.click();
        break;
      case 'f':
        world.addFoodBurst(config);
        break;
      case 'c':
        world.addCreature(config);
        break;
      case 'Escape':
        renderer.selectedCreatureId = null;
        ui.updateSelectedCreature(null);
        break;
    }
  });

  requestAnimationFrame(loop);
}

function loop(): void {
  if (!ui.isPaused()) {
    const ticks = config.speedMultiplier;
    for (let i = 0; i < ticks; i++) {
      world.step(config);
      stats.update(world.tick, world.creatures);
      events.check(world.tick, world.creatures.length, world.totalBorn, world.totalDied);
    }
    ui.updateStats();

    // Update selected creature info
    if (renderer.selectedCreatureId !== null) {
      const sel = world.creatures.find(c => c.id === renderer.selectedCreatureId);
      ui.updateSelectedCreature(sel ?? null);
    }
  }

  renderer.render(world, config, events);
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
