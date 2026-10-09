import { Vec2, vec2, ColorRGBA, hexToRgba, lerp } from '../core/math';
import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';

export interface PhotoFilter {
  id: string;
  name: string;
  tint: ColorRGBA;
  vignetteAlpha: number;
}

export const PHOTO_FILTERS: PhotoFilter[] = [
  { id: 'natural', name: 'Natural Ghibli', tint: { r: 1.0, g: 1.0, b: 1.0, a: 0.0 }, vignetteAlpha: 0.22 },
  { id: 'warm', name: 'Warm 35mm Film', tint: { r: 0.98, g: 0.65, b: 0.24, a: 0.13 }, vignetteAlpha: 0.38 },
  { id: 'watercolour', name: 'Gouache Watercolour', tint: { r: 0.97, g: 0.93, b: 0.84, a: 0.16 }, vignetteAlpha: 0.18 },
  { id: 'polaroid', name: 'Vintage Polaroid', tint: { r: 0.28, g: 0.62, b: 0.58, a: 0.12 }, vignetteAlpha: 0.42 },
  { id: 'dusk', name: 'Dusk Indigo', tint: { r: 0.26, g: 0.16, b: 0.60, a: 0.17 }, vignetteAlpha: 0.48 }
];

export class PhotoMode {
  isActive: boolean = false;
  filterIndex: number = 0;
  panPos: Vec2 = vec2(0, 0);
  zoom: number = 1.0;
  targetZoom: number = 1.0;
  flashAlpha: number = 0;
  letterboxProgress: number = 0; // 0 to 1 animation

  // Scratch memory for zero allocations per frame
  private scratchBlack: ColorRGBA = { r: 0.05, g: 0.07, b: 0.09, a: 1 };
  private scratchGold: ColorRGBA = { r: 0.95, g: 0.85, b: 0.55, a: 0.8 };
  private scratchFlash: ColorRGBA = { r: 1.0, g: 1.0, b: 1.0, a: 0 };
  private scratchTint: ColorRGBA = { r: 1.0, g: 1.0, b: 1.0, a: 0 };
  private scratchVignette: ColorRGBA = { r: 0.02, g: 0.04, b: 0.06, a: 0 };

  enter(initialPos: Vec2, currentZoom: number = 1.0): void {
    this.isActive = true;
    this.panPos.x = initialPos.x;
    this.panPos.y = initialPos.y;
    this.zoom = currentZoom;
    this.targetZoom = currentZoom;
  }

  exit(): void {
    this.isActive = false;
  }

  toggle(initialPos: Vec2, currentZoom: number = 1.0): boolean {
    if (this.isActive) {
      this.exit();
    } else {
      this.enter(initialPos, currentZoom);
    }
    return this.isActive;
  }

  cycleFilter(): string {
    this.filterIndex = (this.filterIndex + 1) % PHOTO_FILTERS.length;
    return PHOTO_FILTERS[this.filterIndex].name;
  }

  getCurrentFilter(): PhotoFilter {
    return PHOTO_FILTERS[this.filterIndex];
  }

  adjustZoom(delta: number): void {
    this.targetZoom = Math.max(0.6, Math.min(2.2, this.targetZoom + delta));
  }

