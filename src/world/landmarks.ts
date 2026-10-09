import { PRNG, hashSeed } from '../core/prng';
import { BiomeType } from './biomes';
import { Vec2 } from '../core/math';
import { IRenderer } from '../render/types';
import { ArtToolkit } from '../render/art';
import { hexToRgba } from '../core/math';

export interface LandmarkEntry {
  id: string;
  name: string;
  title: string;
  desc: string;
  icon: string;
  x: number;
  y: number;
  discovered: boolean;
}

const REGION_PREFIXES = [
  'Apricot', 'Sleeping', 'Sunstone', 'Whispering', 'Amber', 'Moonlit',
  'Silvermist', 'Bramblewood', 'Cloudveil', 'Clover', 'Golden', 'Emerald',
  'Mossy', 'Starlight', 'Honey', 'Echoing', 'Cedar', 'Serene', 'Willow', 'Wildflower'
];

const REGION_SUFFIXES = [
  'Hollow', 'Pines', 'Valley', 'Ridge', 'Glade', 'Cascades',
  'Reach', 'Crags', 'Meadow', 'Grove', 'Crossing', 'Bluff',
  'Haven', 'Basin', 'Highlands', 'Shallows', 'Creek', 'Rest', 'Sanctuary', 'Pass'
];

const BIOME_SUBTITLES: Record<BiomeType, string> = {
  [BiomeType.Meadow]: 'Gentle rolling pastures and singing breezes',
  [BiomeType.PineForest]: 'Ancient scented evergreens and silent moss',
  [BiomeType.BirchGrove]: 'Sunlit silver boughs and dancing leaves',
  [BiomeType.AutumnMaple]: 'Radiant canopy of falling amber and russet',
  [BiomeType.CherryBlossom]: 'Drifting petals and quiet spring waters',
  [BiomeType.GlowingHollow]: 'Luminescent spores in timeless twilight',
  [BiomeType.LakesRivers]: 'Shimmering currents and polished riverstones',
  [BiomeType.SandyCoast]: 'Tideline breezes and sea-washed dunes',
  [BiomeType.SnowyPeaks]: 'Glacial winds and pristine white snow',
  [BiomeType.WildflowerFields]: 'Endless blossoms humming with meadow life',
  [BiomeType.MistyHighlands]: 'Cloud-shrouded crags above the valley',
  [BiomeType.RockyCliffs]: 'Towering ancient granite carved by time',
  [BiomeType.MarshPonds]: 'Rippling reeds and gentle marsh frog song'
};

const LANDMARK_TEMPLATES = [
  { name: 'The Weeping Willow of Eld', title: 'Ancient Grove Sanctuary', icon: '🌿', desc: 'A centuries-old sacred willow trailing radiant filaments into the mist.' },
  { name: 'Sunken Bell Tower', title: 'Submerged Relic', icon: '🔔', desc: 'An ancient bell tower whose chime echoes softly across evening waters.' },
  { name: "Stargazer's Monolith", title: 'Basalt Obelisk', icon: '✨', desc: 'A towering stone pillar intricately etched with ancient star constellations.' },
  { name: 'Forgotten Tea Pavilion', title: 'Cedar Gazebo', icon: '🍵', desc: 'A weathered mountain pavilion nestled beneath fragrant blossoms.' },
  { name: 'Whispering Stone Arch', title: 'Natural Archway', icon: '🪨', desc: 'A colossal sandstone arch that hums melodically in the mountain winds.' },
  { name: "Old Fisher's Shanty", title: 'Lakeside Pier', icon: '🎣', desc: 'Weathered cedar planks and glowing lanterns by the quiet waters.' },
  { name: "Lover's Overlook", title: 'Floral Bluff', icon: '🌸', desc: 'A breathtaking high cliff blanketed in mountain daisies and wild thyme.' },
  { name: 'Moss-Gilded Dolmen', title: 'Ancient Circle', icon: '🏛️', desc: 'Colossal megaliths resting in deep emerald velvet moss.' },
  { name: "The Hermit's Chimney", title: 'Stone Hearth', icon: '🪵', desc: 'A solitary smoking stone hearth half-hidden in wild brambles.' },
  { name: 'Moonwell Shrine', title: 'Crystalline Pool', icon: '🌙', desc: 'A circular spring that mirrors the night sky with immaculate clarity.' },
  { name: 'Sun-Dial Spire', title: 'Gilded Gnomon', icon: '☀️', desc: 'A quartz spire that traces the wanderer\'s journey with golden shadows.' },
  { name: 'Timber Wolf Hollow', title: 'Spruce Den', icon: '🐾', desc: 'A quiet mossy den sheltered beneath the roots of a fallen monarch tree.' },
  { name: 'Echoing River Cairn', title: 'Balancing Stones', icon: '⛰️', desc: 'Carefully stacked riverstones left by pilgrims of ages past.' },
  { name: 'Clockwork Waterwheel', title: 'Cedar Wheel', icon: '⚙️', desc: 'A quiet paddlewheel turning slowly with the rhythm of the mountain brook.' },
  { name: 'Fairy Ring of Amanita', title: 'Spore Circle', icon: '🍄', desc: 'A vibrant ring of glowing crimson mushrooms humming with magic.' },
  { name: 'Fossilized Drake Ribs', title: 'Ancient Bones', icon: '🦴', desc: 'Colossal prehistoric arches overgrown with honeysuckle vines.' },
  { name: 'The Windmill of Boreas', title: 'Cliff Mill', icon: '🌬️', desc: 'A lone windmill whose sails turn with every whispered gust of wind.' },
  { name: "Seafarer's Compass Rose", title: 'Coastal Mosaic', icon: '🧭', desc: 'A massive nautical compass carved into ocean-facing granite.' },
  { name: 'The Glass Conservatory', title: 'Overgrown Dome', icon: '🏛️', desc: 'An iron-framed glass dome filled with rare wild orchids and fern fronds.' },
  { name: "Wanderer's Crossroads", title: 'Ancient Signpost', icon: '📍', desc: 'A carved wooden fingerpost pointing to forgotten provinces and cozy trails.' }
];

