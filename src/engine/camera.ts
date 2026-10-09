export class Camera {
  x: number;
  y: number;
  private isInitialized: boolean = false;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  update(player: { x: number; y: number }, dt: number = 1 / 60): void {
    if (!this.isInitialized) {
      this.x = player.x;
      this.y = player.y;
      this.isInitialized = true;
      return;
    }
    // Exponential smoothing for frame-rate independent smooth camera follow
    const smooth = 1 - Math.exp(-6.0 * Math.min(dt, 0.1));
    this.x += (player.x - this.x) * smooth;
    this.y += (player.y - this.y) * smooth;
  }

  snapTo(targetX: number, targetY: number): void {
    this.x = targetX;
    this.y = targetY;
    this.isInitialized = true;
  }
}