import { Vec2, vec2, ColorRGBA, hexToRgba, lerpAngle, lerp } from '../core/math';
import { VerletRope } from './verlet';
import { IRenderer } from '../render/types';

export type CharacterAction = 'idle' | 'walk' | 'run' | 'sit' | 'wade';

export interface CharacterCustomization {
  colorwayIndex: number; // 0 to 7
  hatIndex: number;      // 0 to 3
  backpackIndex: number; // 0 to 2
}

export const COLORWAYS: { name: string; coat: string; scarf: string }[] = [
  { name: 'Rust Coral', coat: '#D9534F', scarf: '#3EC1D3' },
  { name: 'Forest Moss', coat: '#4A7C59', scarf: '#F4D06F' },
  { name: 'Deep Indigo', coat: '#2C3E50', scarf: '#E74C3C' },
  { name: 'Ochre Gold', coat: '#D4AC0D', scarf: '#2E86C1' },
  { name: 'Heather Violet', coat: '#7D3C98', scarf: '#A3E4D7' },
  { name: 'Pine Teal', coat: '#16A085', scarf: '#F39C12' },
  { name: 'Dusty Plum', coat: '#884EA0', scarf: '#EDBB99' },
  { name: 'Cloud White', coat: '#E5E8E8', scarf: '#E67E22' }
];

export interface Footstep {
  pos: Vec2;
  angle: number;
  life: number; // 1 to 0
}

export class Character {
  pos: Vec2 = vec2(0, 0);
  prevPos: Vec2 = vec2(0, 0);
  vel: Vec2 = vec2(0, 0);

  facingAngle: number = Math.PI / 2; // Facing down (south) initially
  action: CharacterAction = 'idle';

  walkCycle: number = 0;
  customization: CharacterCustomization = {
    colorwayIndex: 0,
    hatIndex: 0,
    backpackIndex: 0
  };

  // Verlet Scarf
  scarfRope: VerletRope;

  // Turning lean angle
  turnLean: number = 0;

  // Footsteps trail
  footsteps: Footstep[] = [];
  private stepTimer: number = 0;

  // Movement tuning
  readonly walkSpeed: number = 110;
  readonly runSpeed: number = 210;
  readonly accel: number = 1400;
  readonly friction: number = 0.84;

  constructor(startX: number = 0, startY: number = 0) {
    this.pos = vec2(startX, startY);
    this.prevPos = vec2(startX, startY);
    this.scarfRope = new VerletRope(5, 3.5, vec2(startX, startY - 14));
  }

  update(inputMove: Vec2, isRunningInput: boolean, windForce: Vec2, dt: number): void {
    this.prevPos.x = this.pos.x;
    this.prevPos.y = this.pos.y;

    const hasInput = Math.hypot(inputMove.x, inputMove.y) > 0.05;
    const targetSpeed = isRunningInput ? this.runSpeed : this.walkSpeed;

    if (hasInput) {
      this.vel.x += inputMove.x * this.accel * dt;
      this.vel.y += inputMove.y * this.accel * dt;

      const currentSpeed = Math.hypot(this.vel.x, this.vel.y);
      if (currentSpeed > targetSpeed) {
        this.vel.x = (this.vel.x / currentSpeed) * targetSpeed;
        this.vel.y = (this.vel.y / currentSpeed) * targetSpeed;
      }

      // Smooth facing turn
      const targetAngle = Math.atan2(this.vel.y, this.vel.x);
      const angleDiff = targetAngle - this.facingAngle;
      this.turnLean = lerp(this.turnLean, Math.sin(angleDiff) * 0.25, 1 - Math.exp(-10 * dt));
      this.facingAngle = lerpAngle(this.facingAngle, targetAngle, 1 - Math.exp(-14 * dt));

      this.action = isRunningInput && currentSpeed > this.walkSpeed * 1.1 ? 'run' : 'walk';
      const strideFreq = this.action === 'run' ? 16 : 10;
      this.walkCycle += dt * strideFreq;

      // Spawn footsteps
      this.stepTimer += dt * strideFreq;
      if (this.stepTimer >= Math.PI) {
        this.stepTimer -= Math.PI;
        this.footsteps.push({
          pos: vec2(this.pos.x, this.pos.y),
          angle: this.facingAngle,
          life: 1.0
        });
        if (this.footsteps.length > 24) this.footsteps.shift();
      }
    } else {
      this.vel.x *= Math.pow(this.friction, dt * 60);
      this.vel.y *= Math.pow(this.friction, dt * 60);
      if (Math.abs(this.vel.x) < 1) this.vel.x = 0;
      if (Math.abs(this.vel.y) < 1) this.vel.y = 0;

      this.turnLean = lerp(this.turnLean, 0, 1 - Math.exp(-8 * dt));
      this.action = 'idle';
      this.walkCycle += dt * 2.0; // Slow breathing cycle
    }

    // Apply motion to position
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    // Decay footsteps
    for (let i = this.footsteps.length - 1; i >= 0; i--) {
      this.footsteps[i].life -= dt * 0.35;
      if (this.footsteps[i].life <= 0) {
        this.footsteps.splice(i, 1);
      }
    }

    // Update Verlet Scarf
    const neckAnchor = vec2(this.pos.x, this.pos.y - 14);
    // Inertia opposite to velocity + environmental wind
    const scarfForce = vec2(
      windForce.x * 20 - this.vel.x * 0.6,
      windForce.y * 20 - this.vel.y * 0.6 + 10 // gentle gravity
    );
    this.scarfRope.update(neckAnchor, scarfForce, dt);
  }

