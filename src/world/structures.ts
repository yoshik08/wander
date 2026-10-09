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
  | 'sanctuary_crystal';

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
  chunkX: number,
  chunkY: number,
  seed: number,
  elevation: Float32Array,
  biome: Uint8Array,
  tileFlags: Uint8Array,
  collision: Uint8Array
): StructureInstance[] {
  const structures: StructureInstance[] = [];
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

    return structures;
  }

  // 2. Sparse Macro Landmarks (roughly 1 major landmark every 4-6 chunks)
  const landmarkChance = chunkRng.next();
  if (landmarkChance > 0.28) {
    return structures; // Most chunks remain pure untouched serene nature
  }

  // Sample center tile of chunk
  const midTile = Math.floor(CHUNK_TILES / 2);
  const midIdx = midTile * CHUNK_TILES + midTile;
  const elev = elevation[midIdx];
  const bType = biome[midIdx] as BiomeType;
  const isWater = elev < -0.35;

  const structWorldX = baseWorldX + midTile * TILE_SIZE + 12;
  const structWorldY = baseWorldY + midTile * TILE_SIZE + 12;

  // Lighthouse on Sandy Coast near the sea
  if (bType === BiomeType.SandyCoast && elev >= -0.32 && elev <= 0.15) {
    const sId = `lighthouse-${chunkX}-${chunkY}`;
    structures.push({
      id: sId,
      type: 'lighthouse',
      x: structWorldX,
      y: structWorldY,
      baseY: structWorldY + 36,
      width: 36,
      height: 90,
      variant: 0,
      solidTiles: [
        { dx: 0, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 1, dy: 1 }
      ]
    });
    // Mark collision
    applySolidFootprint(midTile, midTile, [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }], collision);
    return structures;
  }

  // Old Windmill on elevated grassy meadow or breezy highlands
  if ((bType === BiomeType.Meadow || bType === BiomeType.MistyHighlands) && elev > 0.18 && elev < 0.6) {
    if (chunkRng.next() < 0.35) {
      const sId = `windmill-${chunkX}-${chunkY}`;
      structures.push({
        id: sId,
        type: 'windmill',
        x: structWorldX,
        y: structWorldY,
        baseY: structWorldY + 28,
        width: 44,
        height: 72,
        variant: chunkRng.rangeInt(0, 1),
        solidTiles: [
          { dx: 0, dy: 0 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 1, dy: 1 }
        ]
      });
      applySolidFootprint(midTile, midTile, [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }], collision);
      return structures;
    }
  }

  // Ancient Mossy Ruins in forests or rocky areas
  if ((bType === BiomeType.PineForest || bType === BiomeType.RockyCliffs || bType === BiomeType.AutumnMaple) && !isWater) {
    if (chunkRng.next() < 0.30) {
      const sId = `ruins-${chunkX}-${chunkY}`;
      structures.push({
        id: sId,
        type: 'ruins',
        x: structWorldX,
        y: structWorldY,
        baseY: structWorldY + 20,
        width: 48,
        height: 42,
        variant: chunkRng.rangeInt(0, 2),
        solidTiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }]
      });
      applySolidFootprint(midTile, midTile, [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }], collision);
      return structures;
    }
  }

  // Tiny Abandoned Cottage in Birch Grove, Meadow, or Autumn Woods
  if ((bType === BiomeType.BirchGrove || bType === BiomeType.Meadow || bType === BiomeType.AutumnMaple) && !isWater) {
    if (chunkRng.next() < 0.30) {
      const sId = `cottage-${chunkX}-${chunkY}`;
      structures.push({
        id: sId,
        type: 'cottage',
        x: structWorldX,
        y: structWorldY,
        baseY: structWorldY + 22,
        width: 52,
        height: 46,
        variant: chunkRng.rangeInt(0, 1),
        solidTiles: [
          { dx: -1, dy: 0 },
          { dx: 0, dy: 0 },
          { dx: 1, dy: 0 }
        ]
      });
      applySolidFootprint(midTile, midTile, [{ dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 }], collision);
      return structures;
    }
  }

  // Stone Circle in Wildflower fields, Highlands, or glowing mushroom hollow
  if ((bType === BiomeType.WildflowerFields || bType === BiomeType.MistyHighlands || bType === BiomeType.GlowingHollow) && !isWater) {
    if (chunkRng.next() < 0.25) {
      const sId = `stone-circle-${chunkX}-${chunkY}`;
      structures.push({
        id: sId,
        type: 'stone_circle',
        x: structWorldX,
        y: structWorldY,
        baseY: structWorldY + 26,
        width: 60,
        height: 60,
        variant: 0,
        solidTiles: [] // Stones themselves are props around perimeter; center remains walkable!
      });
      return structures;
    }
  }

  // Scenic Bench, Sitting Log, or Campfire at trailside
  if (!isWater) {
    const roll = chunkRng.next();
    const sType: StructureType = roll < 0.4 ? 'bench' : (roll < 0.7 ? 'sitting_log' : 'campfire');
    structures.push({
      id: `${sType}-${chunkX}-${chunkY}`,
      type: sType,
      x: structWorldX,
      y: structWorldY,
      baseY: structWorldY + 8,
      width: sType === 'campfire' ? 28 : 26,
      height: sType === 'campfire' ? 28 : 14,
      variant: 0,
      solidTiles: []
    });
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

    default:
      break;
  }
}
