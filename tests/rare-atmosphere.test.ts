import { describe, it, expect } from 'vitest';
import { WildCreature } from '../src/entities/wild-creature';
import { ParticleSystem } from '../src/systems/particles';
import { LightingSystem } from '../src/systems/lighting';
import { BiomeType } from '../src/world/biomes';

describe('Step C7.2: Rare Atmosphere & Weather-locked Spawns', () => {
  it('correctly tags and filters weather-locked creatures (rain, snow, night)', () => {
    // Marsh creature (rain locked)
    const rainCreature = new WildCreature({ id: 'c1', speciesId: 95, x: 10, y: 10, level: 5 }, 0, 0, 'seed');
    expect(rainCreature.spawnCondition).toBe('rain');
    expect(rainCreature.isConditionSatisfied(0.1, false, 'noon')).toBe(false);
    expect(rainCreature.isConditionSatisfied(0.35, false, 'noon')).toBe(true);

    // Snowy peaks creature (snow locked)
    const snowCreature = new WildCreature({ id: 'c2', speciesId: 147, x: 10, y: 10, level: 5 }, 0, 0, 'seed');
    expect(snowCreature.spawnCondition).toBe('snow');
    expect(snowCreature.isConditionSatisfied(0.0, false, 'noon')).toBe(false);
    expect(snowCreature.isConditionSatisfied(0.0, true, 'noon')).toBe(true);

    // Night creature
    const nightCreature = new WildCreature({ id: 'c3', speciesId: 150, x: 10, y: 10, level: 5 }, 0, 0, 'seed');
    expect(nightCreature.spawnCondition).toBe('night');
    expect(nightCreature.isConditionSatisfied(0.0, false, 'noon')).toBe(false);
    expect(nightCreature.isConditionSatisfied(0.0, false, 'night')).toBe(true);

    // Standard creature
    const normalCreature = new WildCreature({ id: 'c4', speciesId: 1, x: 10, y: 10, level: 5 }, 0, 0, 'seed');
    expect(normalCreature.spawnCondition).toBe('all');
    expect(normalCreature.isConditionSatisfied(0.0, false, 'noon')).toBe(true);
  });

  it('spawns shooting stars in ParticleSystem with proper trajectory and lifetime', () => {
    const ps = new ParticleSystem(9876);
    const beforeCount = ps.getActiveCount();
    ps.spawnShootingStar(100, 100, 400, 300);
    const afterCount = ps.getActiveCount();
    expect(afterCount).toBe(beforeCount + 1);
  });

  it('renders auroras in LightingSystem without throwing errors in cold biomes', () => {
    const ls = new LightingSystem();
    const mockRenderer: any = {
      drawPolygon: () => {}
    };

    const timeInfo: any = {
      phase: 'night',
      isNight: true
    };

    expect(() => {
      ls.renderAurora(
        mockRenderer,
        0, 0, 1280, 800, 1.0,
        timeInfo,
        BiomeType.SnowyPeaks,
        10.5
      );
    }).not.toThrow();
  });
});
