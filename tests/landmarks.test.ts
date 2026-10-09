import { describe, it, expect, vi } from 'vitest';
import { LandmarkManager } from '../src/world/landmarks';
import { BiomeType } from '../src/world/biomes';
import { vec2 } from '../src/core/math';

describe('Step 8.4: Landmarks & Place Names', () => {
  it('generates exactly 20 deterministic landmarks per seed', () => {
    const lm1 = new LandmarkManager('dawn-meadow');
    expect(lm1.landmarks.length).toBe(20);

    const ids = lm1.landmarks.map(l => l.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(20);

    // Verify determinism
    const lm2 = new LandmarkManager('dawn-meadow');
    expect(lm1.landmarks[0].x).toBe(lm2.landmarks[0].x);
    expect(lm1.landmarks[0].y).toBe(lm2.landmarks[0].y);
    expect(lm1.landmarks[0].name).toBe(lm2.landmarks[0].name);

    // Different seed produces different placement
    const lm3 = new LandmarkManager('night-forest');
    expect(lm3.landmarks[0].x !== lm1.landmarks[0].x || lm3.landmarks[0].y !== lm1.landmarks[0].y).toBe(true);
  });

  it('generates poetic place names and biome subtitles', () => {
    const lm = new LandmarkManager('dawn-meadow');
    const r1 = lm.getRegionInfo(0, 0, BiomeType.Meadow);
    expect(r1.name.length).toBeGreaterThan(4);
    expect(r1.subtitle).toBe('Gentle rolling pastures and singing breezes');

    const r2 = lm.getRegionInfo(2000, 2000, BiomeType.PineForest);
    expect(r2.name.length).toBeGreaterThan(4);
    expect(r2.subtitle).toBe('Ancient scented evergreens and silent moss');
  });

  it('triggers onRegionEnter when player enters a new region', () => {
    const lm = new LandmarkManager('dawn-meadow');
    const enteredRegions: string[] = [];

    lm.onRegionEnter = (name, subtitle) => {
      enteredRegions.push(name);
    };

    lm.update(vec2(100, 100), BiomeType.Meadow);
    expect(enteredRegions.length).toBe(1);

    // Staying in same region does not re-trigger
    lm.update(vec2(150, 150), BiomeType.Meadow);
    expect(enteredRegions.length).toBe(1);

    // Crossing into another region grid triggers callback
    lm.update(vec2(3000, 3000), BiomeType.AutumnMaple);
    expect(enteredRegions.length).toBe(2);
  });

  it('triggers onLandmarkDiscovered on proximity and tracks discovered count', () => {
    const lm = new LandmarkManager('dawn-meadow');
    expect(lm.getDiscoveredCount()).toBe(0);

    const target = lm.landmarks[0];
    const discoveredList: string[] = [];

    lm.onLandmarkDiscovered = (landmark) => {
      discoveredList.push(landmark.id);
    };

    // Approach landmark within discovery radius
    lm.update(vec2(target.x, target.y), BiomeType.Meadow);

    expect(target.discovered).toBe(true);
    expect(discoveredList).toContain(target.id);
    expect(lm.getDiscoveredCount()).toBe(1);

    // Moving near it again does not re-trigger
    lm.update(vec2(target.x + 2, target.y + 2), BiomeType.Meadow);
    expect(discoveredList.length).toBe(1);
  });

  it('restores discovered state via syncSavedLandmarks', () => {
    const lm = new LandmarkManager('dawn-meadow');
    expect(lm.getDiscoveredCount()).toBe(0);

    lm.syncSavedLandmarks(['landmark_0', 'landmark_5', 'landmark_12']);
    expect(lm.getDiscoveredCount()).toBe(3);
    expect(lm.landmarks[0].discovered).toBe(true);
    expect(lm.landmarks[5].discovered).toBe(true);
    expect(lm.landmarks[12].discovered).toBe(true);
    expect(lm.landmarks[1].discovered).toBe(false);
  });
});
