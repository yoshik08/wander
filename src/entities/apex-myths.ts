import { Vec2, vec2, hexToRgba, lerp } from '../core/math';
import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';
import { CreatureGenome, CreatureType, generateCreatureGenome } from './creature';
import { CHUNK_PIXEL_SIZE } from '../world/chunk';

export interface ApexCreature {
  id: string;
  name: string;
  title: string;
  element: CreatureType;
  x: number;
  y: number;
  puzzleId: string;
  puzzlePedestals: { x: number; y: number; activated: boolean; label: string }[];
  puzzleSolved: boolean;
  speciesId: number;
  level: number;
  maxResolve: number;
  currentResolve: number;
  genome: CreatureGenome;
  dialogue: string;
}

export interface RoamingMyth {
  id: string;
  name: string;
  title: string;
  speciesId: number;
  genome: CreatureGenome;
  level: number;
  maxResolve: number;
  currentResolve: number;
  pos: Vec2;
  getRealTimePosition: () => Vec2;
}

export class ApexMythManager {
  apexCreatures: ApexCreature[] = [];
  roamingMyth: RoamingMyth;
  private time: number = 0;

  constructor(globalSeed: string | number = 'meadow-seed') {
    this.initApexCreatures(globalSeed);
    this.roamingMyth = this.initRoamingMyth(globalSeed);
  }

  private initApexCreatures(globalSeed: string | number) {
    const configs = [
      {
        id: 'apex_north',
        name: 'Apex Zephyros',
        title: 'Sovereign of the Celestial Gale',
        element: 'Aero' as CreatureType,
        speciesId: 150,
        cx: 0, cy: -15,
        puzzleId: 'puzzle_apex_north',
        pedestalLabel: 'Wind Harp Altar',
        dialogue: "You who climb the highest winds... let our spirits entwine."
      },
      {
        id: 'apex_south',
        name: 'Apex Terranox',
        title: 'Primeval Colossus of the Deep Roots',
        element: 'Terra' as CreatureType,
        speciesId: 149,
        cx: 0, cy: 15,
        puzzleId: 'puzzle_apex_south',
        pedestalLabel: 'Granite Stele Plinth',
        dialogue: "Ancient as stone, patient as the soil. We acknowledge your stride."
      },
      {
        id: 'apex_east',
        name: 'Apex Ignisaur',
        title: 'Radiant Phoenix of the Dawning Sun',
        element: 'Ignis' as CreatureType,
        speciesId: 148,
        cx: 15, cy: 0,
        puzzleId: 'puzzle_apex_east',
        pedestalLabel: 'Solar Brazier',
        dialogue: "Warmth rekindled in the quiet meadow. Soar with the sun."
      },
      {
        id: 'apex_west',
        name: 'Apex Hydravos',
        title: 'Leviathan of the Moonlit Trenches',
        element: 'Aqua' as CreatureType,
        speciesId: 147,
        cx: -15, cy: 0,
        puzzleId: 'puzzle_apex_west',
        pedestalLabel: 'Tidal Pearl Dais',
        dialogue: "From the quiet shallows to the eternal seas, flow onward."
      }
    ];

    for (const c of configs) {
      const genome = generateCreatureGenome(globalSeed, c.speciesId, 2.0);
      genome.name = c.name;
      genome.type = c.element;
      genome.scale = 2.2; // Majestic massive scale

      const worldX = c.cx * CHUNK_PIXEL_SIZE + CHUNK_PIXEL_SIZE / 2;
      const worldY = c.cy * CHUNK_PIXEL_SIZE + CHUNK_PIXEL_SIZE / 2;
      const level = 45;
      const maxResolve = 160;

      this.apexCreatures.push({
        id: c.id,
        name: c.name,
        title: c.title,
        element: c.element,
        x: worldX,
        y: worldY,
        puzzleId: c.puzzleId,
        puzzlePedestals: [
          { x: worldX - 60, y: worldY + 30, activated: false, label: `${c.pedestalLabel} (West)` },
          { x: worldX + 60, y: worldY + 30, activated: false, label: `${c.pedestalLabel} (East)` }
        ],
        puzzleSolved: false,
        speciesId: c.speciesId,
        level,
        maxResolve,
        currentResolve: maxResolve,
        genome,
        dialogue: c.dialogue
      });
    }
  }

