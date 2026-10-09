import { SimplexNoise } from './noise';
import { getBiome, BiomeType, Biome } from './biome';

export const CHUNK_SIZE = 32; // tiles
export const TILE_SIZE = 16; // pixels (logical)

export interface ChunkData {
  heightMap: number[][]; // elevation per tile (normalized -1 to 1)
  biomeMap: BiomeType[][]; // biome per tile
  propMap: string[][]; // prop type per tile (empty string for none)
  // We'll also store moisture and temperature for debugging if needed
}

export class Chunk {
  chunkX: number; // chunk coordinate in chunk space
  chunkY: number;
  data: ChunkData;
  private noise: SimplexNoise;

  constructor(chunkX: number, chunkY: number, seed: number) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    // Create a noise instance with a seed derived from the main seed and chunk position
    this.noise = new SimplexNoise(seed + chunkX * 10000 + chunkY * 1000);
    this.data = this.generateChunk();
  }

  private generateChunk(): ChunkData {
    const heightMap: number[][] = [];
    const biomeMap: BiomeType[][] = [];
    const propMap: string[][] = [];

    // We'll sample noise at a higher frequency for details
    const freq = 0.1;
    const amp = 1.0;

    for (let y = 0; y < CHUNK_SIZE; y++) {
      const heightRow: number[] = [];
      const biomeRow: BiomeType[] = [];
      const propRow: string[] = [];
      for (let x = 0; x < CHUNK_SIZE; x++) {
        // World position for this tile
        const worldX = (this.chunkX * CHUNK_SIZE + x) * TILE_SIZE;
        const worldY = (this.chunkY * CHUNK_SIZE + y) * TILE_SIZE;

        // Sample elevation noise
        const elevation = this.noise.noise2D(worldX * freq, worldY * freq) * amp;
        // Sample moisture and temperature
        const moisture = this.noise.noise2D(worldX * freq + 1000, worldY * freq + 1000) * 0.5 + 0.5; // 0 to 1
        const temperature = this.noise.noise2D(worldX * freq + 2000, worldY * freq + 2000) * 0.5 + 0.5; // 0 to 1

        heightRow.push(elevation);
        const biome = getBiome(elevation, moisture, temperature);
        biomeRow.push(biome);

        // Place props based on biome and some noise
        const prop = this.placeProp(biome, worldX, worldY);
        propRow.push(prop);
      }
      heightMap.push(heightRow);
      biomeMap.push(biomeRow);
      propMap.push(propRow);
    }

    // Apply river carver (simple: carve a river based on low elevation and moisture)
    this.carveRivers(heightMap, biomeMap, propMap);

    return {
      heightMap,
      biomeMap,
      propMap
    };
  }

  private placeProp(biome: BiomeType, worldX: number, worldY: number): string {
    // Use noise to determine if we place a prop and what type
    const noiseVal = this.noise.noise2D(worldX * 0.5, worldY * 0.5);
    const threshold = 0.7; // only place props in some areas
    if (noiseVal < threshold) {
      return '';
    }
    // Choose a prop based on biome
    const biomeData: Biome = (() => {
      switch (biome) {
        case BiomeType.Ocean: return {type: BiomeType.Ocean, name: '', groundColor: '', props: [], ambientSound: '', colorMultiplier: [0,0,0]} as Biome;
        case BiomeType.Beach: return {type: BiomeType.Beach, name: '', groundColor: '', props: ['shell', 'driftwood'], ambientSound: '', colorMultiplier: [0,0,0]} as Biome;
        case BiomeType.Meadow: return {type: BiomeType.Meadow, name: '', groundColor: '', props: ['grass', 'flower', 'tree'], ambientSound: '', colorMultiplier: [0,0,0]} as Biome;
        case BiomeType.PineForest: return {type: BiomeType.PineForest, name: '', groundColor: '', props: ['pine', 'fern', 'log', 'mushroom'], ambientSound: '', colorMultiplier: [0,0,0]} as Biome;
        case BiomeType.StreamLake: return {type: BiomeType.StreamLake, name: '', groundColor: '', props: ['reed', 'lily', 'rock'], ambientSound: '', colorMultiplier: [0,0,0]} as Biome;
        case BiomeType.CherryBlossom: return {type: BiomeType.CherryBlossom, name: '', groundColor: '', props: ['cherryTree', 'petal'], ambientSound: '', colorMultiplier: [0,0,0]} as Biome;
        case BiomeType.HillsCliffs: return {type: BiomeType.HillsCliffs, name: '', groundColor: '', props: ['rock', 'stone', 'sparseTree'], ambientSound: '', colorMultiplier: [0,0,0]} as Biome;
        case BiomeType.SnowyPeaks: return {type: BiomeType.SnowyPeaks, name: '', groundColor: '', props: ['snow', 'ice'], ambientSound: '', colorMultiplier: [0,0,0]} as Biome;
        case BiomeType.SecretGlade: return {type: BiomeType.SecretGlade, name: '', groundColor: '', props: ['firefly', 'stone', 'grass'], ambientSound: '', colorMultiplier: [0,0,0]} as Biome;
      }
    })();
    const props = biomeData.props;
    if (props.length === 0) {
      return '';
    }
    const propIndex = Math.floor(this.noise.noise2D(worldX * 0.3, worldY * 0.3) * 0.5 + 0.5 * props.length);
    return props[propIndex];
  }

  private carveRivers(heightMap: number[][], biomeMap: BiomeType[][], propMap: string[][]) {
    // Simple river carver: find a path from high elevation to low elevation? We'll just carve a river where elevation is low and moisture is high.
    // We'll do a simple pass: if elevation < -0.2 and moisture > 0.7, set biome to StreamLake and clear props.
    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const elevation = heightMap[y][x];
        // We need moisture and temperature, but we don't have them stored. We'll approximate: if elevation is low and we are near water?
        // We'll skip for now and just use elevation.
        if (elevation < -0.2) {
          biomeMap[y][x] = BiomeType.StreamLake;
          propMap[y][x] = ''; // clear props in river
        }
      }
    }
  }
}