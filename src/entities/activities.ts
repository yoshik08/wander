import { Vec2, vec2, lerp } from '../core/math';
import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';
import { ChunkManager } from '../world/chunk-manager';

export interface SkippedStone {
  id: number;
  pos: Vec2;
  startPos: Vec2;
  targetPos: Vec2;
  arcHeight: number;
  maxHeight: number;
  progress: number; // 0 to 1
  speed: number;    // progress units / sec
  skipsRemaining: number;
  totalSkips: number;
  angle: number;
  stepDistance: number;
  active: boolean;
}

export type FishingStatus = 'idle' | 'casting' | 'waiting' | 'nibble' | 'hooked' | 'caught';

export interface FishCatch {
  name: string;
  species: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Treasured';
  lengthInches: number;
  description: string;
  icon: string;
  keepsakeId?: string;
}

export const CATCH_CATALOGUE: FishCatch[] = [
  {
    name: 'Glimmer Minnow',
    species: 'minnow',
    rarity: 'Common',
    lengthInches: 3.5,
    description: 'A tiny iridescent river fish glowing with quiet green-gold light.',
    icon: '🐟'
  },
  {
    name: 'Meadow Brook Trout',
    species: 'trout',
    rarity: 'Common',
    lengthInches: 9.2,
    description: 'Speckled with golden vermiculation and gentle pink fins.',
    icon: '🐟'
  },
  {
    name: 'Whispering Guppy',
    species: 'guppy',
    rarity: 'Common',
    lengthInches: 2.8,
    description: 'Drifts peacefully among river reeds and lily pads in calm schools.',
    icon: '🐠'
  },
  {
    name: 'Mirror Carp',
    species: 'carp',
    rarity: 'Uncommon',
    lengthInches: 16.4,
    description: 'Broad silver scales that reflect cloudscapes like polished pewter.',
    icon: '🎏'
  },
  {
    name: 'Golden River Perch',
    species: 'perch',
    rarity: 'Uncommon',
    lengthInches: 11.0,
    description: 'Vibrant striped fins that flash like sunlight through amber water.',
    icon: '🐠'
  },
  {
    name: 'Moonlit Dace',
    species: 'dace',
    rarity: 'Rare',
    lengthInches: 7.6,
    description: 'A nocturnal swimmer with luminous blue ventral edges.',
    icon: '✨'
  },
  {
    name: 'Sunken Driftwood Blossom',
    species: 'keepsake',
    rarity: 'Rare',
    lengthInches: 5.0,
    description: 'A fragrant water lotus bloom caught along a polished piece of driftwood.',
    icon: '🌸',
    keepsakeId: 'cherry_petal'
  },
  {
    name: 'Prismatic River Koi',
    species: 'koi',
    rarity: 'Treasured',
    lengthInches: 22.5,
    description: 'A legendary serene koi adorned with pearlescent calico markings.',
    icon: '💎'
  }
];

export class ActivityManager {
  stones: SkippedStone[] = [];
  fishingStatus: FishingStatus = 'idle';
  fishingBobberPos: Vec2 = vec2(0, 0);
  fishingTimer: number = 0;
  fishingNibbleTimer: number = 0;
  fishingHookedTimer: number = 0;
  fishingRodAngle: number = 0;
  currentCatch: FishCatch | null = null;

  stonesSkippedCount: number = 0;
  private nextStoneId: number = 1;
  private hookRippleTimer: number = 0;

  get isFishing(): boolean {
    return this.fishingStatus !== 'idle';
  }

  /**
   * Evaluates if there is reachable water in front of the character.
   */
  checkWaterNearby(
    playerPos: Vec2,
    facingAngle: number,
    chunkManager: ChunkManager,
    layer: number
  ): { canFish: boolean; canSkipStone: boolean; waterTarget: Vec2 | null } {
    const dirX = Math.cos(facingAngle);
    const dirY = Math.sin(facingAngle);

    // Test points along facing direction (24px to 68px ahead)
    const testDistances = [24, 38, 54, 70];
    let waterTarget: Vec2 | null = null;

    for (const dist of testDistances) {
      const tx = playerPos.x + dirX * dist;
      const ty = playerPos.y + dirY * dist;
      if (chunkManager.isWaterAt(layer, tx, ty)) {
        waterTarget = vec2(tx, ty);
        break;
      }
    }

    if (waterTarget) {
      return {
        canFish: true,
        canSkipStone: true,
        waterTarget
      };
    }

    return {
      canFish: false,
      canSkipStone: false,
      waterTarget: null
    };
  }

