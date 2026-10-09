import { describe, it, expect, vi } from 'vitest';
import { EasterEggSystem } from '../src/systems/easter-eggs';

describe('Step C8.1: Easter Eggs & Secret Systems', () => {
  it('initializes with correct world coordinates for Creator Camp and 10,000 Paces Milestone', () => {
    const ee = new EasterEggSystem();
    expect(ee.creatorX).toBe(-999 * 24);
    expect(ee.creatorY).toBe(-999 * 24);
    expect(ee.milestoneDist).toBe(10000 * 24);
  });

  it('triggers water sprite after clicking the same water spot 50 times', () => {
    const ee = new EasterEggSystem();
    const spriteCb = vi.fn();
    ee.onWaterSprite = spriteCb;

    // 49 clicks
    for (let i = 0; i < 49; i++) {
      ee.handleWaterClick(120, 240, true);
    }
    expect(ee.waterSprite.active).toBe(false);
    expect(spriteCb).not.toHaveBeenCalled();

    // 50th click
    ee.handleWaterClick(120, 240, true);
    expect(ee.waterSprite.active).toBe(true);
    expect(ee.waterSprite.x).toBe(120);
    expect(ee.waterSprite.y).toBe(240);
    expect(spriteCb).toHaveBeenCalledTimes(1);
  });

  it('resets water clicks if clicking outside water or too far away', () => {
    const ee = new EasterEggSystem();
    for (let i = 0; i < 20; i++) {
      ee.handleWaterClick(100, 100, true);
    }
    // Click on land
    ee.handleWaterClick(100, 100, false);
    // Click on water again
    ee.handleWaterClick(100, 100, true);
    // Needs 49 more to reach 50
    for (let i = 0; i < 48; i++) {
      ee.handleWaterClick(100, 100, true);
    }
    expect(ee.waterSprite.active).toBe(false);
  });

  it('triggers sleep pile after 10 minutes (600s) of idle stillness', () => {
    const ee = new EasterEggSystem();
    const sleepCb = vi.fn();
    ee.onSleepPile = sleepCb;

    ee.update(300, false);
    expect(ee.isSleepPileActive).toBe(false);

    // Moving resets idle timer
    ee.update(1, true);
    expect(ee.idleTimer).toBe(0);

    // Full 600s
    ee.update(600, false);
    expect(ee.isSleepPileActive).toBe(true);
    expect(sleepCb).toHaveBeenCalledTimes(1);
  });

  it('updates water sprite timer and deactivates when expired', () => {
    const ee = new EasterEggSystem();
    ee.waterSprite = { active: true, x: 50, y: 50, timer: 3.5 };

    ee.update(2.0, false);
    expect(ee.waterSprite.active).toBe(true);
    expect(ee.waterSprite.timer).toBeCloseTo(1.5);

    ee.update(2.0, false);
    expect(ee.waterSprite.active).toBe(false);
  });

  it('triggers meteor shower when Konami sequence is entered', () => {
    const ee = new EasterEggSystem();
    const meteorCb = vi.fn();
    ee.onMeteorShower = meteorCb;

    // Up Up Down Down Left Right
    ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].forEach(k => ee.handleKey(k));
    expect(meteorCb).toHaveBeenCalledTimes(1);
  });
});
