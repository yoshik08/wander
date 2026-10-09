import { Vec2, vec2, ColorRGBA, hexToRgba, lerp } from '../core/math';
import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';
import { ChunkManager } from '../world/chunk-manager';
import { CHUNK_PIXEL_SIZE, CHUNK_TILES, TILE_FLAG_WATER, TILE_FLAG_PATH, TILE_FLAG_BRIDGE } from '../world/chunk';
import { BiomeType } from '../world/biomes';

export class DiegeticMap {
  isOpen: boolean = false;
  openProgress: number = 0; // 0 (hidden) to 1 (fully open)

  // Scratch colors for zero-allocation rendering
  private scratchDimColor: ColorRGBA = { r: 0.04, g: 0.08, b: 0.05, a: 0 };
  private scratchPaperColor: ColorRGBA = { r: 0.96, g: 0.92, b: 0.83, a: 0 };
  private scratchBorderColor: ColorRGBA = { r: 0.55, g: 0.43, b: 0.29, a: 0 };
  private scratchInnerFrameColor: ColorRGBA = { r: 0.77, g: 0.65, b: 0.49, a: 0 };
  private scratchFogColor: ColorRGBA = { r: 0.88, g: 0.84, b: 0.74, a: 0 };
  private scratchCellColor: ColorRGBA = { r: 0.3, g: 0.6, b: 0.3, a: 0 };
  private scratchMarkerColor: ColorRGBA = { r: 0.9, g: 0.25, b: 0.2, a: 0 };
  private scratchPointerColor: ColorRGBA = { r: 0.95, g: 0.98, b: 1.0, a: 0 };
  private scratchCatColor: ColorRGBA = { r: 0.9, g: 0.5, b: 0.1, a: 0 };
  private scratchStarColor: ColorRGBA = { r: 0.98, g: 0.82, b: 0.2, a: 0 };

  toggle(): boolean {
    this.isOpen = !this.isOpen;
    return this.isOpen;
  }

