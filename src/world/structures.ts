import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';
import { ColorRGBA, hexToRgba, vec2, Vec2 } from '../core/math';
import { PRNG } from '../core/prng';
import { BiomeType } from './biomes';
import { CHUNK_TILES, TILE_SIZE, CHUNK_PIXEL_SIZE } from './chunk';

export type StructureType =
  | 'windmill'
  | 'lighthouse'
  | 'cottage'
  | 'ruins'
  | 'stone_circle'
  | 'campfire'
  | 'bench'
  | 'sitting_log'
  | 'bridge'
  | 'stepping_stones'
  | 'sanctuary_crystal'
  | 'resting_crystal'
  | 'nomad_camp'
  | 'waystone'
  | 'brambles'
  | 'boulder'
  | 'gap'
  | 'cave_entrance'
  | 'garden_plot'
  | 'wind_chime';

export enum StructureRarity {
  Common = 0,
  Uncommon = 1,
  Rare = 2,
  Legendary = 3
}

export interface StructureDef {
  type: StructureType;
  rarity: StructureRarity;
  allowedBiomes?: BiomeType[]; // empty means all biomes
  minElev: number;
  maxElev: number;
  allowWater: boolean;
  spawnWeight: number;
  width: number;
  height: number;
  yOffset: number;
  variants: number;
  solidFootprint: { dx: number; dy: number }[];
}