  private initRoamingMyth(globalSeed: string | number): RoamingMyth {
    const genome = generateCreatureGenome(globalSeed, 146, 2.0);
    genome.name = 'Lunaris';
    genome.type = 'Aero';
    genome.scale = 1.8;
    genome.isPrismatic = true;

    const getRealTimePosition = (): Vec2 => {
      const now = new Date();
      // Orbit changes based on 24-hour real world clock
      const totalHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
      const theta = (totalHours / 24) * Math.PI * 2;
      const orbitRadius = 2600 + Math.sin(theta * 3) * 400; // ~3.5 chunks orbit
      return vec2(
        Math.cos(theta) * orbitRadius,
        Math.sin(theta) * orbitRadius
      );
    };

    const initialPos = getRealTimePosition();

    return {
      id: 'myth_lunaris',
      name: 'Lunaris the Star-Walker',
      title: 'The Eternal Celestial Wanderer',
      speciesId: 146,
      genome,
      level: 40,
      maxResolve: 140,
      currentResolve: 140,
      pos: initialPos,
      getRealTimePosition
    };
  }

  syncSavedPuzzles(clearedObstacles: Set<string> | string[]) {
    const cleared = clearedObstacles instanceof Set ? clearedObstacles : new Set(clearedObstacles);
    for (const apex of this.apexCreatures) {
      if (cleared.has(apex.puzzleId)) {
        apex.puzzleSolved = true;
        apex.puzzlePedestals.forEach(p => p.activated = true);
      }
    }
  }

  update(dt: number) {
    this.time += dt;
    this.roamingMyth.pos = this.roamingMyth.getRealTimePosition();
  }

  renderShrines(renderer: IRenderer, art: ArtToolkit, layer: number, camPos: Vec2) {
    if (layer !== 0) return;

    for (const apex of this.apexCreatures) {
      const dx = camPos.x - apex.x;
      const dy = camPos.y - apex.y;
      if (dx * dx + dy * dy > 950 * 950) continue;

      // Draw Shrine Ground Sanctuary Circle
      renderer.drawCircle(apex.x, apex.y + 10, 80, hexToRgba('#1A252C', 0.4));
      renderer.drawCircle(apex.x, apex.y + 10, 76, hexToRgba('#4A5A65', 0.25));

      // Ancient concentric stone ring
      renderer.drawCircle(apex.x, apex.y + 10, 50, hexToRgba('#2C3E50', 0.3));

      // Draw puzzle pedestals
      for (const ped of apex.puzzlePedestals) {
        // Pedestal base
        renderer.drawCircle(ped.x, ped.y + 4, 14, hexToRgba('#1B2631', 0.4));
        renderer.drawRect(ped.x - 10, ped.y - 12, 20, 16, hexToRgba('#566573', 0.95));
        renderer.drawRect(ped.x - 8, ped.y - 16, 16, 6, hexToRgba('#7F8C8D', 0.95));

        // Crystal atop pedestal
        const glowColor = ped.activated ? apex.genome.accentColor : hexToRgba('#7F8C8D', 0.8);
        const pulse = ped.activated ? 1.0 + Math.sin(this.time * 4 + ped.x) * 0.2 : 0.8;
        renderer.drawCircle(ped.x, ped.y - 20, 5 * pulse, glowColor);
        if (ped.activated) {
          renderer.drawCircle(ped.x, ped.y - 20, 2, hexToRgba('#FFFFFF', 0.95));
        }
      }

      // If puzzle NOT solved: radiant seal dome over Apex
      if (!apex.puzzleSolved) {
        const sealPulse = 0.6 + Math.sin(this.time * 2.5 + apex.x) * 0.25;
        renderer.drawCircle(apex.x, apex.y - 10, 42, { ...apex.genome.accentColor, a: 0.25 * sealPulse });
        renderer.drawCircle(apex.x, apex.y - 10, 36, hexToRgba('#FFFFFF', 0.15 * sealPulse));
        // Rotating barrier glyphs
        const rot = this.time * 1.5;
        for (let i = 0; i < 4; i++) {
          const ang = rot + (i * Math.PI) / 2;
          const gx = apex.x + Math.cos(ang) * 38;
          const gy = apex.y - 10 + Math.sin(ang) * 38;
          renderer.drawCircle(gx, gy, 3, { ...apex.genome.accentColor, a: 0.8 });
        }
      }
    }
  }

