import { describe, it, expect } from 'vitest';
import { TimeSystem, Season } from '../src/systems/time';
import { ArtToolkit } from '../src/render/art';
import { vec2 } from '../src/core/math';

describe('Step 6.3: Four Advancing Seasons', () => {
  it('correctly cycles through 4 seasons every 2 in-game days', () => {
    // 240 seconds per day to speed up test progression
    const ts = new TimeSystem(0.0, 240);
    
    // Day 0: Spring
    expect(ts.getSeasonInfo().season).toBe('spring');
    expect(ts.getSeasonInfo().dayInSeason).toBe(1);

    // Advance 1 in-game day (24 hours) -> Day 1 (still Spring)
    ts.totalDays = 1.0;
    ts.currentHour = 0.0;
    expect(ts.getSeasonInfo().season).toBe('spring');
    expect(ts.getSeasonInfo().dayInSeason).toBe(2);

    // Advance to Day 2 -> Summer
    ts.totalDays = 2.0;
    expect(ts.getSeasonInfo().season).toBe('summer');
    expect(ts.getSeasonInfo().dayInSeason).toBe(1);

    // Advance to Day 4 -> Autumn
    ts.totalDays = 4.0;
    expect(ts.getSeasonInfo().season).toBe('autumn');
    expect(ts.getSeasonInfo().name).toBe('Autumn');

    // Advance to Day 6 -> Winter
    ts.totalDays = 6.0;
    expect(ts.getSeasonInfo().season).toBe('winter');
    expect(ts.getSeasonInfo().name).toBe('Winter');

    // Advance to Day 8 -> Back to Spring
    ts.totalDays = 8.0;
    expect(ts.getSeasonInfo().season).toBe('spring');
  });

  it('provides distinct seasonal ambient tints', () => {
    const ts = new TimeSystem(8.0);
    
    ts.totalDays = 0; // Spring
    const springTint = ts.getSeasonInfo().ambientTint;

    ts.totalDays = 4; // Autumn
    const autumnTint = ts.getSeasonInfo().ambientTint;

    ts.totalDays = 6; // Winter
    const winterTint = ts.getSeasonInfo().ambientTint;

    expect(autumnTint.r).toBeGreaterThan(winterTint.r);
    expect(winterTint.b).toBeGreaterThan(autumnTint.b);
  });

  it('renders seasonal tree variants in ArtToolkit across all 4 seasons', () => {
    const mockRenderer: any = {
      drawDropShadow: () => {},
      drawRect: () => {},
      drawCircle: () => {},
      drawPolygon: () => {}
    };
    const art = new ArtToolkit(mockRenderer);

    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    seasons.forEach(s => {
      art.setSeason(s);
      expect(art.season).toBe(s);

      // Oak (0) and Pine (1)
      expect(() => art.drawPaintedTree(100, 200, 1.0, vec2(0, 0), 0)).not.toThrow();
      expect(() => art.drawPaintedTree(100, 200, 1.0, vec2(0, 0), 1)).not.toThrow();
      // Birch
      expect(() => art.drawBirchTree(150, 200, 1.0, vec2(0, 0))).not.toThrow();
    });
  });
});