  open(): void {
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  update(dt: number): void {
    const target = this.isOpen ? 1.0 : 0.0;
    this.openProgress = lerp(this.openProgress, target, Math.min(1.0, 9.0 * dt));
    if (!this.isOpen && this.openProgress < 0.01) {
      this.openProgress = 0;
    }
  }

  render(
    renderer: IRenderer,
    art: ArtToolkit,
    playerPos: Vec2,
    playerAngle: number,
    catPos: Vec2,
    chunkManager: ChunkManager,
    viewWidth: number,
    viewHeight: number,
    zoom: number,
    camX: number,
    camY: number,
    time: number
  ): void {
    if (this.openProgress <= 0.01) return;

    const p = this.openProgress;
    const halfW = (viewWidth / 2) / zoom;
    const halfH = (viewHeight / 2) / zoom;

    // 1. Semi-transparent dark environmental vignette background
    this.scratchDimColor.a = 0.68 * p;
    renderer.drawRect(
      camX - halfW,
      camY - halfH,
      halfW * 2,
      halfH * 2,
      this.scratchDimColor
    );

    // 2. Parchment Sheet Dimensions (responsive on desktop & phones)
    const mapW = Math.min((viewWidth * 0.84) / zoom, 540 / zoom);
    const mapH = Math.min((viewHeight * 0.84) / zoom, 440 / zoom);
    const left = camX - mapW / 2;
    const top = camY - mapH / 2;

    // Soft drop shadow beneath parchment
    art.drawDropShadow(camX, camY + mapH / 2, mapW * 0.9, 14);

    // Antique vellum paper base
    this.scratchPaperColor.a = 0.97 * p;
    renderer.drawRect(left, top, mapW, mapH, this.scratchPaperColor);

    // Weathered double border & corner brackets
    this.scratchBorderColor.a = 0.90 * p;
    renderer.drawLine(left + 2, top + 2, left + mapW - 2, top + 2, 2.0, this.scratchBorderColor);
    renderer.drawLine(left + mapW - 2, top + 2, left + mapW - 2, top + mapH - 2, 2.0, this.scratchBorderColor);
    renderer.drawLine(left + mapW - 2, top + mapH - 2, left + 2, top + mapH - 2, 2.0, this.scratchBorderColor);
    renderer.drawLine(left + 2, top + mapH - 2, left + 2, top + 2, 2.0, this.scratchBorderColor);

    // Inner subtle gold frame
    const inset = 6 / zoom;
    this.scratchInnerFrameColor.a = 0.65 * p;
    renderer.drawLine(left + inset, top + inset, left + mapW - inset, top + inset, 1.0, this.scratchInnerFrameColor);
    renderer.drawLine(left + mapW - inset, top + inset, left + mapW - inset, top + mapH - inset, 1.0, this.scratchInnerFrameColor);
    renderer.drawLine(left + mapW - inset, top + mapH - inset, left + inset, top + mapH - inset, 1.0, this.scratchInnerFrameColor);
    renderer.drawLine(left + inset, top + mapH - inset, left + inset, top + inset, 1.0, this.scratchInnerFrameColor);

    // Corner decorative notches
    renderer.drawCircle(left + inset + 2, top + inset + 2, 2.0, this.scratchBorderColor);
    renderer.drawCircle(left + mapW - inset - 2, top + inset + 2, 2.0, this.scratchBorderColor);
    renderer.drawCircle(left + mapW - inset - 2, top + mapH - inset - 2, 2.0, this.scratchBorderColor);
    renderer.drawCircle(left + inset + 2, top + mapH - inset - 2, 2.0, this.scratchBorderColor);

    // 3. Explored Chunks Grid
    const centerChunkX = Math.floor(playerPos.x / CHUNK_PIXEL_SIZE);
    const centerChunkY = Math.floor(playerPos.y / CHUNK_PIXEL_SIZE);

    // 7x7 grid centered around player's explored domain
    const gridRadius = 3;
    const gridSpan = gridRadius * 2 + 1; // 7 chunks wide
    const cellMargin = 2 / zoom;
    const availableW = mapW - 40 / zoom;
    const availableH = mapH - 70 / zoom;
    const cellSize = Math.floor(Math.min(availableW / gridSpan, availableH / gridSpan));

    const gridOriginX = camX - (gridSpan * cellSize) / 2;
    const gridOriginY = camY - (gridSpan * cellSize) / 2 + 6 / zoom;

    for (let dy = -gridRadius; dy <= gridRadius; dy++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const cx = centerChunkX + dx;
        const cy = centerChunkY + dy;
        const cellX = gridOriginX + (dx + gridRadius) * cellSize;
        const cellY = gridOriginY + (dy + gridRadius) * cellSize;

        const isExplored = chunkManager.isExplored(cx, cy);

        if (isExplored) {
          // Explored Chunk: draw terrain biome color
          const sampleWorldX = cx * CHUNK_PIXEL_SIZE + CHUNK_PIXEL_SIZE / 2;
          const sampleWorldY = cy * CHUNK_PIXEL_SIZE + CHUNK_PIXEL_SIZE / 2;
          const biome = chunkManager.getBiomeAt(0, sampleWorldX, sampleWorldY);

          this.getBiomeMapColor(biome, this.scratchCellColor);
          this.scratchCellColor.a = 0.88 * p;
          renderer.drawRect(cellX + cellMargin, cellY + cellMargin, cellSize - cellMargin * 2, cellSize - cellMargin * 2, this.scratchCellColor);

          // River / water representation
          if (chunkManager.isWaterAt(0, sampleWorldX, sampleWorldY)) {
            this.scratchMarkerColor.r = 0.28;
            this.scratchMarkerColor.g = 0.58;
            this.scratchMarkerColor.b = 0.82;
            this.scratchMarkerColor.a = 0.85 * p;
            renderer.drawCircle(cellX + cellSize / 2, cellY + cellSize / 2, cellSize * 0.28, this.scratchMarkerColor);
          }

          // Landmarks in spawn chunk
          if (cx === 0 && cy === 0) {
            // Campfire star pin
            this.scratchStarColor.a = 0.95 * p;
            renderer.drawCircle(cellX + cellSize / 2, cellY + cellSize / 2, 3.0, this.scratchStarColor);
            renderer.drawCircle(cellX + cellSize / 2, cellY + cellSize / 2, 1.2, hexToRgba('#D35400'));
          }

          // Keepsakes indicator: draw small golden glint if uncollected keepsake exists in chunk
          const chunk = chunkManager.getChunk(0, cx, cy);
          if (chunk && chunk.data.keepsakes) {
            for (const k of chunk.data.keepsakes) {
              if (!chunkManager.isKeepsakeCollected(k.id)) {
                this.scratchStarColor.a = 0.85 * p;
                renderer.drawCircle(cellX + (k.x / CHUNK_PIXEL_SIZE) * cellSize, cellY + (k.y / CHUNK_PIXEL_SIZE) * cellSize, 1.8, this.scratchStarColor);
              }
            }
          }
        } else {
          // Fog of War: soft sketch parchment cloud
          this.scratchFogColor.a = 0.65 * p;
          renderer.drawRect(cellX + cellMargin, cellY + cellMargin, cellSize - cellMargin * 2, cellSize - cellMargin * 2, this.scratchFogColor);
          // Subtle sketch line indicating unknown terrain
          renderer.drawLine(cellX + cellMargin + 2, cellY + cellSize / 2, cellX + cellSize - cellMargin - 2, cellY + cellSize / 2, 0.8, this.scratchInnerFrameColor);
        }
      }
    }

    // 4. Cat Companion Marker
    const catRelX = (catPos.x - (centerChunkX - gridRadius) * CHUNK_PIXEL_SIZE) / (gridSpan * CHUNK_PIXEL_SIZE);
    const catRelY = (catPos.y - (centerChunkY - gridRadius) * CHUNK_PIXEL_SIZE) / (gridSpan * CHUNK_PIXEL_SIZE);
    if (catRelX >= 0 && catRelX <= 1 && catRelY >= 0 && catRelY <= 1) {
      const catMapX = gridOriginX + catRelX * (gridSpan * cellSize);
      const catMapY = gridOriginY + catRelY * (gridSpan * cellSize);
      this.scratchCatColor.a = 0.95 * p;
      renderer.drawCircle(catMapX, catMapY, 3.2, this.scratchCatColor);
      renderer.drawCircle(catMapX, catMapY, 1.5, hexToRgba('#FFFFFF'));
    }

    // 5. Wanderer Player Marker with Heading Direction Pointer
    const pRelX = (playerPos.x - (centerChunkX - gridRadius) * CHUNK_PIXEL_SIZE) / (gridSpan * CHUNK_PIXEL_SIZE);
    const pRelY = (playerPos.y - (centerChunkY - gridRadius) * CHUNK_PIXEL_SIZE) / (gridSpan * CHUNK_PIXEL_SIZE);
    const pMapX = gridOriginX + pRelX * (gridSpan * cellSize);
    const pMapY = gridOriginY + pRelY * (gridSpan * cellSize);

    // Glowing player pin
    this.scratchMarkerColor.r = 0.88;
    this.scratchMarkerColor.g = 0.22;
    this.scratchMarkerColor.b = 0.18;
    this.scratchMarkerColor.a = 1.0 * p;
    renderer.drawCircle(pMapX, pMapY, 4.5, this.scratchMarkerColor);

    // Facing direction pointer
    const ptrX = pMapX + Math.cos(playerAngle) * 7.0;
    const ptrY = pMapY + Math.sin(playerAngle) * 7.0;
    this.scratchPointerColor.a = 0.95 * p;
    renderer.drawLine(pMapX, pMapY, ptrX, ptrY, 2.0, this.scratchPointerColor);

    // 6. Compass Rose in Top-Right
    const compassX = left + mapW - 24 / zoom;
    const compassY = top + 22 / zoom;
    this.scratchBorderColor.a = 0.85 * p;
    renderer.drawLine(compassX, compassY - 10, compassX, compassY + 10, 1.2, this.scratchBorderColor);
    renderer.drawLine(compassX - 10, compassY, compassX + 10, compassY, 1.2, this.scratchBorderColor);
    // North tip pointer (Red N)
    renderer.drawCircle(compassX, compassY - 11, 2.2, this.scratchMarkerColor);
  }

