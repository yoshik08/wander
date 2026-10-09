import { ColorRGBA, hexToRgba } from '../core/math';

export enum BiomeType {
  Meadow = 0,
  WildflowerFields = 1,
  BirchGrove = 2,
  PineForest = 3,
  CherryBlossom = 4,
  RockyCliffs = 5,
  MarshPonds = 6,
  LakesRivers = 7,
  SandyCoast = 8,
  AutumnMaple = 9,
  MistyHighlands = 10,
  SnowyPeaks = 11,
  GlowingHollow = 12
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
}

export const BIOMES: Record<BiomeType, BiomeDefinition> = {
  [BiomeType.Meadow]: {
    type: BiomeType.Meadow,
    name: 'Sunny Meadow',
    palette: {
      groundPrimary: hexToRgba('#8DB255'),
      groundSecondary: hexToRgba('#A6C96C'),
      groundAccent: hexToRgba('#8DB255'),
      foliagePrimary: hexToRgba('#3A5F40'),
      foliageSecondary: hexToRgba('#8DB255'),
      waterTint: hexToRgba('#6B9CB5')
    },
    props: ['grass', 'flower_daisy', 'flower_buttercup', 'oak_tree', 'log', 'pebble'],
    ambientBed: 'meadow_birds'
  },
  [BiomeType.WildflowerFields]: {
    type: BiomeType.WildflowerFields,
    name: 'Wildflower Fields',
    palette: {
      groundPrimary: hexToRgba('#8DB255'),
      groundSecondary: hexToRgba('#A6C96C'),
      groundAccent: hexToRgba('#A6C96C'),
      foliagePrimary: hexToRgba('#3A5F40'),
      foliageSecondary: hexToRgba('#A6C96C'),
      waterTint: hexToRgba('#6B9CB5')
    },
    props: ['flower_poppy', 'flower_lavender', 'flower_rose', 'flower_daisy', 'grass', 'butterfly_bush'],
    ambientBed: 'meadow_breeze'
  },
  [BiomeType.BirchGrove]: {
    type: BiomeType.BirchGrove,
    name: 'Birch Grove',
    palette: {
      groundPrimary: hexToRgba('#5A8E4C'),
      groundSecondary: hexToRgba('#4E7E41'),
      groundAccent: hexToRgba('#6EA85E'),
      foliagePrimary: hexToRgba('#66A64F'),
      foliageSecondary: hexToRgba('#84C46C'),
      waterTint: hexToRgba('#4599D6')
    },
    props: ['birch_tree', 'fern', 'clover', 'log', 'white_flower'],
    ambientBed: 'rustling_leaves'
  },
  [BiomeType.PineForest]: {
    type: BiomeType.PineForest,
    name: 'Deep Pine Forest',
    palette: {
      groundPrimary: hexToRgba('#2D542E'),
      groundSecondary: hexToRgba('#244425'),
      groundAccent: hexToRgba('#3A663B'),
      foliagePrimary: hexToRgba('#1E4223'),
      foliageSecondary: hexToRgba('#2A5E30'),
      waterTint: hexToRgba('#2D70A3')
    },
    props: ['pine_tree', 'fern', 'mushroom_brown', 'log_mossy', 'pinecone'],
    ambientBed: 'forest_wind'
  },
  [BiomeType.CherryBlossom]: {
    type: BiomeType.CherryBlossom,
    name: 'Cherry Blossom Valley',
    palette: {
      groundPrimary: hexToRgba('#588B4D'),
      groundSecondary: hexToRgba('#4B7941'),
      groundAccent: hexToRgba('#FADBD8'),
      foliagePrimary: hexToRgba('#F1948A'),
      foliageSecondary: hexToRgba('#FADBD8'),
      waterTint: hexToRgba('#5DADE2')
    },
    props: ['cherry_tree', 'petal_patch', 'lantern_stone', 'flower_pink'],
    ambientBed: 'gentle_spring'
  },
  [BiomeType.RockyCliffs]: {
    type: BiomeType.RockyCliffs,
    name: 'Rocky Rises & Cliffs',
    palette: {
      groundPrimary: hexToRgba('#6E6B5E'),
      groundSecondary: hexToRgba('#5B594E'),
      groundAccent: hexToRgba('#7D796A'),
      foliagePrimary: hexToRgba('#4A6E42'),
      foliageSecondary: hexToRgba('#5C7D55'),
      waterTint: hexToRgba('#4A8DB8')
    },
    props: ['boulder', 'rock_cliff', 'sparse_shrub', 'stone_cairn'],
    ambientBed: 'high_wind'
  },
  [BiomeType.MarshPonds]: {
    type: BiomeType.MarshPonds,
    name: 'Ponds & Marsh',
    palette: {
      groundPrimary: hexToRgba('#3E6338'),
      groundSecondary: hexToRgba('#33522E'),
      groundAccent: hexToRgba('#4D7A46'),
      foliagePrimary: hexToRgba('#2E572A'),
      foliageSecondary: hexToRgba('#447A3E'),
      waterTint: hexToRgba('#356E58')
    },
    props: ['reed_marsh', 'lily_pad', 'cattail', 'water_puddle', 'mud_patch'],
    ambientBed: 'crickets_water'
  },
  [BiomeType.LakesRivers]: {
    type: BiomeType.LakesRivers,
    name: 'Clear Water Lake',
    palette: {
      groundPrimary: hexToRgba('#3A8FD4'),
      groundSecondary: hexToRgba('#2F7CBF'),
      groundAccent: hexToRgba('#52A8ED'),
      foliagePrimary: hexToRgba('#2E7D32'),
      foliageSecondary: hexToRgba('#4CAF50'),
      waterTint: hexToRgba('#3A8FD4')
    },
    props: ['lily_pad', 'reed', 'river_stone', 'stepping_stone'],
    ambientBed: 'flowing_water'
  },
  [BiomeType.SandyCoast]: {
    type: BiomeType.SandyCoast,
    name: 'Sandy Coast',
    palette: {
      groundPrimary: hexToRgba('#D4B886'),
      groundSecondary: hexToRgba('#C2A574'),
      groundAccent: hexToRgba('#E2C899'),
      foliagePrimary: hexToRgba('#5A8A4C'),
      foliageSecondary: hexToRgba('#76A867'),
      waterTint: hexToRgba('#2E9CB8')
    },
    props: ['seashell', 'driftwood', 'dune_grass', 'beach_pebble'],
    ambientBed: 'ocean_waves'
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
    ambientBed: 'autumn_breeze'
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
    ambientBed: 'misty_echo'
  },
  [BiomeType.SnowyPeaks]: {
    type: BiomeType.SnowyPeaks,
    name: 'Snowy Peaks',
    palette: {
      groundPrimary: hexToRgba('#EBF5FB'),
      groundSecondary: hexToRgba('#D4E6F1'),
      groundAccent: hexToRgba('#FFFFFF'),
      foliagePrimary: hexToRgba('#7F8C8D'),
      foliageSecondary: hexToRgba('#BDC3C7'),
      waterTint: hexToRgba('#85C1E9')
    },
    props: ['snow_drift', 'ice_patch', 'frost_pine', 'snow_crystal'],
    ambientBed: 'cold_wind'
  },
  [BiomeType.GlowingHollow]: {
    type: BiomeType.GlowingHollow,
    name: 'Glowing Mushroom Hollow',
    palette: {
      groundPrimary: hexToRgba('#1B263B'),
      groundSecondary: hexToRgba('#0D1B2A'),
      groundAccent: hexToRgba('#48CAE4'),
      foliagePrimary: hexToRgba('#0077B6'),
      foliageSecondary: hexToRgba('#90E0EF'),
      waterTint: hexToRgba('#00B4D8')
    },
    props: ['mushroom_glowing_blue', 'mushroom_glowing_teal', 'glow_spore', 'magic_stone'],
    ambientBed: 'magical_hum'
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
  // 1. Water bodies (oceans and coastal flats)
  if (elevation < -0.35) {
    return BiomeType.LakesRivers;
  }
  if (elevation < -0.15) {
    return BiomeType.SandyCoast;
  }

  // 2. High Altitude / Mountain Peaks
  if (elevation > 0.65) {
    if (temperature < 0.28) {
      return BiomeType.SnowyPeaks;
    }
    return BiomeType.RockyCliffs;
  }

  // 3. Highlands and Rugged Hills
  if (elevation > 0.35) {
    if (moisture > 0.6) {
      return BiomeType.MistyHighlands;
    }
    if (erosion < 0.35) {
      return BiomeType.RockyCliffs;
    }
  }

  // 4. Lowland wetlands and ponds
  if (elevation < 0.05 && moisture > 0.68) {
    return BiomeType.MarshPonds;
  }

  // 5. Rare enchanted biome
  if (moisture > 0.75 && temperature > 0.65 && erosion > 0.65) {
    return BiomeType.GlowingHollow;
  }

  // 6. Temperate Woodlands and Forests
  if (moisture > 0.55) {
    if (temperature < 0.38) {
      return BiomeType.PineForest;
    }
    if (temperature > 0.58) {
      return BiomeType.CherryBlossom;
    }
    return BiomeType.AutumnMaple;
  }

  // 7. Light Groves
  if (moisture > 0.42) {
    if (temperature < 0.45) {
      return BiomeType.BirchGrove;
    }
  }

  // 8. Open Fields & Meadows
  if (moisture > 0.45 && temperature > 0.5) {
    return BiomeType.WildflowerFields;
  }

  // Default calm temperate meadow
  return BiomeType.Meadow;
}
