import { describe, it, expect, vi } from 'vitest';
import { ActivityManager, CATCH_CATALOGUE } from '../src/entities/activities';
import { vec2 } from '../src/core/math';
import { Character } from '../src/entities/character';
import { ArtToolkit } from '../src/render/art';
import { IRenderer } from '../src/render/types';

describe('Step 9.3: Activities (Stone Skipping & Relaxing Fishing)', () => {
  it('detects reachable water ahead and returns valid waterTarget', () => {
    const manager = new ActivityManager();
    const mockChunkManager: any = {
      isWaterAt: vi.fn((layer: number, x: number, y: number) => {
        // Mock water at x >= 400
        return x >= 400;
      })
    };

    // Facing right (east = angle 0) at x = 360: distance 38 reaches x = 398 (no), distance 54 reaches x = 414 (water!)
    const resultFacingWater = manager.checkWaterNearby(vec2(360, 200), 0, mockChunkManager, 0);
    expect(resultFacingWater.canFish).toBe(true);
    expect(resultFacingWater.canSkipStone).toBe(true);
    expect(resultFacingWater.waterTarget).not.toBeNull();
    expect(resultFacingWater.waterTarget!.x).toBeGreaterThanOrEqual(400);

    // Facing left (west = angle PI) at x = 360: moving away from water
    const resultFacingAway = manager.checkWaterNearby(vec2(360, 200), Math.PI, mockChunkManager, 0);
    expect(resultFacingAway.canFish).toBe(false);
    expect(resultFacingAway.canSkipStone).toBe(false);
    expect(resultFacingAway.waterTarget).toBeNull();
  });

  it('skips a stone with bouncing parabolic physics and ripple callbacks', () => {
    const manager = new ActivityManager();
    const ripples: { x: number; y: number; r: number }[] = [];
    const splashes: { x: number; y: number; c: number }[] = [];

    const onRipple = (x: number, y: number, r: number) => ripples.push({ x, y, r });
    const onSplash = (x: number, y: number, c: number) => splashes.push({ x, y, c });

    const stone = manager.skipStone(vec2(100, 100), 0, vec2(150, 100));
    expect(manager.stones.length).toBe(1);
    expect(stone.totalSkips).toBeGreaterThanOrEqual(3);
    expect(stone.skipsRemaining).toBe(stone.totalSkips);
    expect(manager.stonesSkippedCount).toBe(1);

    // Advance mid-skip: stone should be in the air with positive arcHeight
    manager.update(0.2, onRipple, onSplash);
    expect(stone.progress).toBeGreaterThan(0);
    expect(stone.arcHeight).toBeGreaterThan(0);

    // Advance enough to complete all skips
    const initialSkips = stone.totalSkips;
    for (let i = 0; i < 40; i++) {
      manager.update(0.15, onRipple, onSplash);
    }

    // Ripples and splashes should have been recorded for impacts
    expect(ripples.length).toBeGreaterThanOrEqual(initialSkips);
    expect(splashes.length).toBeGreaterThanOrEqual(1);

    // Stone should have exhausted its skips and sunk
    expect(manager.stones.length).toBe(0);
  });

  it('runs relaxing timing-free fishing state machine through catch cycle', () => {
    const manager = new ActivityManager();
    const ripples: { x: number; y: number; r: number }[] = [];
    const onRipple = (x: number, y: number, r: number) => ripples.push({ x, y, r });

    expect(manager.isFishing).toBe(false);
    manager.startFishing(vec2(200, 200), 0, vec2(240, 200));
    expect(manager.isFishing).toBe(true);
    expect(manager.fishingStatus).toBe('casting');

    // Casting phase finishes
    manager.update(0.5, onRipple);
    expect(manager.fishingStatus).toBe('waiting');

    // Reeling in while waiting yields no fish
    const earlyReel = manager.reelIn();
    expect(earlyReel.caught).toBe(false);
    expect(manager.isFishing).toBe(false);

    // Restart and wait through nibble to hooked
    manager.startFishing(vec2(200, 200), 0, vec2(240, 200));
    manager.update(0.5, onRipple); // Finish cast -> waiting
    manager.update(8.0, onRipple); // Wait -> nibble
    manager.update(3.0, onRipple); // Nibble -> hooked
    expect(manager.fishingStatus).toBe('hooked');

    // Timing-free test: advance time by 60 seconds, remains hooked without fleeing
    manager.update(60.0, onRipple);
    expect(manager.fishingStatus).toBe('hooked');

    // Player reels in calmly
    const finalCatch = manager.reelIn();
    expect(finalCatch.caught).toBe(true);
    expect(finalCatch.item).toBeDefined();
    expect(CATCH_CATALOGUE).toContainEqual(finalCatch.item);
  });

  it('supports Character fish action and cancels peacefully upon movement', () => {
    const char = new Character(300, 300);
    expect(char.action).toBe('idle');

    char.action = 'fish';
    // Idle update: remains fishing
    char.update(vec2(0, 0), false, vec2(0, 0), 0.1);
    expect(char.action).toBe('fish');

    // Player inputs movement: cancels fishing and resumes walking
    char.update(vec2(1, 0), false, vec2(0, 0), 0.1);
    expect(char.action).toBe('walk');
  });

  it('renders skipped stone, fishing float, and fishing rod without errors', () => {
    const mockRenderer: any = {
      drawRect: vi.fn(),
      drawCircle: vi.fn(),
      drawLine: vi.fn(),
      drawPolygon: vi.fn()
    };
    const art = new ArtToolkit(mockRenderer);

    expect(() => {
      art.drawSkippedStone(150, 120, 8, 1.0);
    }).not.toThrow();

    expect(() => {
      art.drawFishingFloat(240, 200, 1.5, false);
      art.drawFishingFloat(240, 200, -3.0, true);
    }).not.toThrow();

    expect(() => {
      art.drawFishingRod(200, 190, 222, 174, 240, 200);
    }).not.toThrow();

    expect(mockRenderer.drawCircle).toHaveBeenCalled();
    expect(mockRenderer.drawLine).toHaveBeenCalled();
  });
});
