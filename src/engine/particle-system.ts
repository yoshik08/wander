import { Wind } from './wind';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // remaining life in seconds
  maxLife: number;
  color: string;
  size: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;
  private wind: Wind | null = null; // we'll use wind to affect particles

  constructor(maxParticles = 500) {
    this.maxParticles = maxParticles;
  }

  setWind(wind: Wind) {
    this.wind = wind;
  }

  emit(x: number, y: number, vx: number, vy: number, life: number, color: string, size: number) {
    if (this.particles.length >= this.maxParticles) {
      // Remove oldest particle
      this.particles.shift();
    }
    this.particles.push({
      x,
      y,
      vx,
      vy,
      life,
      maxLife: life,
      color,
      size
    });
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      // Apply wind if available
      if (this.wind) {
        const wind = this.wind.getWind(p.x, p.y, performance.now() / 1000);
        p.vx += wind.dx * dt;
        p.vy += wind.dy * dt;
      }
      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Simple drag
      p.vx *= 0.99;
      p.vy *= 0.99;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }
}