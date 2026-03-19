import type { SimConfig, Creature } from './types';
import type { World } from './world';
import type { Stats } from './stats';
import { DEFAULT_CONFIG } from './config';
import { saveEcosystem, loadEcosystem } from './persistence';
import { Environment } from './environment';

export class UI {
  private config: SimConfig;
  private world: World;
  private stats: Stats;
  private paused: boolean = false;
  private onReset: () => void;

  // DOM elements
  private elPopulation!: HTMLElement;
  private elTick!: HTMLElement;
  private elGeneration!: HTMLElement;
  private elDiversity!: HTMLElement;
  private elBorn!: HTMLElement;
  private elDied!: HTMLElement;
  private elTopCreature!: HTMLElement;
  private elSpecies!: HTMLElement;
  private elPlayBtn!: HTMLButtonElement;
  private elSelected!: HTMLElement;
  private elHallOfFame!: HTMLElement;

  constructor(config: SimConfig, world: World, stats: Stats, onReset: () => void) {
    this.config = config;
    this.world = world;
    this.stats = stats;
    this.onReset = onReset;
    this.init();
  }

  private init(): void {
    this.elPopulation = document.getElementById('stat-population')!;
    this.elTick = document.getElementById('stat-tick')!;
    this.elGeneration = document.getElementById('stat-generation')!;
    this.elDiversity = document.getElementById('stat-diversity')!;
    this.elBorn = document.getElementById('stat-born')!;
    this.elDied = document.getElementById('stat-died')!;
    this.elTopCreature = document.getElementById('top-creature')!;
    this.elSpecies = document.getElementById('species-list')!;
    this.elPlayBtn = document.getElementById('btn-play') as HTMLButtonElement;
    this.elSelected = document.getElementById('selected-creature')!;
    this.elHallOfFame = document.getElementById('hall-of-fame')!;

    // Play/Pause
    this.elPlayBtn.addEventListener('click', () => {
      this.paused = !this.paused;
      this.elPlayBtn.textContent = this.paused ? '▶ Play' : '⏸ Pause';
      this.elPlayBtn.classList.toggle('paused', this.paused);
    });

    // Speed buttons
    document.querySelectorAll('[data-speed]').forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseInt((btn as HTMLElement).dataset.speed!);
        this.config.speedMultiplier = speed;
        document.querySelectorAll('[data-speed]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Sliders
    this.bindSlider('slider-food', 'foodSpawnRate', 0.05, 1, 0.05);
    this.bindSlider('slider-mutation-rate', 'mutationRate', 0, 0.5, 0.01);
    this.bindSlider('slider-mutation-strength', 'mutationStrength', 0.01, 0.3, 0.01);
    this.bindSlider('slider-friction', 'friction', 0.9, 1.0, 0.005);

    // Buttons
    document.getElementById('btn-food-burst')!.addEventListener('click', () => {
      this.world.addFoodBurst(this.config);
    });

    document.getElementById('btn-add-creature')!.addEventListener('click', () => {
      this.world.addCreature(this.config);
    });

    document.getElementById('btn-save')!.addEventListener('click', () => {
      saveEcosystem(
        this.world.tick,
        this.world.totalBorn,
        this.world.totalDied,
        this.world.creatures,
        this.world.foods,
        this.world.hallOfFame,
        this.world.environment.zones,
        this.config,
      );
    });

    document.getElementById('btn-load')!.addEventListener('click', async () => {
      const state = await loadEcosystem();
      if (!state) return;
      // Restore state
      this.world.creatures = state.creatures;
      this.world.foods = state.foods;
      this.world.tick = state.tick;
      this.world.totalBorn = state.totalBorn;
      this.world.totalDied = state.totalDied;
      this.world.hallOfFame = state.hallOfFame;
      this.world.environment = new Environment(state.config.worldRadius);
      this.world.environment.zones = state.zones;
      // Restore config
      Object.assign(this.config, state.config);
      // Update sliders
      (document.getElementById('slider-food') as HTMLInputElement).value = this.config.foodSpawnRate.toString();
      document.getElementById('slider-food-value')!.textContent = this.config.foodSpawnRate.toFixed(2);
      (document.getElementById('slider-mutation-rate') as HTMLInputElement).value = this.config.mutationRate.toString();
      document.getElementById('slider-mutation-rate-value')!.textContent = this.config.mutationRate.toFixed(2);
      (document.getElementById('slider-mutation-strength') as HTMLInputElement).value = this.config.mutationStrength.toString();
      document.getElementById('slider-mutation-strength-value')!.textContent = this.config.mutationStrength.toFixed(2);
      (document.getElementById('slider-friction') as HTMLInputElement).value = this.config.friction.toString();
      document.getElementById('slider-friction-value')!.textContent = this.config.friction.toFixed(2);
      this.stats.reset();
    });

    document.getElementById('btn-reset')!.addEventListener('click', () => {
      this.onReset();
    });
  }

  private bindSlider(
    id: string,
    key: keyof SimConfig,
    min: number,
    max: number,
    step: number,
  ): void {
    const slider = document.getElementById(id) as HTMLInputElement;
    const valueEl = document.getElementById(id + '-value')!;

    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = (this.config[key] as number).toString();
    valueEl.textContent = (this.config[key] as number).toFixed(2);

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      (this.config as any)[key] = val;
      valueEl.textContent = val.toFixed(2);
    });
  }

  isPaused(): boolean {
    return this.paused;
  }

  updateSelectedCreature(creature: import('./types').Creature | null): void {
    if (!creature) {
      this.elSelected.innerHTML = '<div class="empty">Click a creature to inspect</div>';
      return;
    }
    const g = creature.genome;
    const role = g.aggression > 0.5 ? '🔴 Predator' : '🟢 Herbivore';
    this.elSelected.innerHTML = `
      <div class="selected-header">
        <span class="color-swatch" style="background: hsl(${g.hue}, 75%, 50%)"></span>
        <span class="selected-role">${role}</span>
        <span class="selected-id">#${creature.id}</span>
      </div>
      <div class="selected-stats">
        <div class="top-stat"><span class="label">Age</span><span class="value">${creature.age}</span></div>
        <div class="top-stat"><span class="label">Gen</span><span class="value">${creature.generation}</span></div>
        <div class="top-stat"><span class="label">Energy</span><span class="value">${creature.energy.toFixed(0)}/${creature.maxEnergy.toFixed(0)}</span></div>
        <div class="top-stat"><span class="label">Speed</span><span class="value">${g.speed.toFixed(2)}</span></div>
        <div class="top-stat"><span class="label">Size</span><span class="value">${g.size.toFixed(1)}</span></div>
        <div class="top-stat"><span class="label">Sense</span><span class="value">${g.senseRadius.toFixed(0)}</span></div>
        <div class="top-stat"><span class="label">Metab</span><span class="value">${g.metabolism.toFixed(2)}</span></div>
        <div class="top-stat"><span class="label">Aggr</span><span class="value">${(g.aggression * 100).toFixed(0)}%</span></div>
        <div class="top-stat"><span class="label">Repro @</span><span class="value">${g.reproductionThreshold.toFixed(0)}</span></div>
      </div>
    `;
  }

  updateStats(): void {
    const creatures = this.world.creatures;
    const latest = this.stats.getLatest();

    this.elPopulation.textContent = creatures.length.toString();
    this.elTick.textContent = this.world.tick.toString();
    this.elBorn.textContent = this.world.totalBorn.toString();
    this.elDied.textContent = this.world.totalDied.toString();

    if (creatures.length > 0) {
      const avgGen = creatures.reduce((s, c) => s + c.generation, 0) / creatures.length;
      this.elGeneration.textContent = avgGen.toFixed(1);
    } else {
      this.elGeneration.textContent = '0';
    }

    if (latest) {
      this.elDiversity.textContent = (latest.diversityIndex * 100).toFixed(0) + '%';
    }

    // Top creature
    const top = this.stats.getTopCreature(creatures);
    if (top) {
      this.elTopCreature.innerHTML = `
        <div class="top-stat"><span class="label">Age</span><span class="value">${top.age}</span></div>
        <div class="top-stat"><span class="label">Gen</span><span class="value">${top.generation}</span></div>
        <div class="top-stat"><span class="label">Energy</span><span class="value">${top.energy.toFixed(0)}</span></div>
        <div class="top-stat"><span class="label">Speed</span><span class="value">${top.genome.speed.toFixed(1)}</span></div>
        <div class="top-stat"><span class="label">Size</span><span class="value">${top.genome.size.toFixed(1)}</span></div>
        <div class="top-stat"><span class="label">Aggr</span><span class="value">${(top.genome.aggression * 100).toFixed(0)}%</span></div>
        <div class="color-swatch" style="background: hsl(${top.genome.hue}, 75%, 50%)"></div>
      `;
    } else {
      this.elTopCreature.innerHTML = '<div class="empty">No creatures alive</div>';
    }

    // Hall of Fame
    if (this.world.hallOfFame.length > 0) {
      const causeEmoji = { starved: '💀', eaten: '🔴', culled: '⚡' };
      this.elHallOfFame.innerHTML = this.world.hallOfFame.map((e, i) => `
        <div class="hof-entry">
          <span class="hof-rank">${i + 1}</span>
          <span class="species-dot" style="background: hsl(${e.genome.hue}, 75%, 50%)"></span>
          <span>Gen ${e.generation}</span>
          <span class="hof-cause">${causeEmoji[e.cause]}</span>
          <span class="hof-age">${e.age} ticks</span>
        </div>
      `).join('');
    }

    // Species list
    const species = this.stats.getSpeciesList(creatures);
    this.elSpecies.innerHTML = species.slice(0, 6).map(s => `
      <div class="species-row">
        <span class="species-dot" style="background: hsl(${s.hue}, 75%, 50%)"></span>
        <span class="species-name">${s.label}</span>
        <span class="species-count">${s.count}</span>
      </div>
    `).join('');
  }
}
