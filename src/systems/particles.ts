import { ColorRGBA, Vec2 } from '../core/math';
import { IRenderer } from '../render/types';
import { BiomeType } from '../world/biomes';
import { PRNG } from '../core/prng';

export type ParticleType = 'pollen' | 'petal' | 'leaf' | 'spore' | 'dust' | 'firefly' | 'ripple';

export interface Particle {
  active: boolean;
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  angularVel: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  baseAlpha: number;
  oscOffset: number;
  oscSpeed: number;
  oscAmpX: number;
  oscAmpY: number;
}

export class ParticleSystem {
  private readonly maxParticles = 500;
  private readonly pool: Particle[] = [];
  private prng: PRNG;

  // Scratch memory for zero-allocation rendering
  private scratchColor: ColorRGBA = { r: 1, g: 1, b: 1, a: 1 };
  private scratchHaloColor: ColorRGBA = { r: 1, g: 1, b: 1, a: 0.2 };
  private scratchQuad: [Vec2, Vec2, Vec2, Vec2] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 }
  ];

  // Spawn timing accumulator
  private spawnAccumulator = 0;

  constructor(seed: number = 4242) {
    this.prng = new PRNG(seed);

    // Pre-allocate entire particle pool
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push({
        active: false,
        type: 'pollen',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 2,
        angle: 0,
        angularVel: 0,
        life: 0,
        maxLife: 1,
        r: 1,
        g: 1,
        b: 1,
        baseAlpha: 1,
        oscOffset: 0,
        oscSpeed: 1,
        oscAmpX: 5,
        oscAmpY: 3
      });
    }
  }

  /**
   * Pre-populates the visible viewport with ambient particles on startup
   * so the player immediately sees rich atmospheric drifting particles.
   */
  seedViewport(
    camX: number,
    camY: number,
    viewWidth: number,
    viewHeight: number,
    zoom: number,
    biome: BiomeType,
    initialCount: number = 80
  ): void {
    const halfW = (viewWidth / 2) / zoom;
    const halfH = (viewHeight / 2) / zoom;

    for (let i = 0; i < initialCount; i++) {
      const rx = camX - halfW + this.prng.next() * (halfW * 2);
      const ry = camY - halfH + this.prng.next() * (halfH * 2);
      const p = this.allocateParticle();
      if (!p) break;
      this.initAmbientParticle(p, rx, ry, biome);
      // Stagger existing lifetimes so they don't all expire at once
      p.life = p.maxLife * (0.2 + this.prng.next() * 0.8);
    }
  }

  private allocateParticle(): Particle | null {
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    return null;
  }

  /**
   * Spawns a footstep dust puff when the character walks or runs.
   */
  spawnFootstepDust(x: number, y: number, facingAngle: number): void {
    const p = this.allocateParticle();
    if (!p) return;

    p.active = true;
    p.type = 'dust';
    p.x = x + (this.prng.next() - 0.5) * 6;
    p.y = y + (this.prng.next() - 0.5) * 3;

    // Dust puffs slightly backward from moving direction
    const backward = facingAngle + Math.PI;
    const speed = 12 + this.prng.next() * 16;
    p.vx = Math.cos(backward) * speed + (this.prng.next() - 0.5) * 10;
    p.vy = Math.sin(backward) * speed - (8 + this.prng.next() * 10); // drifts up
    p.size = 2.2 + this.prng.next() * 1.8;
    p.angle = this.prng.next() * Math.PI * 2;
    p.angularVel = (this.prng.next() - 0.5) * 2;

    p.maxLife = 0.45 + this.prng.next() * 0.3;
    p.life = p.maxLife;

    // Soft warm earth/dust color
    p.r = 0.82;
    p.g = 0.78;
    p.b = 0.70;
    p.baseAlpha = 0.35;

    p.oscOffset = 0;
    p.oscSpeed = 0;
    p.oscAmpX = 0;
    p.oscAmpY = 0;
  }

  /**
   * Spawns an expanding concentric water ripple ellipse.
   */
  spawnRipple(x: number, y: number, maxRadius: number = 14): void {
    const p = this.allocateParticle();
    if (!p) return;

    p.active = true;
    p.type = 'ripple';
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.size = 2.5; // starting radius
    p.angle = maxRadius; // target max radius
    p.angularVel = 0;
    p.maxLife = 1.0;
    p.life = p.maxLife;

    p.r = 0.90;
    p.g = 0.96;
    p.b = 1.0;
    p.baseAlpha = 0.55;

    p.oscOffset = 0;
    p.oscSpeed = 0;
    p.oscAmpX = 0;
    p.oscAmpY = 0;
  }

  private initAmbientParticle(p: Particle, spawnX: number, spawnY: number, biome: BiomeType): void {
    p.active = true;
    p.x = spawnX;
    p.y = spawnY;
    p.oscOffset = this.prng.next() * Math.PI * 2;
    p.angle = this.prng.next() * Math.PI * 2;

    // Pick type and aesthetics based on biome
    const roll = this.prng.next();

    if (biome === BiomeType.CherryBlossom) {
      if (roll < 0.85) {
        // Cherry Blossom Petal
        p.type = 'petal';
        p.size = 3.6 + this.prng.next() * 2.2;
        p.angularVel = (this.prng.next() - 0.5) * 3.5;
        p.maxLife = 6.0 + this.prng.next() * 4.0;
        p.r = 0.98;
        p.g = 0.75 + this.prng.next() * 0.15;
        p.b = 0.80 + this.prng.next() * 0.15;
        p.baseAlpha = 0.75;
        p.oscSpeed = 1.2 + this.prng.next() * 1.5;
        p.oscAmpX = 14 + this.prng.next() * 10;
        p.oscAmpY = 8 + this.prng.next() * 6;
      } else {
        // Pollen
        p.type = 'pollen';
        p.size = 1.2 + this.prng.next() * 1.2;
        p.angularVel = 0;
        p.maxLife = 5.0 + this.prng.next() * 4.0;
        p.r = 0.96;
        p.g = 0.85;
        p.b = 0.40;
        p.baseAlpha = 0.65;
        p.oscSpeed = 2.0 + this.prng.next() * 2.0;
        p.oscAmpX = 6;
        p.oscAmpY = 4;
      }
    } else if (biome === BiomeType.AutumnMaple) {
      if (roll < 0.80) {
        // Autumn Leaf (orange/amber/red)
        p.type = 'leaf';
        p.size = 4.2 + this.prng.next() * 2.5;
        p.angularVel = (this.prng.next() - 0.5) * 4.0;
        p.maxLife = 7.0 + this.prng.next() * 4.0;
        const colorVariant = this.prng.next();
        if (colorVariant < 0.5) {
          p.r = 0.91; p.g = 0.55; p.b = 0.22; // Amber orange
        } else if (colorVariant < 0.8) {
          p.r = 0.82; p.g = 0.32; p.b = 0.14; // Rust red
        } else {
          p.r = 0.94; p.g = 0.72; p.b = 0.20; // Golden yellow
        }
        p.baseAlpha = 0.85;
        p.oscSpeed = 1.0 + this.prng.next() * 1.4;
        p.oscAmpX = 16 + this.prng.next() * 12;
        p.oscAmpY = 10 + this.prng.next() * 6;
      } else {
        // Pollen
        p.type = 'pollen';
        p.size = 1.4 + this.prng.next() * 1.0;
        p.angularVel = 0;
        p.maxLife = 5.0 + this.prng.next() * 3.0;
        p.r = 0.96; p.g = 0.82; p.b = 0.35;
        p.baseAlpha = 0.6;
        p.oscSpeed = 2.0;
        p.oscAmpX = 8;
        p.oscAmpY = 4;
      }
    } else if (biome === BiomeType.GlowingHollow) {
      if (roll < 0.65) {
        // Bioluminescent Spore
        p.type = 'spore';
        p.size = 1.8 + this.prng.next() * 1.6;
        p.angularVel = (this.prng.next() - 0.5) * 1.5;
        p.maxLife = 5.5 + this.prng.next() * 4.0;
        if (roll < 0.35) {
          p.r = 0.28; p.g = 0.82; p.b = 0.72; // Cyan teal
        } else {
          p.r = 0.68; p.g = 0.45; p.b = 0.85; // Soft violet
        }
        p.baseAlpha = 0.85;
        p.oscSpeed = 1.5 + this.prng.next() * 1.5;
        p.oscAmpX = 8;
        p.oscAmpY = 6;
      } else {
        // Firefly
        p.type = 'firefly';
        p.size = 2.4 + this.prng.next() * 1.2;
        p.angularVel = 0;
        p.maxLife = 8.0 + this.prng.next() * 5.0;
        p.r = 0.75; p.g = 0.95; p.b = 0.45; // Warm yellow-green
        p.baseAlpha = 0.90;
        p.oscSpeed = 0.8 + this.prng.next() * 0.8;
        p.oscAmpX = 14;
        p.oscAmpY = 12;
      }
    } else if (biome === BiomeType.PineForest) {
      if (roll < 0.55) {
        // Forest green leaf / needle
        p.type = 'leaf';
        p.size = 3.2 + this.prng.next() * 2.0;
        p.angularVel = (this.prng.next() - 0.5) * 3.0;
        p.maxLife = 6.0 + this.prng.next() * 3.0;
        p.r = 0.22; p.g = 0.52; p.b = 0.26;
        p.baseAlpha = 0.75;
        p.oscSpeed = 1.2;
        p.oscAmpX = 10;
        p.oscAmpY = 6;
      } else {
        // Spore / pollen
        p.type = 'pollen';
        p.size = 1.3 + this.prng.next() * 1.2;
        p.angularVel = 0;
        p.maxLife = 5.0 + this.prng.next() * 3.0;
        p.r = 0.92; p.g = 0.88; p.b = 0.45;
        p.baseAlpha = 0.6;
        p.oscSpeed = 2.0;
        p.oscAmpX = 6;
        p.oscAmpY = 4;
      }
    } else if (biome === BiomeType.WildflowerFields) {
      if (roll < 0.40) {
        // Colorful flower petal (rose pink, lavender, yellow)
        p.type = 'petal';
        p.size = 3.2 + this.prng.next() * 1.8;
        p.angularVel = (this.prng.next() - 0.5) * 3.0;
        p.maxLife = 5.5 + this.prng.next() * 3.5;
        const petRoll = this.prng.next();
        if (petRoll < 0.4) {
          p.r = 0.95; p.g = 0.58; p.b = 0.54; // Rose coral
        } else if (petRoll < 0.7) {
          p.r = 0.78; p.g = 0.60; p.b = 0.85; // Lavender
        } else {
          p.r = 0.98; p.g = 0.85; p.b = 0.25; // Buttercup yellow
        }
        p.baseAlpha = 0.75;
        p.oscSpeed = 1.4;
        p.oscAmpX = 12;
        p.oscAmpY = 7;
      } else {
        // Golden meadow pollen
        p.type = 'pollen';
        p.size = 1.3 + this.prng.next() * 1.2;
        p.angularVel = 0;
        p.maxLife = 5.0 + this.prng.next() * 4.0;
        p.r = 0.96; p.g = 0.84; p.b = 0.35;
        p.baseAlpha = 0.65;
        p.oscSpeed = 2.2;
        p.oscAmpX = 7;
        p.oscAmpY = 4;
      }
    } else {
      // Meadow / Birch / Marsh / Default: Sunny golden pollen
      if (roll < 0.85) {
        p.type = 'pollen';
        p.size = 1.3 + this.prng.next() * 1.4;
        p.angularVel = 0;
        p.maxLife = 5.0 + this.prng.next() * 4.0;
        p.r = 0.96; p.g = 0.82; p.b = 0.32;
        p.baseAlpha = 0.65;
        p.oscSpeed = 2.2 + this.prng.next() * 1.5;
        p.oscAmpX = 8;
        p.oscAmpY = 5;
      } else {
        // Occasional soft daisy / blossom petal
        p.type = 'petal';
        p.size = 3.0 + this.prng.next() * 1.8;
        p.angularVel = (this.prng.next() - 0.5) * 2.5;
        p.maxLife = 5.0 + this.prng.next() * 3.0;
        p.r = 0.98; p.g = 0.95; p.b = 0.88; // Daisy petal
        p.baseAlpha = 0.70;
        p.oscSpeed = 1.4;
        p.oscAmpX = 10;
        p.oscAmpY = 6;
      }
    }

    p.life = p.maxLife;

    // Initial velocity: gentle nudge in wind direction
    p.vx = (this.prng.next() - 0.5) * 10;
    p.vy = (this.prng.next() - 0.5) * 8;
  }

  /**
   * Updates all active particles and spawns new ambient ones upwind.
   */
  update(
    dt: number,
    time: number,
    camX: number,
    camY: number,
    viewWidth: number,
    viewHeight: number,
    zoom: number,
    biome: BiomeType,
    globalWind: Vec2
  ): void {
    const halfW = (viewWidth / 2) / zoom;
    const halfH = (viewHeight / 2) / zoom;
    const margin = 120;

    const minX = camX - halfW - margin;
    const maxX = camX + halfW + margin;
    const minY = camY - halfH - margin;
    const maxY = camY + halfH + margin;

    let activeCount = 0;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      // Check viewport bounds (cull if drifted far off-screen)
      if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
        p.active = false;
        continue;
      }

      // Physics integration
      if (p.type === 'dust') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(0.88, dt * 60);
        p.vy *= Math.pow(0.88, dt * 60);
        p.size += dt * 2.0; // expand slightly
      } else if (p.type === 'ripple') {
        const expandSpeed = (p.angle - 2.5) / p.maxLife;
        p.size += expandSpeed * dt;
      } else {
        // Atmospheric particles advected by wind + organic curl
        const windSpeedMult = p.type === 'pollen' ? 18 : p.type === 'firefly' ? 6 : 24;
        const targetVx = globalWind.x * windSpeedMult;
        const targetVy = globalWind.y * windSpeedMult + (p.type === 'firefly' ? 0 : 6); // gentle gravity drift

        // Ease velocity toward target wind
        p.vx += (targetVx - p.vx) * Math.min(1, 3.5 * dt);
        p.vy += (targetVy - p.vy) * Math.min(1, 3.5 * dt);

        // Sinusoidal curl noise
        const curlX = Math.sin(time * p.oscSpeed + p.oscOffset) * p.oscAmpX;
        const curlY = Math.cos(time * p.oscSpeed * 0.8 + p.oscOffset) * p.oscAmpY;

        p.x += (p.vx + curlX) * dt;
        p.y += (p.vy + curlY) * dt;

        p.angle += p.angularVel * dt;
      }

      activeCount++;
    }

    // Continuous ambient spawning to maintain target particle count (~120 on screen)
    const targetCount = 120;
    this.spawnAccumulator += dt * 30; // ~30 particles/sec spawn budget
    const toSpawn = Math.floor(this.spawnAccumulator);
    this.spawnAccumulator -= toSpawn;

    if (activeCount < targetCount && toSpawn > 0) {
      for (let s = 0; s < toSpawn && activeCount < targetCount; s++) {
        const p = this.allocateParticle();
        if (!p) break;

        // Spawn upwind so particles naturally drift into the viewport
        let spawnX: number;
        let spawnY: number;

        const spawnEdgeRoll = this.prng.next();
        if (spawnEdgeRoll < 0.6) {
          // Upwind horizontal edge (left or right depending on wind direction)
          if (globalWind.x >= 0) {
            spawnX = camX - halfW - (20 + this.prng.next() * 40);
          } else {
            spawnX = camX + halfW + (20 + this.prng.next() * 40);
          }
          spawnY = camY - halfH + this.prng.next() * (halfH * 2);
        } else {
          // Upwind vertical edge (top or bottom)
          if (globalWind.y >= 0) {
            spawnY = camY - halfH - (20 + this.prng.next() * 40);
          } else {
            spawnY = camY + halfH + (20 + this.prng.next() * 40);
          }
          spawnX = camX - halfW + this.prng.next() * (halfW * 2);
        }

        this.initAmbientParticle(p, spawnX, spawnY, biome);
        activeCount++;
      }
    }
  }

  /**
   * Renders all active particles with zero per-frame garbage allocations.
   */
  render(renderer: IRenderer, time: number): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      // Calculate smooth fade-in and fade-out
      const progress = 1.0 - (p.life / p.maxLife);
      const fadeIn = Math.min(1.0, progress / 0.15);
      const fadeOut = Math.min(1.0, (1.0 - progress) / 0.20);
      let alpha = p.baseAlpha * fadeIn * fadeOut;

      if (p.type === 'firefly') {
        // Breathing pulse for fireflies
        const pulse = 0.65 + 0.35 * Math.sin(time * 4.5 + p.oscOffset);
        alpha *= pulse;
      }

      this.scratchColor.r = p.r;
      this.scratchColor.g = p.g;
      this.scratchColor.b = p.b;
      this.scratchColor.a = alpha;

      if (p.type === 'pollen' || p.type === 'dust') {
        renderer.drawCircle(p.x, p.y, p.size, this.scratchColor);
      } else if (p.type === 'ripple') {
        // Concentric perspective ellipse ring for water ripple
        const segments = 8;
        const step = (Math.PI * 2) / segments;
        for (let s = 0; s < segments; s++) {
          const a0 = s * step;
          const a1 = (s + 1) * step;
          const x0 = p.x + Math.cos(a0) * p.size;
          const y0 = p.y + Math.sin(a0) * (p.size * 0.55);
          const x1 = p.x + Math.cos(a1) * p.size;
          const y1 = p.y + Math.sin(a1) * (p.size * 0.55);
          renderer.drawLine(x0, y0, x1, y1, 1.3, this.scratchColor);
        }
      } else if (p.type === 'spore' || p.type === 'firefly') {
        // 2-layer luminous glow: soft outer halo + sharp bright core
        this.scratchHaloColor.r = p.r;
        this.scratchHaloColor.g = p.g;
        this.scratchHaloColor.b = p.b;
        this.scratchHaloColor.a = alpha * 0.30;
        renderer.drawCircle(p.x, p.y, p.size * 2.2, this.scratchHaloColor);
        renderer.drawCircle(p.x, p.y, p.size * 0.9, this.scratchColor);
      } else if (p.type === 'petal' || p.type === 'leaf') {
        // Stylized tumbling leaf / petal with rotation
        const tumble = 0.4 + 0.6 * Math.abs(Math.sin(p.angle * 1.5));
        const hw = p.size * 0.45 * tumble;
        const hh = p.size;
        const cos = Math.cos(p.angle);
        const sin = Math.sin(p.angle);

        // Scratch quad corners rotated by angle
        this.scratchQuad[0].x = p.x - hw * cos + hh * sin;
        this.scratchQuad[0].y = p.y - hw * sin - hh * cos;

        this.scratchQuad[1].x = p.x + hw * cos + hh * sin;
        this.scratchQuad[1].y = p.y + hw * sin - hh * cos;

        this.scratchQuad[2].x = p.x + hw * cos - hh * sin;
        this.scratchQuad[2].y = p.y + hw * sin + hh * cos;

        this.scratchQuad[3].x = p.x - hw * cos - hh * sin;
        this.scratchQuad[3].y = p.y - hw * sin + hh * cos;

        renderer.drawPolygon(this.scratchQuad, this.scratchColor);
      }
    }
  }

  getActiveCount(): number {
    let count = 0;
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.pool[i].active) count++;
    }
    return count;
  }
}
