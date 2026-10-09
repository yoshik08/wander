import { ColorRGBA, rgbaToCss, Vec2, vec2 } from '../core/math';
import { IRenderer, RenderStats } from './types';

export class Canvas2DRenderer implements IRenderer {
  readonly backend = 'canvas2d' as const;
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  width: number = 0;
  height: number = 0;
  dpr: number = 1;

  private cameraPos: Vec2 = vec2(0, 0);
  private cameraZoom: number = 1;

  private drawCalls: number = 0;
  private quadsCount: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }
    this.ctx = ctx;
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr;

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  setCamera(centerX: number, centerY: number, zoom: number = 1): void {
    this.cameraPos.x = centerX;
    this.cameraPos.y = centerY;
    this.cameraZoom = zoom;
  }

  screenToWorld(screenX: number, screenY: number): Vec2 {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    return {
      x: this.cameraPos.x + (screenX - halfW) / this.cameraZoom,
      y: this.cameraPos.y + (screenY - halfH) / this.cameraZoom
    };
  }

  worldToScreen(worldX: number, worldY: number): Vec2 {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    return {
      x: halfW + (worldX - this.cameraPos.x) * this.cameraZoom,
      y: halfH + (worldY - this.cameraPos.y) * this.cameraZoom
    };
  }

  beginFrame(clearColor?: ColorRGBA): void {
    const ctx = this.ctx;
    this.drawCalls = 0;
    this.quadsCount = 0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (clearColor) {
      ctx.fillStyle = rgbaToCss(clearColor);
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Set camera transform in DPR space
    ctx.setTransform(
      this.dpr * this.cameraZoom,
      0,
      0,
      this.dpr * this.cameraZoom,
      this.dpr * (this.width / 2 - this.cameraPos.x * this.cameraZoom),
      this.dpr * (this.height / 2 - this.cameraPos.y * this.cameraZoom)
    );
  }

  drawQuad(
    x: number,
    y: number,
    w: number,
    h: number,
    color: ColorRGBA = { r: 1, g: 1, b: 1, a: 1 }
  ): void {
    this.drawRect(x, y, w, h, color);
  }

  drawRect(x: number, y: number, w: number, h: number, color: ColorRGBA): void {
    this.ctx.fillStyle = rgbaToCss(color);
    this.ctx.fillRect(x, y, w, h);
    this.drawCalls++;
    this.quadsCount++;
  }

  drawCircle(cx: number, cy: number, radius: number, color: ColorRGBA): void {
    this.ctx.fillStyle = rgbaToCss(color);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.drawCalls++;
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, width: number, color: ColorRGBA): void {
    this.ctx.strokeStyle = rgbaToCss(color);
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    this.drawCalls++;
  }

  drawPolygon(points: Vec2[], color: ColorRGBA): void {
    if (points.length < 3) return;
    this.ctx.fillStyle = rgbaToCss(color);
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.drawCalls++;
  }

  endFrame(): void {
    // Canvas 2D renders immediately
  }

  getStats(): RenderStats {
    return {
      drawCalls: this.drawCalls,
      quadsCount: this.quadsCount,
      backend: 'canvas2d'
    };
  }
}
