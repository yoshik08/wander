import { Vec2, vec2, ColorRGBA, lerpAngle } from '../core/math';
import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';
import { CreatureGenome, generateCreatureGenome } from './creature';
import { SavedCreature } from '../systems/save';

export class PartyLeader {
  pos: Vec2 = vec2(0, 0);
  prevPos: Vec2 = vec2(0, 0);
  vel: Vec2 = vec2(0, 0);

  facingLeft: boolean = false;
  state: 'idle' | 'walk' | 'sit' = 'idle';
  timer: number = 0;
  blinkTimer: number = 2.5;

  genome: CreatureGenome;
  level: number;

  constructor(spawnX: number, spawnY: number, savedData: SavedCreature, globalSeed: string | number) {
    this.pos = vec2(spawnX, spawnY);
    this.prevPos = vec2(spawnX, spawnY);
    this.genome = generateCreatureGenome(globalSeed, savedData.speciesId);
    this.level = savedData.level;
  }

  update(dt: number, time: number, playerPos: Vec2, isPlayerSitting: boolean): void {
    this.prevPos.x = this.pos.x;
    this.prevPos.y = this.pos.y;

    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = 2.5 + Math.random() * 3.5;
    }

    if (isPlayerSitting) {
      // Follow to the side of the player and sit
      const targetX = playerPos.x - 14;
      const targetY = playerPos.y + 2;
      const dist = Math.hypot(targetX - this.pos.x, targetY - this.pos.y);
      if (dist > 4) {
        const moveAngle = Math.atan2(targetY - this.pos.y, targetX - this.pos.x);
        this.vel.x = Math.cos(moveAngle) * 45;
        this.vel.y = Math.sin(moveAngle) * 45;
        this.state = 'walk';
        this.facingLeft = this.vel.x < 0;
      } else {
        this.vel.x = 0;
        this.vel.y = 0;
        this.state = 'sit';
        this.facingLeft = false;
      }
    } else {
      // Trail behind player
      const dx = playerPos.x - this.pos.x;
      const dy = playerPos.y - this.pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 30) {
        const moveAngle = Math.atan2(dy, dx);
        const speed = Math.min(80, dist * 2);
        this.vel.x = Math.cos(moveAngle) * speed;
        this.vel.y = Math.sin(moveAngle) * speed;
        this.state = 'walk';
        if (Math.abs(this.vel.x) > 0.05) {
          this.facingLeft = this.vel.x < 0;
        }
      } else {
        this.vel.x = 0;
        this.vel.y = 0;
        if (this.state === 'walk') {
          this.state = 'idle';
          this.timer = 0;
        }
      }
    }

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    
    if (this.state === 'idle') {
      this.timer += dt;
      if (this.timer > 4.0) {
        this.state = 'sit';
      }
    }
  }

  // Scratch object to prevent allocations
  private scratchColor: ColorRGBA = { r: 1, g: 1, b: 1, a: 1 };

  draw(renderer: IRenderer, art: ArtToolkit, alpha: number, time: number): void {
    const renderX = this.prevPos.x + (this.pos.x - this.prevPos.x) * alpha;
    const renderY = this.prevPos.y + (this.pos.y - this.prevPos.y) * alpha;

    const isBlinking = this.blinkTimer < 0.15;
    const bounce = this.state === 'walk' ? Math.abs(Math.sin(time * 12)) * 2.0 : 0;
    
    let bob = 0;
    if (this.state === 'idle') bob = Math.sin(time * 3) * 0.5;
    if (this.state === 'sit') bob = Math.sin(time * 1.5) * 0.3;

    art.drawCreature(
      renderX,
      renderY - bounce + bob,
      time,
      this.genome,
      this.state,
      this.facingLeft
    );
  }
}
