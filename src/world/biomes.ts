import { ColorRGBA, hexToRgba } from '../core/math';

export enum BiomeType {
  // Canonical 13 Biomes (retaining historic numbers for full backward-compatibility)
  Meadow = 0,
  FlowerMeadow = 0,
  WildflowerFields = 1,
  BirchGrove = 2,
  BirchWoods = 2,
  PineForest = 3,
  MistyPineTaiga = 3,
  CherryBlossom = 4,
  CherryBlossomHills = 4,
  RockyCliffs = 5,
  SkyIslandCliffs = 5,
  MarshPonds = 6,
  SwampMangrove = 6,
  LakesRivers = 7,
  RiverDelta = 7,
  SandyCoast = 8,
  Beach = 8,
  AutumnMaple = 9,
  MistyHighlands = 10,
  SnowyPeaks = 11,
  AlpinePeaks = 11,
  GlowingHollow = 12,
  CrystalGeodeCave = 12,

  // Expanded World Biomes
  OldGrowthForest = 13,
  BambooGrove = 14,
  MushroomFields = 15,
  SunflowerPlains = 16,
  Savanna = 17,
  BadlandsMesa = 18,
  DesertDunes = 19,
  Oasis = 20,
  SnowyTundra = 21,
  FrozenLake = 22,
  IceSpikes = 23,
  VolcanicAsh = 24,
  CoralShallows = 25,
  DeepOcean = 26,
  LushCave = 27,
  DripstoneCave = 28
}

export interface BiomeDefinition {
  type: BiomeType;
  name: string;
  palette: {
    groundPrimary: ColorRGBA;
    groundSecondary: ColorRGBA;
    groundAccent: ColorRGBA;
    foliagePrimary: ColorRGBA;
    foliageSecondary: ColorRGBA;
    waterTint: ColorRGBA;
  };
  props: string[];
  ambientBed: string;
  creatures?: [number, number];
}

