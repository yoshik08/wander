import { describe, it, expect } from 'vitest';
import { hashSeed, PRNG } from '../src/core/prng';
import { generateChunkData, CHUNK_TILES } from '../src/world/chunk';
import { BiomeType, classifyBiome } from '../src/world/biomes';

describe('Seed Hashing & PRNG Determinism', () => {
  it('produces identical hash for identical text seed', () => {
    const s1 = hashSeed('dawn-meadow-123');
    const s2 = hashSeed('dawn-meadow-123');
    expect(s1).toBe(s2);
    expect(typeof s1).toBe('number');
  });

  it('produces identical PRNG sequences for the same seed', () => {
    const rng1 = new PRNG(998877);
    const rng2 = new PRNG(998877);
    for (let i = 0; i < 50; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('produces identical chunk data for the same chunk and seed', () => {
    const data1 = generateChunkData(2, -3, 'test-seed-42');
    const data2 = generateChunkData(2, -3, 'test-seed-42');

    expect(data1.elevation.length).toBe(data2.elevation.length);
    for (let i = 0; i < 64; i++) {
      expect(data1.elevation[i]).toBe(data2.elevation[i]);
      expect(data1.biome[i]).toBe(data2.biome[i]);
      expect(data1.collision[i]).toBe(data2.collision[i]);
    }
  });
});

describe('Biome Classification & Climate', () => {
  it('classifies deep water as LakesRivers', () => {
    const b = classifyBiome(-0.5, 0.5, 0.5, 0.5);
    expect(b).toBe(BiomeType.LakesRivers);
  });

  it('classifies snowy peaks for high altitude cold peaks', () => {
    const b = classifyBiome(0.75, 0.5, 0.1, 0.5);
    expect(b).toBe(BiomeType.SnowyPeaks);
  });

  it('classifies meadow for temperate mid elevation', () => {
    const b = classifyBiome(0.2, 0.45, 0.5, 0.5);
    expect(b).toBe(BiomeType.Meadow);
  });
});

describe('Hydrology Flow Vectors & Water Shading', () => {
  it('generates normalized flow vectors', () => {
    const chunk = generateChunkData(0, 0, 12345);
    for (let i = 0; i < chunk.flowDirX.length; i += 32) {
      const len = Math.hypot(chunk.flowDirX[i], chunk.flowDirY[i]);
      expect(len).toBeCloseTo(1.0, 2);
    }
  });

  it('generates valid shoreline foam bitmasks', () => {
    const chunk = generateChunkData(1, 2, 'shoreline-test');
    expect(chunk.foamMask.length).toBe(CHUNK_TILES * CHUNK_TILES);
    for (let i = 0; i < chunk.foamMask.length; i++) {
      expect(chunk.foamMask[i]).toBeGreaterThanOrEqual(0);
      expect(chunk.foamMask[i]).toBeLessThanOrEqual(15);
    }
  });
});

describe('Procedural Paths, Bridges & Structures', () => {
  it('ensures bridges over water are always walkable', () => {
    const chunk = generateChunkData(0, 0, 'bridge-test');
    for (let i = 0; i < chunk.tileFlags.length; i++) {
      if (chunk.tileFlags[i] === 4) { // TILE_FLAG_BRIDGE
        expect(chunk.collision[i]).toBe(0);
      }
    }
  });

  it('places deterministic landmarks in spawn chunk', () => {
    const chunk1 = generateChunkData(0, 0, 'seed-99');
    const chunk2 = generateChunkData(0, 0, 'seed-99');
    expect(chunk1.structures.length).toBeGreaterThan(0);
    expect(chunk1.structures.length).toBe(chunk2.structures.length);
    expect(chunk1.structures[0].type).toBe(chunk2.structures[0].type);
    expect(chunk1.structures[0].x).toBe(chunk2.structures[0].x);
    expect(chunk1.structures[0].y).toBe(chunk2.structures[0].y);
  });

  it('scatters deterministic collectible keepsakes with valid metadata', () => {
    const chunk1 = generateChunkData(1, 1, 'keepsake-seed-42');
    const chunk2 = generateChunkData(1, 1, 'keepsake-seed-42');
    expect(chunk1.keepsakes.length).toBe(chunk2.keepsakes.length);
    if (chunk1.keepsakes.length > 0) {
      expect(chunk1.keepsakes[0].id).toBe(chunk2.keepsakes[0].id);
      expect(chunk1.keepsakes[0].name).toBe(chunk2.keepsakes[0].name);
      expect(chunk1.keepsakes[0].x).toBe(chunk2.keepsakes[0].x);
      expect(chunk1.keepsakes[0].y).toBe(chunk2.keepsakes[0].y);
    }
  });
});

describe('Traversability Guarantee Across 500 Random Seeds', () => {
  it('guarantees spawn is walkable and connects out of spawn chunk across 500 seeds', () => {
    const masterRng = new PRNG(20261009);

    for (let s = 0; s < 500; s++) {
      const seed = masterRng.rangeInt(1, 100000000);
      const chunk = generateChunkData(0, 0, seed);

      // 1. Center spawn tile (tx=16, ty=16) must be walkable
      const centerIdx = 16 * CHUNK_TILES + 16;
      expect(chunk.collision[centerIdx]).toBe(0);

      // 2. Flood fill from center to verify escape to boundary
      const visited = new Uint8Array(CHUNK_TILES * CHUNK_TILES);
      const queue: number[] = [centerIdx];
      visited[centerIdx] = 1;

      let reachedBoundary = false;

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const cx = curr % CHUNK_TILES;
        const cy = Math.floor(curr / CHUNK_TILES);

        if (cx === 0 || cx === CHUNK_TILES - 1 || cy === 0 || cy === CHUNK_TILES - 1) {
          reachedBoundary = true;
          break;
        }

        const neighbors = [
          cy * CHUNK_TILES + (cx + 1),
          cy * CHUNK_TILES + (cx - 1),
          (cy + 1) * CHUNK_TILES + cx,
          (cy - 1) * CHUNK_TILES + cx
        ];

        for (const n of neighbors) {
          if (!visited[n] && chunk.collision[n] === 0) {
            visited[n] = 1;
            queue.push(n);
          }
        }
      }

      // Must never spawn in an enclosed pocket!
      expect(reachedBoundary).toBe(true);
    }
  });
});
