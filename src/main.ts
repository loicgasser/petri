import { DEFAULT_CONFIG } from './config';
import { World } from './world';
import { Renderer } from './renderer';
import { Stats } from './stats';
import { UI } from './ui';
import { EventSystem } from './events';
import { AudioSystem } from './audio';
import type { SimConfig } from './types';

const config: SimConfig = { ...DEFAULT_CONFIG };
const world = new World();
const stats = new Stats();
const events = new EventSystem();
const audio = new AudioSystem();
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

  // Sound toggle button
  document.getElementById('btn-sound')!.addEventListener('click', () => {
    const soundOn = audio.toggle();
    document.getElementById('btn-sound')!.textContent = soundOn ? '🔊 Sound On' : '🔇 Sound Off';
  });

  // Click to select creature
  mainCanvas.addEventListener('click', (e) => {
    if (renderer.skipNextClick) {
      renderer.skipNextClick = false;
      return;
    }
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
        renderer.followMode = false;
        ui.updateSelectedCreature(null);
        break;
      case 't':
        // Toggle follow mode
        if (renderer.selectedCreatureId !== null) {
          renderer.followMode = !renderer.followMode;
        }
        break;
      case 'm':
        // Toggle sound
        const soundOn = audio.toggle();
        const soundBtn = document.getElementById('btn-sound');
        if (soundBtn) soundBtn.textContent = soundOn ? '🔊 Sound On' : '🔇 Sound Off';
        break;
    }
  });

  requestAnimationFrame(loop);
}

function loop(): void {
  if (!ui.isPaused()) {
    const ticks = config.speedMultiplier;
    const frameStart = performance.now();
    for (let i = 0; i < ticks; i++) {
      if (i > 0 && performance.now() - frameStart > 14) break;
      const result = world.step(config);
      stats.update(world.tick, world.creatures);
      events.check(world.tick, world.creatures.length, world.totalBorn, world.totalDied);

      // Audio feedback
      if (result.ate > 0) audio.onEat();
      if (result.died > 0) audio.onDeath();
      if (result.born > 0) audio.onBirth();
    }
    audio.updateAmbient(world.creatures.length);
    ui.updateStats();
    renderer.updateHover(world.creatures);

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