export const BIOMES: Record<BiomeType, BiomeDefinition> = {
  [BiomeType.Meadow]: {
    type: BiomeType.Meadow,
    name: 'Sunny Flower Meadow',
    palette: {
      groundPrimary: hexToRgba('#4E8A42'),
      groundSecondary: hexToRgba('#437B38'),
      groundAccent: hexToRgba('#589C4B'),
      foliagePrimary: hexToRgba('#3B7B34'),
      foliageSecondary: hexToRgba('#569E4C'),
      waterTint: hexToRgba('#3D8FD1')
    },
    props: ['grass', 'flower_daisy', 'flower_buttercup', 'oak_tree', 'log', 'pebble'],
    ambientBed: 'meadow_birds',
    creatures: [1, 20]
  },
  [BiomeType.WildflowerFields]: {
    type: BiomeType.WildflowerFields,
    name: 'Wildflower Fields',
    palette: {
      groundPrimary: hexToRgba('#549646'),
      groundSecondary: hexToRgba('#4B873D'),
      groundAccent: hexToRgba('#62AA52'),
      foliagePrimary: hexToRgba('#408639'),
      foliageSecondary: hexToRgba('#6AB85B'),
      waterTint: hexToRgba('#388EC9')
    },
    props: ['flower_poppy', 'flower_lavender', 'flower_rose', 'flower_daisy', 'grass', 'butterfly_bush'],
    ambientBed: 'meadow_breeze',
    creatures: [21, 35]
  },
  [BiomeType.BirchGrove]: {
    type: BiomeType.BirchGrove,
    name: 'Birch Woods',
    palette: {
      groundPrimary: hexToRgba('#5A8E4C'),
      groundSecondary: hexToRgba('#4E7E41'),
      groundAccent: hexToRgba('#6EA85E'),
      foliagePrimary: hexToRgba('#66A64F'),
      foliageSecondary: hexToRgba('#84C46C'),
      waterTint: hexToRgba('#4599D6')
    },
    props: ['birch_tree', 'fern', 'clover', 'log', 'white_flower'],
    ambientBed: 'rustling_leaves',
    creatures: [36, 50]
  },
  [BiomeType.PineForest]: {
    type: BiomeType.PineForest,
    name: 'Misty Pine Taiga',
    palette: {
      groundPrimary: hexToRgba('#2D542E'),
      groundSecondary: hexToRgba('#244425'),
      groundAccent: hexToRgba('#3A663B'),
      foliagePrimary: hexToRgba('#1E4223'),
      foliageSecondary: hexToRgba('#2A5E30'),
      waterTint: hexToRgba('#2D70A3')
    },
    props: ['pine_tree', 'fern', 'mushroom_brown', 'log_mossy', 'pinecone'],
    ambientBed: 'forest_wind',
    creatures: [51, 65]
  },
  [BiomeType.CherryBlossom]: {
    type: BiomeType.CherryBlossom,
    name: 'Cherry Blossom Hills',
    palette: {
      groundPrimary: hexToRgba('#588B4D'),
      groundSecondary: hexToRgba('#4B7941'),
      groundAccent: hexToRgba('#FADBD8'),
      foliagePrimary: hexToRgba('#F1948A'),
      foliageSecondary: hexToRgba('#FADBD8'),
      waterTint: hexToRgba('#5DADE2')
    },
    props: ['cherry_tree', 'petal_patch', 'lantern_stone', 'flower_pink'],
    ambientBed: 'gentle_spring',
    creatures: [66, 75]
  },
  [BiomeType.RockyCliffs]: {
    type: BiomeType.RockyCliffs,
    name: 'Sky-Island Cliffs & Rises',
    palette: {
      groundPrimary: hexToRgba('#6E6B5E'),
      groundSecondary: hexToRgba('#5B594E'),
      groundAccent: hexToRgba('#7D796A'),
      foliagePrimary: hexToRgba('#4A6E42'),
      foliageSecondary: hexToRgba('#5C7D55'),
      waterTint: hexToRgba('#4A8DB8')
    },
    props: ['boulder', 'rock_cliff', 'sparse_shrub', 'stone_cairn'],
    ambientBed: 'high_wind',
    creatures: [76, 90]
  },
  [BiomeType.MarshPonds]: {
    type: BiomeType.MarshPonds,
    name: 'Swamp & Mangrove Shallows',
    palette: {
      groundPrimary: hexToRgba('#3E6338'),
      groundSecondary: hexToRgba('#33522E'),
      groundAccent: hexToRgba('#4D7A46'),
      foliagePrimary: hexToRgba('#2E572A'),
      foliageSecondary: hexToRgba('#447A3E'),
      waterTint: hexToRgba('#356E58')
    },
    props: ['reed_marsh', 'lily_pad', 'cattail', 'water_puddle', 'mud_patch'],
    ambientBed: 'crickets_water',
    creatures: [91, 105]
  },
  [BiomeType.LakesRivers]: {
    type: BiomeType.LakesRivers,
    name: 'Clear River Delta & Lake',
    palette: {
      groundPrimary: hexToRgba('#3A8FD4'),
      groundSecondary: hexToRgba('#2F7CBF'),
      groundAccent: hexToRgba('#52A8ED'),
      foliagePrimary: hexToRgba('#2E7D32'),
      foliageSecondary: hexToRgba('#4CAF50'),
      waterTint: hexToRgba('#3A8FD4')
    },
    props: ['lily_pad', 'reed', 'river_stone', 'stepping_stone'],
    ambientBed: 'flowing_water',
    creatures: [106, 120]
  },
  [BiomeType.SandyCoast]: {
    type: BiomeType.SandyCoast,
    name: 'Sunny Coast & Beach',
    palette: {
      groundPrimary: hexToRgba('#D4B886'),
      groundSecondary: hexToRgba('#C2A574'),
      groundAccent: hexToRgba('#E2C899'),
      foliagePrimary: hexToRgba('#5A8A4C'),
      foliageSecondary: hexToRgba('#76A867'),
      waterTint: hexToRgba('#2E9CB8')
    },
    props: ['seashell', 'driftwood', 'dune_grass', 'beach_pebble'],
    ambientBed: 'ocean_waves',
    creatures: [121, 130]
  },
  [BiomeType.AutumnMaple]: {
    type: BiomeType.AutumnMaple,
    name: 'Autumn Maple Woods',
    palette: {
      groundPrimary: hexToRgba('#5D6A38'),
      groundSecondary: hexToRgba('#4F5B2F'),
      groundAccent: hexToRgba('#B95828'),
      foliagePrimary: hexToRgba('#C0392B'),
      foliageSecondary: hexToRgba('#E67E22'),
      waterTint: hexToRgba('#3E84A6')
    },
    props: ['maple_tree_red', 'maple_tree_orange', 'leaf_pile', 'acorn'],
    ambientBed: 'autumn_breeze',
    creatures: [131, 140]
  },
  [BiomeType.MistyHighlands]: {
    type: BiomeType.MistyHighlands,
    name: 'Misty Highlands',
    palette: {
      groundPrimary: hexToRgba('#4B6B48'),
      groundSecondary: hexToRgba('#3D593A'),
      groundAccent: hexToRgba('#5C8058'),
      foliagePrimary: hexToRgba('#3F643B'),
      foliageSecondary: hexToRgba('#537D4E'),
      waterTint: hexToRgba('#4D7C8F')
    },
    props: ['highland_pine', 'heather_bush', 'fog_puff', 'standing_stone'],
    ambientBed: 'misty_echo',
    creatures: [141, 145]
  },
  [BiomeType.SnowyPeaks]: {
    type: BiomeType.SnowyPeaks,
    name: 'Alpine Snowy Peaks',
    palette: {
      groundPrimary: hexToRgba('#EBF5FB'),
      groundSecondary: hexToRgba('#D4E6F1'),
      groundAccent: hexToRgba('#FFFFFF'),
      foliagePrimary: hexToRgba('#7F8C8D'),
      foliageSecondary: hexToRgba('#BDC3C7'),
      waterTint: hexToRgba('#85C1E9')
    },
    props: ['snow_drift', 'ice_patch', 'frost_pine', 'snow_crystal'],
    ambientBed: 'cold_wind',
    creatures: [146, 148]
  },
  [BiomeType.GlowingHollow]: {
    type: BiomeType.GlowingHollow,
    name: 'Crystal Geode Cave & Hollow',
    palette: {
      groundPrimary: hexToRgba('#1B263B'),
      groundSecondary: hexToRgba('#0D1B2A'),
      groundAccent: hexToRgba('#48CAE4'),
      foliagePrimary: hexToRgba('#0077B6'),
      foliageSecondary: hexToRgba('#90E0EF'),
      waterTint: hexToRgba('#00B4D8')
    },
    props: ['mushroom_glowing_blue', 'mushroom_glowing_teal', 'glow_spore', 'magic_stone'],
    ambientBed: 'crystal_resonance',
    creatures: [149, 150]
  },
  [BiomeType.OldGrowthForest]: {
    type: BiomeType.OldGrowthForest,
    name: 'Old-Growth Forest',
    palette: {
      groundPrimary: hexToRgba('#2D4F28'),
      groundSecondary: hexToRgba('#234120'),
      groundAccent: hexToRgba('#3A6335'),
      foliagePrimary: hexToRgba('#1B3B1C'),
      foliageSecondary: hexToRgba('#2B542C'),
      waterTint: hexToRgba('#2E6D8E')
    },
    props: ['oak_tree', 'fern', 'moss_patch', 'shrub', 'log'],
    ambientBed: 'deep_woods',
    creatures: [51, 65]
  },
  [BiomeType.BambooGrove]: {
    type: BiomeType.BambooGrove,
    name: 'Emerald Bamboo Grove',
    palette: {
      groundPrimary: hexToRgba('#4B7F36'),
      groundSecondary: hexToRgba('#3E6D2B'),
      groundAccent: hexToRgba('#5E9946'),
      foliagePrimary: hexToRgba('#3B7527'),
      foliageSecondary: hexToRgba('#6BB347'),
      waterTint: hexToRgba('#3FA3A8')
    },
    props: ['bamboo', 'fern', 'lantern_stone', 'pebble'],
    ambientBed: 'bamboo_chime',
    creatures: [68, 80]
  },
  [BiomeType.MushroomFields]: {
    type: BiomeType.MushroomFields,
    name: 'Mycelium Mushroom Fields',
    palette: {
      groundPrimary: hexToRgba('#2C3E50'),
      groundSecondary: hexToRgba('#1E2B37'),
      groundAccent: hexToRgba('#8E44AD'),
      foliagePrimary: hexToRgba('#9B59B6'),
      foliageSecondary: hexToRgba('#E74C3C'),
      waterTint: hexToRgba('#2980B9')
    },
    props: ['giant_mushroom', 'mushroom', 'mushroom_glowing', 'spore_puff'],
    ambientBed: 'spore_hum',
    creatures: [140, 150]
  },
  [BiomeType.SunflowerPlains]: {
    type: BiomeType.SunflowerPlains,
    name: 'Sunflower Plains',
    palette: {
      groundPrimary: hexToRgba('#6B9638'),
      groundSecondary: hexToRgba('#5C852D'),
      groundAccent: hexToRgba('#F4D03F'),
      foliagePrimary: hexToRgba('#E67E22'),
      foliageSecondary: hexToRgba('#F1C40F'),
      waterTint: hexToRgba('#3498DB')
    },
    props: ['sunflower', 'grass', 'flower', 'pebble'],
    ambientBed: 'warm_breeze',
    creatures: [15, 28]
  },
  [BiomeType.Savanna]: {
    type: BiomeType.Savanna,
    name: 'Golden Savanna',
    palette: {
      groundPrimary: hexToRgba('#A39054'),
      groundSecondary: hexToRgba('#8E7B44'),
      groundAccent: hexToRgba('#B8A563'),
      foliagePrimary: hexToRgba('#687D38'),
      foliageSecondary: hexToRgba('#8A9E4D'),
      waterTint: hexToRgba('#4E9AB5')
    },
    props: ['acacia_tree', 'shrub', 'boulder', 'pebble'],
    ambientBed: 'dry_whisper',
    creatures: [85, 100]
  },
  [BiomeType.BadlandsMesa]: {
    type: BiomeType.BadlandsMesa,
    name: 'Badlands Mesa',
    palette: {
      groundPrimary: hexToRgba('#BA6D48'),
      groundSecondary: hexToRgba('#A05634'),
      groundAccent: hexToRgba('#D2835E'),
      foliagePrimary: hexToRgba('#6A4C3A'),
      foliageSecondary: hexToRgba('#8C654E'),
      waterTint: hexToRgba('#457B9D')
    },
    props: ['rock_cliff', 'cactus', 'boulder', 'shrub'],
    ambientBed: 'canyon_echo',
    creatures: [78, 92]
  },
  [BiomeType.DesertDunes]: {
    type: BiomeType.DesertDunes,
    name: 'Desert Dunes',
    palette: {
      groundPrimary: hexToRgba('#D4AF37'),
      groundSecondary: hexToRgba('#BA982A'),
      groundAccent: hexToRgba('#E6C35C'),
      foliagePrimary: hexToRgba('#8B9556'),
      foliageSecondary: hexToRgba('#A8B26B'),
      waterTint: hexToRgba('#38A3A5')
    },
    props: ['cactus', 'boulder', 'pebble', 'driftwood'],
    ambientBed: 'desert_wind',
    creatures: [80, 95]
  },
  [BiomeType.Oasis]: {
    type: BiomeType.Oasis,
    name: 'Verdant Oasis',
    palette: {
      groundPrimary: hexToRgba('#588B4D'),
      groundSecondary: hexToRgba('#487B3F'),
      groundAccent: hexToRgba('#E6C35C'),
      foliagePrimary: hexToRgba('#2E7D32'),
      foliageSecondary: hexToRgba('#43A047'),
      waterTint: hexToRgba('#00B4D8')
    },
    props: ['palm_tree', 'reed', 'lily_pad', 'flower'],
    ambientBed: 'oasis_trickle',
    creatures: [95, 110]
  },
  [BiomeType.SnowyTundra]: {
    type: BiomeType.SnowyTundra,
    name: 'Snowy Tundra',
    palette: {
      groundPrimary: hexToRgba('#D0DCE5'),
      groundSecondary: hexToRgba('#BDCBD6'),
      groundAccent: hexToRgba('#EBF5FB'),
      foliagePrimary: hexToRgba('#7F8C8D'),
      foliageSecondary: hexToRgba('#A6ACAF'),
      waterTint: hexToRgba('#85C1E9')
    },
    props: ['snow_drift', 'frost_pine', 'pebble'],
    ambientBed: 'tundra_chill',
    creatures: [135, 147]
  },
  [BiomeType.FrozenLake]: {
    type: BiomeType.FrozenLake,
    name: 'Frozen Glacial Lake',
    palette: {
      groundPrimary: hexToRgba('#A9CCE3'),
      groundSecondary: hexToRgba('#93B8D0'),
      groundAccent: hexToRgba('#E8F8F5'),
      foliagePrimary: hexToRgba('#5D6D7E'),
      foliageSecondary: hexToRgba('#85929E'),
      waterTint: hexToRgba('#A9CCE3')
    },
    props: ['ice_patch', 'ice_spike', 'snow_drift'],
    ambientBed: 'ice_crack',
    creatures: [142, 148]
  },
  [BiomeType.IceSpikes]: {
    type: BiomeType.IceSpikes,
    name: 'Crystalline Ice Spikes',
    palette: {
      groundPrimary: hexToRgba('#D4E6F1'),
      groundSecondary: hexToRgba('#BED7E5'),
      groundAccent: hexToRgba('#FFFFFF'),
      foliagePrimary: hexToRgba('#5DADE2'),
      foliageSecondary: hexToRgba('#85C1E9'),
      waterTint: hexToRgba('#7FB3D5')
    },
    props: ['ice_spike', 'ice_patch', 'snow_crystal'],
    ambientBed: 'crystalline_wind',
    creatures: [145, 149]
  },
  [BiomeType.VolcanicAsh]: {
    type: BiomeType.VolcanicAsh,
    name: 'Volcanic Ash Fields',
    palette: {
      groundPrimary: hexToRgba('#373737'),
      groundSecondary: hexToRgba('#262626'),
      groundAccent: hexToRgba('#59453B'),
      foliagePrimary: hexToRgba('#D35400'),
      foliageSecondary: hexToRgba('#E67E22'),
      waterTint: hexToRgba('#C0392B')
    },
    props: ['volcanic_vent', 'boulder', 'pebble'],
    ambientBed: 'hollow_ember',
    creatures: [70, 85]
  },
  [BiomeType.CoralShallows]: {
    type: BiomeType.CoralShallows,
    name: 'Coral Reef Shallows',
    palette: {
      groundPrimary: hexToRgba('#3498DB'),
      groundSecondary: hexToRgba('#2980B9'),
      groundAccent: hexToRgba('#FADBD8'),
      foliagePrimary: hexToRgba('#FF7675'),
      foliageSecondary: hexToRgba('#74B9FF'),
      waterTint: hexToRgba('#00CEC9')
    },
    props: ['coral', 'lily_pad', 'seashell'],
    ambientBed: 'lapping_tide',
    creatures: [110, 125]
  },
  [BiomeType.DeepOcean]: {
    type: BiomeType.DeepOcean,
    name: 'Deep Ocean Trench',
    palette: {
      groundPrimary: hexToRgba('#1A5276'),
      groundSecondary: hexToRgba('#154360'),
      groundAccent: hexToRgba('#2471A3'),
      foliagePrimary: hexToRgba('#117A65'),
      foliageSecondary: hexToRgba('#16A085'),
      waterTint: hexToRgba('#1B4F72')
    },
    props: ['pebble', 'driftwood'],
    ambientBed: 'deep_tide',
    creatures: [115, 128]
  },
  [BiomeType.LushCave]: {
    type: BiomeType.LushCave,
    name: 'Lush Cave Garden',
    palette: {
      groundPrimary: hexToRgba('#1E4223'),
      groundSecondary: hexToRgba('#153118'),
      groundAccent: hexToRgba('#27AE60'),
      foliagePrimary: hexToRgba('#2ECC71'),
      foliageSecondary: hexToRgba('#58D68D'),
      waterTint: hexToRgba('#1ABC9C')
    },
    props: ['moss_patch', 'mushroom_glowing', 'stalagmite', 'fern'],
    ambientBed: 'cavern_drops',
    creatures: [130, 145]
  },
  [BiomeType.DripstoneCave]: {
    type: BiomeType.DripstoneCave,
    name: 'Dripstone Chasm',
    palette: {
      groundPrimary: hexToRgba('#424949'),
      groundSecondary: hexToRgba('#323838'),
      groundAccent: hexToRgba('#7F8C8D'),
      foliagePrimary: hexToRgba('#566573'),
      foliageSecondary: hexToRgba('#707B7C'),
      waterTint: hexToRgba('#2C3E50')
    },
    props: ['stalagmite', 'boulder', 'pebble'],
    ambientBed: 'dripstone_echo',
    creatures: [75, 90]
  }
};