export class LandmarkManager {
  readonly landmarks: LandmarkEntry[] = [];
  private currentRegionKey: string = '';
  onLandmarkDiscovered?: (landmark: LandmarkEntry) => void;
  onRegionEnter?: (name: string, subtitle: string) => void;

  constructor(seedRaw: string | number) {
    const seedNum = typeof seedRaw === 'number' ? seedRaw : hashSeed(seedRaw);
    const rng = new PRNG(seedNum ^ 0x9E3779B9);

    // Generate 20 deterministic landmarks scattered around the world
    for (let i = 0; i < LANDMARK_TEMPLATES.length; i++) {
      const template = LANDMARK_TEMPLATES[i];
      // Distribute radially in a spiral pattern (450px to 2200px from spawn)
      const angle = (i * (Math.PI * 2 / 20)) + (rng.next() - 0.5) * 0.28;
      const dist = 520 + (i % 6) * 260 + rng.next() * 140;
      const x = Math.round(Math.cos(angle) * dist);
      const y = Math.round(Math.sin(angle) * dist);

      this.landmarks.push({
        id: `landmark_${i}`,
        name: template.name,
        title: template.title,
        desc: template.desc,
        icon: template.icon,
        x,
        y,
        discovered: false
      });
    }
  }

  syncSavedLandmarks(savedIds: string[] = []): void {
    const set = new Set(savedIds);
    for (const lm of this.landmarks) {
      if (set.has(lm.id)) {
        lm.discovered = true;
      }
    }
  }

  getRegionInfo(worldX: number, worldY: number, biome: BiomeType): { name: string; subtitle: string; regionKey: string } {
    const regionTileSize = 1536; // 6 chunks per named region
    const rx = Math.floor(worldX / regionTileSize);
    const ry = Math.floor(worldY / regionTileSize);
    const regionKey = `${rx}_${ry}`;

    // Deterministic hash for region coordinates
    const h = Math.abs((rx * 73856093) ^ (ry * 19349663) ^ (biome * 83492791));
    const prefix = REGION_PREFIXES[h % REGION_PREFIXES.length];
    const suffix = REGION_SUFFIXES[(h >> 4) % REGION_SUFFIXES.length];

    const name = `${prefix} ${suffix}`;
    const subtitle = BIOME_SUBTITLES[biome] || 'The Uncharted Wilds';

    return { name, subtitle, regionKey };
  }

  update(playerPos: Vec2, currentBiome: BiomeType): void {
    // 1. Region Title Card check
    const reg = this.getRegionInfo(playerPos.x, playerPos.y, currentBiome);
    if (reg.regionKey !== this.currentRegionKey) {
      this.currentRegionKey = reg.regionKey;
      this.onRegionEnter?.(reg.name, reg.subtitle);
    }

    // 2. Proximity check for 20 landmarks
    for (const lm of this.landmarks) {
      if (!lm.discovered) {
        const dist = Math.hypot(playerPos.x - lm.x, playerPos.y - lm.y);
        if (dist < 46) {
          lm.discovered = true;
          this.onLandmarkDiscovered?.(lm);
        }
      }
    }
  }

  getDiscoveredCount(): number {
    return this.landmarks.filter(l => l.discovered).length;
  }

  render(renderer: IRenderer, art: ArtToolkit, layer: number, camPos: Vec2, time: number): void {
    if (layer !== 0) return; // overworld only

    for (const lm of this.landmarks) {
      const dx = lm.x - camPos.x;
      const dy = lm.y - camPos.y;
      if (Math.abs(dx) > 1000 || Math.abs(dy) > 700) continue;

      // Draw artistic landmark monument
      art.drawDropShadow(lm.x, lm.y, 24, 10);

      // Stone base plinth
      renderer.drawRect(lm.x - 14, lm.y - 10, 28, 12, hexToRgba('#4A5568'));
      renderer.drawRect(lm.x - 11, lm.y - 18, 22, 10, hexToRgba('#718096'));

      // Carved monolith / pillar
      renderer.drawRect(lm.x - 8, lm.y - 42, 16, 26, hexToRgba('#CBD5E0'));

      // Inscribed golden rune / symbol
      renderer.drawCircle(lm.x, lm.y - 30, 4.5, hexToRgba('#ECC94B'));
      renderer.drawCircle(lm.x, lm.y - 30, 2.5, hexToRgba('#FFFFFF'));

      // If discovered, gentle sparkling glow
      if (lm.discovered) {
        const glow = 0.5 + 0.5 * Math.sin(time * 3 + lm.x * 0.1);
        renderer.drawCircle(lm.x, lm.y - 30, 9, hexToRgba('#ECC94B', glow * 0.4));
      }
    }
  }
}
