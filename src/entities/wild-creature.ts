import { Vec2, vec2, lerp, hexToRgba } from '../core/math';
import { PRNG } from '../core/prng';
import { CreatureGenome, generateCreatureGenome } from './creature';
import { CreatureInstance, CHUNK_PIXEL_SIZE, Chunk } from '../world/chunk';
import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';

export class WildCreature {
  readonly id: string;
  readonly speciesId: number;
  readonly chunkX: number;
  readonly chunkY: number;
  readonly genome: CreatureGenome;
  readonly level: number;

  maxResolve: number;
  resolve: number;

  pos: Vec2;
  prevPos: Vec2;
  vel: Vec2;
  originPos: Vec2;
  targetPos: Vec2;

  state: 'idle' | 'walk' | 'sit' | 'yield';
  facingLeft: boolean;
  timer: number;
  blinkTimer: number;
  walkSpeed: number;

  private rng: PRNG;

  constructor(instance: CreatureInstance, chunkX: number, chunkY: number, globalSeed: string | number) {
    this.id = instance.id;
    this.speciesId = instance.speciesId;
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.level = instance.level;

    const worldX = chunkX * CHUNK_PIXEL_SIZE + instance.x;
    const worldY = chunkY * CHUNK_PIXEL_SIZE + instance.y;

    this.pos = vec2(worldX, worldY);
    this.prevPos = vec2(worldX, worldY);
    this.originPos = vec2(worldX, worldY);
    this.targetPos = vec2(worldX, worldY);
    this.vel = vec2(0, 0);

    this.genome = generateCreatureGenome(globalSeed, instance.speciesId);
    this.maxResolve = Math.floor(this.genome.stats.vigor * 2 + this.level * 4);
    this.resolve = this.maxResolve;

    this.rng = new PRNG(this.genome.seedNum ^ (chunkX * 7919) ^ (chunkY * 6571));
    this.facingLeft = this.rng.range(0, 1) < 0.5;
    this.state = this.rng.range(0, 1) < 0.3 ? 'sit' : 'idle';
    this.timer = this.rng.range(1.5, 4.0);
    this.blinkTimer = this.rng.range(2.0, 5.0);
    this.walkSpeed = 14 + (this.genome.stats.haste * 0.3);
  }

  update(dt: number, time: number, isTraversable: (x: number, y: number) => boolean, playerPos?: Vec2): void {
    this.prevPos.x = this.pos.x;
    this.prevPos.y = this.pos.y;

    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = this.rng.range(2.5, 6.0);
    }

    if (this.state === 'yield') {
      this.vel.x = 0;
      this.vel.y = 0;
      return;
    }

    if (this.state === 'walk') {
      const dx = this.targetPos.x - this.pos.x;
      const dy = this.targetPos.y - this.pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 2.0) {
        this.pos.x = this.targetPos.x;
        this.pos.y = this.targetPos.y;
        this.vel.x = 0;
        this.vel.y = 0;
        this.state = this.rng.range(0, 1) < 0.3 ? 'sit' : 'idle';
        this.timer = this.rng.range(2.0, 5.0);
      } else {
        const nx = dx / dist;
        const ny = dy / dist;
        const step = Math.min(dist, this.walkSpeed * dt);
        const nextX = this.pos.x + nx * step;
        const nextY = this.pos.y + ny * step;

        if (isTraversable(nextX, nextY)) {
          this.pos.x = nextX;
          this.pos.y = nextY;
          this.vel.x = nx * this.walkSpeed;
          this.vel.y = ny * this.walkSpeed;
          if (Math.abs(nx) > 0.05) {
            this.facingLeft = nx < 0;
          }
        } else {
          // Blocked by terrain or obstacle
          this.vel.x = 0;
          this.vel.y = 0;
          this.state = 'idle';
          this.timer = this.rng.range(1.5, 3.5);
        }
      }
    } else {
      // Idle or Sit
      this.vel.x = 0;
      this.vel.y = 0;

      // Notice player if very close and look towards them
      if (playerPos) {
        const pDist = Math.hypot(playerPos.x - this.pos.x, playerPos.y - this.pos.y);
        if (pDist < 36) {
          this.facingLeft = playerPos.x < this.pos.x;
        }
      }

      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.state === 'sit') {
          this.state = 'idle';
          this.timer = this.rng.range(2.0, 4.0);
        } else {
          // In idle: decide whether to sit, look around, or wander
          const roll = this.rng.range(0, 1);
          if (roll < 0.25) {
            this.state = 'sit';
            this.timer = this.rng.range(3.0, 6.0);
          } else if (roll < 0.40) {
            this.facingLeft = !this.facingLeft;
            this.timer = this.rng.range(1.5, 3.0);
          } else {
            // Pick wander destination within 45px of originPos
            const wanderAngle = this.rng.range(0, Math.PI * 2);
            const wanderDist = this.rng.range(16, 48);
            const candX = this.originPos.x + Math.cos(wanderAngle) * wanderDist;
            const candY = this.originPos.y + Math.sin(wanderAngle) * wanderDist;

            if (isTraversable(candX, candY)) {
              this.targetPos.x = candX;
              this.targetPos.y = candY;
              this.state = 'walk';
            } else {
              this.timer = this.rng.range(1.0, 2.5);
            }
          }
        }
      }
    }
  }

  getInterpolatedPos(alpha: number): Vec2 {
    return {
      x: lerp(this.prevPos.x, this.pos.x, alpha),
      y: lerp(this.prevPos.y, this.pos.y, alpha)
    };
  }

  render(renderer: IRenderer, art: ArtToolkit, alpha: number, time: number, playerPos?: Vec2): void {
    const p = this.getInterpolatedPos(alpha);
    art.drawCreature(p.x, p.y, time, this.genome, this.state, this.facingLeft);

    // Subtle overhead presence tag if player is within gentle proximity
    if (playerPos) {
      const dist = Math.hypot(playerPos.x - p.x, playerPos.y - p.y);
      if (dist < 42) {
        const s = this.genome.scale;
        const tagY = p.y - 18 * s;
        // Elemental pip
        renderer.drawCircle(p.x, tagY, 2.5, this.genome.accentColor);
      }
    }
  }
}

export class WildCreatureManager {
  private creatures: Map<string, WildCreature> = new Map();

  syncWithChunks(visibleChunks: Chunk[], globalSeed: string | number): void {
    for (const chunk of visibleChunks) {
      if (!chunk.data || !chunk.data.creatures) continue;
      for (const inst of chunk.data.creatures) {
        if (!this.creatures.has(inst.id)) {
          this.creatures.set(inst.id, new WildCreature(inst, chunk.chunkX, chunk.chunkY, globalSeed));
        }
      }
    }
  }

  onChunkUnloaded(chunk: Chunk): void {
    if (!chunk.data || !chunk.data.creatures) return;
    for (const inst of chunk.data.creatures) {
      this.creatures.delete(inst.id);
    }
  }

  update(dt: number, time: number, isTraversable: (x: number, y: number) => boolean, playerPos?: Vec2): void {
    for (const creature of this.creatures.values()) {
      creature.update(dt, time, isTraversable, playerPos);
    }
  }

  getActiveCreatures(): WildCreature[] {
    return Array.from(this.creatures.values());
  }

  getCreatureNear(worldX: number, worldY: number, radius: number): WildCreature | null {
    let closest: WildCreature | null = null;
    let closestDist = radius;
    for (const c of this.creatures.values()) {
      const d = Math.hypot(c.pos.x - worldX, c.pos.y - worldY);
      if (d < closestDist) {
        closestDist = d;
        closest = c;
      }
    }
    return closest;
  }
}