  /**
   * Skips a flat river stone across the water along the given angle.
   */
  skipStone(playerPos: Vec2, facingAngle: number, waterTarget?: Vec2 | null): SkippedStone {
    const totalSkips = 3 + Math.floor(Math.random() * 3); // 3 to 5 skips
    const stepDist = 36 + Math.random() * 14;

    const startX = playerPos.x + Math.cos(facingAngle) * 10;
    const startY = playerPos.y + Math.sin(facingAngle) * 10;

    const targetX = waterTarget ? waterTarget.x : startX + Math.cos(facingAngle) * stepDist;
    const targetY = waterTarget ? waterTarget.y : startY + Math.sin(facingAngle) * stepDist;

    const stone: SkippedStone = {
      id: this.nextStoneId++,
      pos: vec2(startX, startY),
      startPos: vec2(startX, startY),
      targetPos: vec2(targetX, targetY),
      arcHeight: 0,
      maxHeight: 14,
      progress: 0,
      speed: 2.2,
      skipsRemaining: totalSkips,
      totalSkips,
      angle: facingAngle,
      stepDistance: stepDist,
      active: true
    };

    this.stones.push(stone);
    this.stonesSkippedCount++;
    return stone;
  }

  /**
   * Casts a fishing line towards the designated water target.
   */
  startFishing(playerPos: Vec2, facingAngle: number, waterTarget: Vec2): void {
    this.fishingStatus = 'casting';
    this.fishingBobberPos = vec2(waterTarget.x, waterTarget.y);
    this.fishingRodAngle = facingAngle;
    this.fishingTimer = 0;
    this.currentCatch = null;
  }

  /**
   * Cancels or packs up the fishing rod.
   */
  stopFishing(): void {
    this.fishingStatus = 'idle';
    this.currentCatch = null;
  }

  /**
   * Reels in the fishing line. Relaxing & timing-free.
   */
  reelIn(): { caught: boolean; item?: FishCatch } {
    if (this.fishingStatus === 'hooked') {
      // Deterministically select catch based on weighted roll
      const roll = Math.random();
      let chosen: FishCatch;
      if (roll < 0.55) {
        // Common
        const commons = CATCH_CATALOGUE.filter(c => c.rarity === 'Common');
        chosen = commons[Math.floor(Math.random() * commons.length)];
      } else if (roll < 0.85) {
        // Uncommon
        const uncommons = CATCH_CATALOGUE.filter(c => c.rarity === 'Uncommon');
        chosen = uncommons[Math.floor(Math.random() * uncommons.length)];
      } else if (roll < 0.96) {
        // Rare
        const rares = CATCH_CATALOGUE.filter(c => c.rarity === 'Rare');
        chosen = rares[Math.floor(Math.random() * rares.length)];
      } else {
        // Treasured
        const treasured = CATCH_CATALOGUE.filter(c => c.rarity === 'Treasured');
        chosen = treasured[Math.floor(Math.random() * treasured.length)];
      }

      this.currentCatch = chosen;
      this.fishingStatus = 'caught';
      this.fishingTimer = 2.0; // short display before idle
      return { caught: true, item: chosen };
    }

    this.stopFishing();
    return { caught: false };
  }

