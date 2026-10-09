import { IRenderer } from './types';
import { ColorRGBA, hexToRgba, Vec2, vec2 } from '../core/math';

export class ArtToolkit {
  private renderer: IRenderer;
  
  constructor(renderer: IRenderer) {
    this.renderer = renderer;
  }

  // A shadow helper for diagonal drop shadows angled by the sun
  drawDropShadow(x: number, y: number, w: number, h: number, sunAngle: number = 0.5) {
    const shadowColor = hexToRgba('#000000', 0.15);
    const skew = Math.sin(sunAngle) * h * 0.5;
    // Draw a skewed polygon for the shadow
    this.renderer.drawPolygon([
      vec2(x - w/2, y),
      vec2(x + w/2, y),
      vec2(x + w/2 + skew, y - h),
      vec2(x - w/2 + skew, y - h)
    ], shadowColor);
  }

  drawBlobShadow(x: number, y: number, radius: number) {
    // Soft dark-green blob shadow under character
    this.renderer.drawCircle(x, y, radius, hexToRgba('#1B3317', 0.28));
  }

  drawPaintedTree(x: number, baseY: number, time: number, wind: Vec2, variant: number) {
    this.drawDropShadow(x, baseY, 14, 28, 0.5);
    
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
    this.drawDropShadow(x, baseY, 12, 6, 0.5);
    this.renderer.drawCircle(x, baseY, 5, hexToRgba('#8A8E91')); // base stone colour
    this.renderer.drawCircle(x - 1, baseY - 1, 3, hexToRgba('#D0D3D4')); // highlight
  }

  drawPaintedFlower(x: number, baseY: number, time: number, wind: Vec2, variant: number) {
    const sway = Math.sin(time * 3.0 + x * 0.1) * 2.0 + wind.x * 1.5;
    
    this.renderer.drawLine(x, baseY, x + sway * 0.2, baseY - 6, 1.5, hexToRgba('#3A5F40'));
    
    const petalColors = ['#FFFFFF', '#E89D5E', '#F39C12', '#9B59B6', '#F1948A'];
    const pColor = hexToRgba(petalColors[variant % petalColors.length]);
    
    this.renderer.drawCircle(x + sway * 0.3, baseY - 6, 3.2, pColor);
    this.renderer.drawCircle(x + sway * 0.3, baseY - 6, 1.2, hexToRgba('#F4D03F')); // Pollen center
  }

  drawGrassBlade(x: number, baseY: number, time: number, wind: Vec2) {
    const sway = Math.sin(time * 3 + x * 0.04) * 2 + wind.x * 1.5;
    this.renderer.drawLine(x, baseY, x + sway, baseY - 7, 1.5, hexToRgba('#A6C96C'));
  }
}
