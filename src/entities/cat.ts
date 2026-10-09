import { Vec2, vec2, ColorRGBA, hexToRgba, lerpAngle, lerp } from '../core/math';
import { VerletRope } from './verlet';
import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';

export type CatState = 'following' | 'sitting' | 'sleeping';

export interface CatColorway {
  name: string;
  body: string;
  patch: string;
  innerEar: string;
  eyes: string;
  nose: string;
}

export const CAT_COLORWAYS: CatColorway[] = [
  // 0: Calico / Tricolor
  { name: 'Calico', body: '#FDFEFE', patch: '#D35400', innerEar: '#FADBD8', eyes: '#27AE60', nose: '#E74C3C' },
  // 1: Ginger Tabby
  { name: 'Ginger', body: '#E67E22', patch: '#BA4A00', innerEar: '#FADBD8', eyes: '#2ECC71', nose: '#E74C3C' },
  // 2: Tuxedo (Black & White)
  { name: 'Tuxedo', body: '#1C2833', patch: '#FDFEFE', innerEar: '#D5D8DC', eyes: '#F1C40F', nose: '#566573' },
  // 3: Cloud White
  { name: 'Cloud', body: '#EAEDED', patch: '#BDC3C7', innerEar: '#FADBD8', eyes: '#3498DB', nose: '#E74C3C' }
];

export class Cat {
  pos: Vec2 = vec2(0, 0);
  prevPos: Vec2 = vec2(0, 0);
  vel: Vec2 = vec2(0, 0);

  facingAngle: number = Math.PI / 2;
  state: CatState = 'sitting';
  stateTimer: number = 0;

  trotCycle: number = 0;
  variant: number = 0; // 0 = Calico, 1 = Ginger, 2 = Tuxedo, 3 = Cloud

  tailRope: VerletRope;

  // Animation timers
  blinkTimer: number = 2.5;
  isBlinking: boolean = false;
  earTwitchTimer: number = 4.0;
  isEarTwitching: boolean = false;

  // Scratch memory for zero-allocation rendering
  private scratchColor: ColorRGBA = { r: 1, g: 1, b: 1, a: 1 };
  private scratchEyeColor: ColorRGBA = { r: 0.1, g: 0.7, b: 0.3, a: 1 };

  constructor(spawnX: number, spawnY: number, variant: number = 0) {
    this.pos = vec2(spawnX, spawnY);
    this.prevPos = vec2(spawnX, spawnY);
    this.variant = variant % CAT_COLORWAYS.length;

    // Tail: 5 nodes, segment length 3.2px
    this.tailRope = new VerletRope(5, 3.2, vec2(spawnX, spawnY), 0.88);
  }

