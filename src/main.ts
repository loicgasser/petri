import { DEFAULT_CONFIG } from './config';
import { World } from './world';
import { Renderer } from './renderer';
import { Stats } from './stats';
import { UI } from './ui';
import type { SimConfig } from './types';

const config: SimConfig = { ...DEFAULT_CONFIG };
const world = new World();
const stats = new Stats();
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

  renderer = new Renderer(mainCanvas);
  stats.initChart(chartCanvas);

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

  requestAnimationFrame(loop);
}

function loop(): void {
  if (!ui.isPaused()) {
    const ticks = config.speedMultiplier;
    for (let i = 0; i < ticks; i++) {
      world.step(config);
      stats.update(world.tick, world.creatures);
    }
    ui.updateStats();

    // Update selected creature info
    if (renderer.selectedCreatureId !== null) {
      const sel = world.creatures.find(c => c.id === renderer.selectedCreatureId);
      ui.updateSelectedCreature(sel ?? null);
    }
  }

  renderer.render(world, config);
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