  triggerShutter(canvas: HTMLCanvasElement): void {
    this.flashAlpha = 1.0;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      const timeStr = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `meadow_postcard_${timeStr}.png`;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn('[Photo Mode] Postcard export skipped:', e);
    }
  }

  update(moveInput: Vec2, dt: number): void {
    const targetP = this.isActive ? 1.0 : 0.0;
    this.letterboxProgress = lerp(this.letterboxProgress, targetP, Math.min(1.0, 8.0 * dt));
    if (!this.isActive && this.letterboxProgress < 0.01) {
      this.letterboxProgress = 0;
    }

    if (this.isActive) {
      // Free camera pan
      const panSpeed = (240 / this.zoom) * dt;
      this.panPos.x += moveInput.x * panSpeed;
      this.panPos.y += moveInput.y * panSpeed;

      // Smooth zoom easing
      this.zoom = lerp(this.zoom, this.targetZoom, Math.min(1.0, 7.0 * dt));
    }

    // Flash decay
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 4.0);
    }
  }

  render(
    renderer: IRenderer,
    art: ArtToolkit,
    viewWidth: number,
    viewHeight: number,
    camX: number,
    camY: number
  ): void {
    if (this.letterboxProgress <= 0.01) return;

    const p = this.letterboxProgress;
    const filter = PHOTO_FILTERS[this.filterIndex];
    const halfW = (viewWidth / 2) / this.zoom;
    const halfH = (viewHeight / 2) / this.zoom;

    // 1. Postcard Filter Tint Overlay
    if (filter.tint.a > 0) {
      this.scratchTint.r = filter.tint.r;
      this.scratchTint.g = filter.tint.g;
      this.scratchTint.b = filter.tint.b;
      this.scratchTint.a = filter.tint.a * p;
      renderer.drawRect(
        camX - halfW,
        camY - halfH,
        halfW * 2,
        halfH * 2,
        this.scratchTint
      );
    }

    // 2. Corner Vignette
    if (filter.vignetteAlpha > 0) {
      this.scratchVignette.a = filter.vignetteAlpha * p * 0.45;
      const cornerSize = Math.min(halfW, halfH) * 0.4;
      // Top-Left
      renderer.drawRect(camX - halfW, camY - halfH, cornerSize, cornerSize * 0.5, this.scratchVignette);
      // Top-Right
      renderer.drawRect(camX + halfW - cornerSize, camY - halfH, cornerSize, cornerSize * 0.5, this.scratchVignette);
      // Bottom-Left
      renderer.drawRect(camX - halfW, camY + halfH - cornerSize * 0.5, cornerSize, cornerSize * 0.5, this.scratchVignette);
      // Bottom-Right
      renderer.drawRect(camX + halfW - cornerSize, camY + halfH - cornerSize * 0.5, cornerSize, cornerSize * 0.5, this.scratchVignette);
    }

    // 3. Cinematic Letterbox Bars (Top & Bottom)
    const barHeight = (viewHeight * 0.08 * p) / this.zoom;
    this.scratchBlack.a = 0.98 * p;
    // Top Bar
    renderer.drawRect(
      camX - halfW,
      camY - halfH,
      halfW * 2,
      barHeight,
      this.scratchBlack
    );
    // Bottom Bar
    renderer.drawRect(
      camX - halfW,
      camY + halfH - barHeight,
      halfW * 2,
      barHeight,
      this.scratchBlack
    );

    // Elegant gold hairline dividers along letterbox borders
    this.scratchGold.a = 0.85 * p;
    renderer.drawLine(
      camX - halfW,
      camY - halfH + barHeight,
      camX + halfW,
      camY - halfH + barHeight,
      1.0,
      this.scratchGold
    );
    renderer.drawLine(
      camX - halfW,
      camY + halfH - barHeight,
      camX + halfW,
      camY + halfH - barHeight,
      1.0,
      this.scratchGold
    );

    // Rule-of-Thirds Grid Markers (subtle golden crosshairs in corners)
    const thirdW = (halfW * 2) / 3;
    const thirdH = (halfH * 2) / 3;
    const markerLen = 6 / this.zoom;
    this.scratchGold.a = 0.40 * p;
    for (let ix = 1; ix <= 2; ix++) {
      for (let iy = 1; iy <= 2; iy++) {
        const mx = camX - halfW + ix * thirdW;
        const my = camY - halfH + iy * thirdH;
        renderer.drawLine(mx - markerLen, my, mx + markerLen, my, 1.0, this.scratchGold);
        renderer.drawLine(mx, my - markerLen, mx, my + markerLen, 1.0, this.scratchGold);
      }
    }

    // 4. Camera Shutter Flash (pure bright flash on snapshot)
    if (this.flashAlpha > 0) {
      this.scratchFlash.a = this.flashAlpha;
      renderer.drawRect(
        camX - halfW,
        camY - halfH,
        halfW * 2,
        halfH * 2,
        this.scratchFlash
      );
    }
  }
}
