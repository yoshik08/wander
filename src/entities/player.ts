export class Player {
  x: number;
  y: number;
  vx: number;
  vy: number;

  constructor() {
    // Start in the middle of the screen (world coordinates, we'll adjust later)
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}