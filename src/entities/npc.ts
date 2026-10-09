import { Vec2, vec2, hexToRgba, lerp } from '../core/math';
import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';
import { CreatureGenome, CreatureType, generateCreatureGenome } from './creature';
import { CHUNK_PIXEL_SIZE } from '../world/chunk';

export interface Warden {
  id: string;
  name: string;
  title: string;
  element: CreatureType;
  badgeName: string;
  x: number;
  y: number;
  monumentX: number;
  monumentY: number;
  defeated: boolean;
  colorway: { coat: string; scarf: string; glow: string };
  creature: {
    genome: CreatureGenome;
    level: number;
    maxResolve: number;
    currentResolve: number;
  };
  dialogue: {
    intro: string;
    defeat: string;
    victory: string;
  };
}

export interface RivalWanderer {
  id: string;
  name: string;
  title: string;
  x: number;
  y: number;
  defeated: boolean;
  colorway: { coat: string; scarf: string };
  creatureSeed: number;
  dialogue: {
    intro: string;
    defeat: string;
    victory: string;
  };
}

export class NPCManager {
  wardens: Warden[] = [];
  rival: RivalWanderer;
  private time: number = 0;

  constructor(seed: string | number = 'meadow-seed') {
    this.initWardens(seed);
    this.rival = {
      id: 'rival_kael',
      name: 'Rival Kael',
      title: 'The Wandering Seeker',
      x: -160,
      y: -220,
      defeated: false,
      colorway: { coat: '#2C3E50', scarf: '#E74C3C' },
      creatureSeed: 9999,
      dialogue: {
        intro: "Hey Wanderer! You feel that breeze? Let's test our bonds in a friendly spar!",
        defeat: "Incredible harmony! You and your companions are truly one with this world.",
        victory: "Good effort! Take time to breathe and wander; strength comes with the journey."
      }
    };
  }

