import { BiomeType, classifyBiome } from './biomes';
import { SimplexNoise } from './noise';
import { PRNG, hashSeed } from '../core/prng';

export const CHUNK_TILES = 32;
export const TILE_SIZE = 24; // 24x24 pixels per tile
export const CHUNK_PIXEL_SIZE = CHUNK_TILES * TILE_SIZE; // 768 pixels

export interface ChunkProp {
  type: string;
  x: number;      // local pixel offset in chunk (0 to 768)
  y: number;      // local pixel offset in chunk (0 to 768)
  baseY: number;  // absolute world Y for depth sorting
  variant: number;
}

export interface ChunkBufferData {
  chunkX: number;
  chunkY: number;
  elevation: Float32Array; // 1024 floats
  moisture: Float32Array;  // 1024 floats
  temperature: Float32Array;// 1024 floats
  biome: Uint8Array;       // 1024 bytes
  flowDirX: Float32Array;  // 1024 floats (river flow vector X)
  flowDirY: Float32Array;  // 1024 floats (river flow vector Y)
  collision: Uint8Array;   // 1024 bytes (0 = walkable, 1 = solid)
  props: ChunkProp[];
}

export class Chunk {
  readonly chunkX: number;
  readonly chunkY: number;
  data: ChunkBufferData;

  constructor(chunkX: number, chunkY: number, data: ChunkBufferData) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.data = data;
  }

  isSolid(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileX >= CHUNK_TILES || tileY < 0 || tileY >= CHUNK_TILES) {
      return false;
    }
    return this.data.collision[tileY * CHUNK_TILES + tileX] === 1;
  }
}

/**
 * Pure deterministic generator for a single chunk.
 * Can run either in Web Worker or synchronously on main thread for spawn chunks.
 */