  /**
   * Updates stone physics and peaceful fishing state machine.
   */
  update(
    dt: number,
    onRipple?: (x: number, y: number, radius: number) => void,
    onSplash?: (x: number, y: number, count: number) => void
  ): void {
    // 1. Update skipping stones
    for (const stone of this.stones) {
      if (!stone.active) continue;

      stone.progress += dt * stone.speed;
      const t = Math.min(1.0, stone.progress);
      stone.pos.x = lerp(stone.startPos.x, stone.targetPos.x, t);
      stone.pos.y = lerp(stone.startPos.y, stone.targetPos.y, t);
      stone.arcHeight = Math.max(0, 4 * stone.maxHeight * t * (1 - t));

      if (stone.progress >= 1.0) {
        // Impact water surface
        stone.skipsRemaining--;
        const skipIndex = stone.totalSkips - stone.skipsRemaining;

        if (onRipple) {
          onRipple(stone.pos.x, stone.pos.y, 6 + skipIndex * 2.5);
        }
        if (onSplash) {
          onSplash(stone.pos.x, stone.pos.y, 4);
        }

        if (stone.skipsRemaining > 0) {
          // Bounce to next skip segment
          stone.startPos = vec2(stone.pos.x, stone.pos.y);
          stone.stepDistance *= 0.72;
          stone.targetPos = vec2(
            stone.pos.x + Math.cos(stone.angle) * stone.stepDistance,
            stone.pos.y + Math.sin(stone.angle) * stone.stepDistance
          );
          stone.maxHeight *= 0.62;
          stone.speed *= 0.92;
          stone.progress = 0;
        } else {
          // Sinks peacefully with soft water plopping
          stone.active = false;
          if (onRipple) {
            onRipple(stone.pos.x, stone.pos.y, 8);
          }
        }
      }
    }

    // Prune inactive stones
    this.stones = this.stones.filter(s => s.active);

    // 2. Update fishing state machine
    if (this.fishingStatus === 'casting') {
      this.fishingTimer += dt * 2.5;
      if (this.fishingTimer >= 1.0) {
        this.fishingStatus = 'waiting';
        this.fishingTimer = 3.0 + Math.random() * 4.0; // 3 to 7s of peaceful waiting
        if (onRipple) {
          onRipple(this.fishingBobberPos.x, this.fishingBobberPos.y, 7);
        }
      }
    } else if (this.fishingStatus === 'waiting') {
      this.fishingTimer -= dt;
      if (this.fishingTimer <= 0) {
        this.fishingStatus = 'nibble';
        this.fishingNibbleTimer = 2.0;
        if (onRipple) {
          onRipple(this.fishingBobberPos.x, this.fishingBobberPos.y, 5);
        }
      }
    } else if (this.fishingStatus === 'nibble') {
      this.fishingNibbleTimer -= dt;
      if (this.fishingNibbleTimer <= 0) {
        // Hooked! Timing-free: stays hooked until player reels in!
        this.fishingStatus = 'hooked';
        this.fishingHookedTimer = 0;
        this.hookRippleTimer = 0;
        if (onRipple) {
          onRipple(this.fishingBobberPos.x, this.fishingBobberPos.y, 14);
        }
        if (onSplash) {
          onSplash(this.fishingBobberPos.x, this.fishingBobberPos.y, 6);
        }
      }
    } else if (this.fishingStatus === 'hooked') {
      this.fishingHookedTimer += dt;
      this.hookRippleTimer += dt;
      if (this.hookRippleTimer >= 0.75) {
        this.hookRippleTimer = 0;
        if (onRipple) {
          onRipple(this.fishingBobberPos.x, this.fishingBobberPos.y, 9);
        }
      }
    } else if (this.fishingStatus === 'caught') {
      this.fishingTimer -= dt;
      if (this.fishingTimer <= 0) {
        this.fishingStatus = 'idle';
      }
    }
  }

  /**
   * Renders skipping stones and fishing rod/line/float.
   */
  render(renderer: IRenderer, art: ArtToolkit, playerPos: Vec2, playerFacingAngle: number): void {
    // 1. Render skipping stones
    for (const stone of this.stones) {
      if (!stone.active) continue;
      art.drawSkippedStone(stone.pos.x, stone.pos.y, stone.arcHeight, 1.0);
    }

    // 2. Render fishing equipment
    if (this.fishingStatus !== 'idle') {
      const isHooked = this.fishingStatus === 'hooked';
      const bobOffset = isHooked
        ? -3.5 + Math.sin(performance.now() / 80) * 1.8
        : Math.sin(performance.now() / 320) * 1.5;

      // Rod base from character hands
      const baseX = playerPos.x + Math.cos(playerFacingAngle + 0.3) * 6;
      const baseY = playerPos.y - 10 + Math.sin(playerFacingAngle + 0.3) * 4;

      // Rod tip angled forward and up
      const tipX = baseX + Math.cos(playerFacingAngle) * 22;
      const tipY = baseY + Math.sin(playerFacingAngle) * 12 - 16;

      art.drawFishingRod(baseX, baseY, tipX, tipY, this.fishingBobberPos.x, this.fishingBobberPos.y + bobOffset);
      art.drawFishingFloat(this.fishingBobberPos.x, this.fishingBobberPos.y, bobOffset, isHooked);
    }
  }
}
