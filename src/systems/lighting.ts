import { ColorRGBA, Vec2 } from '../core/math';
import { IRenderer } from '../render/types';
import { TimePhaseInfo } from './time';
import { BiomeType } from '../world/biomes';
import { StructureInstance } from '../world/structures';

export class LightingSystem {
  // Scratch memory for zero-allocation rendering
  private scratchColor: ColorRGBA = { r: 1, g: 1, b: 1, a: 0.1 };
  private scratchGlowColor: ColorRGBA = { r: 1, g: 0.8, b: 0.4, a: 0.15 };
  private scratchQuad: [Vec2, Vec2, Vec2, Vec2] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 }
  ];

  // Fixed god ray beam configurations across viewport
  private readonly rayOffsets = [-0.4, -0.15, 0.1, 0.35, 0.6];
  private readonly rayWidths = [45, 60, 50, 70, 55];

  enableGodRays: boolean = true;
  enablePointBloom: boolean = true;

  /**
   * Renders cinematic god rays (sunbeams) penetrating through tree canopies.
   */
  renderGodRays(
    renderer: IRenderer,
    camX: number,
    camY: number,
    viewWidth: number,
    viewHeight: number,
    zoom: number,
    timeInfo: TimePhaseInfo,
    biome: BiomeType,
    time: number
  ): void {
    if (!this.enableGodRays) return;
    // Only visible during dawn, morning, golden hour, dusk when sun is at an angle
    const phase = timeInfo.phase;
    if (phase === 'night' || phase === 'noon') return;

    // Forest biomes have prominent god rays filtering through tree branches
    let biomeMultiplier = 0.6; // Meadow default subtle rays
    if (
      biome === BiomeType.PineForest ||
      biome === BiomeType.BirchGrove ||
      biome === BiomeType.AutumnMaple ||
      biome === BiomeType.CherryBlossom
    ) {
      biomeMultiplier = 1.0;
    }

    // Intensity peaks at Dawn and Golden Hour
    let baseIntensity = 0.08;
    if (phase === 'dawn' || phase === 'dusk') {
      baseIntensity = 0.13;
    } else if (phase === 'golden_hour') {
      baseIntensity = 0.15;
    } else if (phase === 'morning') {
      baseIntensity = 0.09;
    }

    const intensity = baseIntensity * biomeMultiplier;
    if (intensity < 0.02) return;

    const halfW = (viewWidth / 2) / zoom;
    const halfH = (viewHeight / 2) / zoom;

    // Angle of rays follows sun
    const angle = timeInfo.sunAngle;
    const skew = Math.sin(angle) * (halfH * 2.2);

    // Warm golden morning/dusk sunlight beam color
    if (phase === 'dawn') {
      this.scratchColor.r = 1.0;
      this.scratchColor.g = 0.88;
      this.scratchColor.b = 0.74;
    } else if (phase === 'dusk') {
      this.scratchColor.r = 1.0;
      this.scratchColor.g = 0.78;
      this.scratchColor.b = 0.58;
    } else {
      // Golden / Morning
      this.scratchColor.r = 1.0;
      this.scratchColor.g = 0.94;
      this.scratchColor.b = 0.72;
    }

    const topY = camY - halfH - 20;
    const bottomY = camY + halfH + 20;

    for (let i = 0; i < this.rayOffsets.length; i++) {
      // Subtle organic breath/fluttering in ray width and position
      const breath = Math.sin(time * 0.8 + i * 1.5) * 0.3;
      const swayOffset = Math.sin(time * 0.4 + i * 2.1) * 15;
      const rayAlpha = Math.max(0.01, (intensity + breath * 0.03));

      this.scratchColor.a = rayAlpha;

      const baseX = camX + this.rayOffsets[i] * halfW * 2 + swayOffset;
      const w = this.rayWidths[i] * (1.0 + breath * 0.2);

      // Slanted trapezoid shaft polygon
      this.scratchQuad[0].x = baseX - w * 0.4;
      this.scratchQuad[0].y = topY;

      this.scratchQuad[1].x = baseX + w * 0.4;
      this.scratchQuad[1].y = topY;

      this.scratchQuad[2].x = baseX + w * 0.8 + skew;
      this.scratchQuad[2].y = bottomY;

      this.scratchQuad[3].x = baseX - w * 0.8 + skew;
      this.scratchQuad[3].y = bottomY;

      renderer.drawPolygon(this.scratchQuad, this.scratchColor);
    }
  }

  /**
   * Renders warm point-light bloom halos for campfires, lanterns, and point sources.
   */
  renderPointLights(
    renderer: IRenderer,
    layer: number,
    chunks: any[],
    time: number,
    timeInfo: TimePhaseInfo,
    playerPos: import('../core/math').Vec2,
    partyLeader: any
  ): void {
    // 1. Player / Ignis Light (very important in caves or at night)
    if (layer < 0 || timeInfo.isNight || timeInfo.phase === 'dusk') {
      const pulse = 0.9 + 0.1 * Math.sin(time * 5);
      const isIgnis = partyLeader?.genome?.type === 'Ignis';
      
      this.scratchGlowColor.r = isIgnis ? 1.0 : 0.8;
      this.scratchGlowColor.g = isIgnis ? 0.6 : 0.9;
      this.scratchGlowColor.b = isIgnis ? 0.2 : 0.7;
      this.scratchGlowColor.a = (isIgnis ? 0.25 : 0.15) * pulse;
      renderer.drawCircle(playerPos.x, playerPos.y - 8, isIgnis ? 120 : 60, this.scratchGlowColor);
      
      this.scratchGlowColor.a = (isIgnis ? 0.15 : 0.05) * pulse;
      renderer.drawCircle(playerPos.x, playerPos.y - 8, isIgnis ? 200 : 100, this.scratchGlowColor);
    }

    if (!this.enablePointBloom) return;

    for (const chunk of chunks) {
      for (const struct of chunk.data.structures) {
        if (struct.type === 'campfire') {
          const { x, y } = struct;
          // Animated campfire bloom flicker
          const flicker = Math.sin(time * 7 + x) * 3;
          const pulse = 0.85 + 0.15 * Math.sin(time * 12 + y);

          // Core warm bloom
          this.scratchGlowColor.r = 1.0;
          this.scratchGlowColor.g = 0.65;
          this.scratchGlowColor.b = 0.20;
          this.scratchGlowColor.a = (timeInfo.isNight ? 0.32 : 0.16) * pulse;
          renderer.drawCircle(x, y + 2, 28 + flicker, this.scratchGlowColor);

          // Outer soft ambient halo
          this.scratchGlowColor.a = (timeInfo.isNight ? 0.18 : 0.08) * pulse;
          renderer.drawCircle(x, y + 2, 54 + flicker * 1.5, this.scratchGlowColor);
        } else if (struct.type === 'cottage' && (timeInfo.isNight || timeInfo.phase === 'dusk')) {
          // Warm cottage window glow
          const { x, y } = struct;
          this.scratchGlowColor.r = 1.0;
          this.scratchGlowColor.g = 0.85;
          this.scratchGlowColor.b = 0.40;
          this.scratchGlowColor.a = 0.15;
          renderer.drawCircle(x, y + 4, 35, this.scratchGlowColor);
        }
      }
      
      for (const prop of chunk.data.props) {
        if (prop.type === 'glowing_mushroom') {
          const px = chunk.chunkX * 384 + prop.x;
          const py = chunk.chunkY * 384 + prop.y;
          const pulse = 0.85 + 0.15 * Math.sin(time * 2 + px);
          
          this.scratchGlowColor.r = 0.2;
          this.scratchGlowColor.g = 0.7;
          this.scratchGlowColor.b = 0.9;
          this.scratchGlowColor.a = 0.2 * pulse;
          renderer.drawCircle(px, prop.baseY - 8, 45, this.scratchGlowColor);
        }
      }
    }
  }

  /**
   * Renders undulating celestial auroras in high snow and misty mountain biomes at night/twilight.
   */
  renderAurora(
    renderer: IRenderer,
    camX: number,
    camY: number,
    viewWidth: number,
    viewHeight: number,
    zoom: number,
    timeInfo: TimePhaseInfo,
    biome: BiomeType,
    time: number
  ): void {
    const isNightOrTwilight = timeInfo.phase === 'night' || timeInfo.phase === 'dusk' || timeInfo.phase === 'dawn';
    const isColdBiome = biome === BiomeType.SnowyPeaks || biome === BiomeType.MistyHighlands;
    if (!isNightOrTwilight || !isColdBiome) return;

    const halfW = (viewWidth / 2) / zoom;
    const halfH = (viewHeight / 2) / zoom;
    const topY = camY - halfH;
    const ribbonWidth = halfW * 2.2;
    const segments = 16;
    const segW = ribbonWidth / segments;
    const startX = camX - halfW * 1.1;

    // 2 aurora curtain bands: emerald green and celestial violet
    const bands = [
      { color: { r: 0.25, g: 0.92, b: 0.65, a: 0.20 }, baseY: topY + 45, amp: 26, speed: 0.5 },
      { color: { r: 0.62, g: 0.55, b: 0.98, a: 0.16 }, baseY: topY + 70, amp: 32, speed: 0.35 }
    ];

    for (const band of bands) {
      for (let s = 0; s < segments; s++) {
        const x0 = startX + s * segW;
        const x1 = x0 + segW;

        const wave0 = Math.sin(time * band.speed + s * 0.45) * band.amp + Math.cos(time * 0.3 + s * 0.2) * (band.amp * 0.4);
        const wave1 = Math.sin(time * band.speed + (s + 1) * 0.45) * band.amp + Math.cos(time * 0.3 + (s + 1) * 0.2) * (band.amp * 0.4);

        const y0_top = topY;
        const y0_bot = band.baseY + wave0;
        const y1_top = topY;
        const y1_bot = band.baseY + wave1;

        this.scratchQuad[0].x = x0;
        this.scratchQuad[0].y = y0_top;
        this.scratchQuad[1].x = x1;
        this.scratchQuad[1].y = y1_top;
        this.scratchQuad[2].x = x1;
        this.scratchQuad[2].y = y1_bot;
        this.scratchQuad[3].x = x0;
        this.scratchQuad[3].y = y0_bot;

        renderer.drawPolygon(this.scratchQuad, band.color);
      }
    }
  }
}
