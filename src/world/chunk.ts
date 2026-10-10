import { BiomeType, classifyBiome, BIOMES } from './biomes';
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

export interface KeepsakeInstance {
  id: string;
  type: string;
  name: string;
  desc: string;
  x: number;
  y: number;
  collected?: boolean;
}

export interface CreatureInstance {
  id: string;
  speciesId: number;
  x: number; // local chunk X
  y: number; // local chunk Y
  level: number;
}

export interface ChunkBufferData {
  layer: number;
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
  keepsakes: KeepsakeInstance[];
  creatures: CreatureInstance[];
}

export class Chunk {
  readonly layer: number;
  readonly chunkX: number;
  readonly chunkY: number;
  data: ChunkBufferData;
  renderCache: any = null;

  constructor(layer: number, chunkX: number, chunkY: number, data: ChunkBufferData) {
    this.layer = layer;
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

export function pickSpeciesForBiome(biome: BiomeType, rng: PRNG): number {
  // 15% chance to be a global wanderer
  if (rng.range(0, 1) < 0.15) {
    return rng.rangeInt(1, 151);
  }
  
  switch (biome) {
    case BiomeType.Meadow:
      return rng.rangeInt(1, 21); // 1 - 20
    case BiomeType.WildflowerFields:
      return rng.rangeInt(21, 36); // 21 - 35
    case BiomeType.BirchGrove:
      return rng.rangeInt(36, 51); // 36 - 50
    case BiomeType.PineForest:
      return rng.rangeInt(51, 66); // 51 - 65
    case BiomeType.CherryBlossom:
      return rng.rangeInt(66, 76); // 66 - 75
    case BiomeType.RockyCliffs:
      return rng.rangeInt(76, 91); // 76 - 90
    case BiomeType.MarshPonds:
      return rng.rangeInt(91, 106); // 91 - 105
    case BiomeType.LakesRivers:
      return rng.rangeInt(106, 121); // 106 - 120
    case BiomeType.SandyCoast:
      return rng.rangeInt(121, 131); // 121 - 130
    case BiomeType.AutumnMaple:
      return rng.rangeInt(131, 141); // 131 - 140
    case BiomeType.MistyHighlands:
      return rng.rangeInt(141, 146); // 141 - 145
    case BiomeType.SnowyPeaks:
      return rng.rangeInt(146, 149); // 146 - 148
    case BiomeType.GlowingHollow:
      return rng.rangeInt(149, 151); // 149 - 150
    default:
      return rng.rangeInt(1, 151);
  }
}

/**
 * Pure deterministic generator for a single chunk.
 * Can run either in Web Worker or synchronously on main thread for spawn chunks.
 */
export function generateChunkData(layer: number, chunkX: number, chunkY: number, rawSeed: number | string): ChunkBufferData {
  const seedNum = hashSeed(rawSeed) ^ (layer * 0x73856093);

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

  if (layer < 0) {
    for (let ty = 0; ty < CHUNK_TILES; ty++) {
      for (let tx = 0; tx < CHUNK_TILES; tx++) {
        const idx = ty * CHUNK_TILES + tx;
        const worldTileX = chunkX * CHUNK_TILES + tx;
        const worldTileY = chunkY * CHUNK_TILES + ty;
        const worldX = worldTileX * TILE_SIZE;
        const worldY = worldTileY * TILE_SIZE;
        
        const caveVal = elevNoise.fbm2D(worldX * 0.003, worldY * 0.003, 3);
        const isSolid = Math.abs(caveVal) > 0.25 ? 1 : 0;
        
        elevation[idx] = isSolid ? 0.9 : -0.5;
        moisture[idx] = 0.5;
        temperature[idx] = 0.5;
        flowDirX[idx] = 0;
        flowDirY[idx] = 0;
        tileFlags[idx] = TILE_FLAG_LAND;
        collision[idx] = isSolid;
        biome[idx] = BiomeType.GlowingHollow;
      }
    }
  } else {
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

      // Smoothly blend spawn clearing into gentle meadow around (256, 256) in chunk (0, 0)
      const spawnCenterX = CHUNK_PIXEL_SIZE / 2;
      const spawnCenterY = CHUNK_PIXEL_SIZE / 2;
      const distFromSpawn = Math.hypot(worldX - spawnCenterX, worldY - spawnCenterY);
      if (chunkX === 0 && chunkY === 0) {
        if (distFromSpawn < 160) {
          const blend = Math.max(0, 1.0 - distFromSpawn / 160);
          elev = elev * (1.0 - blend) + 0.28 * blend;
          if (distFromSpawn < 90) {
            isRiver = false;
          }
        }
      } else if (isRiver) {
        elev = -0.42; // Riverbed water level
      }

      let isWater = isRiver || elev < -0.35;

      // 4. Procedural Winding Dirt Paths
      const pathVal = Math.abs(pathNoise.noise2D(px * pathScale, py * pathScale));
      let isPath = pathVal < 0.024;

      // Connect spawn clearing to path network
      if (chunkX === 0 && chunkY === 0) {
        const spawnTrailY = spawnCenterY + Math.sin((worldX - spawnCenterX) * 0.025) * 16;
        if (worldX >= spawnCenterX - 24 && Math.abs(worldY - spawnTrailY) < 16) {
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
      let bType: BiomeType = isRiver ? BiomeType.LakesRivers : classifyBiome(elev, moist, temp, erosion);
      if (layer < 0) {
        bType = BiomeType.GlowingHollow;
      } else if (distFromSpawn < 400 && chunkX === 0 && chunkY === 0 && !isRiver && !isWater) {
        bType = BiomeType.Meadow;
      }
      biome[idx] = bType;
    }
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
    layer,
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
        if (chance < 0.05 && distFromSpawn > 70) {
          props.push({
            type: 'oak_tree',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 12,
            variant: propRng.rangeInt(0, 2)
          });
          collision[idx] = 1;
        } else if (chance < 0.20) {
          props.push({
            type: 'flower',
            x: tx * TILE_SIZE + propRng.range(4, 18),
            y: ty * TILE_SIZE + propRng.range(4, 18),
            baseY: worldY + 8,
            variant: propRng.rangeInt(0, 4)
          });
        } else if (chance < 0.36) {
          props.push({
            type: 'grass',
            x: tx * TILE_SIZE + propRng.range(3, 19),
            y: ty * TILE_SIZE + propRng.range(3, 19),
            baseY: worldY + 6,
            variant: propRng.rangeInt(0, 3)
          });
        } else if (chance < 0.40) {
          props.push({
            type: 'shrub',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 6,
            variant: 0
          });
        } else if (chance < 0.44) {
          props.push({
            type: 'mushroom',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 4,
            variant: propRng.rangeInt(0, 3)
          });
        } else if (chance < 0.48) {
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
        } else if (chance < 0.24) {
          props.push({
            type: 'fern',
            x: tx * TILE_SIZE + 10,
            y: ty * TILE_SIZE + 10,
            baseY: worldY + 8,
            variant: 0
          });
        } else if (chance < 0.32) {
          props.push({
            type: 'mushroom',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 4,
            variant: 0 // Brown forest mushroom
          });
        }
      } else if (bType === BiomeType.BirchGrove) {
        if (chance < 0.09 && distFromSpawn > 70) {
          props.push({
            type: 'birch_tree',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 12,
            variant: 0
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
        } else if (chance < 0.32) {
          props.push({
            type: 'flower',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 6,
            variant: 0
          });
        }
      } else if ((bType as BiomeType) === BiomeType.GlowingHollow) {
        if (chance < 0.25) {
          props.push({
            type: 'mushroom_glowing',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 4,
            variant: propRng.rangeInt(0, 3)
          });
        }
      } else if (bType === BiomeType.CherryBlossom) {
        if (chance < 0.18) {
          props.push({
            type: 'shrub',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 6,
            variant: 2 // Blossom pink shrub
          });
        }
      } else if (bType === BiomeType.AutumnMaple) {
        if (chance < 0.20) {
          props.push({
            type: 'shrub',
            x: tx * TILE_SIZE + 12,
            y: ty * TILE_SIZE + 12,
            baseY: worldY + 6,
            variant: 1 // Autumn amber shrub
          });
        }
      } else {
        // Data-driven fallback for all 26 expanded biomes
        const bDef = BIOMES[bType];
        if (bDef && bDef.props && bDef.props.length > 0) {
          // Adjust overall vegetation density per biome type
          let spawnRate = 0.25;
          if (bType === BiomeType.DesertDunes || bType === BiomeType.DeepOcean || bType === BiomeType.SnowyTundra || bType === BiomeType.VolcanicAsh) {
            spawnRate = 0.08;
          } else if (bType === BiomeType.OldGrowthForest || bType === BiomeType.BambooGrove || bType === BiomeType.LushCave) {
            spawnRate = 0.38;
          }

          if (chance < spawnRate) {
            const pType = propRng.pick(bDef.props);
            
            let isSolid = false;
            let yOffset = 6;
            let numVariants = 1;

            if (pType.includes('tree') || pType === 'bamboo' || pType === 'cactus' || pType === 'ice_spike' || pType === 'stalagmite' || pType === 'boulder' || pType === 'rock_cliff' || pType === 'volcanic_vent' || pType === 'giant_mushroom') {
              isSolid = true;
              yOffset = 16;
            }
            if (pType === 'grass' || pType === 'shrub' || pType === 'fern' || pType === 'flower') {
              numVariants = 3;
              yOffset = 6;
            }
            if (pType.includes('mushroom')) {
              numVariants = 3;
              yOffset = 4;
            }
            if (pType === 'coral') {
              numVariants = 2;
              yOffset = 6;
            }

            // Don't spawn solid objects right on spawn
            if (isSolid && distFromSpawn < 70) continue;

            props.push({
              type: pType,
              x: tx * TILE_SIZE + 12,
              y: ty * TILE_SIZE + 12,
              baseY: worldY + yOffset,
              variant: propRng.rangeInt(0, numVariants)
            });

            if (isSolid) {
              collision[idx] = 1;
            }
          }
        }
      }
    }
  }

  // 6. Collectible Keepsakes Generation (feathers, cones, shells, clovers, etc.)
  const keepsakes: KeepsakeInstance[] = [];
  const keepsakeRng = new PRNG(seedNum ^ (chunkX * 94372) ^ (chunkY * 61471));
  if (keepsakeRng.next() < 0.75) {
    for (let attempts = 0; attempts < 12; attempts++) {
      const tx = keepsakeRng.rangeInt(3, CHUNK_TILES - 4);
      const ty = keepsakeRng.rangeInt(3, CHUNK_TILES - 4);
      const idx = ty * CHUNK_TILES + tx;
      if (collision[idx] === 0 && (tileFlags[idx] & TILE_FLAG_WATER) === 0) {
        const b = biome[idx] as BiomeType;
        let kType = 'blue_feather';
        let kName = 'Blue Jay Feather';
        let kDesc = 'A fallen sapphire feather from high morning boughs.';

        if (b === BiomeType.PineForest) {
          kType = 'pine_cone';
          kName = 'Ancient Pinecone';
          kDesc = 'Smells of rich pine resin and sun-warmed forest needles.';
        } else if (b === BiomeType.BirchGrove) {
          kType = 'acorn';
          kName = 'Golden Oak Acorn';
          kDesc = 'The tiny seed of a mighty forest giant.';
        } else if (b === BiomeType.AutumnMaple) {
          kType = 'amber_leaf';
          kName = 'Autumn Maple Leaf';
          kDesc = 'A radiant amber leaf preserving the warmth of late summer.';
        } else if (b === BiomeType.CherryBlossom) {
          kType = 'cherry_petal';
          kName = 'Pressed Blossom';
          kDesc = 'A delicate fragrant petal pressed softly between pages.';
        } else if (b === BiomeType.GlowingHollow) {
          kType = 'glowing_spore';
          kName = 'Moonlit Spore Pod';
          kDesc = 'Glows with a soft cyan luminescence in twilight.';
        } else if (b === BiomeType.LakesRivers || b === BiomeType.MarshPonds) {
          kType = 'smooth_pebble';
          kName = 'Riverstone';
          kDesc = 'Worn silky smooth by mountain currents over centuries.';
        } else if (b === BiomeType.SandyCoast) {
          kType = 'seashell';
          kName = 'Sun-Washed Shell';
          kDesc = 'Whispers with the gentle roar of distant ocean tides.';
        } else if (b === BiomeType.SnowyPeaks) {
          kType = 'quartz_crystal';
          kName = 'Frost Quartz';
          kDesc = 'Catches morning sunlight in clear glacial facets.';
        } else if (b === BiomeType.WildflowerFields) {
          kType = 'wild_clover';
          kName = 'Four-Leaf Clover';
          kDesc = 'A rare lucky four-petaled clover found amidst wild grasses.';
        }

        keepsakes.push({
          id: `k_${chunkX}_${chunkY}_0`,
          type: kType,
          name: kName,
          desc: kDesc,
          x: tx * TILE_SIZE + 12,
          y: ty * TILE_SIZE + 12,
          collected: false
        });
        break;
      }
    }
  }

  // 7. Creature Spawning (1-3 per chunk based on biome and deterministic PRNG)
  const creatures: CreatureInstance[] = [];
  const creatureRng = new PRNG(seedNum ^ (chunkX * 1337) ^ (chunkY * 9999));
  
  const isSpawnChunk = (chunkX === 0 && chunkY === 0);
  const numCreatures = isSpawnChunk ? creatureRng.rangeInt(1, 3) : creatureRng.rangeInt(1, 4); // 1-2 in spawn, 1-3 elsewhere
  for (let i = 0; i < numCreatures; i++) {
    for (let attempts = 0; attempts < 15; attempts++) {
      const tx = creatureRng.rangeInt(2, CHUNK_TILES - 3);
      const ty = creatureRng.rangeInt(2, CHUNK_TILES - 3);
      const idx = ty * CHUNK_TILES + tx;
      
      const wx = tx * TILE_SIZE + 12;
      const wy = ty * TILE_SIZE + 12;
      
      // If spawn chunk, keep distance from player spawn (384, 384)
      if (isSpawnChunk && Math.hypot(wx - 384, wy - 384) < 110) {
        continue;
      }
      
      if (collision[idx] === 0 && (tileFlags[idx] & TILE_FLAG_WATER) === 0) {
        const tileBiome = biome[idx] as BiomeType;
        const speciesId = pickSpeciesForBiome(tileBiome, creatureRng);
        const level = isSpawnChunk ? creatureRng.rangeInt(2, 6) : creatureRng.rangeInt(2, 18);
        
        creatures.push({
          id: `c_${chunkX}_${chunkY}_${i}`,
          speciesId,
          x: wx,
          y: wy,
          level
        });
        break;
      }
    }
  }

  return {
    layer,
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
    structures,
    keepsakes,
    creatures
  };
}
