import { Vec2, vec2, hexToRgba } from '../core/math';
import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';

export interface GardenPlotSlot {
  id: number;
  localX: number;
  localY: number;
  seedType: string;
  stage: 'empty' | 'sprout' | 'growing' | 'blooming';
  growth: number; // 0.0 to 1.0
  plantName: string;
  flowerColor: string;
}

export const SEED_TYPES: Record<string, { name: string; color: string }> = {
  wild_clover: { name: 'Emerald Clover', color: '#4CAF50' },
  cherry_petal: { name: 'Cherry Blossom', color: '#F06292' },
  acorn: { name: 'Pygmy Oak', color: '#8D6E63' },
  glowing_spore: { name: 'Moonlit Bellflower', color: '#26C6DA' },
  amber_leaf: { name: 'Golden Marigold', color: '#FFA000' },
  blue_feather: { name: 'Azure Columbine', color: '#42A5F5' },
  default: { name: 'Meadow Wildflower', color: '#BA68C8' }
};

export class GardenSystem {
  // Center position of garden plot in world coordinates near spawn (0,0)
  readonly pos: Vec2 = { x: 448, y: 432 };
  readonly width: number = 72;
  readonly height: number = 52;

  // 4 tilled planting beds
  readonly slots: GardenPlotSlot[] = [
    { id: 0, localX: -20, localY: -12, seedType: '', stage: 'empty', growth: 0, plantName: '', flowerColor: '#4CAF50' },
    { id: 1, localX: 20, localY: -12, seedType: '', stage: 'empty', growth: 0, plantName: '', flowerColor: '#F06292' },
    { id: 2, localX: -20, localY: 12, seedType: '', stage: 'empty', growth: 0, plantName: '', flowerColor: '#FFA000' },
    { id: 3, localX: 20, localY: 12, seedType: '', stage: 'empty', growth: 0, plantName: '', flowerColor: '#26C6DA' }
  ];

  constructor() {}

  load(savedData?: Array<{ id: number; seedType: string; stage: 'empty' | 'sprout' | 'growing' | 'blooming'; growth: number }>): void {
    if (!savedData || !Array.isArray(savedData)) return;
    for (const saved of savedData) {
      const slot = this.slots.find(s => s.id === saved.id);
      if (slot) {
        slot.seedType = saved.seedType || '';
        slot.stage = saved.stage || 'empty';
        slot.growth = saved.growth || 0;
        const info = SEED_TYPES[slot.seedType] || SEED_TYPES['default'];
        slot.plantName = info.name;
        slot.flowerColor = info.color;
      }
    }
  }

  save(): Array<{ id: number; seedType: string; stage: 'empty' | 'sprout' | 'growing' | 'blooming'; growth: number }> {
    return this.slots.map(s => ({
      id: s.id,
      seedType: s.seedType,
      stage: s.stage,
      growth: s.growth
    }));
  }

  getSlotWorldPos(slot: GardenPlotSlot): Vec2 {
    return {
      x: this.pos.x + slot.localX,
      y: this.pos.y + slot.localY
    };
  }

  getClosestSlot(playerPos: Vec2, maxDist: number = 32): GardenPlotSlot | null {
    let closest: GardenPlotSlot | null = null;
    let minDist = maxDist;

    for (const slot of this.slots) {
      const sp = this.getSlotWorldPos(slot);
      const dist = Math.hypot(playerPos.x - sp.x, playerPos.y - sp.y);
      if (dist < minDist) {
        minDist = dist;
        closest = slot;
      }
    }

    return closest;
  }

  plantSeed(slotId: number, seedType: string): boolean {
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot || slot.stage !== 'empty') return false;

