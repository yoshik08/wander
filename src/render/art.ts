import { IRenderer } from './types';
import { ColorRGBA, hexToRgba, Vec2, vec2 } from '../core/math';

export class ArtToolkit {
  private renderer: IRenderer;

  // Dynamic sun angle and elevation driven by TimeSystem
  sunAngle: number = 0.5;
  sunElevation: number = 0.6;

  // Scratch memory for zero allocations per frame
  private scratchShadowColor: ColorRGBA = { r: 0, g: 0, b: 0, a: 0.15 };
  private scratchShadowQuad: [Vec2, Vec2, Vec2, Vec2] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 }
  ];

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
  }

  setSun(sunAngle: number, sunElevation: number): void {
    this.sunAngle = sunAngle;
    this.sunElevation = sunElevation;
  }

  // A shadow helper for diagonal drop shadows angled dynamically by the sun
  drawDropShadow(x: number, y: number, w: number, h: number, customAngle?: number, customElevation?: number) {
    const angle = customAngle !== undefined ? customAngle : this.sunAngle;
    const elevation = customElevation !== undefined ? customElevation : this.sunElevation;

    // Shadow length scales inversely with sun elevation:
    // Long stretch at dawn/dusk (~1.5x), compact underneath at noon (~0.35x)
    const lengthFactor = 0.35 + (1.0 - Math.min(1.0, Math.max(0.0, elevation))) * 1.15;
    const effH = h * lengthFactor;
    const skew = Math.sin(angle) * effH * 0.8;

    // Dynamic alpha: deeper in midday sunlight, softer at dawn/dusk/night
    this.scratchShadowColor.a = 0.08 + Math.max(0.0, elevation) * 0.12;

    this.scratchShadowQuad[0].x = x - w * 0.5;
    this.scratchShadowQuad[0].y = y;
    this.scratchShadowQuad[1].x = x + w * 0.5;
    this.scratchShadowQuad[1].y = y;
    this.scratchShadowQuad[2].x = x + w * 0.5 + skew;
    this.scratchShadowQuad[2].y = y - effH * 0.45;
    this.scratchShadowQuad[3].x = x - w * 0.5 + skew;
    this.scratchShadowQuad[3].y = y - effH * 0.45;

    this.renderer.drawPolygon(this.scratchShadowQuad, this.scratchShadowColor);
  }

  drawBlobShadow(x: number, y: number, radius: number) {
    // Soft dark-green blob shadow under character
    this.renderer.drawCircle(x, y, radius, hexToRgba('#1B3317', 0.28));
  }

  drawCharacterShadow(x: number, y: number, scale: number) {
    // 1. Soft contact blob shadow
    this.drawBlobShadow(x, y, 6.5 * scale);
    // 2. Dynamic sun drop shadow
    this.drawDropShadow(x, y, 8 * scale, 14 * scale);
  }

  drawPaintedTree(x: number, baseY: number, time: number, wind: Vec2, variant: number) {
    this.drawDropShadow(x, baseY, 14, 28);
    
    // Trunk
    this.renderer.drawRect(x - 3.5, baseY - 16, 7, 18, hexToRgba('#4A2E16'));
    
    // Wind sway factor
    const sway = Math.sin(time * 2.5 + x * 0.03) * 3.0 + wind.x * 3.0;
    
    // Painterly overlapping blobs
    if (variant === 0) { // Oak style
      this.renderer.drawCircle(x - 6 + sway * 0.3, baseY - 20, 13, hexToRgba('#2D6928'));
      this.renderer.drawCircle(x + 6 + sway * 0.4, baseY - 20, 13, hexToRgba('#3A7D34'));
      this.renderer.drawCircle(x + sway * 0.5, baseY - 28, 15, hexToRgba('#4E9A47'));
    } else { // Pine style
      this.renderer.drawPolygon([
        vec2(x - 14 + sway * 0.3, baseY - 10),
        vec2(x + 14 + sway * 0.3, baseY - 10),
        vec2(x + sway * 0.6, baseY - 28)
      ], hexToRgba('#1E4223'));
      this.renderer.drawPolygon([
        vec2(x - 10 + sway * 0.5, baseY - 22),
        vec2(x + 10 + sway * 0.5, baseY - 22),
        vec2(x + sway * 0.8, baseY - 38)
      ], hexToRgba('#28582E'));
    }
  }

  drawPaintedRock(x: number, baseY: number, variant: number) {
    this.drawDropShadow(x, baseY, 12, 6);
    this.renderer.drawCircle(x, baseY, 5, hexToRgba('#8A8E91')); // base stone colour
    this.renderer.drawCircle(x - 1, baseY - 1, 3, hexToRgba('#D0D3D4')); // highlight
  }

  drawPaintedFlower(x: number, baseY: number, time: number, wind: Vec2, variant: number, playerPos?: Vec2) {
    let partX = 0;
    if (playerPos) {
      const dx = x - playerPos.x;
      const dy = baseY - playerPos.y;
      const dist = Math.hypot(dx, dy);
      const radius = 24;
      if (dist < radius && dist > 0.01) {
        const push = Math.pow(1 - dist / radius, 1.3);
        partX = (dx / dist) * push * 8;
      }
    }

    const sway = Math.sin(time * 3.0 + x * 0.1) * 2.0 + wind.x * 1.5 + partX;
    
    this.renderer.drawLine(x, baseY, x + sway * 0.2, baseY - 6, 1.5, hexToRgba('#3A5F40'));
    
    const petalColors = ['#FFFFFF', '#E89D5E', '#F39C12', '#9B59B6', '#F1948A'];
    const pColor = hexToRgba(petalColors[variant % petalColors.length]);
    
    this.renderer.drawCircle(x + sway * 0.3, baseY - 6, 3.2, pColor);
    this.renderer.drawCircle(x + sway * 0.3, baseY - 6, 1.2, hexToRgba('#F4D03F')); // Pollen center
  }

  drawGrassBlade(x: number, baseY: number, time: number, wind: Vec2) {
    const sway = Math.sin(time * 3 + x * 0.04) * 2 + wind.x * 1.5;
    this.renderer.drawLine(x, baseY, x + sway, baseY - 7, 1.5, hexToRgba('#589C4B'));
  }

  drawGrassTuft(x: number, baseY: number, time: number, wind: Vec2, playerPos?: Vec2, variant: number = 0) {
    // Dynamic player parting calculation
    let partX = 0;
    let partY = 0;
    if (playerPos) {
      const dx = x - playerPos.x;
      const dy = baseY - playerPos.y;
      const dist = Math.hypot(dx, dy);
      const radius = 28;
      if (dist < radius && dist > 0.01) {
        const push = Math.pow(1 - dist / radius, 1.4);
        partX = (dx / dist) * push * 9;
        partY = (dy / dist) * push * 3;
      }
    }

    const swayBase = Math.sin(time * 3.2 + x * 0.05) * 2.0 + wind.x * 2.0;

    // Grass color variants (Ghibli greens)
    const bladeColors = [
      hexToRgba('#4E8A42'),
      hexToRgba('#8DB255'),
      hexToRgba('#A6C96C'),
      hexToRgba('#589C4B')
    ];

    // Draw 4 distinct grass blades in a fan
    // Left blade
    this.renderer.drawLine(
      x - 3,
      baseY,
      x - 5 + (swayBase * 0.8 + partX) * 0.8,
      baseY - 7 + partY,
      1.4,
      bladeColors[0]
    );

    // Center-left blade (tallest)
    this.renderer.drawLine(
      x - 1,
      baseY,
      x - 1 + (swayBase + partX),
      baseY - 9 + partY,
      1.6,
      bladeColors[1]
    );

    // Center-right blade
    this.renderer.drawLine(
      x + 1,
      baseY,
      x + 2 + (swayBase * 1.1 + partX),
      baseY - 8 + partY,
      1.5,
      bladeColors[2]
    );

    // Right blade
    this.renderer.drawLine(
      x + 3,
      baseY,
      x + 5 + (swayBase * 0.9 + partX) * 0.8,
      baseY - 6 + partY,
      1.3,
      bladeColors[3]
    );
  }

  drawMushroom(x: number, baseY: number, variant: number, glowing: boolean = false) {
    this.drawDropShadow(x, baseY, 8, 4);

    // Stipe (Stem)
    const stemColor = glowing ? hexToRgba('#1B4965') : hexToRgba('#F4E3C5');
    this.renderer.drawRect(x - 1.5, baseY - 7, 3, 7, stemColor);

    // Cap colors
    const capColors = glowing
      ? [hexToRgba('#00B4D8'), hexToRgba('#48CAE4'), hexToRgba('#90E0EF')]
      : [hexToRgba('#8D5B4C'), hexToRgba('#C0392B'), hexToRgba('#E67E22')];
    const capColor = capColors[variant % capColors.length];

    // Cap (dome)
    this.renderer.drawCircle(x, baseY - 7, 5.5, capColor);

    // Spots or glow highlight
    if (glowing) {
      this.renderer.drawCircle(x, baseY - 8, 2.5, hexToRgba('#CAF0F8', 0.8));
    } else {
      this.renderer.drawCircle(x - 2, baseY - 8, 1.2, hexToRgba('#FFFFFF', 0.85));
      this.renderer.drawCircle(x + 2, baseY - 8, 1.2, hexToRgba('#FFFFFF', 0.85));
    }
  }

  drawFern(x: number, baseY: number, time: number, wind: Vec2, variant: number = 0, playerPos?: Vec2) {
    this.drawDropShadow(x, baseY, 10, 5);

    let partX = 0;
    if (playerPos) {
      const dx = x - playerPos.x;
      const dy = baseY - playerPos.y;
      const dist = Math.hypot(dx, dy);
      const radius = 26;
      if (dist < radius && dist > 0.01) {
        const push = Math.pow(1 - dist / radius, 1.3);
        partX = (dx / dist) * push * 7;
      }
    }

    const sway = Math.sin(time * 2.8 + x * 0.05) * 2.0 + wind.x * 1.5 + partX;
    const fernGreen = hexToRgba('#2E572A');
    const fernLight = hexToRgba('#447A3E');

    // Central frond
    this.renderer.drawLine(x, baseY, x + sway * 0.4, baseY - 12, 1.8, fernGreen);
    this.renderer.drawLine(x - 2, baseY - 6, x + sway * 0.5, baseY - 10, 1.5, fernLight);

    // Left fronds
    this.renderer.drawLine(x, baseY, x - 6 + sway * 0.2, baseY - 8, 1.5, fernGreen);
    this.renderer.drawLine(x, baseY - 2, x - 8 + sway * 0.3, baseY - 5, 1.2, fernLight);

    // Right fronds
    this.renderer.drawLine(x, baseY, x + 6 + sway * 0.3, baseY - 8, 1.5, fernGreen);
    this.renderer.drawLine(x, baseY - 2, x + 8 + sway * 0.4, baseY - 5, 1.2, fernLight);
  }

  drawShrub(x: number, baseY: number, time: number, wind: Vec2, variant: number, playerPos?: Vec2) {
    this.drawDropShadow(x, baseY, 14, 8);

    let partX = 0;
    if (playerPos) {
      const dx = x - playerPos.x;
      const dy = baseY - playerPos.y;
      const dist = Math.hypot(dx, dy);
      const radius = 24;
      if (dist < radius && dist > 0.01) {
        const push = Math.pow(1 - dist / radius, 1.3);
        partX = (dx / dist) * push * 5;
      }
    }

    const sway = Math.sin(time * 2.2 + x * 0.03) * 1.5 + wind.x * 1.2 + partX;

    const shrubPalettes = [
      [hexToRgba('#3B7B34'), hexToRgba('#4E8A42')], // Lush green
      [hexToRgba('#C0392B'), hexToRgba('#E67E22')], // Autumn red/amber
      [hexToRgba('#F1948A'), hexToRgba('#FADBD8')], // Blossom pink
    ];
    const pal = shrubPalettes[variant % shrubPalettes.length];

    this.renderer.drawCircle(x - 4 + sway * 0.2, baseY - 5, 7, pal[0]);
    this.renderer.drawCircle(x + 4 + sway * 0.3, baseY - 5, 7, pal[0]);
    this.renderer.drawCircle(x + sway * 0.4, baseY - 9, 8, pal[1]);
  }

  drawBirchTree(x: number, baseY: number, time: number, wind: Vec2) {
    this.drawDropShadow(x, baseY, 12, 28);

    // White birch trunk
    this.renderer.drawRect(x - 3, baseY - 20, 6, 22, hexToRgba('#EAECEE'));
    // Dark birch bark marks
    this.renderer.drawRect(x - 2, baseY - 14, 3, 2, hexToRgba('#2C3E50'));
    this.renderer.drawRect(x + 1, baseY - 8, 2, 2, hexToRgba('#2C3E50'));

    const sway = Math.sin(time * 2.6 + x * 0.03) * 3.5 + wind.x * 3.0;
    // Pale golden-green birch leaves
    this.renderer.drawCircle(x - 5 + sway * 0.3, baseY - 24, 12, hexToRgba('#78B833'));
    this.renderer.drawCircle(x + 5 + sway * 0.4, baseY - 24, 12, hexToRgba('#8DC73F'));
    this.renderer.drawCircle(x + sway * 0.5, baseY - 32, 13, hexToRgba('#A0D048'));
  }
}
