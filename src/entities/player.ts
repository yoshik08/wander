export class Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  animationState: 'idle' | 'walk' | 'run';
  animationTimer: number;
  animationFrame: number;
  direction: number; // angle in radians, 0 pointing right

  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.animationState = 'idle';
    this.animationTimer = 0;
    this.animationFrame = 0;
    this.direction = 0; // facing right initially
  }

  update(dt: number) {
    // Update position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // In top-down 2D, the player moves freely on both X and Y axes

    // Update animation state based on velocity
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > 0.1) {
      // Moving
      this.animationState = speed > 50 ? 'run' : 'walk';
      // Update direction based on velocity
      this.direction = Math.atan2(this.vy, this.vx);
    } else {
      // Idle
      this.animationState = 'idle';
    }

    // Update animation timer and frame
    const frameDuration = this.animationState === 'idle' ? 0.1 : this.animationState === 'walk' ? 0.05 : 0.03; // seconds per frame
    this.animationTimer += dt;
    if (this.animationTimer >= frameDuration) {
      this.animationTimer -= frameDuration;
      this.animationFrame = (this.animationFrame + 1) % this.getFrameCount();
    }
  }

  getFrameCount(): number {
    switch (this.animationState) {
      case 'idle': return 4;
      case 'walk': return 6;
      case 'run': return 4;
      default: return 1;
    }
  }
}