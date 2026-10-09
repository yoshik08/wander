import { Vec2, vec2, hexToRgba } from '../core/math';
import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';

export interface WaterSpriteEncounter {
  active: boolean;
  x: number;
  y: number;
  timer: number;
}

export class EasterEggSystem {
  // 1. Konami / Meteor shower sequence
  private readonly meteorSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  private currentSeqIndex = 0;
  onMeteorShower?: () => void;

  // 2. Creator tent at -999, -999 tiles = (-23976, -23976) px
  readonly creatorX = -999 * 24;
  readonly creatorY = -999 * 24;
  readonly milestoneDist = 10000 * 24; // 240,000 px

  // 3. Idle sleep pile
  idleTimer = 0;
  isSleepPileActive = false;
  onSleepPile?: () => void;

  // 4. Clicking water 50 times
  private waterClickCount = 0;
  private lastWaterClick: Vec2 | null = null;
  waterSprite: WaterSpriteEncounter = { active: false, x: 0, y: 0, timer: 0 };
  onWaterSprite?: (x: number, y: number) => void;

  constructor() {
    this.setupKeyListeners();
    this.printDevToolsAsciiMap();
  }

  handleKey(key: string) {
    if (key === this.meteorSequence[this.currentSeqIndex]) {
      this.currentSeqIndex++;
      if (this.currentSeqIndex === this.meteorSequence.length) {
        this.currentSeqIndex = 0;
        if (this.onMeteorShower) this.onMeteorShower();
      }
    } else {
      this.currentSeqIndex = (key === this.meteorSequence[0]) ? 1 : 0;
    }
  }

