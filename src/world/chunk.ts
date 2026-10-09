import { SimplexNoise } from './noise';
import { getBiome, BiomeType } from './biome';

export const CHUNK_SIZE = 32; // tiles per chunk side
export const TILE_SIZE = 16;  // pixels per tile

export interface ChunkData {
  heightMap: number[][]; // elevation per tile (-1 to 1)
  biomeMap: BiomeType[][]; // biome per tile
  propMap: string[][];     // prop type per tile (empty string for none)
  propVariantMap?: number[][]; // subtype variant (e.g., flower color 0-4)
}

// Simple deterministic integer hash function
function tileHash(x: number, y: number, seed: number): number {
  let h = (seed ^ (x * 374761393) ^ (y * 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class Chunk {
  chunkX: number;
  chunkY: number;
  data: ChunkData;
  private seed: number;
  private noise: SimplexNoise;

  constructor(chunkX: number, chunkY: number, seed: number) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.seed = seed;
    // Shared noise based on world seed so noise is continuous across chunk boundaries
    this.noise = new SimplexNoise(seed);
    this.data = this.generateChunk();
  }

  private generateChunk(): ChunkData {
    const heightMap: number[][] = [];
    const biomeMap: BiomeType[][] = [];
    const propMap: string[][] = [];
    const propVariantMap: number[][] = [];

    // Macro-noise frequencies for smooth, expansive biomes
    const macroFreq = 0.0015;

    for (let y = 0; y < CHUNK_SIZE; y++) {
      const heightRow: number[] = [];
      const biomeRow: BiomeType[] = [];
      const propRow: string[] = [];
      const variantRow: number[] = [];

      for (let x = 0; x < CHUNK_SIZE; x++) {
        const tileX = this.chunkX * CHUNK_SIZE + x;
        const tileY = this.chunkY * CHUNK_SIZE + y;
        const worldX = tileX * TILE_SIZE;
        const worldY = tileY * TILE_SIZE;

        // Distance from spawn center (0, 0)
        const distFromSpawn = Math.sqrt(worldX * worldX + worldY * worldY);

        // Continuous winding stream passing near spawn (around x = 130..170)
        const streamCenterX = 150 + Math.sin(worldY * 0.007) * 45 + Math.sin(worldY * 0.02) * 15;
        const distToStream = Math.abs(worldX - streamCenterX);
        const streamWaterHalfWidth = 24; // ~3 tiles wide
        const streamBankHalfWidth = 40;  // riverbank zone

        let elevation = 0;
        let biome: BiomeType = BiomeType.Meadow;
        let prop = '';
        let propVariant = 0;

        const tileRnd = tileHash(tileX, tileY, this.seed);

        if (distToStream < streamWaterHalfWidth) {
          // Inside the stream
          biome = BiomeType.StreamLake;
          elevation = -0.4;
          // Occasional water lily
          if (tileRnd < 0.08) {
            prop = 'lily';
          }
        } else if (distToStream < streamBankHalfWidth) {
          // Riverbank transition
          biome = BiomeType.Meadow;
          elevation = 0.05;
          if (tileRnd < 0.25) {
            prop = 'reed';
          } else if (tileRnd < 0.35) {
            prop = 'rock';
          } else if (tileRnd < 0.55) {
            prop = 'grass';
          }
        } else {
          // Normal terrain
          if (distFromSpawn < 1200) {
            // Sunny Meadow spawn region
            biome = BiomeType.Meadow;
            elevation = 0.2 + this.noise.noise2D(worldX * 0.001, worldY * 0.001) * 0.1;
          } else {
            // General world generation outside spawn region
            elevation = this.noise.noise2D(worldX * macroFreq, worldY * macroFreq);
            const moisture = this.noise.noise2D(worldX * macroFreq + 500, worldY * macroFreq + 500) * 0.5 + 0.5;
            const temperature = this.noise.noise2D(worldX * macroFreq + 1200, worldY * macroFreq + 1200) * 0.5 + 0.5;
            biome = getBiome(elevation, moisture, temperature);
          }

          // Props for meadow and other biomes
          if (biome === BiomeType.Meadow) {
            // Keep immediate spawn point clear of obstacles
            if (distFromSpawn < 40) {
              if (tileRnd < 0.3) prop = 'grass';
            } else {
              if (tileRnd < 0.05) {
                // Trees: naturally spaced
                prop = 'tree';
              } else if (tileRnd < 0.20) {
                // Wildflowers! Pick flower variant 0-4
                prop = 'flower';
                propVariant = Math.floor(tileHash(tileX + 7, tileY + 13, this.seed) * 5);
              } else if (tileRnd < 0.45) {
                // Grass tufts / clovers
                prop = 'grass';
              } else if (tileRnd < 0.47) {
                prop = 'log';
              } else if (tileRnd < 0.50) {
                prop = 'rock';
              }
            }
          } else if (biome === BiomeType.PineForest) {
            if (tileRnd < 0.12) prop = 'pine';
            else if (tileRnd < 0.22) prop = 'fern';
            else if (tileRnd < 0.26) prop = 'mushroom';
            else if (tileRnd < 0.28) prop = 'log';
          } else if (biome === BiomeType.CherryBlossom) {
            if (tileRnd < 0.08) prop = 'cherryTree';
            else if (tileRnd < 0.20) prop = 'flower';
            else if (tileRnd < 0.35) prop = 'grass';
          } else if (biome === BiomeType.HillsCliffs) {
            if (tileRnd < 0.15) prop = 'rock';
            else if (tileRnd < 0.22) prop = 'sparseTree';
          }
        }

        heightRow.push(elevation);
        biomeRow.push(biome);
        propRow.push(prop);
        variantRow.push(propVariant);
      }

      heightMap.push(heightRow);
      biomeMap.push(biomeRow);
      propMap.push(propRow);
      propVariantMap.push(variantRow);
    }

    return {
      heightMap,
      biomeMap,
      propMap,
      propVariantMap
    };
  }
}