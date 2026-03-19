export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomPointInCircle(radius: number): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;
  return {
    x: r * Math.cos(angle),
    y: r * Math.sin(angle),
  };
}

export function wrapHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

let _nextId = 1;
export function nextId(): number {
  return _nextId++;
}