  private initWardens(globalSeed: string | number) {
    const wardenConfigs = [
      {
        id: 'warden_sylas',
        cx: 9, cy: 0,
        speciesId: 101,
        level: 18,
        name: 'Warden Sylas',
        title: 'Guardian of the Verdant Canopy',
        element: 'Flora' as CreatureType,
        badgeName: 'Verdant Badge',
        coat: '#27ae60', scarf: '#f1c40f', glow: '#2ecc71',
        intro: "Welcome to the Canopy. Nature bends to those who listen.",
        defeat: "You possess the gentle heart of the forest. Take the Verdant Badge.",
        victory: "Listen more closely to the rustle of the leaves."
      },
      {
        id: 'warden_elara',
        cx: 0, cy: 9,
        speciesId: 102,
        level: 20,
        name: 'Warden Elara',
        title: 'Mistress of the Silent Shallows',
        element: 'Aqua' as CreatureType,
        badgeName: 'Tide Badge',
        coat: '#2980b9', scarf: '#a29bfe', glow: '#3498db',
        intro: "Water shapes all stone, yet yields without resistance. Can you match its flow?",
        defeat: "Fluid and graceful. May the Tide Badge guide your passage.",
        victory: "Flow around your obstacles, Wanderer."
      },
      {
        id: 'warden_vance',
        cx: -9, cy: 0,
        speciesId: 103,
        level: 22,
        name: 'Warden Vance',
        title: 'Keeper of the Ember Hearth',
        element: 'Ignis' as CreatureType,
        badgeName: 'Ember Badge',
        coat: '#c0392b', scarf: '#f39c12', glow: '#e74c3c',
        intro: "The flame burns bright and warm. Show me your inner spark!",
        defeat: "A brilliant flame! The Ember Badge is rightfully yours.",
        victory: "Tend your ember until it roars anew."
      },
      {
        id: 'warden_thorne',
        cx: 0, cy: -9,
        speciesId: 104,
        level: 24,
        name: 'Warden Thorne',
        title: 'Sentinel of the Granite Peak',
        element: 'Terra' as CreatureType,
        badgeName: 'Crag Badge',
        coat: '#7f8c8d', scarf: '#e67e22', glow: '#d35400',
        intro: "Steadfast as the mountain. Let us see if your resolve stands firm.",
        defeat: "Unshakable. The Crag Badge shall anchor your spirit.",
        victory: "Root yourself deeper before you strike."
      },
      {
        id: 'warden_zephyr',
        cx: 7, cy: 7,
        speciesId: 105,
        level: 26,
        name: 'Warden Zephyr',
        title: 'Speaker of the Highland Winds',
        element: 'Aero' as CreatureType,
        badgeName: 'Gale Badge',
        coat: '#8e44ad', scarf: '#00cec9', glow: '#a29bfe',
        intro: "The wind answers to no one, yet whispers to all who dare fly.",
        defeat: "You dance upon the currents. Accept the Gale Badge.",
        victory: "You must learn to read the headwinds."
      },
      {
        id: 'warden_mira',
        cx: -7, cy: 7,
        speciesId: 106,
        level: 28,
        name: 'Warden Mira',
        title: 'Nurturer of the Blossom Vale',
        element: 'Flora' as CreatureType,
        badgeName: 'Bloom Badge',
        coat: '#e84393', scarf: '#fdcb6e', glow: '#fd79a8',
        intro: "Every flower takes its own time to blossom. Show me your petals.",
        defeat: "A breathtaking blossom! Carry the Bloom Badge with pride.",
        victory: "Give yourself time to open, little sprout."
      },
      {
        id: 'warden_kaelen',
        cx: -7, cy: -7,
        speciesId: 107,
        level: 30,
        name: 'Warden Kaelen',
        title: 'Watcher of the Glacial Drift',
        element: 'Aqua' as CreatureType,
        badgeName: 'Frost Badge',
        coat: '#0984e3', scarf: '#dfe6e9', glow: '#74b9ff',
        intro: "Stillness precedes the deepest clarity. Test your calm against the frost.",
        defeat: "Your spirit remains warm and clear. Take the Frost Badge.",
        victory: "Find peace in the quiet chill."
      },
      {
        id: 'warden_caelum',
        cx: 7, cy: -7,
        speciesId: 108,
        level: 32,
        name: 'Warden Caelum',
        title: 'Archon of the Starward Skies',
        element: 'Aero' as CreatureType,
        badgeName: 'Astral Badge',
        coat: '#2d3436', scarf: '#ffeaa7', glow: '#dfe6e9',
        intro: "The constellations trace our steps. Are you ready for the final ascent?",
        defeat: "The stars shine upon you, true Wanderer. The Astral Badge is yours.",
        victory: "Look to the stars and try once more."
      }
    ];

    for (const c of wardenConfigs) {
      const genome = generateCreatureGenome(globalSeed, c.speciesId, 2.0);
      genome.type = c.element;
      const wx = c.cx * CHUNK_PIXEL_SIZE + CHUNK_PIXEL_SIZE / 2;
      const wy = c.cy * CHUNK_PIXEL_SIZE + CHUNK_PIXEL_SIZE / 2;
      const maxResolve = 40 + Math.floor(c.level * 4 + genome.stats.vigor * 2);

      this.wardens.push({
        id: c.id,
        name: c.name,
        title: c.title,
        element: c.element,
        badgeName: c.badgeName,
        x: wx + 20,
        y: wy,
        monumentX: wx - 20,
        monumentY: wy,
        defeated: false,
        colorway: { coat: c.coat, scarf: c.scarf, glow: c.glow },
        creature: {
          genome,
          level: c.level,
          maxResolve,
          currentResolve: maxResolve
        },
        dialogue: {
          intro: c.intro,
          defeat: c.defeat,
          victory: c.victory
        }
      });
    }
  }

  getRivalCreature(playerMaxLevel: number, seed: string | number) {
    const rivalLevel = Math.max(playerMaxLevel + 1, 6);
    const genome = generateCreatureGenome(seed, 109, 1.5);
    const maxResolve = 30 + Math.floor(rivalLevel * 3.5 + genome.stats.vigor * 1.8);
    return {
      genome,
      level: rivalLevel,
      maxResolve,
      currentResolve: maxResolve
    };
  }