  getInterpolatedPos(alpha: number): Vec2 {
    return {
      x: lerp(this.prevPos.x, this.pos.x, alpha),
      y: lerp(this.prevPos.y, this.pos.y, alpha)
    };
  }

  render(renderer: IRenderer, alpha: number): void {
    const p = this.getInterpolatedPos(alpha);
    const colors = COLORWAYS[this.customization.colorwayIndex] || COLORWAYS[0];

    const coatColor = hexToRgba(colors.coat);
    const scarfColor = hexToRgba(colors.scarf);
    const pantsColor = hexToRgba('#34495E');
    const bootColor = hexToRgba('#4A3728');
    const skinColor = hexToRgba('#FAD7A0');
    const hairColor = hexToRgba('#3B2F2F');
    const shadowColor = hexToRgba('#1B3317', 0.28);

    // 1. Draw footstep impressions
    for (const step of this.footsteps) {
      const stepAlpha = step.life * 0.35;
      renderer.drawRect(step.pos.x - 2, step.pos.y - 1, 4, 2, hexToRgba('#2A4D24', stepAlpha));
    }

    // 2. Drop Shadow under character
    renderer.drawCircle(p.x, p.y, 6.5, shadowColor);

    // 3. Animation Swings
    const swing = this.action === 'idle' ? 0 : Math.sin(this.walkCycle);
    const bob = this.action === 'idle'
      ? Math.sin(this.walkCycle) * 0.6
      : Math.abs(Math.sin(this.walkCycle)) * -1.8;

    // Determine 8-way facing category
    let ang = this.facingAngle;
    while (ang > Math.PI) ang -= Math.PI * 2;
    while (ang < -Math.PI) ang += Math.PI * 2;

    const isFacingUp = ang < -Math.PI * 0.25 && ang > -Math.PI * 0.75;
    const isFacingDown = ang > Math.PI * 0.25 && ang < Math.PI * 0.75;
    const isFacingRight = Math.abs(ang) <= Math.PI * 0.25;
    const isFacingLeft = Math.abs(ang) >= Math.PI * 0.75;

    // 4. Legs & Boots (ground contact y: p.y - 5 to p.y)
    const legL_X = p.x - 2.5;
    const legR_X = p.x + 1.5;
    const legSwingOffset = swing * 2.5;

    renderer.drawRect(legL_X, p.y - 6 + bob + legSwingOffset * 0.5, 2.5, 4.5, pantsColor);
    renderer.drawRect(legL_X - 0.5, p.y - 2 + legSwingOffset * 0.5, 3.5, 2.5, bootColor);

    renderer.drawRect(legR_X, p.y - 6 + bob - legSwingOffset * 0.5, 2.5, 4.5, pantsColor);
    renderer.drawRect(legR_X - 0.5, p.y - 2 - legSwingOffset * 0.5, 3.5, 2.5, bootColor);

    // 5. Backpack (behind body if facing down/sides, on back if facing up)
    const torsoY = p.y - 14 + bob;
    if (isFacingUp) {
      renderer.drawRect(p.x - 4, torsoY + 1, 8, 7, hexToRgba('#6E2C00'));
      renderer.drawRect(p.x - 3, torsoY + 2, 6, 4, hexToRgba('#873600'));
    } else if (isFacingRight) {
      renderer.drawRect(p.x - 5.5, torsoY + 1.5, 3.5, 6, hexToRgba('#6E2C00'));
    } else if (isFacingLeft) {
      renderer.drawRect(p.x + 2, torsoY + 1.5, 3.5, 6, hexToRgba('#6E2C00'));
    }

    // 6. Torso & Coat
    renderer.drawRect(p.x - 4.5, torsoY, 9, 8, coatColor);
    // Coat trim / highlight
    renderer.drawRect(p.x - 4.5, torsoY, 9, 2, hexToRgba('#FFFFFF', 0.2));

    // Arms
    const armSwingL = -swing * 3;
    const armSwingR = swing * 3;
    renderer.drawRect(p.x - 6, torsoY + 1.5 + armSwingL * 0.4, 2.5, 5.5, coatColor);
    renderer.drawRect(p.x - 5.5, torsoY + 7 + armSwingL * 0.4, 2, 2, skinColor);

    renderer.drawRect(p.x + 3.5, torsoY + 1.5 + armSwingR * 0.4, 2.5, 5.5, coatColor);
    renderer.drawRect(p.x + 3.5, torsoY + 7 + armSwingR * 0.4, 2, 2, skinColor);

    // 7. Head & Hair
    const headY = torsoY - 6.5;
    renderer.drawCircle(p.x, headY, 4.8, skinColor);

    // Hair / Cap
    renderer.drawCircle(p.x, headY - 1, 4.8, hairColor);

    // Face details
    if (!isFacingUp) {
      // Skin showing
      renderer.drawCircle(p.x, headY + 1, 4.0, skinColor);

      // Hat
      if (this.customization.hatIndex === 0) {
        // Traveler Beanie
        renderer.drawRect(p.x - 5, headY - 4.5, 10, 4.5, hexToRgba('#2C3E50'));
        renderer.drawRect(p.x - 4.5, headY - 1, 9, 1.8, hexToRgba('#1A252F'));
      } else if (this.customization.hatIndex === 1) {
        // Straw Sunhat
        renderer.drawRect(p.x - 7.5, headY - 1.5, 15, 2, hexToRgba('#F4D06F'));
        renderer.drawRect(p.x - 4, headY - 4.5, 8, 3.5, hexToRgba('#D4AC0D'));
      }

      // Eyes & Rosy cheeks
      if (isFacingDown) {
        renderer.drawRect(p.x - 2.5, headY, 1.4, 1.8, hexToRgba('#1B2631'));
        renderer.drawRect(p.x + 1.1, headY, 1.4, 1.8, hexToRgba('#1B2631'));
        // Cheeks
        renderer.drawRect(p.x - 3.8, headY + 2.2, 1.8, 1.2, hexToRgba('#E74C3C', 0.5));
        renderer.drawRect(p.x + 2.0, headY + 2.2, 1.8, 1.2, hexToRgba('#E74C3C', 0.5));
      } else if (isFacingRight) {
        renderer.drawRect(p.x + 2, headY, 1.4, 1.8, hexToRgba('#1B2631'));
        renderer.drawRect(p.x + 1.5, headY + 2.2, 1.8, 1.2, hexToRgba('#E74C3C', 0.5));
      } else if (isFacingLeft) {
        renderer.drawRect(p.x - 3.4, headY, 1.4, 1.8, hexToRgba('#1B2631'));
        renderer.drawRect(p.x - 3.3, headY + 2.2, 1.8, 1.2, hexToRgba('#E74C3C', 0.5));
      }
    }

    // 8. Scarf Collar around neck
    renderer.drawRect(p.x - 4.5, torsoY - 1.5, 9, 3.2, scarfColor);

    // 9. Verlet Scarf Tails
    const nodes = this.scarfRope.nodes;
    for (let i = 0; i < nodes.length - 1; i++) {
      const n1 = nodes[i];
      const n2 = nodes[i + 1];
      const thickness = Math.max(1.8, 3.5 - i * 0.4);
      renderer.drawLine(n1.pos.x, n1.pos.y, n2.pos.x, n2.pos.y, thickness, scarfColor);
    }
  }
}
