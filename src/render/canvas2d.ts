import { ColorRGBA, rgbaToCss, Vec2, vec2 } from '../core/math';
import { IRenderer, RenderStats, WaterTileRenderData } from './types';

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

    // Set camera transform in DPR space, snapped to physical device pixels
    const snappedX = Math.round(this.cameraPos.x * this.cameraZoom * this.dpr) / (this.cameraZoom * this.dpr);
    const snappedY = Math.round(this.cameraPos.y * this.cameraZoom * this.dpr) / (this.cameraZoom * this.dpr);
    ctx.setTransform(
      this.dpr * this.cameraZoom,
      0,
      0,
      this.dpr * this.cameraZoom,
      Math.round(this.dpr * this.width / 2 - snappedX * this.cameraZoom * this.dpr),
      Math.round(this.dpr * this.height / 2 - snappedY * this.cameraZoom * this.dpr)
    );
  }

  drawChunkTerrain(chunk: any): void {
    if (!chunk.renderCache) {
      this.buildChunkCanvas(chunk);
    }
    const cache = chunk.renderCache;
    if (!cache || !cache.canvas) return;

    this.ctx.drawImage(cache.canvas, chunk.chunkX * 768, chunk.chunkY * 768);
    this.drawCalls++;
  }

  drawChunkWater(chunk: any, time: number): void {
    if (!chunk.renderCache) {
      this.buildChunkCanvas(chunk);
    }
    const cache = chunk.renderCache;
    if (!cache || !cache.waterTiles || cache.waterTiles.length === 0) return;

    this.drawWaterBatch(cache.waterTiles, time);
  }

  drawChunkOverWater(chunk: any): void {
    if (!chunk.renderCache) {
      this.buildChunkCanvas(chunk);
    }
    const cache = chunk.renderCache;
    if (!cache) return;

    const ctx = this.ctx;
    // Draw cached bridges
    for (const b of cache.bridgeTiles) {
      ctx.fillStyle = '#3E2723';
      ctx.fillRect(b.wx, b.wy, 24, 24);

      if (b.isHorizontal) {
        for (let pIdx = 0; pIdx < 3; pIdx++) {
          const px = b.wx + pIdx * 8;
          ctx.fillStyle = '#6D4C41';
          ctx.fillRect(px + 1, b.wy + 2, 6, 20);
          ctx.fillStyle = '#8D6E63';
          ctx.fillRect(px + 1, b.wy + 2, 2, 20);
        }
        ctx.fillStyle = '#4A2E16';
        ctx.fillRect(b.wx, b.wy, 24, 2.5);
        ctx.fillRect(b.wx, b.wy + 21.5, 24, 2.5);
      } else {
        for (let pIdx = 0; pIdx < 3; pIdx++) {
          const py = b.wy + pIdx * 8;
          ctx.fillStyle = '#6D4C41';
          ctx.fillRect(b.wx + 2, py + 1, 20, 6);
          ctx.fillStyle = '#8D6E63';
          ctx.fillRect(b.wx + 2, py + 1, 20, 2);
        }
        ctx.fillStyle = '#4A2E16';
        ctx.fillRect(b.wx, b.wy, 2.5, 24);
        ctx.fillRect(b.wx + 21.5, b.wy, 2.5, 24);
      }
      this.drawCalls++;
    }

    // Draw cached stepping stones
    for (const s of cache.steppingStones) {
      this.drawCircle(s.wx + 12, s.wy + 13, 7, { r: 0.11, g: 0.15, b: 0.19, a: 0.35 });
      this.drawCircle(s.wx + 12, s.wy + 11, 6.5, { r: 0.5, g: 0.55, b: 0.55, a: 1 });
      this.drawCircle(s.wx + 10, s.wy + 9, 4, { r: 0.58, g: 0.65, b: 0.65, a: 1 });
      this.drawCircle(s.wx + 14, s.wy + 12, 2.5, { r: 0.15, g: 0.68, b: 0.38, a: 0.7 });
    }
  }

  freeChunk(chunk: any): void {
    chunk.renderCache = null;
  }

  private buildChunkCanvas(chunk: any): void {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 768;
    offCanvas.height = 768;
    const offCtx = offCanvas.getContext('2d')!;

    const baseWorldX = chunk.chunkX * 768;
    const baseWorldY = chunk.chunkY * 768;
    const data = chunk.data;

    const waterTiles: WaterTileRenderData[] = [];
    const bridgeTiles: any[] = [];
    const steppingStones: any[] = [];

    for (let ty = 0; ty < 32; ty++) {
      for (let tx = 0; tx < 32; tx++) {
        const idx = ty * 32 + tx;
        const lx = tx * 24;
        const ly = ty * 24;
        const wx = baseWorldX + lx;
        const wy = baseWorldY + ly;
        const flag = data.tileFlags[idx];
        const elev = data.elevation[idx];

        if (flag === 1 || flag === 8) { // water / waterfall
          offCtx.fillStyle = '#2D5432';
          offCtx.fillRect(lx, ly, 24, 24);
          waterTiles.push({
            x: wx, y: wy, w: 24, h: 24,
            flowX: data.flowDirX[idx], flowY: data.flowDirY[idx],
            depth: elev < -0.45 ? 1.0 : 0.4,
            foamMask: data.foamMask[idx],
            isWaterfall: flag === 8
          });
        } else if (flag === 4) { // bridge
          offCtx.fillStyle = '#2D5432';
          offCtx.fillRect(lx, ly, 24, 24);
          waterTiles.push({
            x: wx, y: wy, w: 24, h: 24,
            flowX: data.flowDirX[idx], flowY: data.flowDirY[idx],
            depth: 0.7, foamMask: 0, isWaterfall: false
          });
          bridgeTiles.push({
            wx, wy,
            isHorizontal: Math.abs(data.flowDirX[idx]) <= Math.abs(data.flowDirY[idx])
          });
        } else if (flag === 16) { // stepping stone
          offCtx.fillStyle = '#2D5432';
          offCtx.fillRect(lx, ly, 24, 24);
          waterTiles.push({
            x: wx, y: wy, w: 24, h: 24,
            flowX: data.flowDirX[idx], flowY: data.flowDirY[idx],
            depth: 0.3, foamMask: data.foamMask[idx], isWaterfall: false
          });
          steppingStones.push({ wx, wy });
        } else if (flag === 2) { // path
          const pathHash = Math.abs(Math.sin(wx * 11.3 + wy * 67.1));
          offCtx.fillStyle = pathHash > 0.5 ? '#93704C' : '#A1805B';
          offCtx.fillRect(lx, ly, 24, 24);
          if (pathHash > 0.75) {
            offCtx.fillStyle = '#755635';
            offCtx.fillRect(lx + 7, ly + 13, 3, 3);
            offCtx.fillStyle = '#B3926B';
            offCtx.fillRect(lx + 15, ly + 7, 2, 2);
          }
        } else {
          // Land
          const tileHash = Math.abs(Math.sin(wx * 12.9898 + wy * 78.233) * 43758.5453);
          offCtx.fillStyle = tileHash > 0.55 ? '#4E8A42' : tileHash > 0.25 ? '#437B38' : '#589C4B';
          offCtx.fillRect(lx, ly, 24, 24);
        }
      }
    }

    chunk.renderCache = {
      canvas: offCanvas,
      waterTiles,
      bridgeTiles,
      steppingStones
    };
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

  drawWaterBatch(tiles: WaterTileRenderData[], time: number): void {
    const ctx = this.ctx;
    for (const tile of tiles) {
      // 1. Base depth color
      ctx.fillStyle = tile.depth > 0.5 ? '#175276' : '#2980B9';
      ctx.fillRect(tile.x, tile.y, tile.w, tile.h);

      // 2. Flow animated wave shimmer
      const fx = Math.abs(tile.flowX) > 0.01 ? tile.flowX : 0.8;
      const fy = Math.abs(tile.flowY) > 0.01 ? tile.flowY : 0.3;
      const wavePhase = (time * 2.0 + (tile.x * fx + tile.y * fy) * 0.05) % 1.0;
      const waveX = tile.x + 2 + (tile.w - 8) * (wavePhase < 0 ? wavePhase + 1 : wavePhase);
      const waveY = tile.y + 4 + Math.sin(time * 3 + tile.x * 0.1) * 3;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(waveX, waveY, 5, 2);

      // 3. Shoreline foam along masked borders
      if (tile.foamMask > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        const foamWidth = 2.5;
        // North (bit 0)
        if (tile.foamMask & 1) {
          ctx.fillRect(tile.x, tile.y, tile.w, foamWidth);
        }
        // South (bit 1)
        if (tile.foamMask & 2) {
          ctx.fillRect(tile.x, tile.y + tile.h - foamWidth, tile.w, foamWidth);
        }
        // East (bit 2)
        if (tile.foamMask & 4) {
          ctx.fillRect(tile.x + tile.w - foamWidth, tile.y, foamWidth, tile.h);
        }
        // West (bit 3)
        if (tile.foamMask & 8) {
          ctx.fillRect(tile.x, tile.y, foamWidth, tile.h);
        }
      }

      // 4. Waterfall cascades
      if (tile.isWaterfall) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (let i = 0; i < 3; i++) {
          const fallY = tile.y + ((time * 25 + i * 8) % tile.h);
          ctx.fillRect(tile.x + i * 7 + 2, fallY, 4, 6);
        }
      }

      this.drawCalls++;
    }
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