  private getBiomeMapColor(biome: BiomeType, out: ColorRGBA): void {
    switch (biome) {
      case BiomeType.Meadow:
        out.r = 0.35; out.g = 0.65; out.b = 0.30; break;
      case BiomeType.WildflowerFields:
        out.r = 0.45; out.g = 0.72; out.b = 0.35; break;
      case BiomeType.BirchGrove:
        out.r = 0.58; out.g = 0.75; out.b = 0.28; break;
      case BiomeType.PineForest:
        out.r = 0.18; out.g = 0.42; out.b = 0.20; break;
      case BiomeType.CherryBlossom:
        out.r = 0.85; out.g = 0.60; out.b = 0.65; break;
      case BiomeType.RockyCliffs:
        out.r = 0.55; out.g = 0.58; out.b = 0.62; break;
      case BiomeType.MarshPonds:
        out.r = 0.28; out.g = 0.48; out.b = 0.36; break;
      case BiomeType.LakesRivers:
        out.r = 0.22; out.g = 0.52; out.b = 0.75; break;
      case BiomeType.SandyCoast:
        out.r = 0.88; out.g = 0.78; out.b = 0.58; break;
      case BiomeType.AutumnMaple:
        out.r = 0.85; out.g = 0.48; out.b = 0.18; break;
      case BiomeType.MistyHighlands:
        out.r = 0.50; out.g = 0.58; out.b = 0.60; break;
      case BiomeType.SnowyPeaks:
        out.r = 0.85; out.g = 0.90; out.b = 0.95; break;
      case BiomeType.GlowingHollow:
        out.r = 0.42; out.g = 0.22; out.b = 0.55; break;
      default:
        out.r = 0.40; out.g = 0.60; out.b = 0.35; break;
    }
  }
}