  syncDefeatedBadges(badges: string[]) {
    for (const warden of this.wardens) {
      if (badges.includes(warden.badgeName)) {
        warden.defeated = true;
      }
    }
  }

  update(dt: number) {
    this.time += dt;
  }

  renderMonuments(renderer: IRenderer, art: ArtToolkit, layer: number, camPos: Vec2) {
    if (layer !== 0) return;

    for (const warden of this.wardens) {
      const dx = camPos.x - warden.monumentX;
      const dy = camPos.y - warden.monumentY;
      if (dx * dx + dy * dy > 900 * 900) continue;

      const mx = warden.monumentX;
      const my = warden.monumentY;

      // Monument ground shadow
      renderer.drawCircle(mx, my + 6, 22, hexToRgba('#1B2631', 0.35));

      // Stepped Stone Dais
      renderer.drawRect(mx - 24, my - 4, 48, 12, hexToRgba('#4B5358', 0.9));
      renderer.drawRect(mx - 18, my - 10, 36, 8, hexToRgba('#5F6A6A', 0.95));

      // Obelisk Monolith Pillar
      renderer.drawRect(mx - 10, my - 54, 20, 46, hexToRgba('#707B7C', 0.95));
      renderer.drawRect(mx - 7, my - 50, 14, 40, hexToRgba('#85929E', 0.9));

      // Obelisk Peak Pyramidion
      renderer.drawRect(mx - 5, my - 62, 10, 8, hexToRgba('#95A5A6', 0.95));
      renderer.drawRect(mx - 2, my - 66, 4, 4, hexToRgba('#BDC3C7', 1.0));

      // Glowing Elemental Rune in center
      const pulse = 0.75 + Math.sin(this.time * 2.5 + mx) * 0.25;
      renderer.drawCircle(mx, my - 32, 6 * pulse, hexToRgba(warden.colorway.glow, 0.4 * pulse));
      renderer.drawCircle(mx, my - 32, 3.5, hexToRgba(warden.colorway.glow, 0.9));
      renderer.drawCircle(mx, my - 32, 1.5, hexToRgba('#FFFFFF', 0.95));
    }
  }

  getRenderableEntities(layer: number, camPos: Vec2) {
    if (layer !== 0) return [];
    const list: {
      y: number;
      draw: (renderer: IRenderer) => void;
    }[] = [];

    const toDraw = [...this.wardens, this.rival];

    for (const npc of toDraw) {
      const dx = camPos.x - npc.x;
      const dy = camPos.y - npc.y;
      if (dx * dx + dy * dy > 900 * 900) continue;

      list.push({
        y: npc.y,
        draw: (renderer: IRenderer) => {
          // Shadow
          renderer.drawCircle(npc.x, npc.y, 8, hexToRgba('#1B2631', 0.4));

          const bob = Math.sin(this.time * 2 + npc.x) * 1.5;

          // Body / Coat
          renderer.drawRect(npc.x - 6, npc.y - 15 + bob, 12, 15, hexToRgba(npc.colorway.coat));
          // Head
          renderer.drawCircle(npc.x, npc.y - 20 + bob, 6, hexToRgba('#FFDAB9'));
          // Scarf
          renderer.drawRect(npc.x - 7, npc.y - 17 + bob, 14, 4, hexToRgba(npc.colorway.scarf));

          // Indicator above head
          if (!npc.defeated) {
            const bounce = Math.sin(this.time * 4) * 2;
            renderer.drawCircle(npc.x, npc.y - 32 + bounce, 4, hexToRgba('#F39C12', 0.8));
            renderer.drawCircle(npc.x, npc.y - 32 + bounce, 2, hexToRgba('#FFFFFF', 0.95));
          } else {
            // Calm star indicator
            renderer.drawCircle(npc.x, npc.y - 30, 2.5, hexToRgba('#2ECC71', 0.7));
          }
        }
      });
    }

    return list;
  }
}

