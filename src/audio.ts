// Procedural audio system using Web Audio API
// Generates ambient "microscopic" sounds based on simulation state

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = false;
  private lastEatTime: number = 0;
  private lastDeathTime: number = 0;
  private lastBirthTime: number = 0;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  toggle(): boolean {
    if (!this.enabled) {
      this.enable();
    } else {
      this.disable();
    }
    return this.enabled;
  }

  private enable(): void {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.15;
    this.masterGain.connect(this.ctx.destination);
    this.enabled = true;

    // Start ambient drone
    this.startAmbient();
  }

  private disable(): void {
    if (this.ambientOsc) {
      this.ambientOsc.stop();
      this.ambientOsc = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.enabled = false;
  }

  private startAmbient(): void {
    if (!this.ctx || !this.masterGain) return;

    this.ambientOsc = this.ctx.createOscillator();
    this.ambientGain = this.ctx.createGain();
    this.ambientOsc.type = 'sine';
    this.ambientOsc.frequency.value = 60;
    this.ambientGain.gain.value = 0.05;
    this.ambientOsc.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);
    this.ambientOsc.start();
  }

  // Update ambient based on population
  updateAmbient(population: number): void {
    if (!this.ctx || !this.ambientOsc || !this.ambientGain) return;
    // Pitch rises slightly with population
    const freq = 50 + Math.min(population, 200) * 0.15;
    this.ambientOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.5);
    // Volume rises with population
    const vol = 0.02 + Math.min(population, 200) * 0.0002;
    this.ambientGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.3);
  }

  onEat(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    if (now - this.lastEatTime < 0.05) return; // Throttle
    this.lastEatTime = now;

    // Soft pop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 800 + Math.random() * 400;
    osc.frequency.setTargetAtTime(400, now, 0.05);
    gain.gain.value = 0.06;
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  onDeath(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    if (now - this.lastDeathTime < 0.1) return;
    this.lastDeathTime = now;

    // Low thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 150 + Math.random() * 50;
    osc.frequency.setTargetAtTime(40, now, 0.1);
    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  onBirth(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    if (now - this.lastBirthTime < 0.1) return;
    this.lastBirthTime = now;

    // Rising chirp
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 600;
    osc.frequency.setTargetAtTime(1200, now, 0.06);
    gain.gain.value = 0.04;
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