/**
 * Determine the biome type based on continuous climate parameters:
 * elevation: -1.0 to 1.0 (sea to mountain peaks)
 * moisture: 0.0 to 1.0 (arid to drenched)
 * temperature: 0.0 to 1.0 (freezing to warm)
 * erosion: 0.0 to 1.0 (rugged cliffs to flat plains)
 */
export function classifyBiome(
  elevation: number,
  moisture: number,
  temperature: number,
  erosion: number
): BiomeType {
  // 1. Deep & Shallow Water bodies (elevation < -0.15)
  if (elevation < -0.35) {
    if (elevation < -0.7) {
      return BiomeType.DeepOcean;
    }
    if (temperature < 0.22) {
      return BiomeType.FrozenLake;
    }
    if (temperature > 0.68 && moisture > 0.62) {
      return BiomeType.CoralShallows;
    }
    if (moisture > 0.58 && elevation > -0.42 && temperature > 0.48) {
      return BiomeType.LakesRivers; // RiverDelta / LakesRivers
    }
    return BiomeType.LakesRivers;
  }
  if (elevation < -0.15) {
    if (temperature < 0.25) {
      return BiomeType.SnowyTundra;
    }
    if (temperature > 0.78 && moisture < 0.28) {
      return BiomeType.DesertDunes;
    }
    return BiomeType.SandyCoast; // Beach
  }

  // 2. High Altitude / Mountain Peaks (elevation > 0.65)
  if (elevation > 0.65) {
    if (temperature < 0.28) {
      if (erosion < 0.35) {
        return BiomeType.IceSpikes;
      }
      return BiomeType.SnowyPeaks; // AlpinePeaks
    }
    if (temperature > 0.75 && moisture < 0.25) {
      return BiomeType.VolcanicAsh;
    }
    if (erosion < 0.3) {
      return BiomeType.RockyCliffs; // SkyIslandCliffs
    }
    return BiomeType.RockyCliffs;
  }

  // 3. Highlands and Rugged Hills (0.35 < elevation <= 0.65)
  if (elevation > 0.35) {
    if (temperature < 0.28) {
      return BiomeType.SnowyTundra;
    }
    if (temperature > 0.72 && moisture < 0.3) {
      return BiomeType.BadlandsMesa;
    }
    if (moisture > 0.6) {
      return BiomeType.MistyHighlands;
    }
    if (erosion < 0.35) {
      return BiomeType.RockyCliffs;
    }
  }

  // 4. Lowland wetlands and ponds (elevation < 0.05)
  if (elevation < 0.05) {
    if (moisture > 0.68) {
      if (temperature > 0.78) {
        return BiomeType.Oasis;
      }
      return BiomeType.MarshPonds; // SwampMangrove
    }
    if (temperature < 0.25) {
      return BiomeType.SnowyTundra;
    }
  }

  // 5. Arid, Warm & Desert biomes (temperature > 0.68)
  if (temperature > 0.68 && moisture < 0.38) {
    if (temperature > 0.8 && moisture < 0.22) {
      return BiomeType.DesertDunes;
    }
    if (erosion < 0.38) {
      return BiomeType.BadlandsMesa;
    }
    return BiomeType.Savanna;
  }

  // 6. Cold Climates (temperature < 0.35)
  if (temperature < 0.35) {
    if (moisture > 0.55) {
      return BiomeType.PineForest; // MistyPineTaiga
    }
    return BiomeType.SnowyTundra;
  }

  // 7. Rare Enchanted & Specialized Groves
  if (moisture > 0.75 && temperature > 0.65 && erosion > 0.65) {
    return BiomeType.GlowingHollow;
  }
  if (moisture > 0.72 && temperature > 0.6 && erosion > 0.62) {
    return BiomeType.MushroomFields;
  }
  if (moisture > 0.68 && temperature > 0.58) {
    return BiomeType.BambooGrove;
  }
  if (moisture > 0.62 && temperature > 0.52) {
    return BiomeType.OldGrowthForest;
  }

  // 8. Temperate Woodlands and Forests
  if (moisture > 0.55) {
    if (temperature < 0.38) {
      return BiomeType.PineForest;
    }
    if (temperature > 0.58) {
      return BiomeType.CherryBlossom;
    }
    return BiomeType.AutumnMaple;
  }

  // 9. Plains, Meadows & Fields
  if (moisture > 0.48 && temperature > 0.54 && erosion > 0.58) {
    return BiomeType.SunflowerPlains;
  }
  if (moisture > 0.42 && temperature < 0.48) {
    return BiomeType.BirchGrove;
  }
  if (moisture > 0.45 && temperature > 0.5) {
    return BiomeType.WildflowerFields;
  }

  // Default calm temperate flower meadow
  return BiomeType.Meadow;
}