  private setupKeyListeners() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      this.handleKey(e.key);
    });
  }

  printDevToolsAsciiMap() {
    console.log(
      '%c✦ MEADOW — SECRET EXPEDITION MAP ✦',
      'color: #F4D06F; font-size: 14px; font-weight: bold; background: #1B2631; padding: 4px;'
    );
    console.log(`
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║        [North: Zephyros (0, -11520)]                     ║
    ║                     |                                    ║
    ║   [West: Hydravos]  +---- [Spawn: (0, 0)] ---- [East]    ║
    ║   (-11520, 0)       |                         Ignisaur   ║
    ║                     |                         (11520, 0) ║
    ║        [South: Terranox (0, 11520)]                      ║
    ║                                                          ║
    ║   ★ Creator Camp: (-23976, -23976) [Tile -999,-999]     ║
    ║   ★ 10,000 Paces Milestone: (240000, 0)                  ║
    ╚══════════════════════════════════════════════════════════╝
    `);
  }

  handleWaterClick(worldX: number, worldY: number, isWater: boolean) {
    if (!isWater) {
      this.waterClickCount = 0;
      return;
    }

    if (this.lastWaterClick) {
      const d = Math.hypot(worldX - this.lastWaterClick.x, worldY - this.lastWaterClick.y);
      if (d < 24) {
        this.waterClickCount++;
      } else {
        this.waterClickCount = 1;
        this.lastWaterClick = vec2(worldX, worldY);
      }
    } else {
      this.waterClickCount = 1;
      this.lastWaterClick = vec2(worldX, worldY);
    }

    if (this.waterClickCount >= 50) {
      this.waterClickCount = 0;
      this.waterSprite = {
        active: true,
        x: worldX,
        y: worldY,
        timer: 3.5 // Visible for 3.5s
      };
      if (this.onWaterSprite) this.onWaterSprite(worldX, worldY);
    }
  }

  update(dt: number, isMoving: boolean) {
    // Idle tracking
    if (isMoving) {
      this.idleTimer = 0;
      this.isSleepPileActive = false;
    } else {
      this.idleTimer += dt;
      if (this.idleTimer >= 600 && !this.isSleepPileActive) {
        this.isSleepPileActive = true;
        if (this.onSleepPile) this.onSleepPile();
      }
    }

    // Water sprite animation
    if (this.waterSprite.active) {
      this.waterSprite.timer -= dt;
      if (this.waterSprite.timer <= 0) {
        this.waterSprite.active = false;
      }
    }
  }

  renderCreatorCamp(renderer: IRenderer, art: ArtToolkit, layer: number, camPos: Vec2, time: number) {
    if (layer !== 0) return;

    const dx = camPos.x - this.creatorX;
    const dy = camPos.y - this.creatorY;
    if (dx * dx + dy * dy > 950 * 950) return;

    const cx = this.creatorX;
    const cy = this.creatorY;

    // Ground shadows
    renderer.drawCircle(cx, cy + 4, 32, hexToRgba('#1B2631', 0.35));

    // Cozy traveler canvas tent
    const tentQuad: [Vec2, Vec2, Vec2, Vec2] = [
      vec2(cx - 24, cy + 8),
      vec2(cx, cy - 24),
      vec2(cx + 24, cy + 8),
      vec2(cx, cy + 12)
    ];
    renderer.drawPolygon(tentQuad, hexToRgba('#E59866', 0.95)); // Warm canvas

    // Tent opening flap
    renderer.drawRect(cx - 6, cy - 2, 12, 10, hexToRgba('#5D4037', 0.9));

    // Campfire beside tent
    renderer.drawCircle(cx + 36, cy + 6, 8, hexToRgba('#424949', 0.9));
    const flicker = Math.sin(time * 8) * 1.5;
    renderer.drawCircle(cx + 36, cy + 4 + flicker, 4, hexToRgba('#E74C3C', 0.9));
    renderer.drawCircle(cx + 36, cy + 2 + flicker, 2.5, hexToRgba('#F39C12', 0.95));

    // Creator NPC: Yoshik sitting comfortably
    const yoshikX = cx + 18;
    const yoshikY = cy + 8;
    renderer.drawCircle(yoshikX, yoshikY + 2, 7, hexToRgba('#1B2631', 0.4)); // shadow
    renderer.drawRect(yoshikX - 5, yoshikY - 12, 10, 12, hexToRgba('#2C3E50', 0.95)); // coat
    renderer.drawCircle(yoshikX, yoshikY - 16, 5, hexToRgba('#FFDAB9', 1.0)); // face
    renderer.drawRect(yoshikX - 6, yoshikY - 14, 12, 3.5, hexToRgba('#3498DB', 0.95)); // blue scarf
  }

  renderMilestoneSign(renderer: IRenderer, layer: number, camPos: Vec2, playerPos: Vec2) {
    if (layer !== 0) return;

    // Placed at (240000, 0)
    const sx = this.milestoneDist;
    const sy = 0;
    const dx = camPos.x - sx;
    const dy = camPos.y - sy;
    if (dx * dx + dy * dy > 950 * 950) return;

    // Wooden signpost
    renderer.drawCircle(sx, sy + 4, 8, hexToRgba('#1B2631', 0.4));
    renderer.drawRect(sx - 2, sy - 16, 4, 18, hexToRgba('#5D4037', 0.95));
    renderer.drawRect(sx - 16, sy - 28, 32, 14, hexToRgba('#8D6E63', 0.95));
    renderer.drawRect(sx - 14, sy - 26, 28, 10, hexToRgba('#A1887F', 0.9));
  }

  renderWaterSprite(renderer: IRenderer, time: number) {
    if (!this.waterSprite.active) return;

    const { x, y, timer } = this.waterSprite;
    const bob = Math.sin(time * 5) * 3;
    const alpha = Math.min(1.0, timer);

    // Water ripple ring
    renderer.drawCircle(x, y + 4, 12 + (3.5 - timer) * 4, hexToRgba('#A2D9CE', alpha * 0.5));

    // Translucent azure water sprite body
    renderer.drawCircle(x, y - 8 + bob, 7, hexToRgba('#3498DB', alpha * 0.75));
    renderer.drawCircle(x, y - 14 + bob, 5, hexToRgba('#85C1E9', alpha * 0.9));
    renderer.drawCircle(x, y - 15 + bob, 2, hexToRgba('#FFFFFF', alpha * 0.95)); // glimmer eye

    // Waving hand
    const wave = Math.sin(time * 10) * 4;
    renderer.drawRect(x + 4, y - 16 + bob + wave, 5, 2.5, hexToRgba('#85C1E9', alpha * 0.9));
  }
}
