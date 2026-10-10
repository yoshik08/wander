import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';
import { ColorRGBA, hexToRgba, vec2, Vec2 } from '../core/math';
import { PRNG } from '../core/prng';
import { BiomeType } from './biomes';
import { CHUNK_TILES, TILE_SIZE, CHUNK_PIXEL_SIZE, TILE_FLAG_PATH } from './chunk';

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
  | 'wind_chime'
  | 'village_well'
  | 'village_house'
  | 'notice_board'
  | 'lamp_post'
  | 'fence'
  | 'market_stall'
  | 'abandoned_cart'
  | 'watchtower'
  | 'watermill'
  | 'ruined_arch'
  | 'cozy_tavern'
  | 'blacksmith_forge'
  | 'apiary'
  | 'sheep_pen'
  | 'wooden_crane'
  // W6
  | 'shipwreck'
  | 'coral_reef'
  | 'giant_clam'
  | 'sea_stack'
  | 'pirate_cove'
  | 'glowing_shroom'
  | 'cave_stalagmite'
  | 'underground_lake'
  | 'sunken_statue'
  | 'kelp_forest'
  | 'ocean_trench_glow'
  | 'beach_shack'
  | 'sandcastle'
  | 'driftwood_shelter'
  | 'sea_cave_entrance'
  | 'tide_pool'
  | 'abandoned_rowboat'
  | 'pearl_oyster'
  | 'waterfall_grotto'
  | 'crystal_geode'
  | 'underground_ruins'
  | 'glow_worm_cave'
  | 'subterranean_river'
  | 'fossil_embedded_rock'
  | 'abyssal_vent'
  // W7 Natural Wonders & Cozy POIs
  | 'geyser'
  | 'hot_spring'
  | 'giant_tree'
  | 'fallen_log'
  | 'mossy_boulder'
  | 'campsite'
  | 'picnic_blanket'
  | 'bird_bath'
  | 'abandoned_tent'
  | 'fishing_dock'
  | 'flower_arch'
  | 'stone_bridge'
  | 'wooden_bridge'
  | 'rope_bridge'
  | 'fairy_ring'
  | 'mushroom_cluster'
  | 'abandoned_well'
  | 'statue_of_the_wanderer'
  | 'meteor_crater'
  | 'crystal_outcropping'
  | 'bamboo_chimes'
  | 'stone_lantern'
  | 'koi_pond'
  | 'torii_gate'
  | 'cherry_blossom_pavilion'
  | 'snow_fort'
  | 'ice_sculpture'
  | 'frozen_waterfall'
  | 'cactus_grove'
  | 'oasis_pool'
  // W8 Legendary Mythic Structures
  | 'sky_pillar'
  | 'moon_shrine'
  | 'sun_dial'
  | 'star_forge'
  | 'floating_island_shadow'
  | 'aurora_obelisk'
  | 'time_rift'
  | 'celestial_observatory'
  | 'world_tree_roots'
  | 'glider_launchpad';

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
  wind_chime: { type: 'wind_chime', rarity: StructureRarity.Uncommon, allowedBiomes: undefined, minElev: -0.2, maxElev: 0.9, allowWater: false, spawnWeight: 1.5, width: 16, height: 32, yOffset: 12, variants: 1, solidFootprint: [] },
  village_well: { type: 'village_well', rarity: StructureRarity.Legendary, allowedBiomes: undefined, minElev: 0, maxElev: 1, allowWater: false, spawnWeight: 0, width: 28, height: 28, yOffset: 12, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  village_house: { type: 'village_house', rarity: StructureRarity.Legendary, allowedBiomes: undefined, minElev: 0, maxElev: 1, allowWater: false, spawnWeight: 0, width: 48, height: 48, yOffset: 16, variants: 2, solidFootprint: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
  notice_board: { type: 'notice_board', rarity: StructureRarity.Legendary, allowedBiomes: undefined, minElev: 0, maxElev: 1, allowWater: false, spawnWeight: 0, width: 24, height: 32, yOffset: 16, variants: 1, solidFootprint: [{ dx: -1, dy: 0 }] },
  lamp_post: { type: 'lamp_post', rarity: StructureRarity.Legendary, allowedBiomes: undefined, minElev: 0, maxElev: 1, allowWater: false, spawnWeight: 0, width: 12, height: 36, yOffset: 24, variants: 1, solidFootprint: [{ dx: 1, dy: 1 }] },
  fence: { type: 'fence', rarity: StructureRarity.Legendary, allowedBiomes: undefined, minElev: 0, maxElev: 1, allowWater: false, spawnWeight: 0, width: 24, height: 16, yOffset: 8, variants: 1, solidFootprint: [] },
  market_stall: { type: 'market_stall', rarity: StructureRarity.Uncommon, allowedBiomes: undefined, minElev: -0.1, maxElev: 0.8, allowWater: false, spawnWeight: 1, width: 32, height: 32, yOffset: 16, variants: 3, solidFootprint: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
  abandoned_cart: { type: 'abandoned_cart', rarity: StructureRarity.Common, allowedBiomes: undefined, minElev: -0.1, maxElev: 0.9, allowWater: false, spawnWeight: 1.5, width: 28, height: 24, yOffset: 12, variants: 2, solidFootprint: [{ dx: 0, dy: 0 }] },
  watchtower: { type: 'watchtower', rarity: StructureRarity.Rare, allowedBiomes: undefined, minElev: 0.3, maxElev: 0.9, allowWater: false, spawnWeight: 0.8, width: 40, height: 80, yOffset: 20, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  watermill: { type: 'watermill', rarity: StructureRarity.Rare, allowedBiomes: undefined, minElev: -0.5, maxElev: -0.2, allowWater: true, spawnWeight: 0.5, width: 64, height: 64, yOffset: 20, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
  ruined_arch: { type: 'ruined_arch', rarity: StructureRarity.Rare, allowedBiomes: undefined, minElev: 0.0, maxElev: 0.8, allowWater: false, spawnWeight: 1, width: 56, height: 60, yOffset: 24, variants: 2, solidFootprint: [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }] },
  cozy_tavern: { type: 'cozy_tavern', rarity: StructureRarity.Rare, allowedBiomes: undefined, minElev: -0.1, maxElev: 0.7, allowWater: false, spawnWeight: 0.6, width: 72, height: 64, yOffset: 28, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }] },
  blacksmith_forge: { type: 'blacksmith_forge', rarity: StructureRarity.Uncommon, allowedBiomes: undefined, minElev: -0.1, maxElev: 0.7, allowWater: false, spawnWeight: 0.8, width: 56, height: 48, yOffset: 24, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
  apiary: { type: 'apiary', rarity: StructureRarity.Uncommon, allowedBiomes: undefined, minElev: -0.1, maxElev: 0.6, allowWater: false, spawnWeight: 1.2, width: 24, height: 24, yOffset: 12, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  sheep_pen: { type: 'sheep_pen', rarity: StructureRarity.Uncommon, allowedBiomes: undefined, minElev: -0.1, maxElev: 0.6, allowWater: false, spawnWeight: 1.0, width: 64, height: 48, yOffset: 20, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
  wooden_crane: { type: 'wooden_crane', rarity: StructureRarity.Rare, allowedBiomes: undefined, minElev: -0.2, maxElev: 0.5, allowWater: false, spawnWeight: 0.7, width: 48, height: 64, yOffset: 24, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  // W6 Ocean/Underground
  shipwreck: { type: 'shipwreck', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.SandyCoast, BiomeType.DeepOcean], minElev: -0.8, maxElev: -0.2, allowWater: true, spawnWeight: 1, width: 90, height: 60, yOffset: 20, variants: 2, solidFootprint: [{ dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
  coral_reef: { type: 'coral_reef', rarity: StructureRarity.Common, allowedBiomes: [BiomeType.CoralShallows], minElev: -0.5, maxElev: -0.2, allowWater: true, spawnWeight: 4, width: 48, height: 48, yOffset: 12, variants: 4, solidFootprint: [] },
  giant_clam: { type: 'giant_clam', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.DeepOcean, BiomeType.CoralShallows], minElev: -0.6, maxElev: -0.3, allowWater: true, spawnWeight: 1.5, width: 32, height: 32, yOffset: 12, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  sea_stack: { type: 'sea_stack', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.DeepOcean, BiomeType.SandyCoast], minElev: -0.5, maxElev: -0.1, allowWater: true, spawnWeight: 2, width: 48, height: 90, yOffset: 30, variants: 2, solidFootprint: [{ dx: 0, dy: 0 }] },
  pirate_cove: { type: 'pirate_cove', rarity: StructureRarity.Legendary, allowedBiomes: [BiomeType.SandyCoast], minElev: 0.0, maxElev: 0.3, allowWater: false, spawnWeight: 0.5, width: 120, height: 90, yOffset: 40, variants: 1, solidFootprint: [{ dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
  glowing_shroom: { type: 'glowing_shroom', rarity: StructureRarity.Common, allowedBiomes: [BiomeType.LushCave, BiomeType.MushroomFields], minElev: 0.0, maxElev: 1.0, allowWater: false, spawnWeight: 3.5, width: 36, height: 48, yOffset: 16, variants: 3, solidFootprint: [{ dx: 0, dy: 0 }] },
  cave_stalagmite: { type: 'cave_stalagmite', rarity: StructureRarity.Common, allowedBiomes: [BiomeType.LushCave, BiomeType.DripstoneCave], minElev: 0.0, maxElev: 1.0, allowWater: false, spawnWeight: 4.5, width: 24, height: 60, yOffset: 20, variants: 3, solidFootprint: [{ dx: 0, dy: 0 }] },
  underground_lake: { type: 'underground_lake', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.LushCave, BiomeType.DripstoneCave], minElev: 0.0, maxElev: 1.0, allowWater: false, spawnWeight: 1, width: 90, height: 90, yOffset: 45, variants: 1, solidFootprint: [] },
  sunken_statue: { type: 'sunken_statue', rarity: StructureRarity.Legendary, allowedBiomes: [BiomeType.DeepOcean], minElev: -1.0, maxElev: -0.5, allowWater: true, spawnWeight: 0.3, width: 60, height: 90, yOffset: 30, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  kelp_forest: { type: 'kelp_forest', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.CoralShallows], minElev: -0.6, maxElev: -0.2, allowWater: true, spawnWeight: 3, width: 48, height: 80, yOffset: 24, variants: 3, solidFootprint: [] },
  ocean_trench_glow: { type: 'ocean_trench_glow', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.DeepOcean], minElev: -1.0, maxElev: -0.8, allowWater: true, spawnWeight: 1, width: 64, height: 32, yOffset: 16, variants: 1, solidFootprint: [] },
  beach_shack: { type: 'beach_shack', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.SandyCoast], minElev: 0.05, maxElev: 0.2, allowWater: false, spawnWeight: 2, width: 48, height: 48, yOffset: 16, variants: 2, solidFootprint: [{ dx: 0, dy: 0 }] },
  sandcastle: { type: 'sandcastle', rarity: StructureRarity.Common, allowedBiomes: [BiomeType.SandyCoast], minElev: 0.0, maxElev: 0.15, allowWater: false, spawnWeight: 3, width: 24, height: 24, yOffset: 10, variants: 2, solidFootprint: [] },
  driftwood_shelter: { type: 'driftwood_shelter', rarity: StructureRarity.Common, allowedBiomes: [BiomeType.SandyCoast], minElev: 0.05, maxElev: 0.2, allowWater: false, spawnWeight: 2.5, width: 36, height: 32, yOffset: 12, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  sea_cave_entrance: { type: 'sea_cave_entrance', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.SandyCoast, BiomeType.RockyCliffs], minElev: -0.1, maxElev: 0.2, allowWater: true, spawnWeight: 1.5, width: 80, height: 80, yOffset: 30, variants: 1, solidFootprint: [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }] },
  tide_pool: { type: 'tide_pool', rarity: StructureRarity.Common, allowedBiomes: [BiomeType.SandyCoast], minElev: -0.05, maxElev: 0.05, allowWater: true, spawnWeight: 3, width: 48, height: 48, yOffset: 12, variants: 2, solidFootprint: [] },
  abandoned_rowboat: { type: 'abandoned_rowboat', rarity: StructureRarity.Common, allowedBiomes: [BiomeType.SandyCoast, BiomeType.CoralShallows], minElev: -0.2, maxElev: 0.1, allowWater: true, spawnWeight: 2.5, width: 32, height: 20, yOffset: 10, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  pearl_oyster: { type: 'pearl_oyster', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.CoralShallows, BiomeType.DeepOcean], minElev: -0.8, maxElev: -0.3, allowWater: true, spawnWeight: 1.5, width: 20, height: 20, yOffset: 8, variants: 1, solidFootprint: [] },
  waterfall_grotto: { type: 'waterfall_grotto', rarity: StructureRarity.Legendary, allowedBiomes: [BiomeType.LushCave], minElev: 0.0, maxElev: 1.0, allowWater: false, spawnWeight: 0.5, width: 90, height: 120, yOffset: 45, variants: 1, solidFootprint: [{ dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
  crystal_geode: { type: 'crystal_geode', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.DripstoneCave], minElev: 0.0, maxElev: 1.0, allowWater: false, spawnWeight: 1, width: 48, height: 48, yOffset: 24, variants: 2, solidFootprint: [{ dx: 0, dy: 0 }] },
  underground_ruins: { type: 'underground_ruins', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.DripstoneCave, BiomeType.LushCave], minElev: 0.0, maxElev: 1.0, allowWater: false, spawnWeight: 1, width: 80, height: 60, yOffset: 24, variants: 2, solidFootprint: [{ dx: -1, dy: 0 }, { dx: 0, dy: 0 }] },
  glow_worm_cave: { type: 'glow_worm_cave', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.LushCave, BiomeType.DripstoneCave], minElev: 0.0, maxElev: 1.0, allowWater: false, spawnWeight: 2, width: 64, height: 64, yOffset: 32, variants: 1, solidFootprint: [] },
  subterranean_river: { type: 'subterranean_river', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.LushCave, BiomeType.DripstoneCave], minElev: 0.0, maxElev: 1.0, allowWater: false, spawnWeight: 2, width: 80, height: 48, yOffset: 20, variants: 1, solidFootprint: [] },
  fossil_embedded_rock: { type: 'fossil_embedded_rock', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.DripstoneCave], minElev: 0.0, maxElev: 1.0, allowWater: false, spawnWeight: 2, width: 36, height: 48, yOffset: 16, variants: 2, solidFootprint: [{ dx: 0, dy: 0 }] },
  abyssal_vent: { type: 'abyssal_vent', rarity: StructureRarity.Legendary, allowedBiomes: [BiomeType.DeepOcean], minElev: -1.0, maxElev: -0.9, allowWater: true, spawnWeight: 0.5, width: 64, height: 90, yOffset: 30, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  // W7
  geyser: { type: 'geyser', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.MistyHighlands, BiomeType.VolcanicAsh], minElev: 0.1, maxElev: 0.9, allowWater: false, spawnWeight: 1, width: 36, height: 60, yOffset: 12, variants: 1, solidFootprint: [] },
  hot_spring: { type: 'hot_spring', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.SnowyTundra, BiomeType.MistyHighlands], minElev: 0.1, maxElev: 0.8, allowWater: false, spawnWeight: 2, width: 72, height: 60, yOffset: 24, variants: 1, solidFootprint: [] },
  giant_tree: { type: 'giant_tree', rarity: StructureRarity.Legendary, allowedBiomes: [BiomeType.OldGrowthForest, BiomeType.PineForest], minElev: 0.0, maxElev: 0.8, allowWater: false, spawnWeight: 0.5, width: 90, height: 180, yOffset: 45, variants: 2, solidFootprint: [{ dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
  fallen_log: { type: 'fallen_log', rarity: StructureRarity.Common, allowedBiomes: [BiomeType.OldGrowthForest, BiomeType.AutumnMaple], minElev: -0.1, maxElev: 0.8, allowWater: false, spawnWeight: 3, width: 64, height: 32, yOffset: 16, variants: 2, solidFootprint: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
  mossy_boulder: { type: 'mossy_boulder', rarity: StructureRarity.Common, allowedBiomes: [BiomeType.Meadow, BiomeType.RiverDelta], minElev: 0.0, maxElev: 0.8, allowWater: false, spawnWeight: 4, width: 32, height: 32, yOffset: 12, variants: 3, solidFootprint: [{ dx: 0, dy: 0 }] },
  campsite: { type: 'campsite', rarity: StructureRarity.Uncommon, allowedBiomes: undefined, minElev: -0.1, maxElev: 0.8, allowWater: false, spawnWeight: 1, width: 64, height: 64, yOffset: 24, variants: 1, solidFootprint: [] },
  picnic_blanket: { type: 'picnic_blanket', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.Meadow, BiomeType.CherryBlossom], minElev: -0.1, maxElev: 0.6, allowWater: false, spawnWeight: 1.5, width: 48, height: 36, yOffset: 12, variants: 2, solidFootprint: [] },
  bird_bath: { type: 'bird_bath', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.FlowerMeadow, BiomeType.WildflowerFields], minElev: 0.0, maxElev: 0.6, allowWater: false, spawnWeight: 0.8, width: 20, height: 32, yOffset: 12, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  abandoned_tent: { type: 'abandoned_tent', rarity: StructureRarity.Uncommon, allowedBiomes: undefined, minElev: -0.1, maxElev: 0.8, allowWater: false, spawnWeight: 1.2, width: 48, height: 36, yOffset: 16, variants: 2, solidFootprint: [{ dx: 0, dy: 0 }] },
  fishing_dock: { type: 'fishing_dock', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.LakesRivers], minElev: -0.2, maxElev: 0.1, allowWater: true, spawnWeight: 1, width: 48, height: 48, yOffset: 20, variants: 1, solidFootprint: [] },
  flower_arch: { type: 'flower_arch', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.CherryBlossom, BiomeType.WildflowerFields], minElev: 0.0, maxElev: 0.6, allowWater: false, spawnWeight: 1.5, width: 48, height: 60, yOffset: 20, variants: 2, solidFootprint: [] },
  stone_bridge: { type: 'stone_bridge', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.LakesRivers], minElev: -0.2, maxElev: 0.2, allowWater: true, spawnWeight: 0.8, width: 64, height: 40, yOffset: 20, variants: 1, solidFootprint: [] },
  wooden_bridge: { type: 'wooden_bridge', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.LakesRivers], minElev: -0.2, maxElev: 0.2, allowWater: true, spawnWeight: 1.2, width: 64, height: 32, yOffset: 16, variants: 1, solidFootprint: [] },
  rope_bridge: { type: 'rope_bridge', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.RockyCliffs, BiomeType.SkyIslandCliffs], minElev: 0.5, maxElev: 1.0, allowWater: false, spawnWeight: 1, width: 80, height: 24, yOffset: 12, variants: 1, solidFootprint: [] },
  fairy_ring: { type: 'fairy_ring', rarity: StructureRarity.Legendary, allowedBiomes: [BiomeType.MushroomFields, BiomeType.OldGrowthForest], minElev: 0.0, maxElev: 0.8, allowWater: false, spawnWeight: 0.4, width: 64, height: 64, yOffset: 24, variants: 1, solidFootprint: [] },
  mushroom_cluster: { type: 'mushroom_cluster', rarity: StructureRarity.Common, allowedBiomes: [BiomeType.MushroomFields], minElev: -0.1, maxElev: 0.8, allowWater: false, spawnWeight: 4, width: 32, height: 48, yOffset: 16, variants: 3, solidFootprint: [{ dx: 0, dy: 0 }] },
  abandoned_well: { type: 'abandoned_well', rarity: StructureRarity.Rare, allowedBiomes: undefined, minElev: -0.1, maxElev: 0.8, allowWater: false, spawnWeight: 0.8, width: 28, height: 32, yOffset: 12, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  statue_of_the_wanderer: { type: 'statue_of_the_wanderer', rarity: StructureRarity.Legendary, allowedBiomes: undefined, minElev: 0.2, maxElev: 0.9, allowWater: false, spawnWeight: 0.3, width: 48, height: 80, yOffset: 24, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  meteor_crater: { type: 'meteor_crater', rarity: StructureRarity.Legendary, allowedBiomes: undefined, minElev: 0.0, maxElev: 0.8, allowWater: false, spawnWeight: 0.2, width: 120, height: 100, yOffset: 50, variants: 1, solidFootprint: [] },
  crystal_outcropping: { type: 'crystal_outcropping', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.CrystalGeodeCave], minElev: 0.0, maxElev: 1.0, allowWater: false, spawnWeight: 2, width: 40, height: 48, yOffset: 16, variants: 3, solidFootprint: [{ dx: 0, dy: 0 }] },
  bamboo_chimes: { type: 'bamboo_chimes', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.BambooGrove], minElev: 0.0, maxElev: 0.8, allowWater: false, spawnWeight: 2, width: 16, height: 48, yOffset: 12, variants: 1, solidFootprint: [] },
  stone_lantern: { type: 'stone_lantern', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.BambooGrove, BiomeType.CherryBlossom], minElev: 0.0, maxElev: 0.8, allowWater: false, spawnWeight: 2, width: 16, height: 32, yOffset: 12, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  koi_pond: { type: 'koi_pond', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.BambooGrove, BiomeType.CherryBlossom], minElev: 0.0, maxElev: 0.6, allowWater: false, spawnWeight: 0.8, width: 64, height: 64, yOffset: 24, variants: 1, solidFootprint: [] },
  torii_gate: { type: 'torii_gate', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.BambooGrove, BiomeType.CherryBlossom], minElev: 0.0, maxElev: 0.8, allowWater: true, spawnWeight: 0.6, width: 80, height: 90, yOffset: 24, variants: 1, solidFootprint: [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }] },
  cherry_blossom_pavilion: { type: 'cherry_blossom_pavilion', rarity: StructureRarity.Legendary, allowedBiomes: [BiomeType.CherryBlossom], minElev: 0.1, maxElev: 0.8, allowWater: false, spawnWeight: 0.4, width: 90, height: 90, yOffset: 36, variants: 1, solidFootprint: [{ dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
  snow_fort: { type: 'snow_fort', rarity: StructureRarity.Uncommon, allowedBiomes: [BiomeType.SnowyTundra, BiomeType.AlpinePeaks], minElev: 0.2, maxElev: 1.0, allowWater: false, spawnWeight: 1.5, width: 48, height: 32, yOffset: 20, variants: 2, solidFootprint: [{ dx: 0, dy: 0 }] },
  ice_sculpture: { type: 'ice_sculpture', rarity: StructureRarity.Rare, allowedBiomes: [BiomeType.IceSpikes, BiomeType.FrozenLake], minElev: 0.0, maxElev: 1.0, allowWater: false, spawnWeight: 1, width: 32, height: 60, yOffset: 16, variants: 3, solidFootprint: [{ dx: 0, dy: 0 }] },
  frozen_waterfall: { type: 'frozen_waterfall', rarity: StructureRarity.Legendary, allowedBiomes: [BiomeType.AlpinePeaks], minElev: 0.4, maxElev: 1.0, allowWater: false, spawnWeight: 0.5, width: 80, height: 120, yOffset: 40, variants: 1, solidFootprint: [] },
  cactus_grove: { type: 'cactus_grove', rarity: StructureRarity.Common, allowedBiomes: [BiomeType.DesertDunes, BiomeType.BadlandsMesa], minElev: 0.0, maxElev: 0.8, allowWater: false, spawnWeight: 3, width: 48, height: 64, yOffset: 20, variants: 3, solidFootprint: [] },
  oasis_pool: { type: 'oasis_pool', rarity: StructureRarity.Legendary, allowedBiomes: [BiomeType.Oasis], minElev: 0.0, maxElev: 0.6, allowWater: false, spawnWeight: 0.8, width: 90, height: 90, yOffset: 40, variants: 1, solidFootprint: [] },
  // W8
  sky_pillar: { type: 'sky_pillar', rarity: StructureRarity.Legendary, allowedBiomes: undefined, minElev: 0.7, maxElev: 1.0, allowWater: false, spawnWeight: 0.1, width: 64, height: 200, yOffset: 32, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  moon_shrine: { type: 'moon_shrine', rarity: StructureRarity.Legendary, allowedBiomes: undefined, minElev: 0.4, maxElev: 1.0, allowWater: false, spawnWeight: 0.2, width: 80, height: 100, yOffset: 30, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  sun_dial: { type: 'sun_dial', rarity: StructureRarity.Legendary, allowedBiomes: undefined, minElev: 0.2, maxElev: 0.8, allowWater: false, spawnWeight: 0.2, width: 64, height: 32, yOffset: 24, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  star_forge: { type: 'star_forge', rarity: StructureRarity.Legendary, allowedBiomes: undefined, minElev: 0.5, maxElev: 1.0, allowWater: false, spawnWeight: 0.1, width: 90, height: 80, yOffset: 40, variants: 1, solidFootprint: [{ dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
  floating_island_shadow: { type: 'floating_island_shadow', rarity: StructureRarity.Legendary, allowedBiomes: undefined, minElev: -0.2, maxElev: 1.0, allowWater: true, spawnWeight: 0.1, width: 120, height: 40, yOffset: 20, variants: 1, solidFootprint: [] },
  aurora_obelisk: { type: 'aurora_obelisk', rarity: StructureRarity.Legendary, allowedBiomes: [BiomeType.SnowyTundra, BiomeType.IceSpikes], minElev: 0.2, maxElev: 1.0, allowWater: false, spawnWeight: 0.2, width: 48, height: 140, yOffset: 24, variants: 1, solidFootprint: [{ dx: 0, dy: 0 }] },
  time_rift: { type: 'time_rift', rarity: StructureRarity.Legendary, allowedBiomes: undefined, minElev: 0.0, maxElev: 1.0, allowWater: true, spawnWeight: 0.05, width: 64, height: 64, yOffset: 32, variants: 1, solidFootprint: [] },
  celestial_observatory: { type: 'celestial_observatory', rarity: StructureRarity.Legendary, allowedBiomes: [BiomeType.AlpinePeaks, BiomeType.SkyIslandCliffs], minElev: 0.6, maxElev: 1.0, allowWater: false, spawnWeight: 0.1, width: 90, height: 120, yOffset: 40, variants: 1, solidFootprint: [{ dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 }] },
  world_tree_roots: { type: 'world_tree_roots', rarity: StructureRarity.Legendary, allowedBiomes: [BiomeType.OldGrowthForest], minElev: 0.2, maxElev: 0.8, allowWater: false, spawnWeight: 0.1, width: 140, height: 90, yOffset: 60, variants: 1, solidFootprint: [{ dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 }] },
  glider_launchpad: { type: 'glider_launchpad', rarity: StructureRarity.Legendary, allowedBiomes: [BiomeType.SkyIslandCliffs, BiomeType.MistyHighlands], minElev: 0.7, maxElev: 1.0, allowWater: false, spawnWeight: 0.3, width: 48, height: 24, yOffset: 12, variants: 1, solidFootprint: [] }
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

  // 1.5. Village Generation Check
  if (!isWater && (bType === BiomeType.Meadow || bType === BiomeType.BirchGrove || bType === BiomeType.AutumnMaple || bType === BiomeType.PineForest || bType === BiomeType.SunflowerPlains)) {
    if (chunkRng.next() < 0.015) { // 1.5% chance per chunk
      generateVillage(structures, chunkX, chunkY, baseWorldX, baseWorldY, chunkRng, collision, tileFlags, elevation, biome);
      return structures;
    }
  }

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

function generateVillage(
  structures: StructureInstance[],
  chunkX: number,
  chunkY: number,
  baseWorldX: number,
  baseWorldY: number,
  rng: PRNG,
  collision: Uint8Array,
  tileFlags: Uint8Array,
  elevation: Float32Array,
  biome: Uint8Array
) {
  const midTile = Math.floor(CHUNK_TILES / 2);
  const wellX = baseWorldX + midTile * TILE_SIZE + 12;
  const wellY = baseWorldY + midTile * TILE_SIZE + 12;

  // 1. Central Well
  structures.push({
    id: `well-${chunkX}-${chunkY}`,
    type: 'village_well',
    x: wellX,
    y: wellY,
    baseY: wellY + 12,
    width: 28,
    height: 28,
    variant: 0,
    solidTiles: [{ dx: 0, dy: 0 }]
  });
  applySolidFootprint(midTile, midTile, [{ dx: 0, dy: 0 }], collision);

  const numHouses = rng.rangeInt(3, 6);
  for (let i = 0; i < numHouses; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = rng.rangeInt(5, 12); // tiles away
    const tx = Math.floor(midTile + Math.cos(angle) * dist);
    const ty = Math.floor(midTile + Math.sin(angle) * dist);

    if (tx > 2 && tx < CHUNK_TILES - 2 && ty > 2 && ty < CHUNK_TILES - 2) {
      const idx = ty * CHUNK_TILES + tx;
      const isWater = elevation[idx] < -0.35;
      if (!isWater && collision[idx] === 0) {
        // Place house
        const hX = baseWorldX + tx * TILE_SIZE + 12;
        const hY = baseWorldY + ty * TILE_SIZE + 12;
        structures.push({
          id: `house-${chunkX}-${chunkY}-${i}`,
          type: 'village_house',
          x: hX,
          y: hY,
          baseY: hY + 16,
          width: 48,
          height: 48,
          variant: rng.rangeInt(0, 2),
          solidTiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }]
        });
        applySolidFootprint(tx, ty, [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }], collision);

        // Path to well
        drawPath(tx, ty, midTile, midTile, tileFlags);

        // Optional props near house
        if (rng.next() < 0.5) {
          structures.push({
            id: `lamp-${chunkX}-${chunkY}-${i}`,
            type: 'lamp_post',
            x: hX + 32,
            y: hY + 16,
            baseY: hY + 24,
            width: 12,
            height: 36,
            variant: 0,
            solidTiles: [{ dx: 1, dy: 1 }]
          });
          applySolidFootprint(tx, ty, [{ dx: 1, dy: 1 }], collision);
        }
      }
    }
  }

  // Notice board near well
  structures.push({
    id: `board-${chunkX}-${chunkY}`,
    type: 'notice_board',
    x: wellX - 32,
    y: wellY + 8,
    baseY: wellY + 16,
    width: 24,
    height: 32,
    variant: 0,
    solidTiles: [{ dx: -1, dy: 0 }]
  });
  applySolidFootprint(midTile, midTile, [{ dx: -1, dy: 0 }], collision);
}

function drawPath(x0: number, y0: number, x1: number, y1: number, tileFlags: Uint8Array) {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1;
  let sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    if (x0 >= 0 && x0 < CHUNK_TILES && y0 >= 0 && y0 < CHUNK_TILES) {
      tileFlags[y0 * CHUNK_TILES + x0] |= TILE_FLAG_PATH;
    }
    if (x0 === x1 && y0 === y1) break;
    let e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
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

    case 'village_well': {
      renderer.drawCircle(x, baseY, 14, hexToRgba('#1B2631', 0.25)); // shadow
      // Stone base
      renderer.drawCircle(x, y + 4, 12, hexToRgba('#7F8C8D'));
      renderer.drawCircle(x, y + 4, 10, hexToRgba('#1B2631')); // dark water pit
      renderer.drawCircle(x, y + 4, 9, hexToRgba('#3498DB', 0.8)); // water
      // Wooden roof
      renderer.drawRect(x - 12, y - 16, 4, 20, hexToRgba('#5C381E'));
      renderer.drawRect(x + 8, y - 16, 4, 20, hexToRgba('#5C381E'));
      renderer.drawPolygonRaw([
        x - 16, y - 16,
        x, y - 24,
        x + 16, y - 16,
        x + 16, y - 12,
        x - 16, y - 12
      ], hexToRgba('#8B4513'));
      break;
    }

    case 'village_house': {
      renderer.drawCircle(x, baseY, 24, hexToRgba('#1B2631', 0.2));
      const isVariant2 = variant === 1;
      const wallColor = isVariant2 ? '#E5E7E9' : '#F5CBA7'; // plaster or stucco
      const roofColor = isVariant2 ? '#A04000' : '#E67E22'; // clay tiles
      
      renderer.drawRect(x - 20, y - 10, 40, 24, hexToRgba(wallColor));
      renderer.drawRect(x - 20, y + 10, 40, 4, hexToRgba('#D5DBDB')); // foundation
      
      // Door
      renderer.drawRect(x - 6, y + 2, 12, 12, hexToRgba('#6E2C00'));
      renderer.drawCircle(x + 3, y + 8, 1.5, hexToRgba('#F4D03F'));
      
      // Windows
      renderer.drawRect(x - 16, y - 2, 8, 8, hexToRgba('#87CEEB', 0.8));
      renderer.drawRect(x + 8, y - 2, 8, 8, hexToRgba('#87CEEB', 0.8));
      // Window panes
      renderer.drawLine(x - 12, y - 2, x - 12, y + 6, 1, hexToRgba('#3E2723'));
      renderer.drawLine(x - 16, y + 2, x - 8, y + 2, 1, hexToRgba('#3E2723'));
      renderer.drawLine(x + 12, y - 2, x + 12, y + 6, 1, hexToRgba('#3E2723'));
      renderer.drawLine(x + 8, y + 2, x + 16, y + 2, 1, hexToRgba('#3E2723'));
      
      // Roof
      renderer.drawPolygonRaw([
        x - 24, y - 10,
        x, y - 26,
        x + 24, y - 10
      ], hexToRgba(roofColor));
      
      // Chimney
      if (isVariant2) {
         renderer.drawRect(x + 12, y - 32, 6, 18, hexToRgba('#7B7D7D'));
         const smProgress = (time % 3) / 3;
         renderer.drawCircle(x + 15, y - 34 - smProgress * 12, 3 + smProgress * 4, hexToRgba('#BDC3C7', 1 - smProgress));
      }
      break;
    }

    case 'lamp_post': {
      renderer.drawCircle(x, baseY, 6, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 2, y - 24, 4, 26, hexToRgba('#2E4053'));
      // lantern
      renderer.drawRect(x - 4, y - 28, 8, 6, hexToRgba('#F4D03F', 0.9));
      renderer.drawRect(x - 5, y - 30, 10, 2, hexToRgba('#2E4053'));
      
      renderer.drawCircle(x, y - 26, 32, hexToRgba('#F5B041', 0.15));
      break;
    }

    case 'notice_board': {
      renderer.drawCircle(x, baseY, 8, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 8, y - 2, 2, 12, hexToRgba('#5C381E'));
      renderer.drawRect(x + 6, y - 2, 2, 12, hexToRgba('#5C381E'));
      renderer.drawRect(x - 10, y - 16, 20, 14, hexToRgba('#8B4513'));
      // papers
      renderer.drawRect(x - 8, y - 14, 6, 6, hexToRgba('#FDFEFE'));
      renderer.drawRect(x + 2, y - 12, 5, 7, hexToRgba('#F5EEF8'));
      renderer.drawRect(x - 4, y - 8, 8, 4, hexToRgba('#FCF3CF'));
      // little roof
      renderer.drawPolygonRaw([
         x - 12, y - 16,
         x, y - 20,
         x + 12, y - 16
      ], hexToRgba('#3E2723'));
      break;
    }

    case 'market_stall': {
      renderer.drawCircle(x, baseY, 16, hexToRgba('#1B2631', 0.25));
      renderer.drawRect(x - 14, y - 4, 28, 12, hexToRgba('#8B4513'));
      renderer.drawRect(x - 12, y - 24, 2, 20, hexToRgba('#5C381E'));
      renderer.drawRect(x + 10, y - 24, 2, 20, hexToRgba('#5C381E'));
      const canopyColor = variant === 0 ? '#E74C3C' : (variant === 1 ? '#3498DB' : '#2ECC71');
      renderer.drawPolygonRaw([x - 16, y - 24, x, y - 32, x + 16, y - 24], hexToRgba(canopyColor));
      renderer.drawCircle(x - 6, y, 4, hexToRgba('#F1C40F'));
      renderer.drawCircle(x + 4, y, 4, hexToRgba('#E67E22'));
      break;
    }
    case 'abandoned_cart': {
      renderer.drawCircle(x, baseY, 14, hexToRgba('#1B2631', 0.3));
      renderer.drawRect(x - 12, y - 6, 24, 8, hexToRgba('#5C381E'));
      renderer.drawCircle(x - 8, y + 2, 6, hexToRgba('#1B2631'));
      renderer.drawCircle(x - 8, y + 2, 4, hexToRgba('#8B4513'));
      renderer.drawCircle(x + 8, y + 2, 6, hexToRgba('#1B2631'));
      renderer.drawCircle(x + 8, y + 2, 4, hexToRgba('#8B4513'));
      renderer.drawLine(x + 12, y - 2, x + 24, y + 4, 2, hexToRgba('#5C381E')); // broken shaft
      renderer.drawRect(x - 6, y - 12, 10, 6, hexToRgba('#7F8C8D')); // cargo
      break;
    }
    case 'watchtower': {
      renderer.drawCircle(x, baseY, 18, hexToRgba('#1B2631', 0.35));
      renderer.drawPolygonRaw([x - 12, baseY, x + 12, baseY, x + 8, y - 40, x - 8, y - 40], hexToRgba('#4A2E16'));
      renderer.drawRect(x - 12, y - 48, 24, 8, hexToRgba('#5C381E')); // platform
      renderer.drawPolygonRaw([x - 14, y - 48, x, y - 64, x + 14, y - 48], hexToRgba('#2C3E50'));
      break;
    }
    case 'watermill': {
      renderer.drawCircle(x, baseY, 28, hexToRgba('#1B2631', 0.3));
      renderer.drawRect(x - 24, y - 16, 32, 32, hexToRgba('#8B4513')); // house
      renderer.drawPolygonRaw([x - 28, y - 16, x - 8, y - 36, x + 12, y - 16], hexToRgba('#A04000'));
      // wheel
      const rot = time * 1.5;
      const wx = x + 16, wy = y;
      renderer.drawCircle(wx, wy, 16, hexToRgba('#5C381E', 0.5));
      for (let w = 0; w < 4; w++) {
         const a = rot + (w * Math.PI) / 2;
         const wx2 = wx + Math.cos(a) * 16;
         const wy2 = wy + Math.sin(a) * 16;
         renderer.drawLine(wx, wy, wx2, wy2, 2, hexToRgba('#4A2E16'));
      }
      break;
    }
    case 'ruined_arch': {
      renderer.drawCircle(x, baseY, 24, hexToRgba('#1B2631', 0.25));
      renderer.drawRect(x - 20, y - 30, 8, 40, hexToRgba('#7F8C8D'));
      renderer.drawRect(x + 12, y - 10, 8, 20, hexToRgba('#7F8C8D')); // broken pillar
      renderer.drawRect(x - 20, y - 30, 24, 8, hexToRgba('#95A5A6')); // half arch
      renderer.drawCircle(x - 12, y - 20, 6, hexToRgba('#27AE60', 0.7)); // moss
      break;
    }
    case 'cozy_tavern': {
      renderer.drawCircle(x, baseY, 32, hexToRgba('#1B2631', 0.3));
      renderer.drawRect(x - 30, y - 12, 60, 28, hexToRgba('#F5CBA7'));
      renderer.drawRect(x - 32, y + 16, 64, 4, hexToRgba('#7F8C8D'));
      // roof
      renderer.drawPolygonRaw([x - 34, y - 12, x, y - 32, x + 34, y - 12], hexToRgba('#C0392B'));
      // door
      renderer.drawRect(x - 8, y + 4, 16, 12, hexToRgba('#5C381E'));
      renderer.drawCircle(x + 4, y + 10, 2, hexToRgba('#F1C40F'));
      // windows
      renderer.drawRect(x - 24, y, 10, 10, hexToRgba('#F9E79F', 0.9));
      renderer.drawRect(x + 14, y, 10, 10, hexToRgba('#F9E79F', 0.9));
      // sign
      renderer.drawRect(x - 22, y - 18, 12, 8, hexToRgba('#8B4513'));
      break;
    }
    case 'blacksmith_forge': {
      renderer.drawCircle(x, baseY, 24, hexToRgba('#1B2631', 0.3));
      renderer.drawRect(x - 24, y - 10, 32, 24, hexToRgba('#95A5A6')); // stone structure
      renderer.drawPolygonRaw([x - 26, y - 10, x - 8, y - 24, x + 10, y - 10], hexToRgba('#2C3E50'));
      // forge fire
      const flicker = Math.sin(time * 10) * 2;
      renderer.drawRect(x + 12, y + 4, 12, 10, hexToRgba('#2C3E50'));
      renderer.drawCircle(x + 18, y + 4 - flicker, 5, hexToRgba('#E67E22', 0.9));
      renderer.drawCircle(x + 18, y + 6 - flicker*0.5, 3, hexToRgba('#F1C40F', 0.9));
      // anvil
      renderer.drawRect(x + 8, y + 14, 8, 4, hexToRgba('#7F8C8D'));
      break;
    }
    case 'apiary': {
      renderer.drawCircle(x, baseY, 10, hexToRgba('#1B2631', 0.25));
      renderer.drawRect(x - 6, y - 8, 12, 16, hexToRgba('#F5CBA7'));
      renderer.drawPolygonRaw([x - 8, y - 8, x, y - 14, x + 8, y - 8], hexToRgba('#D35400'));
      // bees
      const b1x = x + Math.cos(time * 3) * 8;
      const b1y = y - 4 + Math.sin(time * 4) * 8;
      renderer.drawCircle(b1x, b1y, 1.5, hexToRgba('#F1C40F'));
      const b2x = x + Math.cos(time * 3.5 + 2) * 10;
      const b2y = y - 4 + Math.sin(time * 4.5 + 2) * 6;
      renderer.drawCircle(b2x, b2y, 1.5, hexToRgba('#F1C40F'));
      break;
    }
    case 'sheep_pen': {
      renderer.drawCircle(x, baseY, 28, hexToRgba('#1B2631', 0.15));
      // fences
      renderer.drawRect(x - 24, y - 16, 48, 2, hexToRgba('#8B4513'));
      renderer.drawRect(x - 24, y + 16, 48, 2, hexToRgba('#8B4513'));
      renderer.drawRect(x - 24, y - 16, 2, 32, hexToRgba('#8B4513'));
      renderer.drawRect(x + 22, y - 16, 2, 32, hexToRgba('#8B4513'));
      // sheep (fluffs)
      renderer.drawCircle(x - 8, y - 4, 6, hexToRgba('#ECF0F1'));
      renderer.drawCircle(x - 10, y - 6, 4, hexToRgba('#BDC3C7')); // head
      renderer.drawCircle(x + 6, y + 6, 6, hexToRgba('#ECF0F1'));
      renderer.drawCircle(x + 8, y + 4, 4, hexToRgba('#BDC3C7')); // head
      break;
    }
    case 'wooden_crane': {
      renderer.drawCircle(x, baseY, 16, hexToRgba('#1B2631', 0.25));
      renderer.drawRect(x - 4, y - 32, 8, 48, hexToRgba('#5C381E'));
      renderer.drawPolygonRaw([x - 2, y - 32, x + 24, y - 48, x + 24, y - 44], hexToRgba('#8B4513'));
      renderer.drawLine(x + 24, y - 44, x + 24, y - 12, 1, hexToRgba('#BDC3C7')); // rope
      renderer.drawRect(x + 18, y - 12, 12, 12, hexToRgba('#7F8C8D')); // crate
      break;
    }

    // W6 Structures
    case 'shipwreck': {
      renderer.drawCircle(x, baseY, 36, hexToRgba('#1B2631', 0.3));
      renderer.drawPolygonRaw([x - 30, y, x - 20, y - 16, x + 30, y - 8, x + 20, y + 8], hexToRgba('#5C381E'));
      renderer.drawLine(x - 10, y - 8, x, y - 48, 4, hexToRgba('#4A2E16')); // broken mast
      renderer.drawRect(x - 20, y - 10, 16, 16, hexToRgba('#3E2723'));
      break;
    }
    case 'coral_reef': {
      const c1 = variant === 0 ? '#E74C3C' : (variant === 1 ? '#9B59B6' : '#2ECC71');
      const c2 = variant === 3 ? '#F1C40F' : '#E67E22';
      renderer.drawCircle(x - 8, y, 8, hexToRgba(c1));
      renderer.drawCircle(x + 6, y + 4, 6, hexToRgba(c2));
      renderer.drawCircle(x, y - 6, 5, hexToRgba('#3498DB'));
      const sway = Math.sin(time * 2 + x) * 2;
      renderer.drawLine(x - 8, y, x - 10 + sway, y - 12, 2, hexToRgba(c1));
      renderer.drawLine(x + 6, y, x + 8 + sway, y - 10, 2, hexToRgba(c2));
      break;
    }
    case 'giant_clam': {
      renderer.drawCircle(x, baseY, 12, hexToRgba('#1B2631', 0.2));
      renderer.drawPolygonRaw([x - 12, y + 2, x - 8, y - 8, x + 8, y - 8, x + 12, y + 2], hexToRgba('#D5D8DC'));
      renderer.drawCircle(x, y - 4, 4, hexToRgba('#FDFEFE')); // pearl
      renderer.drawPolygonRaw([x - 14, y, x, y + 6, x + 14, y], hexToRgba('#EAEDED'));
      break;
    }
    case 'sea_stack': {
      renderer.drawCircle(x, baseY, 20, hexToRgba('#1B2631', 0.4));
      renderer.drawRect(x - 16, y - 40, 32, 44, hexToRgba('#7F8C8D'));
      renderer.drawPolygonRaw([x - 16, y - 40, x, y - 60, x + 16, y - 40], hexToRgba('#95A5A6'));
      renderer.drawCircle(x - 6, y - 20, 8, hexToRgba('#5D6D7E'));
      renderer.drawCircle(x + 8, y - 30, 6, hexToRgba('#5D6D7E'));
      break;
    }
    case 'pirate_cove': {
      renderer.drawCircle(x, baseY, 40, hexToRgba('#1B2631', 0.3));
      renderer.drawRect(x - 30, y - 20, 60, 30, hexToRgba('#5C381E'));
      renderer.drawPolygonRaw([x - 34, y - 20, x, y - 40, x + 34, y - 20], hexToRgba('#2C3E50'));
      // skull icon on roof
      renderer.drawCircle(x, y - 26, 4, hexToRgba('#ECF0F1'));
      // chests
      renderer.drawRect(x - 40, y + 10, 12, 8, hexToRgba('#8B4513'));
      renderer.drawRect(x - 40, y + 10, 12, 2, hexToRgba('#F1C40F'));
      renderer.drawRect(x + 30, y + 4, 10, 6, hexToRgba('#8B4513'));
      break;
    }
    case 'glowing_shroom': {
      renderer.drawCircle(x, baseY, 12, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 4, y - 20, 8, 22, hexToRgba('#F5EEF8'));
      const capColor = variant === 0 ? '#9B59B6' : (variant === 1 ? '#3498DB' : '#2ECC71');
      const glow = Math.sin(time * 3 + x) * 2;
      renderer.drawCircle(x, y - 20, 14 + glow, hexToRgba(capColor, 0.4));
      renderer.drawPolygonRaw([x - 16, y - 18, x, y - 32, x + 16, y - 18], hexToRgba(capColor));
      break;
    }
    case 'cave_stalagmite': {
      renderer.drawCircle(x, baseY, 10, hexToRgba('#1B2631', 0.3));
      renderer.drawPolygonRaw([x - 10, y + 4, x, y - 30, x + 10, y + 4], hexToRgba('#7F8C8D'));
      renderer.drawPolygonRaw([x - 6, y + 2, x, y - 20, x + 6, y + 2], hexToRgba('#95A5A6'));
      break;
    }
    case 'underground_lake': {
      renderer.drawCircle(x, baseY, 40, hexToRgba('#2980B9', 0.4));
      renderer.drawCircle(x - 10, y - 10, 24, hexToRgba('#3498DB', 0.5));
      const ripple = Math.sin(time * 2) * 2;
      renderer.drawCircle(x + 10, y + 10, 16 + ripple, hexToRgba('#5DADE2', 0.4));
      break;
    }
    case 'sunken_statue': {
      renderer.drawCircle(x, baseY, 24, hexToRgba('#1B2631', 0.3));
      renderer.drawRect(x - 12, y - 8, 24, 12, hexToRgba('#7F8C8D'));
      renderer.drawRect(x - 8, y - 48, 16, 40, hexToRgba('#95A5A6')); // body
      renderer.drawCircle(x, y - 56, 10, hexToRgba('#BDC3C7')); // head
      renderer.drawCircle(x - 6, y - 30, 4, hexToRgba('#27AE60', 0.6)); // algae
      renderer.drawCircle(x + 4, y - 16, 5, hexToRgba('#27AE60', 0.5)); // algae
      break;
    }
    case 'kelp_forest': {
      const sway = Math.sin(time * 1.5 + x) * 4;
      for(let i=0; i<3; i++) {
         const kx = x - 10 + i * 10;
         const ky = y + (i % 2) * 4;
         renderer.drawCircle(kx, ky, 4, hexToRgba('#1B2631', 0.2));
         renderer.drawLine(kx, ky, kx + sway * (i % 2 === 0 ? 1 : -1), ky - 40 + i * 4, 3, hexToRgba('#229954'));
      }
      break;
    }
    case 'ocean_trench_glow': {
      const g = Math.abs(Math.sin(time * 0.5));
      renderer.drawCircle(x, y, 32, hexToRgba('#1A5276', 0.6));
      renderer.drawCircle(x, y, 16, hexToRgba('#154360', 0.8));
      renderer.drawCircle(x, y, 8, hexToRgba('#3498DB', 0.5 + g * 0.5));
      break;
    }
    case 'beach_shack': {
      renderer.drawCircle(x, baseY, 20, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 18, y - 16, 36, 20, hexToRgba('#D68910'));
      renderer.drawPolygonRaw([x - 22, y - 16, x, y - 28, x + 22, y - 16], hexToRgba('#E67E22'));
      renderer.drawRect(x - 6, y - 4, 12, 8, hexToRgba('#1B2631', 0.5)); // open door
      renderer.drawLine(x - 20, y + 4, x - 20, y - 16, 2, hexToRgba('#935116')); // stilts
      renderer.drawLine(x + 20, y + 4, x + 20, y - 16, 2, hexToRgba('#935116'));
      break;
    }
    case 'sandcastle': {
      renderer.drawRect(x - 8, y - 10, 16, 12, hexToRgba('#F5CBA7'));
      renderer.drawRect(x - 12, y - 16, 8, 18, hexToRgba('#F5CBA7'));
      renderer.drawRect(x + 4, y - 16, 8, 18, hexToRgba('#F5CBA7'));
      renderer.drawPolygonRaw([x - 12, y - 16, x - 8, y - 22, x - 4, y - 16], hexToRgba('#E59866'));
      renderer.drawPolygonRaw([x + 4, y - 16, x + 8, y - 22, x + 12, y - 16], hexToRgba('#E59866'));
      break;
    }
    case 'driftwood_shelter': {
      renderer.drawCircle(x, baseY, 14, hexToRgba('#1B2631', 0.2));
      renderer.drawLine(x - 12, y + 4, x, y - 16, 4, hexToRgba('#A6ACAF'));
      renderer.drawLine(x + 12, y + 4, x, y - 16, 4, hexToRgba('#95A5A6'));
      renderer.drawLine(x, y + 8, x, y - 16, 3, hexToRgba('#7F8C8D'));
      renderer.drawCircle(x, y - 2, 6, hexToRgba('#1B2631', 0.6)); // shade inside
      break;
    }
    case 'sea_cave_entrance': {
      renderer.drawCircle(x, baseY, 32, hexToRgba('#1B2631', 0.3));
      renderer.drawRect(x - 30, y - 30, 60, 40, hexToRgba('#5D6D7E'));
      renderer.drawCircle(x, y - 40, 20, hexToRgba('#5D6D7E'));
      renderer.drawCircle(x, y - 10, 16, hexToRgba('#1B2631', 0.9)); // dark entrance
      renderer.drawCircle(x, y + 4, 20, hexToRgba('#2980B9', 0.6)); // water spilling
      break;
    }
    case 'tide_pool': {
      renderer.drawCircle(x, y, 20, hexToRgba('#5DADE2', 0.6));
      renderer.drawCircle(x - 8, y - 4, 12, hexToRgba('#3498DB', 0.5));
      renderer.drawCircle(x + 6, y + 6, 4, hexToRgba('#EC7063')); // starfish
      renderer.drawCircle(x - 12, y + 4, 3, hexToRgba('#A569BD')); // urchin
      break;
    }
    case 'abandoned_rowboat': {
      renderer.drawCircle(x, baseY, 14, hexToRgba('#1B2631', 0.25));
      renderer.drawPolygonRaw([x - 14, y, x - 8, y - 6, x + 12, y - 6, x + 16, y], hexToRgba('#8B4513')); // hull
      renderer.drawPolygonRaw([x - 10, y, x - 6, y - 4, x + 10, y - 4, x + 12, y], hexToRgba('#5C381E')); // inside
      renderer.drawLine(x - 4, y - 2, x - 12, y + 8, 2, hexToRgba('#A04000')); // broken oar
      break;
    }
    case 'pearl_oyster': {
      renderer.drawCircle(x, baseY, 8, hexToRgba('#1B2631', 0.2));
      renderer.drawCircle(x, y, 8, hexToRgba('#D5D8DC'));
      const open = Math.sin(time) > 0 ? 4 : 0;
      renderer.drawCircle(x, y - open, 8, hexToRgba('#EAEDED'));
      if (open > 0) {
         renderer.drawCircle(x, y, 3, hexToRgba('#FDFEFE')); // pearl
         renderer.drawCircle(x, y, 1.5, hexToRgba('#FFF9C4')); // shine
      }
      break;
    }
    case 'waterfall_grotto': {
      renderer.drawCircle(x, baseY, 36, hexToRgba('#1B2631', 0.3));
      renderer.drawRect(x - 30, y - 60, 60, 70, hexToRgba('#7F8C8D'));
      // waterfall
      const fall = (time * 20) % 10;
      renderer.drawRect(x - 12, y - 60, 24, 60, hexToRgba('#3498DB', 0.7));
      renderer.drawLine(x - 6, y - 60 + fall, x - 6, y - 50 + fall, 2, hexToRgba('#AED6F1', 0.8));
      renderer.drawLine(x + 6, y - 55 + fall, x + 6, y - 45 + fall, 2, hexToRgba('#AED6F1', 0.8));
      renderer.drawCircle(x, y + 6, 20, hexToRgba('#2980B9', 0.6)); // splash pool
      break;
    }
    case 'crystal_geode': {
      renderer.drawCircle(x, baseY, 20, hexToRgba('#1B2631', 0.3));
      renderer.drawCircle(x, y - 4, 18, hexToRgba('#5D6D7E'));
      renderer.drawCircle(x, y - 4, 12, hexToRgba('#1B2631'));
      // crystals inside
      const cColor = variant === 0 ? '#9B59B6' : '#E74C3C';
      const cGlow = Math.sin(time * 2 + x) * 2;
      renderer.drawPolygonRaw([x - 4, y - 4, x, y - 14, x + 4, y - 4], hexToRgba(cColor));
      renderer.drawPolygonRaw([x - 8, y, x - 6, y - 8, x - 2, y], hexToRgba(cColor));
      renderer.drawPolygonRaw([x + 2, y, x + 6, y - 8, x + 8, y], hexToRgba(cColor));
      renderer.drawCircle(x, y - 6, 8 + cGlow, hexToRgba(cColor, 0.3));
      break;
    }
    case 'underground_ruins': {
      renderer.drawCircle(x, baseY, 28, hexToRgba('#1B2631', 0.3));
      renderer.drawRect(x - 24, y - 20, 12, 28, hexToRgba('#707B7C')); // pillar 1
      renderer.drawRect(x + 12, y - 10, 12, 18, hexToRgba('#707B7C')); // pillar 2 broken
      renderer.drawRect(x - 28, y - 28, 40, 8, hexToRgba('#5D6D7E')); // fallen lintel
      renderer.drawCircle(x, y - 14, 4, hexToRgba('#9B59B6', 0.6)); // glowing moss
      break;
    }
    case 'glow_worm_cave': {
      renderer.drawCircle(x, baseY, 24, hexToRgba('#1B2631', 0.2));
      renderer.drawCircle(x, y - 16, 24, hexToRgba('#2C3E50'));
      renderer.drawCircle(x, y - 16, 18, hexToRgba('#1B2631'));
      // worms
      for (let i=0; i<8; i++) {
         const wx = x - 12 + (i * 17) % 24;
         const wy = y - 26 + (i * 11) % 12;
         const wGlow = Math.sin(time * 3 + i) * 0.5 + 0.5;
         renderer.drawCircle(wx, wy, 1 + wGlow, hexToRgba('#58D68D', 0.8));
      }
      break;
    }
    case 'subterranean_river': {
      renderer.drawRect(x - 30, y - 12, 60, 24, hexToRgba('#1B2631', 0.3));
      renderer.drawRect(x - 30, y - 8, 60, 16, hexToRgba('#2980B9', 0.6));
      const flow = (time * 15) % 20;
      renderer.drawLine(x - 20 + flow, y - 2, x - 10 + flow, y - 2, 2, hexToRgba('#85C1E9', 0.4));
      renderer.drawLine(x + flow, y + 2, x + 10 + flow, y + 2, 2, hexToRgba('#85C1E9', 0.4));
      break;
    }
    case 'fossil_embedded_rock': {
      renderer.drawCircle(x, baseY, 16, hexToRgba('#1B2631', 0.3));
      renderer.drawPolygonRaw([x - 14, y, x - 6, y - 24, x + 12, y - 16, x + 16, y + 4], hexToRgba('#7F8C8D'));
      // fossil ribs
      renderer.drawLine(x - 4, y - 12, x + 4, y - 8, 2, hexToRgba('#D5D8DC'));
      renderer.drawLine(x - 6, y - 8, x + 6, y - 4, 2, hexToRgba('#D5D8DC'));
      renderer.drawLine(x - 4, y - 4, x + 4, y, 2, hexToRgba('#D5D8DC'));
      break;
    }
    case 'abyssal_vent': {
      renderer.drawCircle(x, baseY, 24, hexToRgba('#1B2631', 0.4));
      renderer.drawPolygonRaw([x - 16, y, x - 8, y - 30, x + 8, y - 30, x + 16, y], hexToRgba('#34495E'));
      renderer.drawPolygonRaw([x - 8, y - 30, x - 4, y - 40, x + 4, y - 40, x + 8, y - 30], hexToRgba('#2C3E50'));
      // vent smoke (bubbles)
      for (let i=0; i<3; i++) {
         const by = y - 40 - ((time * 20 + i * 15) % 30);
         renderer.drawCircle(x - 2 + i*2, by, 3 + i, hexToRgba('#D5D8DC', 0.4));
      }
      break;
    }

    // W7 Natural Wonders
    case 'geyser': {
      renderer.drawCircle(x, baseY, 18, hexToRgba('#1B2631', 0.2));
      renderer.drawCircle(x, y, 16, hexToRgba('#95A5A6'));
      renderer.drawCircle(x, y, 10, hexToRgba('#3498DB'));
      const spray = Math.sin(time * 15) > 0.5 ? 1 : 0;
      if (spray) {
        renderer.drawRect(x - 4, y - 40, 8, 40, hexToRgba('#AED6F1', 0.8));
        renderer.drawCircle(x, y - 45, 10, hexToRgba('#ECF0F1', 0.6));
      }
      break;
    }
    case 'hot_spring': {
      renderer.drawCircle(x, baseY, 36, hexToRgba('#1B2631', 0.15));
      renderer.drawCircle(x, y, 32, hexToRgba('#85C1E9', 0.8));
      renderer.drawCircle(x, y - 4, 28, hexToRgba('#5DADE2', 0.9));
      renderer.drawCircle(x - 20, y - 10, 8, hexToRgba('#BDC3C7')); // rocks
      renderer.drawCircle(x + 18, y + 14, 6, hexToRgba('#BDC3C7'));
      const steam = Math.sin(time + x) * 4;
      renderer.drawCircle(x + steam, y - 16, 12, hexToRgba('#ECF0F1', 0.3));
      break;
    }
    case 'giant_tree': {
      renderer.drawCircle(x, baseY, 40, hexToRgba('#1B2631', 0.3));
      renderer.drawRect(x - 16, y - 90, 32, 100, hexToRgba('#5C381E')); // trunk
      const leaves = variant === 0 ? '#1E8449' : '#145A32';
      const wind = Math.sin(time * 0.5 + x) * 4;
      renderer.drawCircle(x + wind, y - 120, 60, hexToRgba(leaves));
      renderer.drawCircle(x - 30 + wind, y - 100, 40, hexToRgba(leaves));
      renderer.drawCircle(x + 30 + wind, y - 100, 40, hexToRgba(leaves));
      break;
    }
    case 'fallen_log': {
      renderer.drawCircle(x, baseY, 16, hexToRgba('#1B2631', 0.2));
      renderer.drawPolygonRaw([x - 30, y - 6, x + 30, y + 6, x + 30, y + 16, x - 30, y + 4], hexToRgba('#6E2C00'));
      renderer.drawCircle(x - 10, y + 2, 4, hexToRgba('#27AE60', 0.8)); // moss
      renderer.drawCircle(x + 14, y + 10, 3, hexToRgba('#9B59B6', 0.8)); // mushroom
      break;
    }
    case 'mossy_boulder': {
      renderer.drawCircle(x, baseY, 16, hexToRgba('#1B2631', 0.2));
      renderer.drawCircle(x, y - 4, 14, hexToRgba('#7F8C8D'));
      renderer.drawPolygonRaw([x - 12, y - 6, x + 8, y - 14, x + 12, y], hexToRgba('#27AE60', 0.7)); // moss cap
      break;
    }
    case 'campsite': {
      renderer.drawCircle(x, baseY, 32, hexToRgba('#1B2631', 0.15));
      renderer.drawCircle(x, y - 4, 10, hexToRgba('#5D6D7E')); // fire pit
      const flicker = Math.sin(time * 8) * 2;
      renderer.drawCircle(x, y - 6, 6 + flicker, hexToRgba('#E67E22', 0.8));
      renderer.drawRect(x - 20, y - 16, 12, 16, hexToRgba('#C0392B')); // tent
      renderer.drawRect(x + 12, y + 4, 16, 6, hexToRgba('#8B4513')); // log
      break;
    }
    case 'picnic_blanket': {
      renderer.drawPolygonRaw([x - 20, y, x, y - 10, x + 20, y, x, y + 10], hexToRgba('#E74C3C'));
      renderer.drawPolygonRaw([x - 16, y, x, y - 8, x + 16, y, x, y + 8], hexToRgba('#FDFEFE')); // checkered pattern rough
      renderer.drawCircle(x - 4, y, 4, hexToRgba('#F5CBA7')); // basket
      break;
    }
    case 'bird_bath': {
      renderer.drawCircle(x, baseY, 10, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 4, y - 20, 8, 20, hexToRgba('#95A5A6'));
      renderer.drawPolygonRaw([x - 10, y - 24, x + 10, y - 24, x + 6, y - 20, x - 6, y - 20], hexToRgba('#BDC3C7'));
      renderer.drawPolygonRaw([x - 8, y - 24, x + 8, y - 24, x + 4, y - 22, x - 4, y - 22], hexToRgba('#3498DB')); // water
      break;
    }
    case 'abandoned_tent': {
      renderer.drawCircle(x, baseY, 24, hexToRgba('#1B2631', 0.2));
      renderer.drawPolygonRaw([x - 16, y, x, y - 24, x + 16, y], hexToRgba('#2C3E50'));
      renderer.drawPolygonRaw([x - 8, y, x, y - 16, x + 8, y], hexToRgba('#1B2631')); // dark inside
      renderer.drawLine(x - 16, y, x + 16, y - 12, 2, hexToRgba('#7F8C8D')); // torn fabric
      break;
    }
    case 'fishing_dock': {
      renderer.drawPolygonRaw([x - 20, y - 10, x + 20, y + 10, x + 24, y + 6, x - 16, y - 14], hexToRgba('#8B4513'));
      renderer.drawLine(x + 16, y, x + 30, y - 20, 2, hexToRgba('#5C381E')); // rod
      renderer.drawLine(x + 30, y - 20, x + 30, y + 10, 1, hexToRgba('#ECF0F1')); // line
      break;
    }
    case 'flower_arch': {
      renderer.drawCircle(x, baseY, 24, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 16, y - 40, 4, 40, hexToRgba('#27AE60'));
      renderer.drawRect(x + 12, y - 40, 4, 40, hexToRgba('#27AE60'));
      renderer.drawPolygonRaw([x - 20, y - 40, x, y - 56, x + 20, y - 40], hexToRgba('#2ECC71'));
      // flowers
      const fc = variant === 0 ? '#F1948A' : '#F7DC6F';
      renderer.drawCircle(x - 10, y - 46, 5, hexToRgba(fc));
      renderer.drawCircle(x + 10, y - 42, 5, hexToRgba(fc));
      break;
    }
    case 'stone_bridge': {
      renderer.drawCircle(x, baseY, 24, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 30, y - 16, 60, 20, hexToRgba('#7F8C8D'));
      renderer.drawCircle(x, y - 6, 12, hexToRgba('#1B2631', 0.5)); // arch hole
      break;
    }
    case 'wooden_bridge': {
      renderer.drawRect(x - 30, y - 12, 60, 24, hexToRgba('#8B4513'));
      renderer.drawRect(x - 30, y - 16, 60, 4, hexToRgba('#5C381E')); // rails
      renderer.drawRect(x - 30, y + 12, 60, 4, hexToRgba('#5C381E'));
      break;
    }
    case 'rope_bridge': {
      renderer.drawPolygonRaw([x - 40, y - 10, x + 40, y, x + 40, y + 10, x - 40, y], hexToRgba('#5C381E'));
      const dip = Math.sin(time) * 4;
      renderer.drawLine(x - 40, y - 16, x + 40, y - 6, 2, hexToRgba('#F5CBA7')); // ropes
      break;
    }
    case 'fairy_ring': {
      renderer.drawCircle(x, baseY, 32, hexToRgba('#1B2631', 0.15));
      for (let i = 0; i < 8; i++) {
         const a = (i * Math.PI) / 4;
         const rx = x + Math.cos(a) * 20;
         const ry = y + Math.sin(a) * 20;
         renderer.drawCircle(rx, ry, 3, hexToRgba('#ECF0F1'));
         renderer.drawCircle(rx, ry - 2, 4, hexToRgba('#E74C3C'));
      }
      break;
    }
    case 'mushroom_cluster': {
      renderer.drawCircle(x, baseY, 16, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 4, y - 12, 4, 12, hexToRgba('#FDFEFE'));
      renderer.drawCircle(x - 2, y - 14, 8, hexToRgba('#E74C3C'));
      renderer.drawRect(x + 4, y - 8, 4, 8, hexToRgba('#FDFEFE'));
      renderer.drawCircle(x + 6, y - 10, 6, hexToRgba('#E74C3C'));
      break;
    }
    case 'abandoned_well': {
      renderer.drawCircle(x, baseY, 14, hexToRgba('#1B2631', 0.25));
      renderer.drawCircle(x, y - 4, 12, hexToRgba('#7F8C8D'));
      renderer.drawCircle(x, y - 4, 8, hexToRgba('#1B2631')); // hole
      renderer.drawRect(x - 10, y - 20, 2, 20, hexToRgba('#5C381E'));
      renderer.drawRect(x + 8, y - 20, 2, 20, hexToRgba('#5C381E'));
      renderer.drawRect(x - 12, y - 24, 24, 6, hexToRgba('#8B4513')); // roof
      break;
    }
    case 'statue_of_the_wanderer': {
      renderer.drawCircle(x, baseY, 24, hexToRgba('#1B2631', 0.3));
      renderer.drawRect(x - 12, y - 8, 24, 12, hexToRgba('#95A5A6')); // pedestal
      renderer.drawRect(x - 8, y - 40, 16, 32, hexToRgba('#BDC3C7')); // body
      renderer.drawCircle(x, y - 46, 8, hexToRgba('#BDC3C7')); // head
      renderer.drawLine(x + 8, y - 36, x + 16, y - 10, 3, hexToRgba('#95A5A6')); // staff
      break;
    }
    case 'meteor_crater': {
      renderer.drawCircle(x, baseY, 50, hexToRgba('#1B2631', 0.15));
      renderer.drawCircle(x, y, 40, hexToRgba('#4A2E16'));
      renderer.drawCircle(x, y, 30, hexToRgba('#3E2723'));
      // meteorite in center
      renderer.drawCircle(x, y, 10, hexToRgba('#17202A'));
      renderer.drawCircle(x - 2, y - 2, 4, hexToRgba('#5D6D7E'));
      const mglow = Math.sin(time * 2) * 2;
      renderer.drawCircle(x, y, 12 + mglow, hexToRgba('#9B59B6', 0.4));
      break;
    }
    case 'crystal_outcropping': {
      renderer.drawCircle(x, baseY, 20, hexToRgba('#1B2631', 0.2));
      const cc = variant === 0 ? '#3498DB' : (variant === 1 ? '#E74C3C' : '#2ECC71');
      renderer.drawPolygonRaw([x - 12, y, x - 6, y - 30, x, y], hexToRgba(cc));
      renderer.drawPolygonRaw([x, y, x + 8, y - 20, x + 12, y], hexToRgba(cc));
      renderer.drawCircle(x, y - 10, 16, hexToRgba(cc, 0.3)); // glow
      break;
    }
    case 'bamboo_chimes': {
      renderer.drawCircle(x, baseY, 8, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 2, y - 40, 4, 40, hexToRgba('#5C381E'));
      renderer.drawLine(x - 8, y - 36, x + 8, y - 36, 2, hexToRgba('#5C381E'));
      const sw = Math.sin(time * 3) * 2;
      renderer.drawRect(x - 6 + sw, y - 36, 2, 12, hexToRgba('#27AE60'));
      renderer.drawRect(x + 4 + sw, y - 36, 2, 16, hexToRgba('#27AE60'));
      break;
    }
    case 'stone_lantern': {
      renderer.drawCircle(x, baseY, 8, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 4, y - 16, 8, 16, hexToRgba('#7F8C8D'));
      renderer.drawRect(x - 6, y - 22, 12, 6, hexToRgba('#95A5A6'));
      renderer.drawRect(x - 4, y - 20, 8, 4, hexToRgba('#F1C40F', 0.9)); // light
      renderer.drawPolygonRaw([x - 8, y - 22, x, y - 28, x + 8, y - 22], hexToRgba('#7F8C8D'));
      break;
    }
    case 'koi_pond': {
      renderer.drawCircle(x, baseY, 32, hexToRgba('#1B2631', 0.2));
      renderer.drawCircle(x, y, 28, hexToRgba('#3498DB', 0.6));
      // koi fish
      const kx = x + Math.cos(time) * 12;
      const ky = y + Math.sin(time) * 12;
      renderer.drawCircle(kx, ky, 3, hexToRgba('#E67E22'));
      const kx2 = x + Math.cos(time + Math.PI) * 16;
      const ky2 = y + Math.sin(time + Math.PI) * 16;
      renderer.drawCircle(kx2, ky2, 3, hexToRgba('#ECF0F1'));
      break;
    }
    case 'torii_gate': {
      renderer.drawCircle(x, baseY, 40, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 30, y - 60, 6, 60, hexToRgba('#C0392B'));
      renderer.drawRect(x + 24, y - 60, 6, 60, hexToRgba('#C0392B'));
      renderer.drawRect(x - 34, y - 50, 68, 6, hexToRgba('#C0392B'));
      renderer.drawRect(x - 36, y - 64, 72, 8, hexToRgba('#192024'));
      break;
    }
    case 'cherry_blossom_pavilion': {
      renderer.drawCircle(x, baseY, 45, hexToRgba('#1B2631', 0.25));
      renderer.drawRect(x - 30, y - 10, 60, 10, hexToRgba('#D5D8DC')); // base
      renderer.drawRect(x - 24, y - 40, 4, 30, hexToRgba('#8B4513'));
      renderer.drawRect(x + 20, y - 40, 4, 30, hexToRgba('#8B4513'));
      renderer.drawPolygonRaw([x - 36, y - 40, x, y - 60, x + 36, y - 40], hexToRgba('#E74C3C'));
      break;
    }
    case 'snow_fort': {
      renderer.drawCircle(x, baseY, 24, hexToRgba('#1B2631', 0.15));
      renderer.drawRect(x - 20, y - 16, 40, 16, hexToRgba('#ECF0F1'));
      renderer.drawRect(x - 20, y - 24, 10, 8, hexToRgba('#ECF0F1'));
      renderer.drawRect(x + 10, y - 24, 10, 8, hexToRgba('#ECF0F1'));
      break;
    }
    case 'ice_sculpture': {
      renderer.drawCircle(x, baseY, 16, hexToRgba('#1B2631', 0.2));
      renderer.drawPolygonRaw([x - 12, y, x, y - 40, x + 12, y], hexToRgba('#A9CCE3', 0.8));
      renderer.drawPolygonRaw([x - 6, y, x, y - 50, x + 6, y], hexToRgba('#D4E6F1', 0.9));
      renderer.drawCircle(x, y - 20, 10, hexToRgba('#AED6F1', 0.4)); // glint
      break;
    }
    case 'frozen_waterfall': {
      renderer.drawCircle(x, baseY, 40, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 30, y - 80, 60, 90, hexToRgba('#7F8C8D'));
      renderer.drawRect(x - 16, y - 80, 32, 80, hexToRgba('#85C1E9', 0.8));
      renderer.drawPolygonRaw([x - 16, y - 80, x - 10, y, x - 4, y - 80], hexToRgba('#D4E6F1', 0.9));
      renderer.drawPolygonRaw([x + 4, y - 80, x + 10, y, x + 16, y - 80], hexToRgba('#D4E6F1', 0.9));
      break;
    }
    case 'cactus_grove': {
      renderer.drawCircle(x, baseY, 24, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 4, y - 40, 8, 40, hexToRgba('#229954'));
      renderer.drawRect(x - 12, y - 24, 8, 6, hexToRgba('#229954'));
      renderer.drawRect(x - 12, y - 30, 6, 12, hexToRgba('#229954'));
      renderer.drawRect(x + 4, y - 16, 8, 6, hexToRgba('#229954'));
      renderer.drawRect(x + 6, y - 24, 6, 14, hexToRgba('#229954'));
      break;
    }
    case 'oasis_pool': {
      renderer.drawCircle(x, baseY, 45, hexToRgba('#1B2631', 0.15));
      renderer.drawCircle(x, y, 40, hexToRgba('#F5CBA7')); // sand rim
      renderer.drawCircle(x, y, 32, hexToRgba('#3498DB', 0.8)); // water
      renderer.drawRect(x - 30, y - 40, 4, 40, hexToRgba('#8B4513')); // palm
      renderer.drawCircle(x - 30, y - 44, 16, hexToRgba('#27AE60'));
      break;
    }

    // W8 Mythical Legendary
    case 'sky_pillar': {
      renderer.drawCircle(x, baseY, 30, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 24, y - 180, 48, 190, hexToRgba('#D5D8DC'));
      renderer.drawRect(x - 20, y - 180, 40, 190, hexToRgba('#FDFEFE'));
      const pglow = Math.sin(time * 0.5) * 4;
      renderer.drawCircle(x, y - 190, 16 + pglow, hexToRgba('#3498DB', 0.6));
      renderer.drawCircle(x, y - 190, 8, hexToRgba('#AED6F1'));
      break;
    }
    case 'moon_shrine': {
      renderer.drawCircle(x, baseY, 36, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 30, y - 20, 60, 20, hexToRgba('#7F8C8D'));
      renderer.drawCircle(x, y - 40, 24, hexToRgba('#FDFEFE', 0.9)); // moon disc
      renderer.drawCircle(x + 4, y - 44, 20, hexToRgba('#BDC3C7', 0.9)); // crescent mask
      const mglow = Math.abs(Math.sin(time));
      renderer.drawCircle(x, y - 40, 30 + mglow * 10, hexToRgba('#FDFEFE', 0.2));
      break;
    }
    case 'sun_dial': {
      renderer.drawCircle(x, baseY, 30, hexToRgba('#1B2631', 0.2));
      renderer.drawCircle(x, y - 4, 24, hexToRgba('#D4AC0D'));
      renderer.drawCircle(x, y - 4, 20, hexToRgba('#F1C40F'));
      renderer.drawPolygonRaw([x - 2, y, x, y - 30, x + 2, y], hexToRgba('#17202A')); // gnomon
      const angle = (time % (Math.PI * 2));
      renderer.drawLine(x, y - 4, x + Math.cos(angle) * 16, y - 4 + Math.sin(angle) * 16, 2, hexToRgba('#17202A', 0.4)); // shadow
      break;
    }
    case 'star_forge': {
      renderer.drawCircle(x, baseY, 40, hexToRgba('#1B2631', 0.3));
      renderer.drawRect(x - 30, y - 40, 60, 40, hexToRgba('#2C3E50'));
      renderer.drawCircle(x, y - 40, 30, hexToRgba('#34495E'));
      const fire = Math.sin(time * 10) * 2;
      renderer.drawCircle(x, y - 20, 16 + fire, hexToRgba('#9B59B6', 0.8)); // purple fire
      renderer.drawCircle(x, y - 20, 8, hexToRgba('#E74C3C'));
      break;
    }
    case 'floating_island_shadow': {
      renderer.drawCircle(x, y, 60, hexToRgba('#17202A', 0.5));
      renderer.drawCircle(x - 20, y - 10, 30, hexToRgba('#17202A', 0.4));
      renderer.drawCircle(x + 20, y + 10, 20, hexToRgba('#17202A', 0.4));
      break;
    }
    case 'aurora_obelisk': {
      renderer.drawCircle(x, baseY, 20, hexToRgba('#1B2631', 0.2));
      renderer.drawPolygonRaw([x - 16, y, x, y - 120, x + 16, y], hexToRgba('#1B2631'));
      const aglow = Math.sin(time) > 0 ? '#58D68D' : '#AF7AC5';
      renderer.drawLine(x, y - 10, x, y - 110, 4, hexToRgba(aglow, 0.8));
      renderer.drawCircle(x, y - 120, 16, hexToRgba(aglow, 0.4));
      break;
    }
    case 'time_rift': {
      renderer.drawCircle(x, baseY, 30, hexToRgba('#1B2631', 0.1));
      const rot = time * 2;
      for (let i = 0; i < 4; i++) {
         const a = rot + (i * Math.PI) / 2;
         renderer.drawCircle(x + Math.cos(a)*10, y + Math.sin(a)*10 - 20, 12, hexToRgba('#AF7AC5', 0.6));
      }
      renderer.drawCircle(x, y - 20, 8, hexToRgba('#FDFEFE'));
      break;
    }
    case 'celestial_observatory': {
      renderer.drawCircle(x, baseY, 40, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 30, y - 60, 60, 60, hexToRgba('#7F8C8D'));
      renderer.drawCircle(x, y - 60, 30, hexToRgba('#FDFEFE')); // dome
      renderer.drawPolygonRaw([x, y - 90, x + 40, y - 120, x + 44, y - 110], hexToRgba('#B2BABB')); // telescope
      renderer.drawCircle(x, y - 60, 12, hexToRgba('#3498DB', 0.6)); // lens
      break;
    }
    case 'world_tree_roots': {
      renderer.drawCircle(x, baseY, 60, hexToRgba('#1B2631', 0.3));
      // massive intertwining roots
      renderer.drawLine(x - 40, y, x - 10, y - 60, 16, hexToRgba('#3E2723'));
      renderer.drawLine(x + 40, y, x + 10, y - 60, 16, hexToRgba('#3E2723'));
      renderer.drawLine(x - 20, y + 10, x, y - 50, 12, hexToRgba('#4A2E16'));
      renderer.drawCircle(x, y - 60, 30, hexToRgba('#3E2723')); // cut base
      renderer.drawCircle(x, y - 60, 20, hexToRgba('#D5D8DC', 0.5)); // sap glow
      break;
    }
    case 'glider_launchpad': {
      renderer.drawCircle(x, baseY, 24, hexToRgba('#1B2631', 0.2));
      renderer.drawRect(x - 20, y - 10, 40, 10, hexToRgba('#7F8C8D'));
      renderer.drawPolygonRaw([x - 24, y - 10, x + 24, y - 10, x + 16, y - 20, x - 16, y - 20], hexToRgba('#3498DB', 0.8));
      const updraft = (time * 20) % 20;
      renderer.drawLine(x - 8, y - 20 - updraft, x - 8, y - 30 - updraft, 2, hexToRgba('#ECF0F1', 0.6));
      renderer.drawLine(x + 8, y - 15 - updraft, x + 8, y - 25 - updraft, 2, hexToRgba('#ECF0F1', 0.6));
      break;
    }

    default:
      break;
  }
}
