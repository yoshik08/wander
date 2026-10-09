import { Vec2, vec2, ColorRGBA, hexToRgba, lerpAngle, lerp } from '../core/math';
import { VerletRope } from './verlet';
import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';

export type CharacterAction = 'idle' | 'walk' | 'run' | 'sit' | 'wade' | 'fish';

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
  onStep?: (pos: Vec2, angle: number, isRunning: boolean) => void;
  private stepTimer: number = 0;

  // Movement tuning
  readonly walkSpeed: number = 110;
  readonly runSpeed: number = 210;
  readonly accel: number = 1400;
  readonly friction: number = 0.84;
  speedMultiplier: number = 1.0;

  constructor(startX: number = 0, startY: number = 0) {
    this.pos = vec2(startX, startY);
    this.prevPos = vec2(startX, startY);
    this.scarfRope = new VerletRope(5, 3.5, vec2(startX, startY - 14));
  }

  update(inputMove: Vec2, isRunningInput: boolean, windForce: Vec2, dt: number): void {
    this.prevPos.x = this.pos.x;
    this.prevPos.y = this.pos.y;

    const hasInput = Math.hypot(inputMove.x, inputMove.y) > 0.05;
    const targetSpeed = (isRunningInput ? this.runSpeed : this.walkSpeed) * this.speedMultiplier;

    if (this.action === 'sit' || this.action === 'fish') {
      if (hasInput) {
        // Player pushed movement controls: stand up or stop fishing!
        this.action = 'idle';
      } else {
        // Remain seated or fishing peacefully
        this.vel.x = 0;
        this.vel.y = 0;
        this.turnLean = lerp(this.turnLean, 0, 1 - Math.exp(-8 * dt));
        this.walkCycle += dt * 1.5; // slow calm breathing cycle

        // Scarf rests calmly with gentle breeze & gravity
        const neckAnchor = vec2(this.pos.x, this.pos.y - 12);
        const scarfForce = vec2(windForce.x * 12, windForce.y * 12 + 15);
        this.scarfRope.update(neckAnchor, scarfForce, dt);
        return;
      }
    }

    if (hasInput) {
      this.vel.x += inputMove.x * (this.accel * this.speedMultiplier) * dt;
      this.vel.y += inputMove.y * (this.accel * this.speedMultiplier) * dt;

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

      // Spawn footsteps & trigger onStep
      this.stepTimer += dt * strideFreq;
      if (this.stepTimer >= Math.PI) {
        this.stepTimer -= Math.PI;
        this.footsteps.push({
          pos: vec2(this.pos.x, this.pos.y),
          angle: this.facingAngle,
          life: 1.0
        });
        if (this.footsteps.length > 24) this.footsteps.shift();

        if (this.onStep) {
          this.onStep(this.pos, this.facingAngle, this.action === 'run');
        }
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
    const art = new ArtToolkit(renderer);

    const isMobile = window.innerWidth <= 600;
    const s = isMobile ? 2.5 : 2.0;

    // 1. Draw footstep impressions
    for (const step of this.footsteps) {
      const stepAlpha = step.life * 0.35;
      renderer.drawRect(step.pos.x - 2 * s, step.pos.y - 1 * s, 4 * s, 2 * s, hexToRgba('#2A4D24', stepAlpha));
    }

    // 2. Drop Shadow under character (soft dark-green blob shadow + dynamic sun drop shadow)
    art.drawCharacterShadow(p.x, p.y, s);

    // 3. Animation Swings
    const isSitting = this.action === 'sit';
    const isFishing = this.action === 'fish';
    const swing = (this.action === 'idle' || isSitting || isFishing) ? 0 : Math.sin(this.walkCycle);
    const bob = isSitting
      ? Math.sin(this.walkCycle) * 0.4 * s - 2.0 * s
      : (isFishing
        ? Math.sin(this.walkCycle) * 0.3 * s - 0.5 * s
        : (this.action === 'idle'
          ? Math.sin(this.walkCycle) * 0.6 * s
          : Math.abs(Math.sin(this.walkCycle)) * -1.8 * s));

    let ang = this.facingAngle;
    while (ang > Math.PI) ang -= Math.PI * 2;
    while (ang < -Math.PI) ang += Math.PI * 2;

    const isFacingUp = ang < -Math.PI * 0.25 && ang > -Math.PI * 0.75;
    const isFacingDown = ang > Math.PI * 0.25 && ang < Math.PI * 0.75;
    const isFacingRight = Math.abs(ang) <= Math.PI * 0.25;
    const isFacingLeft = Math.abs(ang) >= Math.PI * 0.75;

    // 4. Legs & Boots
    if (isSitting) {
      // Relaxed forward legs over seat edge
      renderer.drawRect(p.x - 3.8 * s, p.y - 3.0 * s, 3.2 * s, 3.0 * s, pantsColor);
      renderer.drawRect(p.x + 0.6 * s, p.y - 3.0 * s, 3.2 * s, 3.0 * s, pantsColor);
      renderer.drawRect(p.x - 4.2 * s, p.y - 0.8 * s, 3.6 * s, 2.2 * s, bootColor);
      renderer.drawRect(p.x + 0.6 * s, p.y - 0.8 * s, 3.6 * s, 2.2 * s, bootColor);
    } else {
      const legL_X = p.x - 2.5 * s;
      const legR_X = p.x + 1.5 * s;
      const legSwingOffset = swing * 2.5 * s;

      renderer.drawRect(legL_X, p.y - 6*s + bob + legSwingOffset * 0.5, 2.5*s, 4.5*s, pantsColor);
      renderer.drawRect(legL_X - 0.5*s, p.y - 2*s + legSwingOffset * 0.5, 3.5*s, 2.5*s, bootColor);

      renderer.drawRect(legR_X, p.y - 6*s + bob - legSwingOffset * 0.5, 2.5*s, 4.5*s, pantsColor);
      renderer.drawRect(legR_X - 0.5*s, p.y - 2*s - legSwingOffset * 0.5, 3.5*s, 2.5*s, bootColor);
    }

    // 5. Backpack
    const torsoY = p.y - 14*s + bob;
    if (isFacingUp) {
      renderer.drawRect(p.x - 4*s, torsoY + 1*s, 8*s, 7*s, hexToRgba('#6E2C00'));
      renderer.drawRect(p.x - 3*s, torsoY + 2*s, 6*s, 4*s, hexToRgba('#873600'));
    } else if (isFacingRight) {
      renderer.drawRect(p.x - 5.5*s, torsoY + 1.5*s, 3.5*s, 6*s, hexToRgba('#6E2C00'));
    } else if (isFacingLeft) {
      renderer.drawRect(p.x + 2*s, torsoY + 1.5*s, 3.5*s, 6*s, hexToRgba('#6E2C00'));
    }

    // 6. Torso & Coat
    renderer.drawRect(p.x - 4.5*s, torsoY, 9*s, 8*s, coatColor);
    renderer.drawRect(p.x - 4.5*s, torsoY, 9*s, 2*s, hexToRgba('#FFFFFF', 0.2));

    // Arms
    if (isSitting) {
      // Hands resting peacefully on lap/knees
      renderer.drawRect(p.x - 5.5 * s, torsoY + 2.0 * s, 2.2 * s, 4.5 * s, coatColor);
      renderer.drawRect(p.x - 4.5 * s, torsoY + 6.0 * s, 2.2 * s, 2.0 * s, skinColor);

      renderer.drawRect(p.x + 3.3 * s, torsoY + 2.0 * s, 2.2 * s, 4.5 * s, coatColor);
      renderer.drawRect(p.x + 2.3 * s, torsoY + 6.0 * s, 2.2 * s, 2.0 * s, skinColor);
    } else if (isFishing) {
      // Arms angled forward holding fishing rod
      renderer.drawRect(p.x - 5.5 * s, torsoY + 2.5 * s, 2.5 * s, 4.0 * s, coatColor);
      renderer.drawRect(p.x + 3.0 * s, torsoY + 2.5 * s, 2.5 * s, 4.0 * s, coatColor);
      renderer.drawRect(p.x - 3.5 * s, torsoY + 5.5 * s, 2.0 * s, 2.0 * s, skinColor);
      renderer.drawRect(p.x + 1.5 * s, torsoY + 5.5 * s, 2.0 * s, 2.0 * s, skinColor);
    } else {
      const armSwingL = -swing * 3 * s;
      const armSwingR = swing * 3 * s;
      renderer.drawRect(p.x - 6*s, torsoY + 1.5*s + armSwingL * 0.4, 2.5*s, 5.5*s, coatColor);
      renderer.drawRect(p.x - 5.5*s, torsoY + 7*s + armSwingL * 0.4, 2*s, 2*s, skinColor);

      renderer.drawRect(p.x + 3.5*s, torsoY + 1.5*s + armSwingR * 0.4, 2.5*s, 5.5*s, coatColor);
      renderer.drawRect(p.x + 3.5*s, torsoY + 7*s + armSwingR * 0.4, 2*s, 2*s, skinColor);
    }

    // 7. Head & Hair
    const headY = torsoY - 6.5*s;
    renderer.drawCircle(p.x, headY, 4.8*s, skinColor);
    renderer.drawCircle(p.x, headY - 1*s, 4.8*s, hairColor);

    if (!isFacingUp) {
      renderer.drawCircle(p.x, headY + 1*s, 4.0*s, skinColor);
      if (this.customization.hatIndex === 0) {
        renderer.drawRect(p.x - 5*s, headY - 4.5*s, 10*s, 4.5*s, hexToRgba('#2C3E50'));
        renderer.drawRect(p.x - 4.5*s, headY - 1*s, 9*s, 1.8*s, hexToRgba('#1A252F'));
      } else if (this.customization.hatIndex === 1) {
        renderer.drawRect(p.x - 7.5*s, headY - 1.5*s, 15*s, 2*s, hexToRgba('#F4D06F'));
        renderer.drawRect(p.x - 4*s, headY - 4.5*s, 8*s, 3.5*s, hexToRgba('#D4AC0D'));
      }
      if (isSitting) {
        // Serene curved closed eyes while resting
        renderer.drawRect(p.x - 2.8 * s, headY + 0.8 * s, 2.0 * s, 0.8 * s, hexToRgba('#1B2631'));
        renderer.drawRect(p.x + 0.8 * s, headY + 0.8 * s, 2.0 * s, 0.8 * s, hexToRgba('#1B2631'));
        renderer.drawRect(p.x - 3.8 * s, headY + 2.2 * s, 1.8 * s, 1.2 * s, hexToRgba('#E74C3C', 0.5));
        renderer.drawRect(p.x + 2.0 * s, headY + 2.2 * s, 1.8 * s, 1.2 * s, hexToRgba('#E74C3C', 0.5));
      } else if (isFacingDown) {
        renderer.drawRect(p.x - 2.5*s, headY, 1.4*s, 1.8*s, hexToRgba('#1B2631'));
        renderer.drawRect(p.x + 1.1*s, headY, 1.4*s, 1.8*s, hexToRgba('#1B2631'));
        renderer.drawRect(p.x - 3.8*s, headY + 2.2*s, 1.8*s, 1.2*s, hexToRgba('#E74C3C', 0.5));
        renderer.drawRect(p.x + 2.0*s, headY + 2.2*s, 1.8*s, 1.2*s, hexToRgba('#E74C3C', 0.5));
      } else if (isFacingRight) {
        renderer.drawRect(p.x + 2*s, headY, 1.4*s, 1.8*s, hexToRgba('#1B2631'));
        renderer.drawRect(p.x + 1.5*s, headY + 2.2*s, 1.8*s, 1.2*s, hexToRgba('#E74C3C', 0.5));
      } else if (isFacingLeft) {
        renderer.drawRect(p.x - 3.4*s, headY, 1.4*s, 1.8*s, hexToRgba('#1B2631'));
        renderer.drawRect(p.x - 3.3*s, headY + 2.2*s, 1.8*s, 1.2*s, hexToRgba('#E74C3C', 0.5));
      }
    }

    // 8. Scarf Collar
    renderer.drawRect(p.x - 4.5*s, torsoY - 1.5*s, 9*s, 3.2*s, scarfColor);

    // 9. Verlet Scarf Tails
    const nodes = this.scarfRope.nodes;
    for (let i = 0; i < nodes.length - 1; i++) {
      const n1 = nodes[i];
      const n2 = nodes[i + 1];
      const thickness = Math.max(1.8*s, 3.5*s - i * 0.4*s);
      
      const nx1 = p.x + (n1.pos.x - p.x) * s;
      const ny1 = p.y - 14*s + (n1.pos.y - (p.y - 14)) * s;
      const nx2 = p.x + (n2.pos.x - p.x) * s;
      const ny2 = p.y - 14*s + (n2.pos.y - (p.y - 14)) * s;
      
      renderer.drawLine(nx1, ny1, nx2, ny2, thickness, scarfColor);
    }
  }

  /**
   * Renders a soft inverted reflection in nearby water bodies.
   */
  renderReflection(renderer: IRenderer, alpha: number): void {
    const p = this.getInterpolatedPos(alpha);
    const colorway = COLORWAYS[this.customization.colorwayIndex] || COLORWAYS[0];
    const coatColor = hexToRgba(colorway.coat, 0.22);
    const scarfColor = hexToRgba(colorway.scarf, 0.25);

    // Mirrored body reflection
    renderer.drawCircle(p.x, p.y + 7, 5.5, coatColor);
    renderer.drawCircle(p.x, p.y + 14, 4.5, coatColor);
    renderer.drawRect(p.x - 3, p.y + 4, 6, 2, scarfColor);
  }
}
