import { PRNG, hashSeed } from '../core/prng';
import { ColorRGBA, hexToRgba, lerp } from '../core/math';
import { ArtToolkit } from '../render/art';
import { IRenderer } from '../render/types';

export type CreatureType = 'Flora' | 'Aqua' | 'Ignis' | 'Terra' | 'Aero';
export type Archetype = 'quadruped' | 'biped' | 'serpent' | 'avian' | 'blob';
export type Appendage = 'horns' | 'tails' | 'wings' | 'petals' | 'fins' | 'none';
export type Pattern = 'fur' | 'scales' | 'bark' | 'smooth';

export interface CreatureGenome {
  speciesId: number;
  seedNum: number;
  name: string;
  type: CreatureType;
  archetype: Archetype;
  appendage: Appendage;
  pattern: Pattern;
  hueShift: number;
  isPrismatic: boolean;
  baseColor: ColorRGBA;
  accentColor: ColorRGBA;
  scale: number;
  complexity: number; // 1.0 or 2.0 (evolved)
  stats: {
    vigor: number;
    strike: number;
    guard: number;
    haste: number;
  };
}

const SYLLABLES_START = ['Bram', 'Lum', 'Peb', 'Flar', 'Gliss', 'Twi', 'Vex', 'Oru', 'Nim', 'Crys'];
const SYLLABLES_MID = ['ble', 'in', 'lo', 'ia', 'en', 'os', 'el', 'ul', 'ra', 'ka'];
const SYLLABLES_END = ['ton', 'is', 'bus', 'fy', 'us', 'a', 'ix', 'ar', 'oth', 'um'];

function generateName(rng: PRNG): string {
  const parts = rng.rangeInt(2, 4);
  let name = '';
  name += SYLLABLES_START[rng.rangeInt(0, SYLLABLES_START.length)];
  if (parts === 3) {
    name += SYLLABLES_MID[rng.rangeInt(0, SYLLABLES_MID.length)];
  }
  name += SYLLABLES_END[rng.rangeInt(0, SYLLABLES_END.length)];
  return name;
}

function getTypeColorRange(type: CreatureType, rng: PRNG): { r: number; g: number; b: number } {
  // Return base hue in roughly 0-1 range based on type
  switch (type) {
    case 'Flora': return { r: rng.range(0.2, 0.4), g: rng.range(0.7, 0.9), b: rng.range(0.2, 0.4) };
    case 'Aqua': return { r: rng.range(0.1, 0.3), g: rng.range(0.4, 0.7), b: rng.range(0.8, 1.0) };
    case 'Ignis': return { r: rng.range(0.8, 1.0), g: rng.range(0.2, 0.5), b: rng.range(0.1, 0.2) };
    case 'Terra': return { r: rng.range(0.5, 0.7), g: rng.range(0.4, 0.5), b: rng.range(0.2, 0.3) };
    case 'Aero': return { r: rng.range(0.8, 0.9), g: rng.range(0.8, 0.9), b: rng.range(0.9, 1.0) };
  }
}

export function generateCreatureGenome(globalSeed: string | number, speciesId: number, complexity: number = 1.0): CreatureGenome {
  const seedNum = hashSeed(globalSeed);
  const rng = new PRNG(seedNum ^ (speciesId * 3812831));
  
  const typeRoll = rng.rangeInt(0, 5);
  const types: CreatureType[] = ['Flora', 'Aqua', 'Ignis', 'Terra', 'Aero'];
  const type = types[typeRoll];

  const archRoll = rng.rangeInt(0, 5);
  const archetypes: Archetype[] = ['quadruped', 'biped', 'serpent', 'avian', 'blob'];
  const archetype = archetypes[archRoll];

  const appRoll = rng.rangeInt(0, 6);
  const appendages: Appendage[] = ['horns', 'tails', 'wings', 'petals', 'fins', 'none'];
  const appendage = appendages[appRoll];

  const patRoll = rng.rangeInt(0, 4);
  const patterns: Pattern[] = ['fur', 'scales', 'bark', 'smooth'];
  const pattern = patterns[patRoll];

  const name = generateName(rng);
  
  const isPrismatic = rng.rangeInt(0, 4096) === 0;
  
  const c = getTypeColorRange(type, rng);
  const hueShift = rng.range(0, Math.PI * 2);

  // If prismatic, completely shift the colors and boost saturation
  let baseColor: ColorRGBA = { r: c.r, g: c.g, b: c.b, a: 1.0 };
  let accentColor: ColorRGBA = { 
    r: Math.min(1, c.r + 0.3), 
    g: Math.min(1, c.g + 0.3), 
    b: Math.min(1, c.b + 0.3), 
    a: 1.0 
  };

  if (isPrismatic) {
    baseColor = { r: 0.9, g: 0.9, b: 0.9, a: 1.0 };
    accentColor = { r: 1.0, g: 0.8, b: 1.0, a: 1.0 };
  }

  // Base stats (evolved = higher)
  const statMult = complexity === 2.0 ? 1.5 : 1.0;
  const vigor = Math.floor(rng.range(20, 40) * statMult);
  const strike = Math.floor(rng.range(10, 25) * statMult);
  const guard = Math.floor(rng.range(10, 25) * statMult);
  const haste = Math.floor(rng.range(10, 25) * statMult);

  return {
    speciesId,
    seedNum,
    name,
    type,
    archetype,
    appendage,
    pattern,
    hueShift,
    isPrismatic,
    baseColor,
    accentColor,
    scale: rng.range(0.8, 1.2) * (complexity === 2.0 ? 1.4 : 1.0),
    complexity,
    stats: { vigor, strike, guard, haste }
  };
}
