export class Camera {
  x: number;
  y: number;

  constructor() {
    this.x = 0;
    this.y = 0;
  }

  update(player: any, canvasHeight: number) {
    this.x = player.x;
    this.y = -canvasHeight;
  }

  apply(ctx: CanvasRenderingContext2D, callback: () => void) {
    ctx.save();
    ctx.translate(-this.x, -this.y);
    callback();
    ctx.restore();
  }
}