  update(dt: number, time: number, playerPos: Vec2, playerVel: Vec2, wind: Vec2): void {
    this.prevPos.x = this.pos.x;
    this.prevPos.y = this.pos.y;

    // Calculate distance and follow target relative to player
    const dx = playerPos.x - this.pos.x;
    const dy = playerPos.y - this.pos.y;
    const distToPlayer = Math.hypot(dx, dy);
    const playerSpeed = Math.hypot(playerVel.x, playerVel.y);

    // Follow target: trails slightly to player's rear/flank
    const followDist = 28;
    const targetX = playerPos.x - Math.cos(playerVel.x !== 0 || playerVel.y !== 0 ? Math.atan2(playerVel.y, playerVel.x) : this.facingAngle) * followDist;
    const targetY = playerPos.y - Math.sin(playerVel.x !== 0 || playerVel.y !== 0 ? Math.atan2(playerVel.y, playerVel.x) : this.facingAngle) * followDist;

    const toTargetX = targetX - this.pos.x;
    const toTargetY = targetY - this.pos.y;
    const distToTarget = Math.hypot(toTargetX, toTargetY);

    // State machine logic
    if (playerSpeed > 15 || distToPlayer > 55) {
      // Player is moving or far away -> Cat trots along
      if (this.state === 'sleeping' || this.state === 'sitting') {
        this.state = 'following';
        this.stateTimer = 0;
      }

      if (distToTarget > 6) {
        const moveAngle = Math.atan2(toTargetY, toTargetX);
        this.facingAngle = lerpAngle(this.facingAngle, moveAngle, Math.min(1.0, 10.0 * dt));

        // Speed ramps up if falling behind, matching player pace
        const maxCatSpeed = Math.max(120, playerSpeed * 1.15);
        const desiredSpeed = Math.min(maxCatSpeed, distToTarget * 4.5);
        const targetVx = Math.cos(moveAngle) * desiredSpeed;
        const targetVy = Math.sin(moveAngle) * desiredSpeed;

        this.vel.x = lerp(this.vel.x, targetVx, Math.min(1.0, 8.0 * dt));
        this.vel.y = lerp(this.vel.y, targetVy, Math.min(1.0, 8.0 * dt));

        const currentSpeed = Math.hypot(this.vel.x, this.vel.y);
        this.trotCycle += dt * (12 + currentSpeed * 0.08);
      } else {
        this.vel.x *= Math.pow(0.5, dt * 60);
        this.vel.y *= Math.pow(0.5, dt * 60);
      }
    } else {
      // Player is stopped/idle
      this.vel.x *= Math.pow(0.7, dt * 60);
      this.vel.y *= Math.pow(0.7, dt * 60);
      if (Math.abs(this.vel.x) < 1) this.vel.x = 0;
      if (Math.abs(this.vel.y) < 1) this.vel.y = 0;

      this.stateTimer += dt;

      if (this.state === 'following' && this.stateTimer > 2.0) {
        this.state = 'sitting';
        this.stateTimer = 0;
      } else if (this.state === 'sitting' && this.stateTimer > 7.0) {
        // Curls into a cozy ball and sleeps!
        this.state = 'sleeping';
        this.stateTimer = 0;
      }
    }

    // Integrate position
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    // Blink & Ear twitch timers
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.isBlinking = !this.isBlinking;
      this.blinkTimer = this.isBlinking ? 0.15 : (2.5 + Math.sin(time) * 1.5);
    }

    this.earTwitchTimer -= dt;
    if (this.earTwitchTimer <= 0) {
      this.isEarTwitching = !this.isEarTwitching;
      this.earTwitchTimer = this.isEarTwitching ? 0.20 : (3.5 + Math.cos(time) * 2.0);
    }

    // Update Verlet Tail
    const tailBaseOffsetX = -Math.cos(this.facingAngle) * 6;
    const tailBaseOffsetY = -Math.sin(this.facingAngle) * 5 + 1;
    const tailAnchor = vec2(this.pos.x + tailBaseOffsetX, this.pos.y + tailBaseOffsetY);