export function generateChunkData(chunkX: number, chunkY: number, rawSeed: number | string): ChunkBufferData {
  const seedNum = hashSeed(rawSeed);

  // Independent noise generators per climate channel
  const elevNoise = new SimplexNoise(seedNum ^ 0x1a2b3c);
  const moistNoise = new SimplexNoise(seedNum ^ 0x4d5e6f);
  const tempNoise = new SimplexNoise(seedNum ^ 0x7a8b9c);
  const erosionNoise = new SimplexNoise(seedNum ^ 0x9e8d7c);
  const warpNoise = new SimplexNoise(seedNum ^ 0x3f2e1d);

  const totalTiles = CHUNK_TILES * CHUNK_TILES;
  const elevation = new Float32Array(totalTiles);
  const moisture = new Float32Array(totalTiles);
  const temperature = new Float32Array(totalTiles);
  const biome = new Uint8Array(totalTiles);
  const flowDirX = new Float32Array(totalTiles);
  const flowDirY = new Float32Array(totalTiles);
  const collision = new Uint8Array(totalTiles);
  const props: ChunkProp[] = [];

  const macroScale = 0.0007; // Broad biomes across hundreds of tiles
  const riverScale = 0.0022; // Winding rivers and valleys

  for (let ty = 0; ty < CHUNK_TILES; ty++) {
    for (let tx = 0; tx < CHUNK_TILES; tx++) {
      const idx = ty * CHUNK_TILES + tx;
      const worldTileX = chunkX * CHUNK_TILES + tx;
      const worldTileY = chunkY * CHUNK_TILES + ty;
      const worldX = worldTileX * TILE_SIZE;
      const worldY = worldTileY * TILE_SIZE;

      // 1. Continental Domain Warping
      const warpX = warpNoise.noise2D(worldX * 0.0012, worldY * 0.0012) * 80.0;
      const warpY = warpNoise.noise2D((worldX + 31.4) * 0.0012, (worldY + 17.8) * 0.0012) * 80.0;
      const px = worldX + warpX;
      const py = worldY + warpY;

      // 2. Base Climate Channels
      let elev = elevNoise.fbm2D(px * macroScale, py * macroScale, 4, 2.0, 0.5);
      const moist = moistNoise.fbm2D((px + 500) * macroScale, (py + 500) * macroScale, 3, 2.0, 0.5) * 0.5 + 0.5;
      const temp = tempNoise.fbm2D((px + 1200) * macroScale, (py + 1200) * macroScale, 3, 2.0, 0.5) * 0.5 + 0.5;
      const erosion = erosionNoise.fbm2D(px * macroScale * 1.5, py * macroScale * 1.5, 3) * 0.5 + 0.5;

      // 3. Hydrology: Downhill Rivers & Stream Carver
      // Distance to river spine
      const riverVal = Math.abs(elevNoise.noise2D(px * riverScale, py * riverScale));
      const isRiver = riverVal < 0.045 && elev > -0.3;

      // Calculate downhill slope gradient for flow vectors
      const eps = 4.0;
      const hL = elevNoise.noise2D((px - eps) * riverScale, py * riverScale);
      const hR = elevNoise.noise2D((px + eps) * riverScale, py * riverScale);
      const hU = elevNoise.noise2D(px * riverScale, (py - eps) * riverScale);
      const hD = elevNoise.noise2D(px * riverScale, (py + eps) * riverScale);

      // Downhill gradient (negative slope)
      let fx = -(hR - hL);
      let fy = -(hD - hU);
      const fLen = Math.hypot(fx, fy) || 0.001;
      fx /= fLen;
      fy /= fLen;

      if (isRiver) {
        elev = -0.42; // Riverbed water level
      }

      // Guarantee open clearing around spawn (0, 0)
      const distFromOrigin = Math.hypot(worldX, worldY);
      if (distFromOrigin < 120) {
        elev = 0.25; // Gentle meadow
      }

      elevation[idx] = elev;
      moisture[idx] = moist;
      temperature[idx] = temp;
      flowDirX[idx] = fx;
      flowDirY[idx] = fy;

      // Classify Biome
      let bType = isRiver ? BiomeType.LakesRivers : classifyBiome(elev, moist, temp, erosion);
      // Spawn is always guaranteed to be Sunny Meadow
      if (distFromOrigin < 400 && !isRiver) {
        bType = BiomeType.Meadow;
      }
      biome[idx] = bType;

      // Collision: Deep water and shear cliffs are impassable by default
      if (elev < -0.35 || elev > 0.82) {
        collision[idx] = 1; // Solid / Water barrier
      } else {
        collision[idx] = 0; // Walkable
      }
    }
  }

  // 4. Procedural Props with Traversability Preservation
  const propRng = new PRNG(seedNum ^ (chunkX * 73856093) ^ (chunkY * 19349663));

  for (let ty = 1; ty < CHUNK_TILES - 1; ty += 2) {
    for (let tx = 1; tx < CHUNK_TILES - 1; tx += 2) {
      const idx = ty * CHUNK_TILES + tx;
      const bType = biome[idx] as BiomeType;
      const elev = elevation[idx];
      const isWater = elev < -0.35;

      const worldX = (chunkX * CHUNK_TILES + tx) * TILE_SIZE + 12;
      const worldY = (chunkY * CHUNK_TILES + ty) * TILE_SIZE + 12;
      const distFromSpawn = Math.hypot(worldX, worldY);

      // Do not place solid props inside spawn clearing
      if (distFromSpawn < 60) continue;

      const chance = propRng.next();

      if (isWater) {
        // Water props (floating lilies, reeds near banks)
        if (chance < 0.08) {
          props.push({
            type: 'lily_pad',
            x: tx * TILE_SIZE + propRng.range(2, 14),
            y: ty * TILE_SIZE + propRng.range(2, 14),
            baseY: worldY,
            variant: propRng.rangeInt(0, 2)
          });
        }
      } else if (bType === BiomeType.Meadow || bType === BiomeType.WildflowerFields) {
        if (chance < 0.06 && distFromSpawn > 70) {
          // Tree (Solid trunk)
          props.push({
            type: 'oak_tree',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 12,
            variant: propRng.rangeInt(0, 2)
          });
          collision[idx] = 1; // Block trunk tile
        } else if (chance < 0.32) {
          // Flowers (Non-solid, pickable)
          props.push({
            type: 'flower',
            x: tx * TILE_SIZE + propRng.range(4, 18),
            y: ty * TILE_SIZE + propRng.range(4, 18),
            baseY: worldY + 8,
            variant: propRng.rangeInt(0, 4)
          });
        } else if (chance < 0.36) {
          // Log to sit on
          props.push({
            type: 'log',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 10,
            variant: 0
          });
        } else if (chance < 0.40) {
          // River pebble / smooth rock
          props.push({
            type: 'rock',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 8,
            variant: 0
          });
        }
      } else if (bType === BiomeType.PineForest) {
        if (chance < 0.12 && distFromSpawn > 70) {
          props.push({
            type: 'pine_tree',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 14,
            variant: propRng.rangeInt(0, 2)
          });
          collision[idx] = 1;
        } else if (chance < 0.22) {
          props.push({
            type: 'fern',
            x: tx * TILE_SIZE + 10,
            y: ty * TILE_SIZE + 10,
            baseY: worldY + 8,
            variant: 0
          });
        }
      } else if (bType === BiomeType.BirchGrove) {
        if (chance < 0.08 && distFromSpawn > 70) {
          props.push({
            type: 'birch_tree',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 12,
            variant: propRng.rangeInt(0, 1)
          });
          collision[idx] = 1;
        }
      }
    }
  }

  // 5. Traversability Guarantee (Flood Fill check & Bridge Fix)
  // Ensure that every chunk maintains a walkable path connecting its 4 boundary edges
  ensureChunkTraversability(collision);

  return {
    chunkX,
    chunkY,
    elevation,
    moisture,
    temperature,
    biome,
    flowDirX,
    flowDirY,
    collision,
    props
  };
}

/**
 * Ensures a traversable corridor exists across the chunk so the player is never trapped.
 */
function ensureChunkTraversability(collision: Uint8Array): void {
  // Carve a guaranteed 2-tile walkable cross through center of chunk
  const mid = Math.floor(CHUNK_TILES / 2);
  for (let i = 0; i < CHUNK_TILES; i++) {
    collision[mid * CHUNK_TILES + i] = 0;
    collision[(mid + 1) * CHUNK_TILES + i] = 0;
    collision[i * CHUNK_TILES + mid] = 0;
    collision[i * CHUNK_TILES + (mid + 1)] = 0;
  }
}
