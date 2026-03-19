import type { Creature, Food, Particle, SimConfig } from './types';
import type { World } from './world';
import type { EventSystem } from './events';
import type { Zone } from './environment';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private centerX: number = 0;
  private centerY: number = 0;
  selectedCreatureId: number | null = null;
  followMode: boolean = false;
  private hoverCreature: Creature | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private zoom: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragStartPanX: number = 0;
  private dragStartPanY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.setupZoomPan();
    this.setupHover();
  }

  private setupHover(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) return;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
  }

  updateHover(creatures: Creature[]): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = (this.mouseX - rect.left - this.centerX) / this.zoom - this.panX;
    const y = (this.mouseY - rect.top - this.centerY) / this.zoom - this.panY;

    let closest: Creature | null = null;
    let closestDist = 25;

    for (const c of creatures) {
      const dx = c.x - x;
      const dy = c.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < closestDist) {
        closestDist = d;
        closest = c;
      }
    }
    this.hoverCreature = closest;
    this.canvas.style.cursor = closest ? 'pointer' : 'default';
  }

  private setupZoomPan(): void {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(0.5, Math.min(5, this.zoom * zoomFactor));
    }, { passive: false });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) { // Middle click or shift+click to pan
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragStartPanX = this.panX;
        this.dragStartPanY = this.panY;
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.panX = this.dragStartPanX + (e.clientX - this.dragStartX) / this.zoom;
        this.panY = this.dragStartPanY + (e.clientY - this.dragStartY) / this.zoom;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Double-click to reset zoom
    this.canvas.addEventListener('dblclick', () => {
      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
    });
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

    // Follow mode: track selected creature
    if (this.followMode && this.selectedCreatureId !== null) {
      const target = world.creatures.find(c => c.id === this.selectedCreatureId);
      if (target) {
        // Smoothly pan toward creature
        const targetPanX = -target.x;
        const targetPanY = -target.y;
        this.panX += (targetPanX - this.panX) * 0.1;
        this.panY += (targetPanY - this.panY) * 0.1;
      }
    }

    // Apply zoom and pan
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-cx + this.panX, -cy + this.panY);

    // Draw world boundary and grid
    this.drawBoundary(cx, cy, config.worldRadius);
    this.drawGrid(cx, cy, config.worldRadius);

    // Draw environment zones
    if (world.environment) {
      for (const zone of world.environment.zones) {
        this.drawZone(zone, cx, cy);
      }
    }

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

    // Draw selection highlight
    if (this.selectedCreatureId !== null) {
      const selected = world.creatures.find(c => c.id === this.selectedCreatureId);
      if (selected) {
        this.drawSelection(selected, cx, cy);
      } else {
        this.selectedCreatureId = null;
      }
    }

    ctx.restore(); // End zoom/pan transform

    // Draw event notifications (not affected by zoom)
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
        ctx.globalAlpha = alpha;
        ctx.fillStyle = event.color;
        ctx.fillText(`${event.emoji} ${event.text}`, cx, yOffset);
        ctx.restore();
      });
    }

    // Draw hover tooltip
    if (this.hoverCreature && this.hoverCreature.id !== this.selectedCreatureId) {
      this.drawTooltip(this.hoverCreature);
    }

    // Draw zoom indicator
    if (this.zoom !== 1) {
      ctx.save();
      ctx.font = `11px 'SF Mono', monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.textAlign = 'right';
      ctx.fillText(`${this.zoom.toFixed(1)}×`, rect.width - 12, rect.height - 12);
      ctx.restore();
    }
  }

  handleClick(clientX: number, clientY: number, creatures: Creature[]): Creature | null {
    const rect = this.canvas.getBoundingClientRect();
    // Account for zoom and pan
    const x = (clientX - rect.left - this.centerX) / this.zoom - this.panX;
    const y = (clientY - rect.top - this.centerY) / this.zoom - this.panY;

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

  private drawTooltip(creature: Creature): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    // Position tooltip near mouse
    let tx = this.mouseX - rect.left + 15;
    let ty = this.mouseY - rect.top - 10;
    const g = creature.genome;
    const role = g.aggression > 0.5 ? 'Predator' : 'Herbivore';

    const lines = [
      `#${creature.id} ${role} (Gen ${creature.generation})`,
      `Age: ${creature.age}  Energy: ${creature.energy.toFixed(0)}`,
      `Spd: ${g.speed.toFixed(1)}  Size: ${g.size.toFixed(1)}  Aggr: ${(g.aggression * 100).toFixed(0)}%`,
    ];

    const lineHeight = 14;
    const padding = 6;
    const width = 220;
    const height = lines.length * lineHeight + padding * 2;

    // Keep on screen
    if (tx + width > rect.width) tx = tx - width - 30;
    if (ty + height > rect.height) ty = rect.height - height - 5;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 15, 25, 0.9)';
    ctx.strokeStyle = `hsla(${g.hue}, 60%, 50%, 0.5)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tx, ty, width, height, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '11px monospace';
    ctx.fillStyle = `hsl(${g.hue}, 70%, 70%)`;
    ctx.textAlign = 'left';
    lines.forEach((line, i) => {
      ctx.fillStyle = i === 0 ? `hsl(${g.hue}, 70%, 70%)` : 'rgba(220, 220, 230, 0.8)';
      ctx.fillText(line, tx + padding, ty + padding + (i + 1) * lineHeight - 2);
    });
    ctx.restore();
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

  private drawZone(zone: Zone, cx: number, cy: number): void {
    const ctx = this.ctx;
    const x = cx + zone.x;
    const y = cy + zone.y;

    let color: string;
    let labelColor: string;
    switch (zone.type) {
      case 'nutrient':
        color = `rgba(100, 200, 255, ${zone.intensity * 0.12})`;
        labelColor = 'rgba(100, 200, 255, 0.3)';
        break;
      case 'toxic':
        color = `rgba(255, 80, 80, ${zone.intensity * 0.1})`;
        labelColor = 'rgba(255, 80, 80, 0.3)';
        break;
      case 'fertile':
        color = `rgba(100, 255, 100, ${zone.intensity * 0.1})`;
        labelColor = 'rgba(100, 255, 100, 0.3)';
        break;
    }

    // Zone gradient
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, zone.radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, zone.radius, 0, Math.PI * 2);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.arc(x, y, zone.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.save();
    ctx.font = '9px monospace';
    ctx.fillStyle = labelColor;
    ctx.textAlign = 'center';
    const label = zone.type === 'nutrient' ? '◆ nutrient' : zone.type === 'toxic' ? '☠ toxic' : '✦ fertile';
    ctx.fillText(label, x, y - zone.radius - 4);
    ctx.restore();
  }

  private drawGrid(cx: number, cy: number, radius: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(40, 60, 80, 0.06)';
    ctx.lineWidth = 0.5;

    // Clip to circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
    ctx.clip();

    const step = 40;
    const start = -Math.ceil(radius / step) * step;
    const end = Math.ceil(radius / step) * step;

    for (let x = start; x <= end; x += step) {
      ctx.beginPath();
      ctx.moveTo(cx + x, cy - radius);
      ctx.lineTo(cx + x, cy + radius);
      ctx.stroke();
    }
    for (let y = start; y <= end; y += step) {
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy + y);
      ctx.lineTo(cx + radius, cy + y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawFood(food: Food, cx: number, cy: number): void {
    const ctx = this.ctx;
    const x = cx + food.x;
    const y = cy + food.y;
    const pulse = 1 + Math.sin(food.age * 0.1) * 0.2;
    const baseSize = 2 + (food.value / 30) * 2;
    const size = baseSize * pulse;

    // Decay factor — food gets dimmer as it ages
    const freshness = Math.max(0.2, 1 - (food.age / 800));
    const hue = 120 * freshness + 40 * (1 - freshness); // green → yellow as it decays

    // Glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
    glow.addColorStop(0, `hsla(${hue}, 80%, 60%, ${0.4 * freshness})`);
    glow.addColorStop(1, `hsla(${hue}, 80%, 60%, 0.0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size * 3, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = `hsla(${hue}, 85%, 60%, ${(0.7 + pulse * 0.15) * freshness})`;
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

    // Cell membrane (outline)
    ctx.strokeStyle = `hsla(${hue}, 60%, ${lightness + 15}%, 0.5)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
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
    ctx.stroke();

    // Nucleus (inner circle)
    const nucleusSize = size * 0.35;
    ctx.fillStyle = `hsla(${hue}, 60%, ${lightness - 10}%, 0.6)`;
    ctx.beginPath();
    ctx.arc(x, y, nucleusSize, 0, Math.PI * 2);
    ctx.fill();

    // Aggression indicator (red spikes for aggressive creatures)
    if (creature.genome.aggression > 0.5) {
      ctx.strokeStyle = `rgba(255, 80, 80, ${(creature.genome.aggression - 0.5) * 0.6})`;
      ctx.lineWidth = 1.5;
      const spikeCount = 6;
      for (let i = 0; i < spikeCount; i++) {
        const angle = (i / spikeCount) * Math.PI * 2 + wobbleTime * 0.3;
        const innerR = size * 0.9;
        const outerR = size * 1.3;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
        ctx.lineTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
        ctx.stroke();
      }
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
