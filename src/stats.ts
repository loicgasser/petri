import type { Creature, PopulationSnapshot } from './types';
import { MAX_SNAPSHOTS, STATS_INTERVAL } from './config';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export class Stats {
  snapshots: PopulationSnapshot[] = [];
  private chart: Chart | null = null;
  private evoChart: Chart | null = null;
  private chartCanvas: HTMLCanvasElement | null = null;

  initChart(canvas: HTMLCanvasElement): void {
    this.chartCanvas = canvas;
    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Population',
            data: [],
            borderColor: '#4fc3f7',
            backgroundColor: 'rgba(79, 195, 247, 0.1)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true,
            tension: 0.3,
          },
          {
            label: 'Avg Aggression ×100',
            data: [],
            borderColor: '#ef5350',
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            tension: 0.3,
          },
          {
            label: 'Avg Speed ×10',
            data: [],
            borderColor: '#66bb6a',
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        scales: {
          x: {
            display: false,
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } },
          },
        },
        plugins: {
          legend: {
            labels: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } },
          },
        },
      },
    });
  }

  initEvoChart(canvas: HTMLCanvasElement): void {
    this.evoChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Avg Size',
            data: [],
            borderColor: '#ffa726',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            tension: 0.3,
            yAxisID: 'y',
          },
          {
            label: 'Avg Metabolism ×10',
            data: [],
            borderColor: '#ab47bc',
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            tension: 0.3,
            yAxisID: 'y',
          },
          {
            label: 'Diversity %',
            data: [],
            borderColor: '#26c6da',
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            tension: 0.3,
            yAxisID: 'y',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        scales: {
          x: { display: false },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } },
          },
        },
        plugins: {
          legend: {
            labels: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } },
          },
        },
      },
    });
  }

  update(tick: number, creatures: Creature[]): void {
    if (tick % STATS_INTERVAL !== 0) return;

    const count = creatures.length;
    if (count === 0) {
      this.snapshots.push({
        tick,
        count: 0,
        avgSpeed: 0,
        avgSize: 0,
        avgAggression: 0,
        avgMetabolism: 0,
        diversityIndex: 0,
      });
    } else {
      let totalSpeed = 0;
      let totalSize = 0;
      let totalAgg = 0;
      let totalMeta = 0;

      for (const c of creatures) {
        totalSpeed += c.genome.speed;
        totalSize += c.genome.size;
        totalAgg += c.genome.aggression;
        totalMeta += c.genome.metabolism;
      }

      this.snapshots.push({
        tick,
        count,
        avgSpeed: totalSpeed / count,
        avgSize: totalSize / count,
        avgAggression: totalAgg / count,
        avgMetabolism: totalMeta / count,
        diversityIndex: this.calcDiversity(creatures),
      });
    }

    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }

    this.updateChart();
  }

  private calcDiversity(creatures: Creature[]): number {
    // Shannon diversity based on hue buckets (12 buckets of 30°)
    const buckets = new Array(12).fill(0);
    for (const c of creatures) {
      const bucket = Math.floor(c.genome.hue / 30) % 12;
      buckets[bucket]++;
    }

    const total = creatures.length;
    let h = 0;
    for (const count of buckets) {
      if (count > 0) {
        const p = count / total;
        h -= p * Math.log2(p);
      }
    }
    // Normalize to 0-1 (max is log2(12) ≈ 3.58)
    return h / Math.log2(12);
  }

  private updateChart(): void {
    if (!this.chart) return;

    const labels = this.snapshots.map(s => s.tick.toString());
    const popData = this.snapshots.map(s => s.count);
    const aggData = this.snapshots.map(s => s.avgAggression * 100);
    const speedData = this.snapshots.map(s => s.avgSpeed * 10);

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = popData;
    this.chart.data.datasets[1].data = aggData;
    this.chart.data.datasets[2].data = speedData;
    this.chart.update('none');

    // Update evolution chart
    if (this.evoChart) {
      this.evoChart.data.labels = labels;
      this.evoChart.data.datasets[0].data = this.snapshots.map(s => s.avgSize);
      this.evoChart.data.datasets[1].data = this.snapshots.map(s => s.avgMetabolism * 10);
      this.evoChart.data.datasets[2].data = this.snapshots.map(s => s.diversityIndex * 100);
      this.evoChart.update('none');
    }
  }

  getLatest(): PopulationSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  getSpeciesList(creatures: Creature[]): Array<{ hue: number; count: number; label: string }> {
    const buckets = new Map<number, number>();
    for (const c of creatures) {
      const bucket = Math.round(c.genome.hue / 30) * 30;
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    }
    const species = Array.from(buckets.entries())
      .map(([hue, count]) => ({
        hue,
        count,
        label: hueToName(hue),
      }))
      .sort((a, b) => b.count - a.count);
    return species;
  }

  getTopCreature(creatures: Creature[]): Creature | null {
    if (creatures.length === 0) return null;
    return creatures.reduce((best, c) => c.age > best.age ? c : best, creatures[0]);
  }

  reset(): void {
    this.snapshots = [];
    for (const chart of [this.chart, this.evoChart]) {
      if (chart) {
        chart.data.labels = [];
        for (const ds of chart.data.datasets) {
          ds.data = [];
        }
        chart.update('none');
      }
    }
  }
}

function hueToName(hue: number): string {
  const names = [
    'Red', 'Orange', 'Yellow', 'Lime',
    'Green', 'Teal', 'Cyan', 'Azure',
    'Blue', 'Violet', 'Magenta', 'Rose',
  ];
  const idx = Math.round(hue / 30) % 12;
  return names[idx];
}
