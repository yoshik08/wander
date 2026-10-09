import { BiomeType, classifyBiome } from './biomes';
import { SimplexNoise } from './noise';
import { PRNG, hashSeed } from '../core/prng';
import { generateChunkStructures, StructureInstance } from './structures';

export const CHUNK_TILES = 32;
export const TILE_SIZE = 24; // 24x24 pixels per tile
export const CHUNK_PIXEL_SIZE = CHUNK_TILES * TILE_SIZE; // 768 pixels

export const TILE_FLAG_LAND = 0;
export const TILE_FLAG_WATER = 1;
export const TILE_FLAG_PATH = 2;
export const TILE_FLAG_BRIDGE = 4;
export const TILE_FLAG_WATERFALL = 8;
export const TILE_FLAG_STEPPING_STONE = 16;

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
  tileFlags: Uint8Array;   // 1024 bytes (flags for path, water, bridge, etc.)
  foamMask: Uint8Array;    // 1024 bytes (shoreline edges bitmask)
  collision: Uint8Array;   // 1024 bytes (0 = walkable, 1 = solid)
  props: ChunkProp[];
  structures: StructureInstance[];
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
  const pathNoise = new SimplexNoise(seedNum ^ 0x5a6b7c);

  const totalTiles = CHUNK_TILES * CHUNK_TILES;
  const elevation = new Float32Array(totalTiles);
  const moisture = new Float32Array(totalTiles);
  const temperature = new Float32Array(totalTiles);
  const biome = new Uint8Array(totalTiles);
  const flowDirX = new Float32Array(totalTiles);
  const flowDirY = new Float32Array(totalTiles);
  const tileFlags = new Uint8Array(totalTiles);
  const foamMask = new Uint8Array(totalTiles);
  const collision = new Uint8Array(totalTiles);
  const props: ChunkProp[] = [];

  const macroScale = 0.0007; // Broad biomes across hundreds of tiles
  const riverScale = 0.0022; // Winding rivers and valleys
  const pathScale = 0.0016;  // Winding dirt trails

  // Helper to sample base elevation and water status at any world coord (for seamless borders)
  const sampleWaterStatus = (wx: number, wy: number) => {
    const wX = warpNoise.noise2D(wx * 0.0012, wy * 0.0012) * 80.0;
    const wY = warpNoise.noise2D((wx + 31.4) * 0.0012, (wy + 17.8) * 0.0012) * 80.0;
    const pX = wx + wX;
    const pY = wy + wY;
    const baseElev = elevNoise.fbm2D(pX * macroScale, pY * macroScale, 4, 2.0, 0.5);
    const rVal = Math.abs(elevNoise.noise2D(pX * riverScale, pY * riverScale));
    const distSpawn = Math.hypot(wx, wy);
    if (distSpawn < 120) return false; // Spawn clearing is land
    return (rVal < 0.046 && baseElev > -0.32) || baseElev < -0.35;
  };

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

      // 3. Hydrology: Downhill Rivers & Water Bodies
      const riverVal = Math.abs(elevNoise.noise2D(px * riverScale, py * riverScale));
      // Organic meandering riverbanks with subtle edge jitter
      const bankJitter = warpNoise.noise2D(px * 0.008, py * 0.008) * 0.008;
      const effectiveThreshold = 0.042 + bankJitter;
      let isRiver = riverVal < effectiveThreshold && elev > -0.32;

      // Downhill slope gradient for flow vectors
      const eps = 4.0;
      const hL = elevNoise.noise2D((px - eps) * riverScale, py * riverScale);
      const hR = elevNoise.noise2D((px + eps) * riverScale, py * riverScale);
      const hU = elevNoise.noise2D(px * riverScale, (py - eps) * riverScale);
      const hD = elevNoise.noise2D(px * riverScale, (py + eps) * riverScale);

      let fx = -(hR - hL);
      let fy = -(hD - hU);
      const fLen = Math.hypot(fx, fy) || 0.001;
      fx /= fLen;
      fy /= fLen;

      // Smoothly blend spawn clearing (0, 0) into gentle meadow
      const distFromOrigin = Math.hypot(worldX, worldY);
      if (distFromOrigin < 150) {
        const blend = Math.max(0, 1.0 - distFromOrigin / 150);
        elev = elev * (1.0 - blend) + 0.28 * blend;
        if (distFromOrigin < 90) {
          isRiver = false;
        }
      } else if (isRiver) {
        elev = -0.42; // Riverbed water level
      }

      let isWater = isRiver || elev < -0.35;

      // 4. Procedural Winding Dirt Paths
      const pathVal = Math.abs(pathNoise.noise2D(px * pathScale, py * pathScale));
      let isPath = pathVal < 0.024;

      // Connect spawn clearing to path network
      if (distFromOrigin < 160) {
        const spawnPathDist = Math.abs(worldY - Math.sin(worldX * 0.02) * 18 - 24);
        if (spawnPathDist < 16) {
          isPath = true;
        }
      }

      // Check for waterfall: water dropping across elevation drop
      let isWaterfall = false;
      if (isWater && elev < -0.35) {
        const hDownstream = elevNoise.noise2D(px + fx * 16, py + fy * 16);
        if (hDownstream < -0.15 && erosion > 0.45) {
          isWaterfall = true;
        }
      }

      // Tile Flag & Collision determination
      let flag = TILE_FLAG_LAND;
      let isSolid = 0;

      if (isWater) {
        if (isPath) {
          // Wooden bridge over water! Always walkable!
          flag = TILE_FLAG_BRIDGE;
          isSolid = 0; // Walkable!
        } else if (isRiver && riverVal > 0.038) {
          // Stepping stone near shallow stream border
          const stoneHash = Math.abs(Math.sin(worldTileX * 45.1 + worldTileY * 91.7));
          if (stoneHash < 0.18) {
            flag = TILE_FLAG_STEPPING_STONE;
            isSolid = 0; // Walkable!
          } else {
            flag = TILE_FLAG_WATER;
            isSolid = 1;
          }
        } else if (isWaterfall) {
          flag = TILE_FLAG_WATERFALL;
          isSolid = 1;
        } else {
          flag = TILE_FLAG_WATER;
          isSolid = 1;
        }
      } else {
        if (isPath) {
          flag = TILE_FLAG_PATH;
          isSolid = 0;
        } else {
          flag = TILE_FLAG_LAND;
          isSolid = (elev > 0.82) ? 1 : 0; // High sheer cliffs are solid
        }
      }

      elevation[idx] = elev;
      moisture[idx] = moist;
      temperature[idx] = temp;
      flowDirX[idx] = fx;
      flowDirY[idx] = fy;
      tileFlags[idx] = flag;
      collision[idx] = isSolid;

      // Classify Biome
      let bType = isRiver ? BiomeType.LakesRivers : classifyBiome(elev, moist, temp, erosion);
      if (distFromOrigin < 400 && !isRiver && !isWater) {
        bType = BiomeType.Meadow;
      }
      biome[idx] = bType;
    }
  }

  // 5. Shoreline Foam Bitmask (Edge detection between water and land)
  for (let ty = 0; ty < CHUNK_TILES; ty++) {
    for (let tx = 0; tx < CHUNK_TILES; tx++) {
      const idx = ty * CHUNK_TILES + tx;
      const flag = tileFlags[idx];
      const isWater = (flag === TILE_FLAG_WATER || flag === TILE_FLAG_WATERFALL);

      if (isWater) {
        const worldTileX = chunkX * CHUNK_TILES + tx;
        const worldTileY = chunkY * CHUNK_TILES + ty;

        // Check N, S, E, W neighbor tiles
        const nIsLand = (ty > 0) ? (tileFlags[(ty - 1) * CHUNK_TILES + tx] !== TILE_FLAG_WATER) : !sampleWaterStatus(worldTileX * TILE_SIZE, (worldTileY - 1) * TILE_SIZE);
        const sIsLand = (ty < CHUNK_TILES - 1) ? (tileFlags[(ty + 1) * CHUNK_TILES + tx] !== TILE_FLAG_WATER) : !sampleWaterStatus(worldTileX * TILE_SIZE, (worldTileY + 1) * TILE_SIZE);
        const eIsLand = (tx < CHUNK_TILES - 1) ? (tileFlags[ty * CHUNK_TILES + (tx + 1)] !== TILE_FLAG_WATER) : !sampleWaterStatus((worldTileX + 1) * TILE_SIZE, worldTileY * TILE_SIZE);
        const wIsLand = (tx > 0) ? (tileFlags[ty * CHUNK_TILES + (tx - 1)] !== TILE_FLAG_WATER) : !sampleWaterStatus((worldTileX - 1) * TILE_SIZE, worldTileY * TILE_SIZE);

        let mask = 0;
        if (nIsLand) mask |= 1;
        if (sIsLand) mask |= 2;
        if (eIsLand) mask |= 4;
        if (wIsLand) mask |= 8;
        foamMask[idx] = mask;
      }
    }
  }

  // 6. Generate Sparse Structures
  const structures = generateChunkStructures(
    chunkX,
    chunkY,
    seedNum,
    elevation,
    biome,
    tileFlags,
    collision
  );

  // 7. Procedural Vegetation & Props
  const propRng = new PRNG(seedNum ^ (chunkX * 73856093) ^ (chunkY * 19349663));

  for (let ty = 1; ty < CHUNK_TILES - 1; ty += 2) {
    for (let tx = 1; tx < CHUNK_TILES - 1; tx += 2) {
      const idx = ty * CHUNK_TILES + tx;
      const bType = biome[idx] as BiomeType;
      const flag = tileFlags[idx];
      const isWater = (flag === TILE_FLAG_WATER || flag === TILE_FLAG_WATERFALL);
      const isPath = (flag === TILE_FLAG_PATH || flag === TILE_FLAG_BRIDGE);

      // Never place blocking props directly on paths or bridges
      if (isPath) continue;

      const worldX = (chunkX * CHUNK_TILES + tx) * TILE_SIZE + 12;
      const worldY = (chunkY * CHUNK_TILES + ty) * TILE_SIZE + 12;
      const distFromSpawn = Math.hypot(worldX, worldY);

      if (distFromSpawn < 60) continue;

      const chance = propRng.next();

      if (isWater) {
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
          props.push({
            type: 'oak_tree',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 12,
            variant: propRng.rangeInt(0, 2)
          });
          collision[idx] = 1;
        } else if (chance < 0.32) {
          props.push({
            type: 'flower',
            x: tx * TILE_SIZE + propRng.range(4, 18),
            y: ty * TILE_SIZE + propRng.range(4, 18),
            baseY: worldY + 8,
            variant: propRng.rangeInt(0, 4)
          });
        } else if (chance < 0.36) {
          props.push({
            type: 'log',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 10,
            variant: 0
          });
        } else if (chance < 0.40) {
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

  // 8. Traversability Guarantee (Flood Fill corridor check & bridge safeguard)
  ensureChunkTraversability(collision, tileFlags);

  return {
    chunkX,
    chunkY,
    elevation,
    moisture,
    temperature,
    biome,
    flowDirX,
    flowDirY,
    tileFlags,
    foamMask,
    collision,
    props,
    structures
  };
}

/**
 * Ensures a traversable corridor exists across the chunk so the player is never trapped.
 * If water crosses the guaranteed corridor, automatically convert it to a bridge!
 */
function ensureChunkTraversability(collision: Uint8Array, tileFlags: Uint8Array): void {
  const mid = Math.floor(CHUNK_TILES / 2);
  for (let i = 0; i < CHUNK_TILES; i++) {
    const idxH1 = mid * CHUNK_TILES + i;
    const idxH2 = (mid + 1) * CHUNK_TILES + i;
    const idxV1 = i * CHUNK_TILES + mid;
    const idxV2 = i * CHUNK_TILES + (mid + 1);

    for (const idx of [idxH1, idxH2, idxV1, idxV2]) {
      collision[idx] = 0; // Ensure walkable
      if (tileFlags[idx] === TILE_FLAG_WATER || tileFlags[idx] === TILE_FLAG_WATERFALL) {
        tileFlags[idx] = TILE_FLAG_BRIDGE; // Bridges span water corridors!
      }
    }
  }
}