export const STRUCTURE_REGISTRY: Record<StructureType, StructureDef> = {
  windmill: { type: 'windmill', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.Meadow, BiomeType.MistyHighlands, BiomeType.SunflowerPlains], minElev: 0.18, maxElev: 0.6, allowWater: false, spawnWeight: 1, width: 44, height: 72, yOffset: 28, variants: 2, solidFootprint: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }] },
  lighthouse: { type: 'lighthouse', rarity: StructureRarity.Legendary, allowedBiomes: [BiomeType.SandyCoast], minElev: -0.32, maxElev: 0.15, allowWater: false, spawnWeight: 1, width: 36, height: 90, yOffset: 36, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }] },
  cottage: { type: 'cottage', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.BirchGrove, BiomeType.Meadow, BiomeType.AutumnMaple, BiomeType.OldGrowthForest], minElev: -0.2, maxElev: 0.7, allowWater: false, spawnWeight: 3, width: 52, height: 46, yOffset: 22, variants: 2, solidFootprint: [{ dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
  ruins: { type: 'ruins', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.PineForest, BiomeType.RockyCliffs, BiomeType.AutumnMaple, BiomeType.MushroomFields], minElev: -0.2, maxElev: 0.8, allowWater: false, spawnWeight: 2, width: 48, height: 42, yOffset: 20, variants: 3, solidFootprint: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
  stone_circle: { type: 'stone_circle', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.WildflowerFields, BiomeType.MistyHighlands, BiomeType.GlowingHollow], minElev: -0.1, maxElev: 0.7, allowWater: false, spawnWeight: 1.5, width: 60, height: 60, yOffset: 26, variants: 1, solidFootprint: [] },
  campfire: { type: 'campfire', rarity: StructureRarity.Common, allowedBiomes: undefined, minElev: -0.2, maxElev: 0.9, allowWater: false, spawnWeight: 1, width: 28, height: 28, yOffset: 12, variants: 1, solidFootprint: [] },
  bench: { type: 'bench', rarity: StructureRarity.Common, allowedBiomes: undefined, minElev: -0.2, maxElev: 0.9, allowWater: false, spawnWeight: 1, width: 24, height: 14, yOffset: 8, variants: 1, solidFootprint: [] },
  sitting_log: { type: 'sitting_log', rarity: StructureRarity.Common, allowedBiomes: undefined, minElev: -0.2, maxElev: 0.9, allowWater: false, spawnWeight: 1.5, width: 26, height: 14, yOffset: 8, variants: 1, solidFootprint: [] },
  bridge: { type: 'bridge', rarity: StructureRarity.Common, allowedBiomes: undefined, minElev: -1.0, maxElev: 1.0, allowWater: true, spawnWeight: 0, width: 32, height: 32, yOffset: 0, variants: 1, solidFootprint: [] },
  stepping_stones: { type: 'stepping_stones', rarity: StructureRarity.Common, allowedBiomes: undefined, minElev: -1.0, maxElev: 1.0, allowWater: true, spawnWeight: 0, width: 32, height: 32, yOffset: 0, variants: 1, solidFootprint: [] },
  sanctuary_crystal: { type: 'sanctuary_crystal', rarity: StructureRarity.Legendary, allowedBiomes: undefined, minElev: 0, maxElev: 1.0, allowWater: false, spawnWeight: 0.5, width: 32, height: 48, yOffset: 16, variants: 1, solidFootprint: [] },
  resting_crystal: { type: 'resting_crystal', rarity: StructureRarity.Uncommon, allowedBiomes: undefined, minElev: -0.2, maxElev: 0.9, allowWater: false, spawnWeight: 2, width: 48, height: 48, yOffset: 16, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  nomad_camp: { type: 'nomad_camp', rarity: StructureRarity.Uncommon, allowedBiomes: undefined, minElev: -0.2, maxElev: 0.8, allowWater: false, spawnWeight: 2, width: 48, height: 48, yOffset: 16, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  waystone: { type: 'waystone', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.Meadow, BiomeType.WildflowerFields, BiomeType.Savanna, BiomeType.SnowyTundra], minElev: -0.1, maxElev: 0.8, allowWater: false, spawnWeight: 2.5, width: 32, height: 48, yOffset: 16, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  brambles: { type: 'brambles', rarity: StructureRarity.Common, allowedBiomes: [BiomeType.PineForest, BiomeType.AutumnMaple, BiomeType.BirchGrove, BiomeType.OldGrowthForest], minElev: -0.1, maxElev: 0.7, allowWater: false, spawnWeight: 3, width: 32, height: 32, yOffset: 12, variants: 3, solidFootprint: [{ dx: 0, dy: 0 }] },
  boulder: { type: 'boulder', rarity: StructureRarity.Common, allowedBiomes: [BiomeType.RockyCliffs, BiomeType.MistyHighlands, BiomeType.BadlandsMesa, BiomeType.DesertDunes, BiomeType.VolcanicAsh], minElev: 0.0, maxElev: 0.9, allowWater: false, spawnWeight: 4, width: 36, height: 36, yOffset: 16, variants: 3, solidFootprint: [{ dx: 0, dy: 0 }] },
  gap: { type: 'gap', rarity: StructureRarity.Common, allowedBiomes: [BiomeType.Meadow, BiomeType.WildflowerFields, BiomeType.IceSpikes], minElev: 0.1, maxElev: 0.8, allowWater: false, spawnWeight: 1.5, width: 36, height: 36, yOffset: 16, variants: 3, solidFootprint: [{ dx: 0, dy: 0 }] },
  cave_entrance: { type: 'cave_entrance', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.RockyCliffs, BiomeType.MistyHighlands, BiomeType.LushCave, BiomeType.DripstoneCave], minElev: 0.2, maxElev: 0.9, allowWater: false, spawnWeight: 2, width: 48, height: 48, yOffset: 12, variants: 2, solidFootprint: [{ dx: 0, dy: 0 }] },
  garden_plot: { type: 'garden_plot', rarity: StructureRarity.Legendary, allowedBiomes: undefined, minElev: 0, maxElev: 1, allowWater: false, spawnWeight: 0, width: 72, height: 52, yOffset: 24, variants: 1, solidFootprint: [] },
  wind_chime: { type: 'wind_chime', rarity: StructureRarity.Uncommon, allowedBiomes: undefined, minElev: -0.2, maxElev: 0.9, allowWater: false, spawnWeight: 1.5, width: 16, height: 32, yOffset: 12, variants: 1, solidFootprint: [] }
};

export interface StructureInstance {
  id: string;
  type: StructureType;
  x: number;       // world pixel X center
  y: number;       // world pixel Y center
  baseY: number;   // world pixel Y for depth sorting
  width: number;
  height: number;
  variant: number;
  rotation?: number;
  solidTiles: { dx: number; dy: number }[]; // relative tile offsets from chunk center
}

/**
 * Deterministically generates structures in a chunk.
 * Placed sparsely across the world based on seed and landscape conditions.
 */
export function generateChunkStructures(
  layer: number,
  chunkX: number,
  chunkY: number,
  seed: number,
  elevation: Float32Array,
  biome: Uint8Array,
  tileFlags: Uint8Array,
  collision: Uint8Array
): StructureInstance[] {
  const structures: StructureInstance[] = [];
  
  if (layer < 0) {
    return structures;
  }

  const chunkRng = new PRNG(seed ^ (chunkX * 1610612741) ^ (chunkY * 805306457));

  const baseWorldX = chunkX * CHUNK_PIXEL_SIZE;
  const baseWorldY = chunkY * CHUNK_PIXEL_SIZE;

  // 1. Starter Landmark near Spawn Chunk (0, 0)
  if (chunkX === 0 && chunkY === 0) {
    // Cozy campfire site with sitting logs near spawn clearing
    const campX = baseWorldX + CHUNK_PIXEL_SIZE / 2 + 56;
    const campY = baseWorldY + CHUNK_PIXEL_SIZE / 2 - 40;
    structures.push({
      id: `spawn-campfire-${seed}`,
      type: 'campfire',
      x: campX,
      y: campY,
      baseY: campY + 12,
      width: 28,
      height: 28,
      variant: 0,
      solidTiles: []
    });

    // Scenic wooden bench overlooking the dawn meadow
    const benchX = baseWorldX + CHUNK_PIXEL_SIZE / 2 - 64;
    const benchY = baseWorldY + CHUNK_PIXEL_SIZE / 2 + 36;
    structures.push({
      id: `spawn-bench-${seed}`,
      type: 'bench',
      x: benchX,
      y: benchY,
      baseY: benchY + 8,
      width: 24,
      height: 14,
      variant: 0,
      solidTiles: []
    });

    // Sanctuary Crystal
    const sanctuaryX = baseWorldX + CHUNK_PIXEL_SIZE / 2;
    const sanctuaryY = baseWorldY + CHUNK_PIXEL_SIZE / 2 - 80;
    structures.push({
      id: `spawn-sanctuary-${seed}`,
      type: 'sanctuary_crystal',
      x: sanctuaryX,
      y: sanctuaryY,
      baseY: sanctuaryY + 16,
      width: 32,
      height: 48,
      variant: 0,
      solidTiles: []
    });

    // Garden Plot in the sunny meadow clearing southeast of campfire
    const gardenX = baseWorldX + CHUNK_PIXEL_SIZE / 2 + 64;
    const gardenY = baseWorldY + CHUNK_PIXEL_SIZE / 2 + 48;
    structures.push({
      id: `spawn-garden-${seed}`,
      type: 'garden_plot',
      x: gardenX,
      y: gardenY,
      baseY: gardenY + 24,
      width: 72,
      height: 52,
      variant: 0,
      solidTiles: []
    });

    // Spawn Wind Chime beside ancient trees
    const chimeX = baseWorldX + CHUNK_PIXEL_SIZE / 2 - 48;
    const chimeY = baseWorldY + CHUNK_PIXEL_SIZE / 2 - 48;
    structures.push({
      id: `spawn-chime-${seed}`,
      type: 'wind_chime',
      x: chimeX,
      y: chimeY,
      baseY: chimeY + 12,
      width: 16,
      height: 32,
      variant: 0,
      solidTiles: []
    });

    return structures;
  }

  // 2. Dynamic Structure Placement System
  // Roll for rarity tier to spawn in this chunk
  let targetRarity = StructureRarity.Common;
  const rarityRoll = chunkRng.next();
  if (rarityRoll < 0.05) targetRarity = StructureRarity.Legendary;
  else if (rarityRoll < 0.15) targetRarity = StructureRarity.Rare;
  else if (rarityRoll < 0.35) targetRarity = StructureRarity.Uncommon;

  // Decide if we spawn any structure at all this chunk
  // Most chunks (60%) remain pristine wilderness
  const hasStructure = chunkRng.chance(0.40);
  if (!hasStructure) {
    return structures;
  }

  // Sample center tile of chunk
  const midTile = Math.floor(CHUNK_TILES / 2);
  const midIdx = midTile * CHUNK_TILES + midTile;
  const elev = elevation[midIdx];
  const bType = biome[midIdx] as BiomeType;
  const isWater = elev < -0.35;

  // Filter registry for valid structures
  const validDefs: StructureDef[] = [];
  let totalWeight = 0;

  for (const key in STRUCTURE_REGISTRY) {
    const def = STRUCTURE_REGISTRY[key as StructureType];
    if (def.rarity !== targetRarity) continue;
    if (def.allowedBiomes && !def.allowedBiomes.includes(bType)) continue;
    if (elev < def.minElev || elev > def.maxElev) continue;
    if (isWater && !def.allowWater) continue;
    if (!isWater && def.allowWater && def.minElev < -0.35) continue; // If requires water but isn't water

    validDefs.push(def);
    totalWeight += def.spawnWeight;
  }

  if (validDefs.length > 0 && totalWeight > 0) {
    let roll = chunkRng.next() * totalWeight;
    let selectedDef: StructureDef | null = null;
    for (const def of validDefs) {
      roll -= def.spawnWeight;
      if (roll <= 0) {
        selectedDef = def;
        break;
      }
    }

    if (selectedDef) {
      const structWorldX = baseWorldX + midTile * TILE_SIZE + 12;
      const structWorldY = baseWorldY + midTile * TILE_SIZE + 12;

      structures.push({
        id: `${selectedDef.type}-${chunkX}-${chunkY}`,
        type: selectedDef.type,
        x: structWorldX,
        y: structWorldY,
        baseY: structWorldY + selectedDef.yOffset,
        width: selectedDef.width,
        height: selectedDef.height,
        variant: selectedDef.variants > 1 ? chunkRng.rangeInt(0, selectedDef.variants - 1) : 0,
        solidTiles: selectedDef.solidFootprint
      });

      applySolidFootprint(midTile, midTile, selectedDef.solidFootprint, collision);
    }
  }

  return structures;
}

function applySolidFootprint(
  centerTx: number,
  centerTy: number,
  footprint: { dx: number; dy: number }[],
  collision: Uint8Array
): void {
  for (const f of footprint) {
    const tx = centerTx + f.dx;
    const ty = centerTy + f.dy;
    if (tx >= 0 && tx < CHUNK_TILES && ty >= 0 && ty < CHUNK_TILES) {
      collision[ty * CHUNK_TILES + tx] = 1;
    }
  }
}

/**
 * Procedural rendering for all structures in MEADOW.
 * Hand-painted vector aesthetic with soft shadows and dynamic animations.
 */
export function renderStructure(
  renderer: IRenderer,
  structure: StructureInstance,
  time: number,
  wind: Vec2,
  art?: ArtToolkit
): void {
  const { type, x, y, baseY, variant } = structure;

  if (art) {
    if (type === 'windmill') art.drawDropShadow(x, baseY, 36, 48);
    else if (type === 'cottage') art.drawDropShadow(x, baseY, 42, 36);
    else if (type === 'lighthouse') art.drawDropShadow(x, baseY, 32, 60);
    else if (type === 'ruins') art.drawDropShadow(x, baseY, 28, 20);
    else if (type === 'bench' || type === 'sitting_log') art.drawDropShadow(x, baseY, 24, 8);
    else if (type === 'stone_circle') art.drawDropShadow(x, baseY, 32, 16);
  }

  switch (type) {
    case 'campfire': {
      // 1. Stone ring base
      renderer.drawCircle(x, y + 2, 13, hexToRgba('#1B2631', 0.35));
      renderer.drawCircle(x, y + 2, 11, hexToRgba('#5D6D7E'));
      renderer.drawCircle(x, y + 2, 8, hexToRgba('#2C3E50'));

      // 2. Burning crossed logs
      renderer.drawRect(x - 7, y, 14, 4, hexToRgba('#4A2E16'));
      renderer.drawRect(x - 2, y - 5, 4, 14, hexToRgba('#5C381E'));

      // 3. Glowing animated embers & fire flame
      const flicker = Math.sin(time * 8 + x) * 2;
      const flicker2 = Math.cos(time * 11 + y) * 1.5;
      // Ambient warm fire glow on ground
      renderer.drawCircle(x, y + 2, 24 + flicker, hexToRgba('#E67E22', 0.16));
      // Outer amber flame
      renderer.drawCircle(x + flicker * 0.4, y - 4 + flicker2 * 0.3, 7 + flicker * 0.5, hexToRgba('#E67E22', 0.85));
      // Core yellow flame
      renderer.drawCircle(x + flicker * 0.2, y - 5, 4.5, hexToRgba('#F39C12', 0.95));
      // White-hot center
      renderer.drawCircle(x, y - 4, 2, hexToRgba('#FFF9C4', 0.9));

      // 4. Sitting log beside fire
      renderer.drawRect(x + 14, y - 6, 6, 16, hexToRgba('#6E2C00'));
      renderer.drawCircle(x + 17, y - 6, 3, hexToRgba('#D7CCC8'));
      break;
    }

    case 'bench': {
      // Soft ground shadow
      renderer.drawCircle(x, baseY, 12, hexToRgba('#1B2631', 0.25));

      // Bench legs & frame (dark iron / cedar)
      renderer.drawRect(x - 11, y + 1, 3, 7, hexToRgba('#3E2723'));
      renderer.drawRect(x + 8, y + 1, 3, 7, hexToRgba('#3E2723'));

      // Seat planks (warm wood)
      renderer.drawRect(x - 12, y + 1, 24, 4, hexToRgba('#8D6E63'));
      renderer.drawRect(x - 12, y - 1, 24, 2, hexToRgba('#A1887F'));

      // Backrest slats
      renderer.drawRect(x - 12, y - 7, 24, 5, hexToRgba('#6D4C41'));
      renderer.drawRect(x - 11, y - 6, 22, 2, hexToRgba('#8D6E63'));
      break;
    }

    case 'sitting_log': {
      // Soft ground shadow
      renderer.drawCircle(x, baseY, 14, hexToRgba('#1B2631', 0.25));

      // Weathered cedar log trunk
      renderer.drawRect(x - 13, y - 2, 26, 8, hexToRgba('#4E342E'));
      renderer.drawRect(x - 12, y - 1, 24, 5, hexToRgba('#6D4C41'));
      renderer.drawCircle(x - 13, y + 2, 3.5, hexToRgba('#8D6E63'));
      renderer.drawCircle(x + 13, y + 2, 3.5, hexToRgba('#8D6E63'));

      // Velvet moss patches on log top
      renderer.drawRect(x - 6, y - 2, 9, 2, hexToRgba('#4CAF50', 0.85));
      renderer.drawRect(x + 5, y - 1, 5, 2, hexToRgba('#66BB6A', 0.8));
      break;
    }

    case 'sanctuary_crystal': {
      // Glow and shadow
      const pulse = Math.sin(time * 2.5);
      renderer.drawCircle(x, baseY, 20 + pulse * 2, hexToRgba('#1ABC9C', 0.15 + pulse * 0.05));
      renderer.drawCircle(x, baseY, 16, hexToRgba('#1B2631', 0.3));

      // Crystal base (Stone)
      renderer.drawRect(x - 10, baseY - 6, 20, 6, hexToRgba('#7F8C8D'));
      renderer.drawRect(x - 8, baseY - 10, 16, 4, hexToRgba('#95A5A6'));

      // Floating crystal
      const floatY = y - 14 + Math.sin(time * 1.5) * 3;
      renderer.drawLine(x, floatY - 14, x, floatY + 10, 12, hexToRgba('#16A085', 0.8));
      renderer.drawLine(x, floatY - 12, x, floatY + 8, 8, hexToRgba('#48C9B0', 0.9));
      renderer.drawLine(x, floatY - 8, x, floatY + 4, 4, hexToRgba('#A3E4D7', 0.95));
      
      // Star glints
      if (Math.sin(time * 3) > 0.8) {
        renderer.drawCircle(x - 4, floatY - 8, 1.5, hexToRgba('#FFFFFF'));
      }
      break;
    }

    case 'waystone': {
      // Glow based on discovered state? We can just make it glow blue for now
      const glow = Math.sin(time * 1.2);
      renderer.drawCircle(x, baseY, 24, hexToRgba('#3498DB', 0.1 + glow * 0.05));
      renderer.drawCircle(x, baseY, 14, hexToRgba('#1B2631', 0.4));
      
      // Tall obelisk
      renderer.drawPolygon([
        vec2(x - 8, baseY),
        vec2(x + 8, baseY),
        vec2(x + 4, baseY - 36),
        vec2(x - 4, baseY - 36)
      ], hexToRgba('#5D6D7E'));

      // Inscribed runes that glow
      renderer.drawRect(x - 1, baseY - 24, 2, 8, hexToRgba('#5DADE2', 0.9));
      renderer.drawRect(x - 2, baseY - 12, 4, 4, hexToRgba('#5DADE2', 0.9));
      break;
    }

    case 'resting_crystal': {
      // Small pulsing crystal
      const pulse = Math.sin(time * 2);
      renderer.drawCircle(x, baseY, 14 + pulse, hexToRgba('#9B59B6', 0.15 + pulse * 0.05));
      renderer.drawCircle(x, baseY, 10, hexToRgba('#1B2631', 0.3));

      // Crystal Base
      renderer.drawRect(x - 6, baseY - 4, 12, 4, hexToRgba('#7F8C8D'));
      
      // The Crystal
      renderer.drawLine(x, baseY - 16, x, baseY, 8, hexToRgba('#8E44AD', 0.8));
      renderer.drawLine(x, baseY - 12, x, baseY - 2, 4, hexToRgba('#BB8FCE', 0.9));
      break;
    }

    case 'nomad_camp': {
      // Shadow
      renderer.drawCircle(x, baseY, 24, hexToRgba('#1B2631', 0.3));
      
      // Central fire
      renderer.drawCircle(x, baseY + 2, 8, hexToRgba('#2C3E50'));
      renderer.drawCircle(x, baseY - 2, 4, hexToRgba('#F39C12', 0.8));
      
      // A small tent
      renderer.drawPolygon([
        vec2(x - 16, baseY + 8),
        vec2(x - 4, baseY + 8),
        vec2(x - 10, baseY - 12)
      ], hexToRgba('#F3E5AB'));
      renderer.drawLine(x - 10, baseY - 14, x - 10, baseY - 12, 2, hexToRgba('#5C381E'));

      // Another tent
      renderer.drawPolygon([
        vec2(x + 4, baseY + 6),
        vec2(x + 14, baseY + 6),
        vec2(x + 9, baseY - 10)
      ], hexToRgba('#E6B0AA'));
      renderer.drawLine(x + 9, baseY - 12, x + 9, baseY - 10, 2, hexToRgba('#5C381E'));

      break;
    }

    case 'brambles': {
      // Thorny bush
      renderer.drawCircle(x, baseY, 16, hexToRgba('#1B2631', 0.4));
      renderer.drawCircle(x - 4, baseY - 4, 12, hexToRgba('#1E8449', 0.9));
      renderer.drawCircle(x + 6, baseY - 6, 14, hexToRgba('#229954', 0.9));
      renderer.drawCircle(x - 2, baseY - 14, 10, hexToRgba('#145A32', 0.9));
      
      // Thorns
      renderer.drawLine(x - 8, baseY - 8, x - 14, baseY - 12, 2, hexToRgba('#784212'));
      renderer.drawLine(x + 4, baseY - 10, x + 10, baseY - 18, 2, hexToRgba('#784212'));
      renderer.drawLine(x + 8, baseY - 2, x + 16, baseY - 4, 2, hexToRgba('#784212'));
      break;
    }

    case 'boulder': {
      // Big rock
      renderer.drawCircle(x, baseY, 18, hexToRgba('#1B2631', 0.5));
      renderer.drawPolygon([
        vec2(x - 14, baseY + 4),
        vec2(x + 16, baseY + 2),
        vec2(x + 10, baseY - 16),
        vec2(x - 4, baseY - 20),
        vec2(x - 16, baseY - 8)
      ], hexToRgba('#7F8C8D'));
      
      renderer.drawPolygon([
        vec2(x - 4, baseY - 20),
        vec2(x + 4, baseY - 12),
        vec2(x - 12, baseY - 6)
      ], hexToRgba('#95A5A6'));
      break;
    }

    case 'gap': {
      // Dark crevasse
      renderer.drawCircle(x, baseY, 20, hexToRgba('#111111', 0.8));
      renderer.drawLine(x - 18, baseY, x + 18, baseY, 4, hexToRgba('#050505'));
      break;
    }

    case 'cave_entrance': {
      // Big rock arch / hole in the ground
      renderer.drawCircle(x, baseY, 28, hexToRgba('#1B2631', 0.6));
      renderer.drawPolygon([
        vec2(x - 24, baseY + 8),
        vec2(x + 24, baseY + 8),
        vec2(x + 16, baseY - 24),
        vec2(x - 16, baseY - 24)
      ], hexToRgba('#5D6D7E'));
      // The dark maw
      renderer.drawCircle(x, baseY - 4, 14, hexToRgba('#0A0A0A', 0.95));
      break;
    }

    case 'garden_plot': {
      // Custom rendered by GardenSystem
      break;
    }

    case 'windmill': {
      // Ground shadow
      renderer.drawCircle(x, baseY, 22, hexToRgba('#1B2631', 0.32));

      // Stone circular foundation
      renderer.drawRect(x - 16, y, 32, 24, hexToRgba('#7F8C8D'));
      renderer.drawRect(x - 18, y + 20, 36, 6, hexToRgba('#5D6D7E'));

      // Weathered wood tapered tower
      renderer.drawPolygon([
        vec2(x - 16, y),
        vec2(x + 16, y),
        vec2(x + 11, y - 36),
        vec2(x - 11, y - 36)
      ], hexToRgba('#6E473B'));

      // Timber cross-beams
      renderer.drawLine(x - 15, y - 10, x + 15, y - 10, 2, hexToRgba('#4A2E16'));
      renderer.drawLine(x - 13, y - 24, x + 13, y - 24, 2, hexToRgba('#4A2E16'));

      // Arched wooden entrance door
      renderer.drawRect(x - 4, y + 10, 8, 14, hexToRgba('#3E2723'));
      renderer.drawCircle(x, y + 10, 4, hexToRgba('#3E2723'));

      // Conical shingle roof
      renderer.drawPolygon([
        vec2(x - 14, y - 36),
        vec2(x + 14, y - 36),
        vec2(x, y - 52)
      ], hexToRgba('#A04000'));

      // Small upper window with warm lantern glow
      renderer.drawRect(x - 3, y - 28, 6, 7, hexToRgba('#F39C12', 0.85));

      // Windmill hub & rotating sails
      const hubX = x;
      const hubY = y - 34;
      const sailRot = time * 0.55;
      const sailLen = 32;

      for (let s = 0; s < 4; s++) {
        const angle = sailRot + (s * Math.PI) / 2;
        const tipX = hubX + Math.cos(angle) * sailLen;
        const tipY = hubY + Math.sin(angle) * sailLen;

        // Timber spar
        renderer.drawLine(hubX, hubY, tipX, tipY, 2.5, hexToRgba('#4A2E16'));

        // Canvas sail cloth lattice
        const normX = -Math.sin(angle) * 7;
        const normY = Math.cos(angle) * 7;
        renderer.drawPolygon([
          vec2(hubX + Math.cos(angle) * 8, hubY + Math.sin(angle) * 8),
          vec2(tipX, tipY),
          vec2(tipX + normX, tipY + normY),
          vec2(hubX + Math.cos(angle) * 8 + normX, hubY + Math.sin(angle) * 8 + normY)
        ], hexToRgba('#FDFEFE', 0.65));
      }

      // Central axle hub cap
      renderer.drawCircle(hubX, hubY, 4, hexToRgba('#2C3E50'));
      break;
    }

    case 'lighthouse': {
      // Ground shadow on rocks/sand
      renderer.drawCircle(x, baseY, 20, hexToRgba('#1B2631', 0.35));

      // Stone masonry foundation base
      renderer.drawRect(x - 16, y + 24, 32, 14, hexToRgba('#5D6D7E'));
      renderer.drawRect(x - 18, y + 34, 36, 6, hexToRgba('#34495E'));

      // Tapered tower body with classic alternating red & white horizontal bands
      const bands = [
        { h0: 24, h1: 12, col: '#C0392B' }, // Red
        { h0: 12, h1: 0, col: '#ECEFF1' },  // White
        { h0: 0, h1: -12, col: '#C0392B' }, // Red
        { h0: -12, h1: -24, col: '#ECEFF1' },// White
        { h0: -24, h1: -36, col: '#C0392B' } // Red
      ];

      for (const b of bands) {
        const topRatio = (b.h1 + 36) / 72;
        const botRatio = (b.h0 + 36) / 72;
        const topHalfW = 9 + topRatio * 5;
        const botHalfW = 9 + botRatio * 5;

        renderer.drawPolygon([
          vec2(x - botHalfW, y + b.h0),
          vec2(x + botHalfW, y + b.h0),
          vec2(x + topHalfW, y + b.h1),
          vec2(x - topHalfW, y + b.h1)
        ], hexToRgba(b.col));
      }

      // Observation catwalk railing
      renderer.drawRect(x - 13, y - 38, 26, 4, hexToRgba('#263238'));
      renderer.drawLine(x - 12, y - 41, x + 12, y - 41, 1.5, hexToRgba('#37474F'));

      // Glass lantern room
      renderer.drawRect(x - 8, y - 50, 16, 12, hexToRgba('#FFF9C4', 0.85));
      renderer.drawRect(x - 9, y - 50, 2, 12, hexToRgba('#263238'));
      renderer.drawRect(x + 7, y - 50, 2, 12, hexToRgba('#263238'));

      // Domed copper roof
      renderer.drawCircle(x, y - 52, 9, hexToRgba('#1B4F72'));
      renderer.drawCircle(x, y - 57, 2, hexToRgba('#F4D03F')); // Finial

      // Rotating beacon beam sweeping across the horizon
      const beamRot = time * 0.45;
      const beamLen = 140;
      const bCos = Math.cos(beamRot);
      const bSin = Math.sin(beamRot);
      const bTipX = x + bCos * beamLen;
      const bTipY = y - 44 + bSin * beamLen;
      const beamSpread = 24;

      renderer.drawPolygon([
        vec2(x, y - 44),
        vec2(bTipX - bSin * beamSpread, bTipY + bCos * beamSpread),
        vec2(bTipX + bSin * beamSpread, bTipY - bCos * beamSpread)
      ], hexToRgba('#FFF9C4', 0.22));

      // Entrance door at base
      renderer.drawRect(x - 4, y + 26, 8, 12, hexToRgba('#2C3E50'));
      break;
    }

    case 'cottage': {
      // Ground shadow
      renderer.drawCircle(x, baseY, 24, hexToRgba('#1B2631', 0.3));

      // Stone foundation
      renderer.drawRect(x - 22, y + 8, 44, 14, hexToRgba('#7F8C8D'));
      // Creeping moss along foundation
      renderer.drawCircle(x - 14, y + 16, 5, hexToRgba('#27AE60', 0.6));
      renderer.drawCircle(x + 12, y + 18, 4, hexToRgba('#2E7D32', 0.6));

      // Wooden timber walls
      renderer.drawRect(x - 20, y - 6, 40, 16, hexToRgba('#6D4C41'));

      // Cedar shingle gabled roof
      renderer.drawPolygon([
        vec2(x - 26, y - 4),
        vec2(x + 26, y - 4),
        vec2(x, y - 26)
      ], hexToRgba('#A04000'));
      // Roof trim
      renderer.drawLine(x - 27, y - 3, x, y - 27, 2.5, hexToRgba('#5D4037'));
      renderer.drawLine(x + 27, y - 3, x, y - 27, 2.5, hexToRgba('#5D4037'));

      // Moss patch on roof
      renderer.drawCircle(x - 8, y - 14, 5, hexToRgba('#4CAF50', 0.5));

      // Stone chimney with gentle wispy smoke
      renderer.drawRect(x + 12, y - 26, 7, 18, hexToRgba('#5D6D7E'));
      const smokeTime = time * 2;
      for (let sm = 0; sm < 3; sm++) {
        const smProgress = (smokeTime + sm * 0.8) % 2.5;
        const smY = y - 28 - smProgress * 12;
        const smX = x + 15 + Math.sin(smProgress * 3 + x) * 4 + wind.x * smProgress * 3;
        const smAlpha = Math.max(0, 0.4 - smProgress * 0.15);
        renderer.drawCircle(smX, smY, 3 + smProgress * 2, hexToRgba('#ECEFF1', smAlpha));
      }

      // Cozy glowing window
      renderer.drawRect(x - 14, y - 2, 9, 8, hexToRgba('#F9E79F', 0.9));
      renderer.drawLine(x - 10, y - 2, x - 10, y + 6, 1.5, hexToRgba('#4A2E16'));
      renderer.drawLine(x - 14, y + 2, x - 5, y + 2, 1.5, hexToRgba('#4A2E16'));

      // Flower box under window
      renderer.drawRect(x - 15, y + 6, 11, 3, hexToRgba('#5D4037'));
      renderer.drawCircle(x - 13, y + 5, 2, hexToRgba('#E74C3C'));
      renderer.drawCircle(x - 10, y + 5, 2, hexToRgba('#9B59B6'));
      renderer.drawCircle(x - 7, y + 5, 2, hexToRgba('#F1C40F'));

      // Wooden door
      renderer.drawRect(x + 4, y - 2, 9, 16, hexToRgba('#4E342E'));
      renderer.drawCircle(x + 11, y + 6, 1.5, hexToRgba('#F4D03F')); // Brass doorknob
      break;
    }

    case 'ruins': {
      // Stone rubble shadow
      renderer.drawCircle(x, baseY, 22, hexToRgba('#1B2631', 0.28));

      // Fallen cracked stone slabs
      renderer.drawRect(x - 20, y + 10, 14, 5, hexToRgba('#7F8C8D'));
      renderer.drawRect(x + 8, y + 12, 12, 6, hexToRgba('#95A5A6'));

      // Left upright column
      renderer.drawRect(x - 14, y - 18, 7, 30, hexToRgba('#BDC3C7'));
      renderer.drawRect(x - 15, y - 21, 9, 3, hexToRgba('#95A5A6')); // Capital

      // Right broken column (shorter, jagged top)
      renderer.drawRect(x + 7, y - 4, 7, 16, hexToRgba('#BDC3C7'));
      renderer.drawPolygon([
        vec2(x + 7, y - 4),
        vec2(x + 14, y - 4),
        vec2(x + 10, y - 8)
      ], hexToRgba('#95A5A6'));

      // Broken lintel stone connecting
      renderer.drawLine(x - 16, y - 21, x - 2, y - 17, 4, hexToRgba('#BDC3C7'));

      // Overgrown ivy climbing the stones
      renderer.drawCircle(x - 11, y - 8, 3.5, hexToRgba('#27AE60', 0.8));
      renderer.drawCircle(x - 13, y - 2, 3, hexToRgba('#1E8449', 0.8));
      renderer.drawCircle(x + 10, y + 2, 4, hexToRgba('#27AE60', 0.8));
      break;
    }

    case 'stone_circle': {
      // Ancient megalithic standing stones in a ring
      const radius = 24;
      const stones = 7;
      renderer.drawCircle(x, y, radius + 4, hexToRgba('#1B2631', 0.18)); // Circular mound shadow

      // Center sacred moss patch with tiny blossoms
      renderer.drawCircle(x, y, 7, hexToRgba('#2ECC71', 0.3));
      renderer.drawCircle(x - 2, y - 1, 2, hexToRgba('#3498DB', 0.8));
      renderer.drawCircle(x + 2, y + 2, 2, hexToRgba('#9B59B6', 0.8));

      // Standing megaliths
      for (let s = 0; s < stones; s++) {
        const angle = (s / stones) * Math.PI * 2;
        const sx = x + Math.cos(angle) * radius;
        const sy = y + Math.sin(angle) * radius * 0.75; // Isometric perspective squish
        const sH = 10 + (s % 3) * 3;

        renderer.drawCircle(sx, sy + 3, 4, hexToRgba('#1B2631', 0.3));
        renderer.drawRect(sx - 3, sy - sH, 6, sH + 3, hexToRgba('#7F8C8D'));
        renderer.drawRect(sx - 2, sy - sH + 1, 4, 3, hexToRgba('#BDC3C7')); // Top highlight
        // Lichen patch
        if (s % 2 === 0) {
          renderer.drawCircle(sx, sy - sH / 2, 2, hexToRgba('#F39C12', 0.7));
        }
      }
      break;
    }

    case 'wind_chime': {
      // 1. Soft ground shadow
      renderer.drawCircle(x, baseY, 6, hexToRgba('#1B2631', 0.28));

      // 2. Carved wooden post & overhang crossbar
      renderer.drawRect(x - 2, y - 24, 4, 26, hexToRgba('#4A2E16')); // Main post
      renderer.drawRect(x - 8, y - 26, 16, 3, hexToRgba('#5C381E')); // Crossbar
      renderer.drawRect(x - 9, y - 28, 18, 2, hexToRgba('#784212')); // Tiny overhang canopy

      // 3. Gentle wind sway of hanging pipes
      const sway = Math.sin(time * 3.0 + x * 0.05) * 2.0;

      // Bronze tubes (tuned lengths)
      const tubeLengths = [12, 16, 14, 10];
      const tubeOffsets = [-6, -2, 2, 6];
      for (let t = 0; t < 4; t++) {
        const tx = x + tubeOffsets[t] + sway * (0.4 + t * 0.15);
        const ty = y - 23;
        const len = tubeLengths[t];
        // Fine thread line
        renderer.drawLine(x + tubeOffsets[t], y - 23, tx, ty + 3, 1, hexToRgba('#BDC3C7', 0.6));
        // Bronze metallic pipe
        renderer.drawRect(tx - 1, ty + 3, 2, len, hexToRgba('#D4AC0D'));
        renderer.drawRect(tx, ty + 3, 1, len, hexToRgba('#F9E79F', 0.8)); // Metallic shine
      }

      // Central wooden clapper & swinging chime leaf
      const clapperX = x + sway * 0.9;
      const clapperY = y - 13;
      renderer.drawCircle(clapperX, clapperY, 2.5, hexToRgba('#784212')); // Clapper disk
      // Dangling amber leaf catching the sun
      renderer.drawCircle(clapperX + sway * 0.5, clapperY + 8, 3, hexToRgba('#F39C12', 0.9));
      break;
    }

    default:
      break;
  }
}
