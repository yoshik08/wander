import { Vec2, vec2, lerp } from './math';

export class Camera {
  pos: Vec2 = vec2(0, 0);
  prevPos: Vec2 = vec2(0, 0);
  target: Vec2 = vec2(0, 0);
  lookAhead: Vec2 = vec2(0, 0);
  zoom: number = 1.0;
  targetZoom: number = 1.0;

  private smoothFactor: number = 5.0; // Easing speed
  private isInitialized: boolean = false;

  constructor(startX: number = 0, startY: number = 0) {
    this.pos = vec2(startX, startY);
    this.prevPos = vec2(startX, startY);
    this.target = vec2(startX, startY);
  }

  update(playerPos: Vec2, playerVelocity: Vec2, dt: number): void {
    if (!this.isInitialized) {
      this.pos.x = playerPos.x;
      this.pos.y = playerPos.y;
      this.prevPos.x = playerPos.x;
      this.prevPos.y = playerPos.y;
      this.target.x = playerPos.x;
      this.target.y = playerPos.y;
      this.isInitialized = true;
      return;
    }

    this.prevPos.x = this.pos.x;
    this.prevPos.y = this.pos.y;

    // Velocity look-ahead (smoothly lead target by ~0.35s of motion)
    const targetLookAheadX = playerVelocity.x * 0.35;
    const targetLookAheadY = playerVelocity.y * 0.35;
    this.lookAhead.x = lerp(this.lookAhead.x, targetLookAheadX, 1 - Math.exp(-3.0 * dt));
    this.lookAhead.y = lerp(this.lookAhead.y, targetLookAheadY, 1 - Math.exp(-3.0 * dt));

    this.target.x = playerPos.x + this.lookAhead.x;
    this.target.y = playerPos.y + this.lookAhead.y;

    // Smooth exponential follow (framerate independent)
    const factor = 1 - Math.exp(-this.smoothFactor * dt);
    this.pos.x += (this.target.x - this.pos.x) * factor;
    this.pos.y += (this.target.y - this.pos.y) * factor;

    // Zoom easing
    this.zoom = lerp(this.zoom, this.targetZoom, 1 - Math.exp(-4.0 * dt));
  }

  getInterpolatedPos(alpha: number): Vec2 {
    return vec2(
      lerp(this.prevPos.x, this.pos.x, alpha),
      lerp(this.prevPos.y, this.pos.y, alpha)
    );
  }

  snapTo(x: number, y: number): void {
    this.pos.x = x;
    this.pos.y = y;
    this.prevPos.x = x;
    this.prevPos.y = y;
    this.target.x = x;
    this.target.y = y;
    this.lookAhead.x = 0;
    this.lookAhead.y = 0;
    this.isInitialized = true;
  }

  setZoom(zoom: number): void {
    this.targetZoom = zoom;
  }
}
