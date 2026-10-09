export interface Vec2 {
  x: number;
  y: number;
}

export function vec2(x: number = 0, y: number = 0): Vec2 {
  return { x, y };
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = (b - a) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
}

export interface ColorRGBA {
  r: number; // 0 - 1
  g: number; // 0 - 1
  b: number; // 0 - 1
  a: number; // 0 - 1
}

export function rgba(r: number, g: number, b: number, a: number = 1.0): ColorRGBA {
  return { r, g, b, a };
}

export function hexToRgba(hex: string, alpha: number = 1.0): ColorRGBA {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const intVal = parseInt(clean, 16);
  return {
    r: ((intVal >> 16) & 255) / 255,
    g: ((intVal >> 8) & 255) / 255,
    b: (intVal & 255) / 255,
    a: alpha
  };
}

export function rgbaToCss(c: ColorRGBA): string {
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  return `rgba(${r},${g},${b},${c.a})`;
}

export function lerpColor(c1: ColorRGBA, c2: ColorRGBA, t: number): ColorRGBA {
  return {
    r: lerp(c1.r, c2.r, t),
    g: lerp(c1.g, c2.g, t),
    b: lerp(c1.b, c2.b, t),
    a: lerp(c1.a, c2.a, t)
  };
}