    // Natural tail swishing force
    const swish = Math.sin(time * 3.5) * 8;
    const tailForce = vec2(
      wind.x * 10 - this.vel.x * 0.4 + swish * Math.sin(this.facingAngle),
      wind.y * 10 - this.vel.y * 0.4 - swish * Math.cos(this.facingAngle) + 4
    );
    this.tailRope.update(tailAnchor, tailForce, dt);
  }

  getInterpolatedPos(alpha: number): Vec2 {
    return {
      x: lerp(this.prevPos.x, this.pos.x, alpha),
      y: lerp(this.prevPos.y, this.pos.y, alpha)
    };
  }

  render(renderer: IRenderer, art: ArtToolkit, alpha: number, time: number): void {
    const p = this.getInterpolatedPos(alpha);
    const col = CAT_COLORWAYS[this.variant] || CAT_COLORWAYS[0];

    const bodyCol = hexToRgba(col.body);
    const patchCol = hexToRgba(col.patch);
    const innerEarCol = hexToRgba(col.innerEar);
    const eyeCol = hexToRgba(col.eyes);
    const noseCol = hexToRgba(col.nose);
    const darkDark = hexToRgba('#1C2833');

    // ==========================================
    // 1. STATE: SLEEPING (Curled in a ball)
    // ==========================================
    if (this.state === 'sleeping') {
      const breath = 1.0 + Math.sin(time * 2.4) * 0.05;

      // Soft circular blob shadow
      art.drawBlobShadow(p.x, p.y + 1, 7.5 * breath);
      art.drawDropShadow(p.x, p.y + 2, 10, 6);

      // Curled round body
      renderer.drawCircle(p.x, p.y - 1, 6.5 * breath, bodyCol);
      // Calico/tabby patch on back
      renderer.drawCircle(p.x + 1.5, p.y - 2, 4.0 * breath, patchCol);

      // Curled head nestled against body
      renderer.drawCircle(p.x - 3.5, p.y, 4.2 * breath, bodyCol);

      // Tucked little ears
      renderer.drawCircle(p.x - 5.5, p.y - 3, 1.8, bodyCol);
      renderer.drawCircle(p.x - 5.5, p.y - 3, 1.0, innerEarCol);
      renderer.drawCircle(p.x - 2.5, p.y - 4, 1.8, bodyCol);
      renderer.drawCircle(p.x - 2.5, p.y - 4, 1.0, innerEarCol);

      // Sleeping closed eye arcs (~_~)
      renderer.drawLine(p.x - 5, p.y + 0.5, p.x - 3, p.y + 0.5, 1.0, darkDark);

      // Curled tail wrapped around front
      renderer.drawLine(p.x + 4, p.y + 2, p.x - 1, p.y + 4.5, 1.8, patchCol);
      renderer.drawCircle(p.x - 1.5, p.y + 4.5, 1.4, bodyCol); // white tail tip

      // Little "z" float icon occasionally
      const zPhase = (time * 0.6) % 3.0;
      if (zPhase < 2.0) {
        const zAlpha = Math.sin((zPhase / 2.0) * Math.PI) * 0.55;
        this.scratchColor.r = 0.8;
        this.scratchColor.g = 0.9;
        this.scratchColor.b = 1.0;
        this.scratchColor.a = zAlpha;
        renderer.drawCircle(p.x - 6 - zPhase * 2, p.y - 7 - zPhase * 5, 1.2, this.scratchColor);
      }
      return;
    }

    // ==========================================
    // 2. STATE: SITTING OR FOLLOWING (Upright / Trotting)
    // ==========================================
    const cos = Math.cos(this.facingAngle);
    const sin = Math.sin(this.facingAngle);
    const perpX = -sin;
    const perpY = cos;

    // Contact blob shadow and dynamic sun drop shadow
    art.drawBlobShadow(p.x, p.y + 1, 6.0);
    art.drawDropShadow(p.x, p.y + 2, 10, 8);

    // Trotting leg animations when moving
    const isMoving = this.state === 'following' && Math.hypot(this.vel.x, this.vel.y) > 10;
    if (isMoving) {
      const legBob1 = Math.sin(this.trotCycle) * 3.0;
      const legBob2 = Math.sin(this.trotCycle + Math.PI) * 3.0;

      // Paws (front and back pairs)
      renderer.drawCircle(p.x + cos * 4 + perpX * 3.0, p.y + sin * 4 + perpY * 3.0 + legBob1, 1.6, bodyCol);
      renderer.drawCircle(p.x + cos * 4 - perpX * 3.0, p.y + sin * 4 - perpY * 3.0 + legBob2, 1.6, bodyCol);
      renderer.drawCircle(p.x - cos * 4 + perpX * 3.0, p.y - sin * 4 + perpY * 3.0 + legBob2, 1.6, bodyCol);
      renderer.drawCircle(p.x - cos * 4 - perpX * 3.0, p.y - sin * 4 - perpY * 3.0 + legBob1, 1.6, bodyCol);
    } else {
      // Sitting paws side by side
      renderer.drawCircle(p.x + perpX * 2.5, p.y + 2.5, 1.6, bodyCol);
      renderer.drawCircle(p.x - perpX * 2.5, p.y + 2.5, 1.6, bodyCol);
    }

    // Main Body Oval
    const bodyCenterY = p.y - 3.5;
    renderer.drawCircle(p.x, bodyCenterY, 5.5, bodyCol);
    // Coat Patch
    renderer.drawCircle(p.x + cos * 1.5, bodyCenterY + sin * 1.5, 3.8, patchCol);

    // Head
    const headX = p.x + cos * 4.5;
    const headY = bodyCenterY - 4.0 + sin * 2.0;
    renderer.drawCircle(headX, headY, 4.5, bodyCol);

    // Perky Ears
    const earTwitch = this.isEarTwitching ? 0.8 : 0.0;
    // Left ear
    renderer.drawCircle(headX + perpX * 3.2, headY - 3.5 + earTwitch, 2.0, bodyCol);
    renderer.drawCircle(headX + perpX * 3.2, headY - 3.5 + earTwitch, 1.1, innerEarCol);
    // Right ear
    renderer.drawCircle(headX - perpX * 3.2, headY - 3.5, 2.0, bodyCol);
    renderer.drawCircle(headX - perpX * 3.2, headY - 3.5, 1.1, innerEarCol);

    // Eyes (or blink slits)
    const eyeSpacing = 2.2;
    const eyeOffsetX = cos * 1.5;
    const eyeOffsetY = sin * 1.0;
    if (!this.isBlinking) {
      // Round expressive cat eyes with black pupils
      renderer.drawCircle(headX + eyeOffsetX + perpX * eyeSpacing, headY + eyeOffsetY, 1.4, eyeCol);
      renderer.drawCircle(headX + eyeOffsetX + perpX * eyeSpacing, headY + eyeOffsetY, 0.7, darkDark);

      renderer.drawCircle(headX + eyeOffsetX - perpX * eyeSpacing, headY + eyeOffsetY, 1.4, eyeCol);
      renderer.drawCircle(headX + eyeOffsetX - perpX * eyeSpacing, headY + eyeOffsetY, 0.7, darkDark);
    } else {
      // Gentle blink slit
      renderer.drawLine(
        headX + eyeOffsetX + perpX * (eyeSpacing + 1), headY + eyeOffsetY,
        headX + eyeOffsetX + perpX * (eyeSpacing - 1), headY + eyeOffsetY,
        1.1, darkDark
      );
      renderer.drawLine(
        headX + eyeOffsetX - perpX * (eyeSpacing - 1), headY + eyeOffsetY,
        headX + eyeOffsetX - perpX * (eyeSpacing + 1), headY + eyeOffsetY,
        1.1, darkDark
      );
    }

    // Tiny pink nose
    renderer.drawCircle(headX + cos * 3.2, headY + 1.2, 0.9, noseCol);

    // Whiskers
    renderer.drawLine(headX + perpX * 2.0, headY + 1.5, headX + perpX * 6.5, headY + 1.0, 0.8, darkDark);
    renderer.drawLine(headX + perpX * 2.0, headY + 2.2, headX + perpX * 6.0, headY + 3.0, 0.8, darkDark);
    renderer.drawLine(headX - perpX * 2.0, headY + 1.5, headX - perpX * 6.5, headY + 1.0, 0.8, darkDark);
    renderer.drawLine(headX - perpX * 2.0, headY + 2.2, headX - perpX * 6.0, headY + 3.0, 0.8, darkDark);

    // Verlet Tail Segments
    for (let i = 0; i < this.tailRope.nodes.length - 1; i++) {
      const n1 = this.tailRope.nodes[i];
      const n2 = this.tailRope.nodes[i + 1];
      const tailColor = i >= 3 ? bodyCol : patchCol;
      renderer.drawLine(n1.pos.x, n1.pos.y, n2.pos.x, n2.pos.y, 2.2 - i * 0.25, tailColor);
    }
  }
}
