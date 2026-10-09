export class Camera {
  x: number;
  y: number;

  constructor() {
    this.x = 0;
    this.y = 0;
  }

  update(player: any, dt: number) {
    // Simple follow: camera centers on player
    this.x = player.x;
    this.y = player.y;
  }

  apply(ctx: CanvasRenderingContext2D, callback: () => void) {
    // Save context, translate by negative camera position to simulate camera movement
    ctx.save();
    ctx.translate(-this.x, -this.y);
    callback();
    ctx.restore();
  }
}