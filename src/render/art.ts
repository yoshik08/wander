import { IRenderer } from './types';
import { ColorRGBA, hexToRgba, Vec2, vec2 } from '../core/math';
import { CreatureGenome } from '../entities/creature';
import { Season } from '../systems/time';

export class ArtToolkit {
  private renderer: IRenderer;

  // Dynamic season and sun angle driven by TimeSystem
  season: Season = 'spring';
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
  private scratchPuddleColor: ColorRGBA = { r: 0.12, g: 0.18, b: 0.12, a: 0.2 };
  private scratchWaterColor: ColorRGBA = { r: 0.32, g: 0.52, b: 0.68, a: 0.35 };
  private scratchHighlightColor: ColorRGBA = { r: 0.95, g: 0.98, b: 1.0, a: 0.4 };
  private scratchPuddleOuter: Vec2[] = Array.from({ length: 8 }, () => ({ x: 0, y: 0 }));
  private scratchPuddleInner: Vec2[] = Array.from({ length: 8 }, () => ({ x: 0, y: 0 }));
  private scratchBirdWingL: [Vec2, Vec2, Vec2] = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
  private scratchBirdWingR: [Vec2, Vec2, Vec2] = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
  }

  setSun(sunAngle: number, sunElevation: number): void {
    this.sunAngle = sunAngle;
    this.sunElevation = sunElevation;
  }

  setSeason(season: Season): void {
    this.season = season;
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
      if (this.season === 'autumn') {
        // Glowing autumn foliage: russet red, burnt orange, golden amber
        this.renderer.drawCircle(x - 6 + sway * 0.3, baseY - 20, 13, hexToRgba('#9C3D18'));
        this.renderer.drawCircle(x + 6 + sway * 0.4, baseY - 20, 13, hexToRgba('#D35400'));
        this.renderer.drawCircle(x + sway * 0.5, baseY - 28, 15, hexToRgba('#F39C12'));
      } else if (this.season === 'winter') {
        // Winter bare oak with frosted branches and snow caps
        this.renderer.drawRect(x - 2, baseY - 28, 4, 14, hexToRgba('#3E2723'));
        this.renderer.drawCircle(x - 6 + sway * 0.3, baseY - 22, 10, hexToRgba('#A9CCE3', 0.6));
        this.renderer.drawCircle(x + 6 + sway * 0.4, baseY - 22, 10, hexToRgba('#D4E6F1', 0.7));
        this.renderer.drawCircle(x + sway * 0.5, baseY - 28, 11, hexToRgba('#F7F9F9', 0.85));
      } else if (this.season === 'summer') {
        // Deep forest summer green
        this.renderer.drawCircle(x - 6 + sway * 0.3, baseY - 20, 13, hexToRgba('#1E561A'));
        this.renderer.drawCircle(x + 6 + sway * 0.4, baseY - 20, 13, hexToRgba('#2A6826'));
        this.renderer.drawCircle(x + sway * 0.5, baseY - 28, 15, hexToRgba('#3B8235'));
      } else {
        // Fresh spring green
        this.renderer.drawCircle(x - 6 + sway * 0.3, baseY - 20, 13, hexToRgba('#2D6928'));
        this.renderer.drawCircle(x + 6 + sway * 0.4, baseY - 20, 13, hexToRgba('#3A7D34'));
        this.renderer.drawCircle(x + sway * 0.5, baseY - 28, 15, hexToRgba('#4E9A47'));
      }
    } else { // Pine style
      if (this.season === 'winter') {
        // Pine needles topped with white snow caps
        this.renderer.drawPolygon([
          vec2(x - 14 + sway * 0.3, baseY - 10),
          vec2(x + 14 + sway * 0.3, baseY - 10),
          vec2(x + sway * 0.6, baseY - 28)
        ], hexToRgba('#1A381E'));
        this.renderer.drawPolygon([
          vec2(x - 10 + sway * 0.5, baseY - 22),
          vec2(x + 10 + sway * 0.5, baseY - 22),
          vec2(x + sway * 0.8, baseY - 38)
        ], hexToRgba('#224C27'));
        // Snowy caps
        this.renderer.drawPolygon([
          vec2(x - 8 + sway * 0.4, baseY - 13),
          vec2(x + 8 + sway * 0.4, baseY - 13),
          vec2(x + sway * 0.6, baseY - 26)
        ], hexToRgba('#EBF5FB', 0.95));
        this.renderer.drawPolygon([
          vec2(x - 5 + sway * 0.6, baseY - 25),
          vec2(x + 5 + sway * 0.6, baseY - 25),
          vec2(x + sway * 0.8, baseY - 37)
        ], hexToRgba('#FFFFFF', 0.95));
      } else if (this.season === 'autumn') {
        // Golden-mossy pine
        this.renderer.drawPolygon([
          vec2(x - 14 + sway * 0.3, baseY - 10),
          vec2(x + 14 + sway * 0.3, baseY - 10),
          vec2(x + sway * 0.6, baseY - 28)
        ], hexToRgba('#2B4C1A'));
        this.renderer.drawPolygon([
          vec2(x - 10 + sway * 0.5, baseY - 22),
          vec2(x + 10 + sway * 0.5, baseY - 22),
          vec2(x + sway * 0.8, baseY - 38)
        ], hexToRgba('#3F6423'));
      } else {
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
    if (this.season === 'autumn') {
      // Golden yellow autumn birch
      this.renderer.drawCircle(x - 5 + sway * 0.3, baseY - 24, 12, hexToRgba('#D4AC0D'));
      this.renderer.drawCircle(x + 5 + sway * 0.4, baseY - 24, 12, hexToRgba('#F4D03F'));
      this.renderer.drawCircle(x + sway * 0.5, baseY - 32, 13, hexToRgba('#F5B041'));
    } else if (this.season === 'winter') {
      // Frosted winter birch
      this.renderer.drawCircle(x - 5 + sway * 0.3, baseY - 24, 9, hexToRgba('#BDC3C7', 0.5));
      this.renderer.drawCircle(x + 5 + sway * 0.4, baseY - 24, 9, hexToRgba('#D5D8DC', 0.6));
      this.renderer.drawCircle(x + sway * 0.5, baseY - 30, 10, hexToRgba('#EBF5FB', 0.85));
    } else {
      // Pale golden-green birch leaves
      this.renderer.drawCircle(x - 5 + sway * 0.3, baseY - 24, 12, hexToRgba('#78B833'));
      this.renderer.drawCircle(x + 5 + sway * 0.4, baseY - 24, 12, hexToRgba('#8DC73F'));
      this.renderer.drawCircle(x + sway * 0.5, baseY - 32, 13, hexToRgba('#A0D048'));
    }
  }

  /**
   * Draws a reflective, organic ground puddle with outer damp soil darkening and inner sky water reflection.
   */
  drawPuddle(x: number, y: number, radiusX: number, radiusY: number, wetness: number): void {
    if (wetness <= 0.04) return;

    // 1. Dark damp soil ring beneath puddle
    const outerRx = radiusX * (0.8 + 0.2 * wetness);
    const outerRy = radiusY * (0.8 + 0.2 * wetness);
    const step = (Math.PI * 2) / 8;
    for (let i = 0; i < 8; i++) {
      const a = i * step;
      this.scratchPuddleOuter[i].x = x + Math.cos(a) * outerRx;
      this.scratchPuddleOuter[i].y = y + Math.sin(a) * outerRy;
    }
    this.scratchPuddleColor.r = 0.12;
    this.scratchPuddleColor.g = 0.18;
    this.scratchPuddleColor.b = 0.12;
    this.scratchPuddleColor.a = 0.32 * wetness;
    this.renderer.drawPolygon(this.scratchPuddleOuter, this.scratchPuddleColor);

    // 2. Reflective puddle water body
    const innerRx = outerRx * 0.75;
    const innerRy = outerRy * 0.70;
    for (let i = 0; i < 8; i++) {
      const a = i * step;
      this.scratchPuddleInner[i].x = x + Math.cos(a) * innerRx;
      this.scratchPuddleInner[i].y = y + Math.sin(a) * innerRy;
    }
    this.scratchWaterColor.r = 0.32;
    this.scratchWaterColor.g = 0.52;
    this.scratchWaterColor.b = 0.68;
    this.scratchWaterColor.a = 0.45 * wetness;
    this.renderer.drawPolygon(this.scratchPuddleInner, this.scratchWaterColor);

    // 3. Subtle glint / sky reflection sheen along top rim
    if (wetness > 0.35) {
      this.scratchHighlightColor.a = 0.28 * wetness;
      this.renderer.drawLine(
        x - innerRx * 0.5,
        y - innerRy * 0.4,
        x + innerRx * 0.4,
        y - innerRy * 0.4,
        1.1,
        this.scratchHighlightColor
      );
    }
  }

  /**
   * Draws an expanding concentric perspective ripple ring.
   */
  drawRipple(x: number, y: number, radius: number, alpha: number): void {
    if (alpha <= 0.01) return;
    this.scratchHighlightColor.r = 0.90;
    this.scratchHighlightColor.g = 0.96;
    this.scratchHighlightColor.b = 1.0;
    this.scratchHighlightColor.a = alpha;

    const segments = 8;
    const step = (Math.PI * 2) / segments;
    for (let s = 0; s < segments; s++) {
      const a0 = s * step;
      const a1 = (s + 1) * step;
      const x0 = x + Math.cos(a0) * radius;
      const y0 = y + Math.sin(a0) * (radius * 0.55);
      const x1 = x + Math.cos(a1) * radius;
      const y1 = y + Math.sin(a1) * (radius * 0.55);
      this.renderer.drawLine(x0, y0, x1, y1, 1.2, this.scratchHighlightColor);
    }
  }

  /**
   * Draws a flying songbird with flapping or outstretched gliding wings.
   */
  drawBird(x: number, y: number, angle: number, wingPhase: number, isGliding: boolean, variant: number): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const perpX = -sin;
    const perpY = cos;

    const flap = isGliding ? 0.25 : Math.sin(wingPhase);
    const wingSpan = 7.5;
    const wingTipX = -cos * 2.0;
    const wingTipY = -sin * 2.0;

    // Left Wing Triangle
    this.scratchBirdWingL[0].x = x + cos * 1.5;
    this.scratchBirdWingL[0].y = y + sin * 1.5;
    this.scratchBirdWingL[1].x = x - cos * 2.5;
    this.scratchBirdWingL[1].y = y - sin * 2.5;
    this.scratchBirdWingL[2].x = x + wingTipX + perpX * wingSpan;
    this.scratchBirdWingL[2].y = y + wingTipY + perpY * wingSpan - flap * 3.5;

    // Right Wing Triangle
    this.scratchBirdWingR[0].x = x + cos * 1.5;
    this.scratchBirdWingR[0].y = y + sin * 1.5;
    this.scratchBirdWingR[1].x = x - cos * 2.5;
    this.scratchBirdWingR[1].y = y - sin * 2.5;
    this.scratchBirdWingR[2].x = x + wingTipX - perpX * wingSpan;
    this.scratchBirdWingR[2].y = y + wingTipY - perpY * wingSpan - flap * 3.5;

    const wingColor = variant === 0 ? hexToRgba('#22384D') : hexToRgba('#4A3525');
    this.renderer.drawPolygon(this.scratchBirdWingL, wingColor);
    this.renderer.drawPolygon(this.scratchBirdWingR, wingColor);

    // Tapered body line
    const bodyColor = variant === 0 ? hexToRgba('#34495E') : hexToRgba('#6D4C41');
    this.renderer.drawLine(x - cos * 4, y - sin * 4, x + cos * 3.5, y + sin * 3.5, 2.0, bodyColor);

    // Pale chest accent
    const chestColor = variant === 0 ? hexToRgba('#EAECEE') : hexToRgba('#FADBD8');
    this.renderer.drawCircle(x + cos * 0.5, y + sin * 0.5, 1.2, chestColor);
  }

  /**
   * Draws a fluttering butterfly with foreshortened wing flaps and species patterns.
   */
  drawButterfly(x: number, y: number, angle: number, wingPhase: number, variant: number, isPerched: boolean): void {
    const flap = isPerched ? (0.4 + 0.3 * Math.sin(wingPhase)) : Math.abs(Math.cos(wingPhase));
    const span = 4.2 * flap + 0.6;

    const species = [
      ['#F4D03F', '#D4AC0D'], // 0: Brimstone Yellow
      ['#5DADE2', '#2874A6'], // 1: Common Blue
      ['#EB984E', '#BA4A00'], // 2: Monarch Amber
      ['#FADBD8', '#E74C3C']  // 3: Peony Pink
    ];
    const pal = species[variant % species.length];
    const mainColor = hexToRgba(pal[0], 0.90);
    const innerColor = hexToRgba(pal[1], 0.85);

    // Dark slender body
    this.renderer.drawLine(x, y - 2.5, x, y + 2.5, 1.0, hexToRgba('#1C2833'));

    // Forewings & Hindwings (Left)
    this.renderer.drawCircle(x - span * 0.65, y - 1.2, 2.8 * flap + 0.6, mainColor);
    this.renderer.drawCircle(x - span * 0.65, y - 1.2, 1.3 * flap + 0.3, innerColor);
    this.renderer.drawCircle(x - span * 0.50, y + 1.2, 2.1 * flap + 0.5, mainColor);

    // Forewings & Hindwings (Right)
    this.renderer.drawCircle(x + span * 0.65, y - 1.2, 2.8 * flap + 0.6, mainColor);
    this.renderer.drawCircle(x + span * 0.65, y - 1.2, 1.3 * flap + 0.3, innerColor);
    this.renderer.drawCircle(x + span * 0.50, y + 1.2, 2.1 * flap + 0.5, mainColor);
  }

  /**
   * Draws a floating collectible keepsake item with gentle bobbing, glowing aura, and glint.
   */
  drawKeepsake(x: number, y: number, type: string, time: number): void {
    const bob = Math.sin(time * 3.2 + x * 0.05) * 2.2;
    this.drawDropShadow(x, y + 2, 7, 4);

    // Golden warm aura halo
    this.renderer.drawCircle(x, y - 3 + bob, 5.5, hexToRgba('#FFF9D2', 0.32 + 0.12 * Math.sin(time * 4)));

    // Specific item illustration
    if (type === 'blue_feather') {
      this.renderer.drawLine(x - 3, y - 1 + bob, x + 3, y - 7 + bob, 1.8, hexToRgba('#2980B9'));
      this.renderer.drawLine(x - 1, y - 2 + bob, x + 4, y - 6 + bob, 1.2, hexToRgba('#85C1E9'));
    } else if (type === 'pine_cone') {
      this.renderer.drawCircle(x, y - 4 + bob, 3.2, hexToRgba('#6E2C00'));
      this.renderer.drawCircle(x, y - 2 + bob, 2.4, hexToRgba('#512E5F'));
    } else if (type === 'acorn') {
      this.renderer.drawCircle(x, y - 3 + bob, 2.8, hexToRgba('#935116'));
      this.renderer.drawCircle(x, y - 5 + bob, 2.2, hexToRgba('#566573'));
    } else if (type === 'amber_leaf') {
      this.renderer.drawCircle(x, y - 4 + bob, 3.4, hexToRgba('#E67E22'));
      this.renderer.drawCircle(x + 1, y - 4 + bob, 2.0, hexToRgba('#F39C12'));
    } else if (type === 'cherry_petal') {
      this.renderer.drawCircle(x, y - 4 + bob, 3.2, hexToRgba('#F1948A'));
      this.renderer.drawCircle(x, y - 4 + bob, 1.6, hexToRgba('#FADBD8'));
    } else if (type === 'glowing_spore') {
      this.renderer.drawCircle(x, y - 4 + bob, 4.0, hexToRgba('#1ABC9C', 0.5));
      this.renderer.drawCircle(x, y - 4 + bob, 2.2, hexToRgba('#E8F8F5'));
    } else if (type === 'smooth_pebble') {
      this.renderer.drawCircle(x, y - 3 + bob, 3.5, hexToRgba('#7F8C8D'));
      this.renderer.drawCircle(x - 1, y - 4 + bob, 1.8, hexToRgba('#BDC3C7'));
    } else if (type === 'seashell') {
      this.renderer.drawCircle(x, y - 3 + bob, 3.2, hexToRgba('#FADBD8'));
      this.renderer.drawCircle(x, y - 3 + bob, 1.8, hexToRgba('#F5EEF8'));
    } else if (type === 'quartz_crystal') {
      this.renderer.drawCircle(x, y - 4 + bob, 3.0, hexToRgba('#D2B4DE'));
      this.renderer.drawCircle(x - 0.5, y - 4.5 + bob, 1.5, hexToRgba('#FFFFFF'));
    } else {
      // wild_clover or default lucky clover
      this.renderer.drawCircle(x - 1.5, y - 4.5 + bob, 1.8, hexToRgba('#27AE60'));
      this.renderer.drawCircle(x + 1.5, y - 4.5 + bob, 1.8, hexToRgba('#27AE60'));
      this.renderer.drawCircle(x - 1.5, y - 1.5 + bob, 1.8, hexToRgba('#27AE60'));
      this.renderer.drawCircle(x + 1.5, y - 1.5 + bob, 1.8, hexToRgba('#27AE60'));
    }

    // Sparkle star glint
    const glint = (time * 1.5 + x * 0.2) % 2.5;
    if (glint < 0.25) {
      this.renderer.drawCircle(x + 2, y - 7 + bob, 1.2, hexToRgba('#FFFFFF', 0.85));
    }
  }

  /**
   * Procedurally draws a wild creature based on its genome.
   */
  drawCreature(x: number, baseY: number, time: number, genome: CreatureGenome, state: 'idle' | 'walk' | 'sit' | 'yield', facingLeft: boolean): void {
    const s = genome.scale;
    const dir = facingLeft ? -1 : 1;
    
    // Animation bob
    let bob = 0;
    if (state === 'idle') bob = Math.sin(time * 3 + x * 0.1) * 0.6 * s;
    else if (state === 'walk') bob = Math.abs(Math.sin(time * 8)) * 2 * s;
    else if (state === 'sit' || state === 'yield') bob = 3 * s; // Lower to ground

    this.drawDropShadow(x, baseY, 14 * s, 10 * s);

    const cBase = genome.baseColor;
    const cAcc = genome.accentColor;
    const y = baseY - 6 * s + bob;

    // Naming a creature "Null" gives a glitch shader effect
    const isGlitch = genome.name === 'Null';
    if (isGlitch) {
      const jitterX = Math.sin(time * 35) * 4;
      const jitterY = (Math.sin(time * 25) > 0.6 ? 2.5 : -1);
      // Chromatic ghosting
      this.renderer.drawCircle(x - 3 + jitterX, y + jitterY, 9 * s, { r: 1.0, g: 0.1, b: 0.3, a: 0.4 });
      this.renderer.drawCircle(x + 3 - jitterX, y - jitterY, 9 * s, { r: 0.1, g: 0.9, b: 1.0, a: 0.4 });
    }

    // Base body based on archetype
    if (genome.archetype === 'quadruped') {
      this.renderer.drawRect(x - 6 * s, y - 5 * s, 12 * s, 8 * s, cBase);
      this.renderer.drawCircle(x + dir * 6 * s, y - 4 * s, 4 * s, cAcc); // Head
      if (state !== 'sit' && state !== 'yield') {
        this.renderer.drawRect(x - 5 * s, y + 3 * s, 2 * s, 3 * s, cAcc); // Legs
        this.renderer.drawRect(x + 3 * s, y + 3 * s, 2 * s, 3 * s, cAcc);
      }
    } else if (genome.archetype === 'biped') {
      this.renderer.drawRect(x - 4 * s, y - 8 * s, 8 * s, 10 * s, cBase);
      this.renderer.drawCircle(x, y - 10 * s, 5 * s, cAcc); // Head
      if (state !== 'sit' && state !== 'yield') {
        this.renderer.drawRect(x - 3 * s, y + 2 * s, 2 * s, 4 * s, cAcc); // Legs
        this.renderer.drawRect(x + 1 * s, y + 2 * s, 2 * s, 4 * s, cAcc);
      }
    } else if (genome.archetype === 'serpent') {
      const sway = Math.sin(time * 4) * 2 * s;
      this.renderer.drawCircle(x + dir * 4 * s, y - 4 * s + sway, 4 * s, cAcc); // Head
      this.renderer.drawRect(x - 6 * s, y - 2 * s, 10 * s, 4 * s, cBase);
    } else if (genome.archetype === 'avian') {
      this.renderer.drawCircle(x, y - 2 * s, 5 * s, cBase); // Body
      this.renderer.drawCircle(x + dir * 3 * s, y - 6 * s, 3 * s, cAcc); // Head
      // Beak
      this.renderer.drawRect(x + dir * 5 * s, y - 6 * s, 3 * s, 1.5 * s, hexToRgba('#F5B041'));
    } else if (genome.archetype === 'blob') {
      const wobble = Math.sin(time * 5) * 1.5 * s;
      this.renderer.drawCircle(x, y - 4 * s - wobble, 7 * s, cBase);
    }

    // Appendages
    if (genome.appendage === 'horns') {
      const hY = y - (genome.archetype === 'biped' ? 14 * s : 8 * s);
      this.renderer.drawLine(x - 2 * s, hY + 2 * s, x - 4 * s, hY - 3 * s, 1.5 * s, cAcc);
      this.renderer.drawLine(x + 2 * s, hY + 2 * s, x + 4 * s, hY - 3 * s, 1.5 * s, cAcc);
    } else if (genome.appendage === 'tails') {
      const tX = x - dir * (genome.archetype === 'quadruped' ? 8 * s : 4 * s);
      const tailSway = Math.sin(time * 6) * 3 * s;
      this.renderer.drawLine(tX, y, tX - dir * 5 * s, y - 4 * s + tailSway, 2 * s, cAcc);
    } else if (genome.appendage === 'wings') {
      const flap = Math.abs(Math.sin(time * 10)) * 4 * s;
      this.renderer.drawLine(x, y - 4 * s, x - 6 * s, y - 8 * s + flap, 2 * s, cAcc);
      this.renderer.drawLine(x, y - 4 * s, x + 6 * s, y - 8 * s + flap, 2 * s, cAcc);
    } else if (genome.appendage === 'petals') {
      this.renderer.drawCircle(x, y - 10 * s, 3 * s, cAcc);
      this.renderer.drawCircle(x - 3 * s, y - 8 * s, 3 * s, cAcc);
      this.renderer.drawCircle(x + 3 * s, y - 8 * s, 3 * s, cAcc);
    } else if (genome.appendage === 'fins') {
      this.renderer.drawRect(x, y - 10 * s, 1 * s, 4 * s, cAcc);
    }

    // Pattern (details)
    if (genome.pattern === 'scales') {
      this.renderer.drawCircle(x - 2 * s, y - 2 * s, 1 * s, cAcc);
      this.renderer.drawCircle(x + 2 * s, y - 2 * s, 1 * s, cAcc);
      this.renderer.drawCircle(x, y, 1 * s, cAcc);
    } else if (genome.pattern === 'fur') {
      this.renderer.drawLine(x - 3 * s, y, x - 4 * s, y + 2 * s, 1 * s, cAcc);
      this.renderer.drawLine(x + 3 * s, y, x + 4 * s, y + 2 * s, 1 * s, cAcc);
    } else if (genome.pattern === 'bark') {
      this.renderer.drawRect(x - 1 * s, y - 4 * s, 2 * s, 6 * s, cAcc);
    }

    // Eyes
    const eX = x + dir * (genome.archetype === 'quadruped' ? 6 * s : (genome.archetype === 'biped' ? 2 * s : 2 * s));
    const eY = y - (genome.archetype === 'biped' ? 10 * s : (genome.archetype === 'quadruped' ? 5 * s : 4 * s));
    
    if (state === 'yield' || state === 'sit') {
      // Yielded / sleeping eyes (curved lines)
      this.renderer.drawLine(eX - 1.5*s, eY, eX + 1.5*s, eY, 1*s, hexToRgba('#1B2631'));
    } else {
      // Open eyes + blinking
      const blink = (time * 2 + x * 0.1) % 4 < 0.1;
      if (!blink) {
        this.renderer.drawCircle(eX - 1.5 * s, eY, 1.2 * s, hexToRgba('#1B2631'));
        this.renderer.drawCircle(eX + 1.5 * s, eY, 1.2 * s, hexToRgba('#1B2631'));
      } else {
        this.renderer.drawRect(eX - 2*s, eY, 4*s, 0.5*s, hexToRgba('#1B2631'));
      }
    }

    // Prismatic Sparkle
    if (genome.isPrismatic && (time * 5 + x) % 1 < 0.2) {
      this.renderer.drawCircle(x - 4 * s, y - 8 * s, 1.5 * s, hexToRgba('#FFFFFF'));
    }
  }

  drawDeer(x: number, y: number, angle: number, isFleeing: boolean, time: number): void {
    this.drawDropShadow(x, y, 16, 7);
    const dir = Math.cos(angle) >= 0 ? 1 : -1;
    const gallop = isFleeing ? Math.sin(time * 14) * 4 : Math.sin(time * 3) * 1.5;

    // Slender legs
    const legOffset1 = Math.sin(time * (isFleeing ? 14 : 4)) * 4;
    const legOffset2 = -legOffset1;
    this.renderer.drawLine(x - 5, y - 6, x - 5 + legOffset1, y + 2, 1.6, hexToRgba('#5D3A2C'));
    this.renderer.drawLine(x + 5, y - 6, x + 5 + legOffset2, y + 2, 1.6, hexToRgba('#5D3A2C'));

    // Body
    this.renderer.drawRect(x - 8, y - 14 + gallop * 0.3, 16, 9, hexToRgba('#8D5B4C'));
    // Flank cream spots
    this.renderer.drawCircle(x, y - 11 + gallop * 0.3, 1.3, hexToRgba('#FADBD8'));
    this.renderer.drawCircle(x - 3, y - 9 + gallop * 0.3, 1.1, hexToRgba('#FADBD8'));

    // Neck & Head
    const headX = x + dir * 8;
    const headY = y - 18 + gallop * 0.5;
    this.renderer.drawRect(headX - 3, headY, 6, 8, hexToRgba('#7D4D3D'));
    this.renderer.drawCircle(headX + dir * 2, headY - 1, 3.8, hexToRgba('#8D5B4C'));

    // Branching Antlers
    this.renderer.drawLine(headX, headY - 3, headX - dir * 2, headY - 10, 1.4, hexToRgba('#D7CCC8'));
    this.renderer.drawLine(headX - dir * 1, headY - 6, headX + dir * 3, headY - 9, 1.2, hexToRgba('#D7CCC8'));

    // Fluffy tail
    this.renderer.drawCircle(x - dir * 8, y - 12 + gallop * 0.3, 2.2, hexToRgba('#FFF8E7'));
  }

  drawRabbit(x: number, y: number, angle: number, isHopping: boolean, time: number): void {
    this.drawDropShadow(x, y, 9, 5);
    const dir = Math.cos(angle) >= 0 ? 1 : -1;
    const hopY = isHopping ? -Math.abs(Math.sin(time * 12)) * 5.5 : 0;

    // Body
    this.renderer.drawCircle(x, y - 5 + hopY, 5.2, hexToRgba('#A0826C'));
    // Head
    this.renderer.drawCircle(x + dir * 4, y - 8 + hopY, 3.6, hexToRgba('#B59982'));
    // Long upright twitching ears
    const earTwitch = Math.sin(time * 8) * 0.8;
    this.renderer.drawLine(x + dir * 3, y - 10 + hopY, x + dir * 2 + earTwitch, y - 16 + hopY, 1.4, hexToRgba('#D7CCC8'));
    this.renderer.drawLine(x + dir * 4.5, y - 10 + hopY, x + dir * 3.5 + earTwitch, y - 15.5 + hopY, 1.3, hexToRgba('#EAECEE'));
    // Fluffy tail
    this.renderer.drawCircle(x - dir * 4.5, y - 5 + hopY, 2.0, hexToRgba('#FFFFFF'));
  }

  drawFox(x: number, y: number, angle: number, isRunning: boolean, time: number): void {
    this.drawDropShadow(x, y, 14, 6);
    const dir = Math.cos(angle) >= 0 ? 1 : -1;
    const trot = isRunning ? Math.sin(time * 12) * 2.5 : Math.sin(time * 4) * 1.0;

    // Body
    this.renderer.drawRect(x - 7, y - 8 + trot * 0.2, 14, 6.5, hexToRgba('#D35400'));
    // White bib
    this.renderer.drawCircle(x + dir * 5, y - 6 + trot * 0.2, 3.0, hexToRgba('#FFF8E7'));

    // Head
    const headX = x + dir * 7;
    const headY = y - 9 + trot * 0.4;
    this.renderer.drawCircle(headX, headY, 3.4, hexToRgba('#E67E22'));
    // Pointy ears
    this.renderer.drawLine(headX, headY - 2, headX - dir * 1, headY - 6, 1.4, hexToRgba('#1C2833'));

    // Bushy white-tipped tail
    const tailSway = Math.sin(time * 6) * 2;
    this.renderer.drawCircle(x - dir * 8, y - 7 + tailSway, 3.8, hexToRgba('#D35400'));
    this.renderer.drawCircle(x - dir * 11, y - 7 + tailSway, 2.4, hexToRgba('#FFFFFF'));
  }

  drawFrog(x: number, y: number, angle: number, isHopping: boolean, time: number): void {
    this.drawDropShadow(x, y, 8, 4);
    const hopY = isHopping ? -Math.abs(Math.sin(time * 10)) * 6.0 : 0;

    // Mottled marsh green body
    this.renderer.drawCircle(x, y - 3 + hopY, 4.2, hexToRgba('#27AE60'));
    // Pale belly
    this.renderer.drawCircle(x, y - 2 + hopY, 2.8, hexToRgba('#82E0AA'));
    // Bulging dark eyes
    this.renderer.drawCircle(x - 2, y - 6 + hopY, 1.5, hexToRgba('#1E8449'));
    this.renderer.drawCircle(x + 2, y - 6 + hopY, 1.5, hexToRgba('#1E8449'));
    this.renderer.drawCircle(x - 2, y - 6 + hopY, 0.7, hexToRgba('#1B2631'));
    this.renderer.drawCircle(x + 2, y - 6 + hopY, 0.7, hexToRgba('#1B2631'));
  }

  drawFirefly(x: number, y: number, time: number): void {
    const glow = 0.35 + 0.65 * Math.abs(Math.sin(time * 3.5 + x * 0.15));
    // Soft luminous halo
    this.renderer.drawCircle(x, y, 5.5, hexToRgba('#CCFF00', glow * 0.40));
    // Core spark
    this.renderer.drawCircle(x, y, 1.8, hexToRgba('#FFFF66', glow * 0.95));
  }

  /**
   * Draws a flat river stone skipping across the water with parabolic height and shadow.
   */
  drawSkippedStone(x: number, y: number, arcHeight: number, scale: number = 1.0): void {
    // Water surface shadow
    this.drawDropShadow(x, y, 6 * scale, 3 * scale);

    // Stone body
    const stoneY = y - arcHeight;
    this.renderer.drawCircle(x, stoneY, 3.2 * scale, hexToRgba('#7F8C8D'));
    this.renderer.drawCircle(x, stoneY + 0.8 * scale, 2.5 * scale, hexToRgba('#566573'));
    // Sun glint on smooth surface
    this.renderer.drawCircle(x - 0.8 * scale, stoneY - 0.8 * scale, 1.4 * scale, hexToRgba('#EAEDED', 0.9));
  }

  /**
   * Draws a classic red & white bobber floating on water with ripples.
   */
  drawFishingFloat(x: number, y: number, bobOffset: number = 0, isHooked: boolean = false): void {
    this.drawRipple(x, y, isHooked ? 8 : 4.5, isHooked ? 0.65 : 0.35);

    const fy = y + bobOffset;
    // Wooden antenna peg
    this.renderer.drawLine(x, fy - 5, x, fy + 3, 1.2, hexToRgba('#D4AC0D'));
    // Top hemisphere (crimson)
    this.renderer.drawCircle(x, fy - 1, 3.2, hexToRgba('#E74C3C'));
    // Bottom hemisphere (ivory white)
    this.renderer.drawCircle(x, fy + 1.2, 2.8, hexToRgba('#FDFEFE'));
  }

  /**
   * Draws a flexible bamboo fishing rod and gentle curved line down to the float.
   */
  drawFishingRod(baseX: number, baseY: number, tipX: number, tipY: number, lineTargetX: number, lineTargetY: number): void {
    // Bamboo pole
    this.renderer.drawLine(baseX, baseY, tipX, tipY, 2.0, hexToRgba('#7D5A2F'));
    // Cork grip
    const gripEndX = baseX + (tipX - baseX) * 0.25;
    const gripEndY = baseY + (tipY - baseY) * 0.25;
    this.renderer.drawLine(baseX, baseY, gripEndX, gripEndY, 3.0, hexToRgba('#C39B64'));
    // Brass reel accent
    this.renderer.drawCircle(baseX + (tipX - baseX) * 0.15, baseY + (tipY - baseY) * 0.15, 2.0, hexToRgba('#F1C40F'));
    // Monofilament line
    this.renderer.drawLine(tipX, tipY, lineTargetX, lineTargetY, 1.0, hexToRgba('#ECF0F1', 0.75));
  }
}

