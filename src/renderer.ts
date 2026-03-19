import type { Creature, Food, Particle, SimConfig } from './types';
import type { World } from './world';
import type { EventSystem } from './events';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private centerX: number = 0;
  private centerY: number = 0;
  selectedCreatureId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.centerX = rect.width / 2;
    this.centerY = rect.height / 2;
  }

  render(world: World, config: SimConfig, events?: EventSystem): void {
    const ctx = this.ctx;
    const cx = this.centerX;
    const cy = this.centerY;
    const rect = this.canvas.getBoundingClientRect();

    // Clear with motion blur effect
    ctx.fillStyle = 'rgba(10, 10, 15, 0.3)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw world boundary
    this.drawBoundary(cx, cy, config.worldRadius);

    // Draw food
    for (const food of world.foods) {
      this.drawFood(food, cx, cy);
    }

    // Draw creature trails
    for (const creature of world.creatures) {
      this.drawTrail(creature, cx, cy);
    }

    // Draw creatures
    for (const creature of world.creatures) {
      this.drawCreature(creature, cx, cy);
    }

    // Draw particles
    for (const particle of world.particles) {
      this.drawParticle(particle, cx, cy);
    }

    // Draw event notifications
    if (events) {
      const active = events.getActive();
      active.forEach((event, i) => {
        const elapsed = Date.now() - event.time;
        const progress = elapsed / event.duration;
        const alpha = progress < 0.2 ? progress / 0.2 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
        const yOffset = 60 + i * 40;

        ctx.save();
        ctx.font = `bold 16px 'SF Mono', 'Fira Code', monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = event.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba').replace('#', '');
        // Use hex color with alpha
        ctx.globalAlpha = alpha;
        ctx.fillStyle = event.color;
        ctx.fillText(`${event.emoji} ${event.text}`, cx, yOffset);
        ctx.restore();
      });
    }

    // Draw selection highlight
    if (this.selectedCreatureId !== null) {
      const selected = world.creatures.find(c => c.id === this.selectedCreatureId);
      if (selected) {
        this.drawSelection(selected, cx, cy);
      } else {
        this.selectedCreatureId = null;
      }
    }
  }

  handleClick(clientX: number, clientY: number, creatures: Creature[]): Creature | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left - this.centerX;
    const y = clientY - rect.top - this.centerY;

    let closest: Creature | null = null;
    let closestDist = 30; // max click distance

    for (const c of creatures) {
      const dx = c.x - x;
      const dy = c.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < closestDist) {
        closestDist = d;
        closest = c;
      }
    }

    this.selectedCreatureId = closest?.id ?? null;
    return closest;
  }

  private drawSelection(creature: Creature, cx: number, cy: number): void {
    const ctx = this.ctx;
    const x = cx + creature.x;
    const y = cy + creature.y;
    const size = creature.genome.size;

    // Pulsing selection ring
    const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.15;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(x, y, (size + 8) * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sense radius highlight
    ctx.strokeStyle = `hsla(${creature.genome.hue}, 70%, 60%, 0.2)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, creature.genome.senseRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawBoundary(cx: number, cy: number, radius: number): void {
    const ctx = this.ctx;

    // Outer glow
    const gradient = ctx.createRadialGradient(cx, cy, radius - 5, cx, cy, radius + 10);
    gradient.addColorStop(0, 'rgba(40, 80, 120, 0.0)');
    gradient.addColorStop(0.7, 'rgba(40, 80, 120, 0.15)');
    gradient.addColorStop(1, 'rgba(40, 80, 120, 0.0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
    ctx.fill();

    // Border ring
    ctx.strokeStyle = 'rgba(60, 120, 180, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle inner background
    const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    innerGrad.addColorStop(0, 'rgba(15, 20, 30, 0.3)');
    innerGrad.addColorStop(1, 'rgba(10, 10, 15, 0.1)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFood(food: Food, cx: number, cy: number): void {
    const ctx = this.ctx;
    const x = cx + food.x;
    const y = cy + food.y;
    const pulse = 1 + Math.sin(food.age * 0.1) * 0.2;
    const baseSize = 2 + (food.value / 30) * 2;
    const size = baseSize * pulse;

    // Glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
    glow.addColorStop(0, 'rgba(100, 220, 100, 0.4)');
    glow.addColorStop(1, 'rgba(100, 220, 100, 0.0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size * 3, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = `rgba(120, 255, 120, ${0.7 + pulse * 0.15})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawTrail(creature: Creature, cx: number, cy: number): void {
    const ctx = this.ctx;
    const hue = creature.genome.hue;

    for (const point of creature.trail) {
      if (point.alpha < 0.05) continue;
      ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${point.alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(cx + point.x, cy + point.y, creature.genome.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCreature(creature: Creature, cx: number, cy: number): void {
    const ctx = this.ctx;
    const x = cx + creature.x;
    const y = cy + creature.y;
    const size = creature.genome.size;
    const hue = creature.genome.hue;
    const energyRatio = creature.energy / creature.maxEnergy;

    // Aura / glow
    const aura = ctx.createRadialGradient(x, y, size * 0.5, x, y, size * 2.5);
    aura.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.2)`);
    aura.addColorStop(1, `hsla(${hue}, 80%, 60%, 0.0)`);
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Sense radius (very faint)
    if (creature.genome.senseRadius > 30) {
      ctx.strokeStyle = `hsla(${hue}, 50%, 50%, 0.05)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(x, y, creature.genome.senseRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Body — organic amoeba-like shape
    const lightness = 40 + energyRatio * 25;
    ctx.fillStyle = `hsl(${hue}, 75%, ${lightness}%)`;
    ctx.beginPath();
    const segments = 8;
    const wobbleTime = creature.age * 0.05 + creature.id * 137;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const wobble = 1 + Math.sin(wobbleTime + i * 1.7) * 0.1 + Math.sin(wobbleTime * 0.7 + i * 2.3) * 0.05;
      const r = size * wobble;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Aggression indicator (red inner ring for aggressive creatures)
    if (creature.genome.aggression > 0.5) {
      ctx.strokeStyle = `rgba(255, 80, 80, ${(creature.genome.aggression - 0.5) * 0.8})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Eyes
    const eyeOffset = size * 0.4;
    const eyeSize = Math.max(1, size * 0.2);
    const perpAngle = creature.facing + Math.PI / 2;
    const eyeForward = size * 0.5;

    for (const side of [-1, 1]) {
      const ex = x + Math.cos(creature.facing) * eyeForward + Math.cos(perpAngle) * eyeOffset * side;
      const ey = y + Math.sin(creature.facing) * eyeForward + Math.sin(perpAngle) * eyeOffset * side;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(ex, ey, eyeSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Energy bar (above creature)
    const barWidth = size * 2;
    const barHeight = 2;
    const barX = x - barWidth / 2;
    const barY = y - size - 6;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const energyHue = energyRatio * 120; // red → green
    ctx.fillStyle = `hsl(${energyHue}, 80%, 50%)`;
    ctx.fillRect(barX, barY, barWidth * Math.min(1, energyRatio), barHeight);
  }

  private drawParticle(particle: Particle, cx: number, cy: number): void {
    const ctx = this.ctx;
    const x = cx + particle.x;
    const y = cy + particle.y;
    const alpha = particle.life;

    let color: string;
    switch (particle.type) {
      case 'death':
        color = `hsla(${particle.hue}, 60%, 50%, ${alpha * 0.8})`;
        break;
      case 'eat':
        color = `rgba(100, 255, 100, ${alpha * 0.8})`;
        break;
      case 'birth':
        color = `hsla(${particle.hue}, 90%, 70%, ${alpha * 0.9})`;
        break;
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}