    const info = SEED_TYPES[seedType] || SEED_TYPES['default'];
    slot.seedType = seedType;
    slot.stage = 'sprout';
    slot.growth = 0.1;
    slot.plantName = info.name;
    slot.flowerColor = info.color;
    return true;
  }

  waterSlot(slotId: number): boolean {
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot || slot.stage === 'empty') return false;

    // Advance growth significantly upon watering
    slot.growth = Math.min(1.0, slot.growth + 0.35);
    this.updateSlotStage(slot);
    return true;
  }

  update(dt: number, isRaining: boolean): void {
    const rainMultiplier = isRaining ? 2.5 : 1.0;
    // Growth rate: approx 1 stage every 45-60 seconds, faster in rain
    const growthRate = 0.015 * rainMultiplier * dt;

    for (const slot of this.slots) {
      if (slot.stage !== 'empty' && slot.stage !== 'blooming') {
        slot.growth = Math.min(1.0, slot.growth + growthRate);
        this.updateSlotStage(slot);
      }
    }
  }

  private updateSlotStage(slot: GardenPlotSlot): void {
    if (slot.growth >= 0.85) {
      slot.stage = 'blooming';
    } else if (slot.growth >= 0.40) {
      slot.stage = 'growing';
    } else if (slot.growth > 0) {
      slot.stage = 'sprout';
    }
  }

  render(renderer: IRenderer, art: ArtToolkit, time: number, wind: Vec2): void {
    const cx = this.pos.x;
    const cy = this.pos.y;

    // 1. Garden Tilled Bed Base & Rustic Timber Border
    art.drawDropShadow(cx, cy + 2, this.width + 6, this.height + 4);

    // Rustic timber border
    renderer.drawRect(cx - this.width / 2 - 4, cy - this.height / 2 - 4, this.width + 8, this.height + 8, hexToRgba('#5D4037'));
    renderer.drawRect(cx - this.width / 2 - 2, cy - this.height / 2 - 2, this.width + 4, this.height + 4, hexToRgba('#795548'));

    // Dark fertile tilled earth bed
    renderer.drawRect(cx - this.width / 2, cy - this.height / 2, this.width, this.height, hexToRgba('#3E2723'));

    // Soft furrow stripes
    for (let r = -1; r <= 1; r++) {
      renderer.drawLine(
        cx - this.width / 2 + 4,
        cy + r * 14,
        cx + this.width / 2 - 4,
        cy + r * 14,
        1.5,
        hexToRgba('#2D1A13', 0.8)
      );
    }

    // Corner timber pegs
    renderer.drawCircle(cx - this.width / 2 - 2, cy - this.height / 2 - 2, 2.5, hexToRgba('#4E342E'));
    renderer.drawCircle(cx + this.width / 2 + 2, cy - this.height / 2 - 2, 2.5, hexToRgba('#4E342E'));
    renderer.drawCircle(cx - this.width / 2 - 2, cy + this.height / 2 + 2, 2.5, hexToRgba('#4E342E'));
    renderer.drawCircle(cx + this.width / 2 + 2, cy + this.height / 2 + 2, 2.5, hexToRgba('#4E342E'));

    // 2. Render each planting mound and plant
    for (const slot of this.slots) {
      const sp = this.getSlotWorldPos(slot);

      // Moist soil mound
      renderer.drawCircle(sp.x, sp.y, 11, hexToRgba('#2A1910'));
      renderer.drawCircle(sp.x, sp.y, 8, hexToRgba('#3B2418'));

      if (slot.stage === 'empty') {
        // Small planting hole depression
        renderer.drawCircle(sp.x, sp.y, 3, hexToRgba('#1B100B'));
        continue;
      }

      const sway = Math.sin(time * 3 + sp.x * 0.1) * wind.x * 1.5;

      if (slot.stage === 'sprout') {
        // Tiny tender sprout shoot
        const shootH = 5 + slot.growth * 4;
        renderer.drawLine(sp.x, sp.y, sp.x + sway * 0.3, sp.y - shootH, 1.6, hexToRgba('#4CAF50'));
        // Two pale green cotyledon leaves
        renderer.drawCircle(sp.x - 2.5, sp.y - shootH, 2.2, hexToRgba('#81C784'));
        renderer.drawCircle(sp.x + 2.5, sp.y - shootH, 2.2, hexToRgba('#81C784'));
      } else if (slot.stage === 'growing') {
        // Sturdy branching stalk
        const stalkH = 10 + slot.growth * 6;
        renderer.drawLine(sp.x, sp.y, sp.x + sway * 0.6, sp.y - stalkH, 2.0, hexToRgba('#388E3C'));
        // Side leaves
        renderer.drawCircle(sp.x - 4 + sway * 0.3, sp.y - stalkH * 0.5, 3.2, hexToRgba('#4CAF50'));
        renderer.drawCircle(sp.x + 4 + sway * 0.3, sp.y - stalkH * 0.6, 3.2, hexToRgba('#4CAF50'));
        // Developing bud
        renderer.drawCircle(sp.x + sway * 0.6, sp.y - stalkH, 3.0, hexToRgba(slot.flowerColor, 0.7));
      } else if (slot.stage === 'blooming') {
        // Full majestic blooming flower
        const stalkH = 16;
        renderer.drawLine(sp.x, sp.y, sp.x + sway, sp.y - stalkH, 2.2, hexToRgba('#2E7D32'));
        // Rich foliage leaves
        renderer.drawCircle(sp.x - 5 + sway * 0.4, sp.y - 7, 4.0, hexToRgba('#388E3C'));
        renderer.drawCircle(sp.x + 5 + sway * 0.4, sp.y - 9, 4.0, hexToRgba('#388E3C'));

        // Radiant blossom petals
        const fx = sp.x + sway;
        const fy = sp.y - stalkH;

        for (let p = 0; p < 5; p++) {
          const pa = (p * Math.PI * 2) / 5 + time * 0.2;
          const petalDist = 4.5;
          renderer.drawCircle(
            fx + Math.cos(pa) * petalDist,
            fy + Math.sin(pa) * petalDist,
            3.6,
            hexToRgba(slot.flowerColor, 0.95)
          );
        }

        // Golden pollen blossom core
        renderer.drawCircle(fx, fy, 3.0, hexToRgba('#FFD54F'));
        renderer.drawCircle(fx, fy, 1.4, hexToRgba('#FFF9C4'));

        // Gentle sparkle halo
        const halo = 0.4 + 0.3 * Math.sin(time * 4 + sp.y);
        renderer.drawCircle(fx, fy, 7.0, hexToRgba(slot.flowerColor, halo * 0.3));
      }
    }
  }
}
