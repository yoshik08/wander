import { describe, it, expect } from 'vitest';
import { GardenSystem, SEED_TYPES } from '../src/world/garden';
import { vec2 } from '../src/core/math';

describe('Step 8.5: Garden Plot System', () => {
  it('initializes with 4 empty garden plot slots near spawn', () => {
    const garden = new GardenSystem();
    expect(garden.slots.length).toBe(4);
    expect(garden.pos.x).toBeCloseTo(448, 1);
    expect(garden.pos.y).toBeCloseTo(432, 1);

    for (const slot of garden.slots) {
      expect(slot.stage).toBe('empty');
      expect(slot.growth).toBe(0);
    }
  });

  it('detects nearest plot slot within proximity radius', () => {
    const garden = new GardenSystem();
    const slot0Pos = garden.getSlotWorldPos(garden.slots[0]);

    // Near slot 0
    const near = garden.getClosestSlot(vec2(slot0Pos.x + 4, slot0Pos.y + 4), 32);
    expect(near).toBeDefined();
    expect(near!.id).toBe(0);

    // Far from garden
    const far = garden.getClosestSlot(vec2(2000, 2000), 32);
    expect(far).toBeNull();
  });

  it('plants seeds and initializes sprout stage', () => {
    const garden = new GardenSystem();
    const success = garden.plantSeed(0, 'cherry_petal');
    expect(success).toBe(true);

    const slot0 = garden.slots[0];
    expect(slot0.stage).toBe('sprout');
    expect(slot0.plantName).toBe('Cherry Blossom');
    expect(slot0.flowerColor).toBe('#F06292');
    expect(slot0.growth).toBeGreaterThan(0);

    // Cannot plant into already occupied slot
    const failure = garden.plantSeed(0, 'acorn');
    expect(failure).toBe(false);
  });

  it('watering advances growth and stages', () => {
    const garden = new GardenSystem();
    garden.plantSeed(1, 'acorn');
    const slot1 = garden.slots[1];
    expect(slot1.stage).toBe('sprout');

    // Water once -> advances toward growing
    garden.waterSlot(1);
    expect(slot1.growth).toBeGreaterThanOrEqual(0.40);
    expect(slot1.stage).toBe('growing');

    // Water again -> advances toward blooming
    garden.waterSlot(1);
    garden.waterSlot(1);
    expect(slot1.growth).toBeGreaterThanOrEqual(0.85);
    expect(slot1.stage).toBe('blooming');
  });

  it('simulates growth over time and accelerates in rain', () => {
    const gardenDry = new GardenSystem();
    gardenDry.plantSeed(0, 'wild_clover');
    gardenDry.update(20, false); // 20 seconds dry

    const gardenRain = new GardenSystem();
    gardenRain.plantSeed(0, 'wild_clover');
    gardenRain.update(20, true); // 20 seconds rain

    expect(gardenRain.slots[0].growth).toBeGreaterThan(gardenDry.slots[0].growth);
  });

  it('serializes and deserializes garden state cleanly', () => {
    const garden = new GardenSystem();
    garden.plantSeed(0, 'amber_leaf');
    garden.waterSlot(0);
    garden.plantSeed(2, 'glowing_spore');

    const savedData = garden.save();
    expect(savedData.length).toBe(4);

    const newGarden = new GardenSystem();
    newGarden.load(savedData);

    expect(newGarden.slots[0].seedType).toBe('amber_leaf');
    expect(newGarden.slots[0].growth).toBeCloseTo(garden.slots[0].growth);
    expect(newGarden.slots[2].seedType).toBe('glowing_spore');
    expect(newGarden.slots[1].stage).toBe('empty');
  });
});
