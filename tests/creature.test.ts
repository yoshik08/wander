import { describe, it, expect } from 'vitest';
import { generateCreatureGenome } from '../src/entities/creature';
import { pickSpeciesForBiome } from '../src/world/chunk';
import { BiomeType } from '../src/world/biomes';
import { PRNG } from '../src/core/prng';
import { WildCreature } from '../src/entities/wild-creature';

describe('Creature Genome & Determinism', () => {
  it('generates 150 species deterministically across runs', () => {
    const seed = 'test-meadow-seed';
    const names = new Set<string>();

    for (let id = 1; id <= 150; id++) {
      const g1 = generateCreatureGenome(seed, id);
      const g2 = generateCreatureGenome(seed, id);

      expect(g1.speciesId).toBe(id);
      expect(g1.name).toBe(g2.name);
      expect(g1.type).toBe(g2.type);
      expect(g1.archetype).toBe(g2.archetype);
      expect(g1.stats.vigor).toBe(g2.stats.vigor);
      expect(g1.stats.strike).toBe(g2.stats.strike);
      names.add(g1.name);
    }

    // Name generation should have variety
    expect(names.size).toBeGreaterThan(60);
  });

  it('correctly boosts stats and scale upon evolution (complexity 2.0)', () => {
    const seed = 'evolution-seed';
    const base = generateCreatureGenome(seed, 42, 1.0);
    const evolved = generateCreatureGenome(seed, 42, 2.0);

    expect(evolved.complexity).toBe(2.0);
    expect(evolved.scale).toBeGreaterThan(base.scale);
    expect(evolved.stats.vigor).toBeGreaterThanOrEqual(base.stats.vigor);
    expect(evolved.stats.strike).toBeGreaterThanOrEqual(base.stats.strike);
  });

  it('selects biome-appropriate species', () => {
    const rng = new PRNG(12345);
    for (let i = 0; i < 20; i++) {
      const sp = pickSpeciesForBiome(BiomeType.Meadow, rng);
      expect(sp).toBeGreaterThanOrEqual(1);
      expect(sp).toBeLessThanOrEqual(150);
    }
  });

  it('initializes wild creature with proper origin, bounds and resolve', () => {
    const inst = {
      id: 'c_0_1_0',
      speciesId: 7,
      x: 100,
      y: 120,
      level: 5
    };
    const creature = new WildCreature(inst, 0, 1, 'world-seed');
    expect(creature.id).toBe('c_0_1_0');
    expect(creature.level).toBe(5);
    expect(creature.resolve).toBe(creature.maxResolve);
    expect(creature.pos.x).toBe(100);
    expect(creature.pos.y).toBe(768 + 120);

    // Update simulation
    creature.update(0.1, 1.0, () => true);
    expect(creature.pos).toBeDefined();
  });
});
