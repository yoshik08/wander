export enum BiomeType {
  Ocean = 0,
  Beach = 1,
  Meadow = 2,
  PineForest = 3,
  StreamLake = 4,
  CherryBlossom = 5,
  HillsCliffs = 6,
  SnowyPeaks = 7,
  SecretGlade = 8
}

export interface Biome {
  type: BiomeType;
  name: string;
  groundColor: string;
  groundTexture?: string; // we'll use procedural textures later
  props: string[]; // types of props to place
  ambientSound: string; // key for ambient sound
  colorMultiplier: [number, number, number]; // RGB multiplier for tinting
}

export const biomeData: Record<BiomeType, Biome> = {
  [BiomeType.Ocean]: {
    type: BiomeType.Ocean,
    name: 'Ocean',
    groundColor: '#1E90FF',
    props: [],
    ambientSound: 'ocean',
    colorMultiplier: [0.8, 0.9, 1.0]
  },
  [BiomeType.Beach]: {
    type: BiomeType.Beach,
    name: 'Beach',
    groundColor: '#F5DEB3',
    props: ['shell', 'driftwood'],
    ambientSound: 'waves',
    colorMultiplier: [1.0, 0.95, 0.8]
  },
  [BiomeType.Meadow]: {
    type: BiomeType.Meadow,
    name: 'Meadow',
    groundColor: '#228B22',
    props: ['grass', 'flower', 'tree'],
    ambientSound: 'meadow',
    colorMultiplier: [0.9, 1.0, 0.9]
  },
  [BiomeType.PineForest]: {
    type: BiomeType.PineForest,
    name: 'Pine Forest',
    groundColor: '#014421',
    props: ['pine', 'fern', 'log', 'mushroom'],
    ambientSound: 'forest',
    colorMultiplier: [0.8, 0.9, 0.8]
  },
  [BiomeType.StreamLake]: {
    type: BiomeType.StreamLake,
    name: 'Stream and Lake',
    groundColor: '#4682B4',
    props: ['reed', 'lily', 'rock'],
    ambientSound: 'water',
    colorMultiplier: [0.8, 0.9, 1.0]
  },
  [BiomeType.CherryBlossom]: {
    type: BiomeType.CherryBlossom,
    name: 'Cherry Blossom Grove',
    groundColor: '#FFB6C1',
    props: ['cherryTree', 'petal'],
    ambientSound: 'cherry',
    colorMultiplier: [1.0, 0.8, 0.9]
  },
  [BiomeType.HillsCliffs]: {
    type: BiomeType.HillsCliffs,
    name: 'Hills and Cliffs',
    groundColor: '#8B4513',
    props: ['rock', 'stone', 'sparseTree'],
    ambientSound: 'wind',
    colorMultiplier: [0.9, 0.8, 0.7]
  },
  [BiomeType.SnowyPeaks]: {
    type: BiomeType.SnowyPeaks,
    name: 'Snowy Peaks',
    groundColor: '#FFFFFF',
    props: ['snow', 'ice'],
    ambientSound: 'wind',
    colorMultiplier: [0.9, 0.9, 1.0]
  },
  [BiomeType.SecretGlade]: {
    type: BiomeType.SecretGlade,
    name: 'Secret Glade',
    groundColor: '#98FB98',
    props: ['firefly', 'stone', 'grass'],
    ambientSound: 'glade',
    colorMultiplier: [0.8, 1.0, 0.8]
  }
};

/**
 * Determine biome based on elevation, moisture, temperature.
 * Elevation: -1 (ocean floor) to 1 (mountain peak)
 * Moisture: 0 (dry) to 1 (wet)
 * Temperature: 0 (cold) to 1 (hot)
 */
export function getBiome(elevation: number, moisture: number, temperature: number): BiomeType {
  // Ocean
  if (elevation < 0) {
    return BiomeType.Ocean;
  }
  // Beach: low elevation near water (we'll simplify: just low elevation and high moisture)
  if (elevation < 0.1 && moisture > 0.7) {
    return BiomeType.Beach;
  }
  // Snowy peaks: high elevation and cold
  if (elevation > 0.8 && temperature < 0.2) {
    return BiomeType.SnowyPeaks;
  }
  // Cherry blossom grove: specific conditions (we'll also add a noise layer later for placement)
  if (elevation > 0.2 && elevation < 0.4 && moisture > 0.5 && temperature > 0.5) {
    return BiomeType.CherryBlossom;
  }
  // Pine forest: elevated, moist, cool
  if (elevation > 0.3 && elevation < 0.6 && moisture > 0.6 && temperature < 0.5) {
    return BiomeType.PineForest;
  }
  // Meadow: moderate elevation, moderate moisture, moderate temperature
  if (elevation > 0.1 && elevation < 0.3 && moisture > 0.3 && moisture < 0.7 && temperature > 0.3 && temperature < 0.7) {
    return BiomeType.Meadow;
  }
  // Hills and cliffs: high elevation, steep (we'll approximate by elevation alone for now)
  if (elevation > 0.6) {
    return BiomeType.HillsCliffs;
  }
  // Default to meadow
  return BiomeType.Meadow;
}