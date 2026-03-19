export interface SimEvent {
  text: string;
  emoji: string;
  time: number;
  duration: number;
  color: string;
}

export class EventSystem {
  events: SimEvent[] = [];
  private lastPopulation = 0;
  private lastCheckTick = 0;
  private peakPopulation = 0;

  check(tick: number, population: number, totalBorn: number, totalDied: number): void {
    if (tick - this.lastCheckTick < 50) return;
    this.lastCheckTick = tick;

    if (population > this.peakPopulation) {
      this.peakPopulation = population;
    }

    // Extinction
    if (population === 0 && this.lastPopulation > 0) {
      this.emit('Mass Extinction!', '💀', '#ef5350');
    }

    // Population boom
    if (population > 100 && this.lastPopulation <= 100) {
      this.emit('Population Boom!', '🚀', '#66bb6a');
    }

    // Predator dominance (checked via birth/death ratio)
    if (totalDied > totalBorn * 1.5 && totalDied > 50 && population < 20) {
      this.emit('Predator Crisis', '🔴', '#ff9800');
    }

    // Recovery
    if (population > 15 && this.lastPopulation <= 5 && this.lastPopulation > 0) {
      this.emit('Recovery!', '🌱', '#4fc3f7');
    }

    // Milestone generations
    if (population > 0) {
      // Not tracking generation events for now to keep it clean
    }

    this.lastPopulation = population;
  }

  private emit(text: string, emoji: string, color: string): void {
    this.events.push({
      text,
      emoji,
      time: Date.now(),
      duration: 3000,
      color,
    });
  }

  getActive(): SimEvent[] {
    const now = Date.now();
    this.events = this.events.filter(e => now - e.time < e.duration);
    return this.events;
  }
}
