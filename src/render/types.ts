import { ColorRGBA, Vec2 } from '../core/math';

export interface RenderStats {
  drawCalls: number;
  quadsCount: number;
  backend: 'webgl2' | 'canvas2d';
}

export interface IRenderer {
  readonly backend: 'webgl2' | 'canvas2d';
  readonly canvas: HTMLCanvasElement;
  width: number;
  height: number;
  dpr: number;

  resize(width: number, height: number, dpr: number): void;
  beginFrame(clearColor?: ColorRGBA): void;
  setCamera(centerX: number, centerY: number, zoom?: number): void;
  screenToWorld(screenX: number, screenY: number): Vec2;
  worldToScreen(worldX: number, worldY: number): Vec2;

  // Chunk static caching
  drawChunkTerrain(chunk: any): void;
  drawChunkWater(chunk: any, time: number): void;
  drawChunkOverWater(chunk: any): void;
  freeChunk(chunk: any): void;

  // Drawing Primitives
  drawRect(x: number, y: number, w: number, h: number, color: ColorRGBA): void;
  drawCircle(x: number, y: number, radius: number, color: ColorRGBA): void;
  drawLine(x1: number, y1: number, x2: number, y2: number, width: number, color: ColorRGBA): void;
  drawPolygon(points: Vec2[], color: ColorRGBA): void;

  // Textured & Batched Quads
  drawQuad(
    x: number,
    y: number,
    w: number,
    h: number,
    color?: ColorRGBA,
    u0?: number,
    v0?: number,
    u1?: number,
    v1?: number,
    textureId?: number
  ): void;

  // Water Shader & Surface Batch
  drawWaterBatch(tiles: WaterTileRenderData[], time: number): void;

  endFrame(): void;
  getStats(): RenderStats;
}

export interface WaterTileRenderData {
  x: number;
  y: number;
  w: number;
  h: number;
  flowX: number;
  flowY: number;
  depth: number;
  foamMask: number;
  isWaterfall: boolean;
}