  getRenderableEntities(layer: number, camPos: Vec2) {
    if (layer !== 0) return [];
    const list: {
      y: number;
      draw: (renderer: IRenderer, art: ArtToolkit) => void;
    }[] = [];

    // 1. Apex Creatures
    for (const apex of this.apexCreatures) {
      const dx = camPos.x - apex.x;
      const dy = camPos.y - apex.y;
      if (dx * dx + dy * dy > 950 * 950) continue;

      list.push({
        y: apex.y,
        draw: (renderer: IRenderer, art: ArtToolkit) => {
          // Radiant aura under creature
          const pulse = 1.0 + Math.sin(this.time * 2 + apex.x) * 0.15;
          renderer.drawCircle(apex.x, apex.y - 12, 28 * pulse, { ...apex.genome.accentColor, a: 0.2 });
          renderer.drawCircle(apex.x, apex.y - 12, 18 * pulse, hexToRgba('#FFFFFF', 0.25));

          // Draw creature with state
          const state = apex.puzzleSolved ? 'idle' : 'sit';
          art.drawCreature(apex.x, apex.y, this.time, apex.genome, state, false);

          // Crown spark atop head if awake
          if (apex.puzzleSolved) {
            const crownY = apex.y - 42;
            const floatSpark = Math.sin(this.time * 3) * 2;
            renderer.drawCircle(apex.x, crownY + floatSpark, 4, hexToRgba('#F4D06F', 0.9));
            renderer.drawCircle(apex.x, crownY + floatSpark, 2, hexToRgba('#FFFFFF', 0.95));
          }
        }
      });
    }

    // 2. Roaming Myth: Lunaris
    const myth = this.roamingMyth;
    const mdx = camPos.x - myth.pos.x;
    const mdy = camPos.y - myth.pos.y;
    if (mdx * mdx + mdy * mdy <= 950 * 950) {
      list.push({
        y: myth.pos.y,
        draw: (renderer: IRenderer, art: ArtToolkit) => {
          // Celestial shifting stardust aura
          const auraPulse = 1.0 + Math.sin(this.time * 3) * 0.2;
          renderer.drawCircle(myth.pos.x, myth.pos.y - 10, 22 * auraPulse, hexToRgba('#A29BFE', 0.3));
          renderer.drawCircle(myth.pos.x, myth.pos.y - 10, 12, hexToRgba('#FFFFFF', 0.4));

          art.drawCreature(myth.pos.x, myth.pos.y, this.time, myth.genome, 'idle', Math.sin(this.time * 0.5) > 0);

          // Trailing celestial star spark
          for (let s = 1; s <= 3; s++) {
            const sx = myth.pos.x - s * 12;
            const sy = myth.pos.y - 8 + Math.sin(this.time * 4 + s) * 4;
            renderer.drawCircle(sx, sy, 2.5 / s, hexToRgba('#DFE6E9', 0.8 / s));
          }
        }
      });
    }

    return list;
  }
}
