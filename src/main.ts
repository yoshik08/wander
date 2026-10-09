import { createRenderer, IRenderer } from './render';
import { GameLoop } from './core/loop';
import { InputManager } from './core/input';
import { Camera } from './core/camera';
import { Character } from './entities/character';
import { generateCreatureGenome } from './entities/creature';
import { ChunkManager } from './world/chunk-manager';
import { CHUNK_PIXEL_SIZE, CHUNK_TILES, TILE_SIZE, TILE_FLAG_PATH, TILE_FLAG_WATER } from './world/chunk';
import { BiomeType } from './world/biomes';
import { renderStructure } from './world/structures';
import { hexToRgba, vec2, Vec2 } from './core/math';
import { ArtToolkit } from './render/art';
import { ParticleSystem } from './systems/particles';
import { TimeSystem } from './systems/time';
import { LightingSystem } from './systems/lighting';
import { WeatherSystem } from './systems/weather';
import { WildlifeSystem } from './entities/boids';
import { Cat } from './entities/cat';
import { WildCreatureManager } from './entities/wild-creature';
import { DiegeticMap } from './ui/map';
import { PhotoMode } from './ui/photo-mode';
import { SaveManager } from './systems/save';
import { NPCManager, Warden, RivalWanderer } from './entities/npc';
import { ApexMythManager, ApexCreature, RoamingMyth } from './entities/apex-myths';
import { EasterEggSystem } from './systems/easter-eggs';
import { SparringSystem, Combatant } from './systems/sparring';
import { SparringHUD } from './ui/sparring-hud';
import { PartyLeader } from './entities/party-leader';
import { SanctuaryUI } from './ui/sanctuary-ui';
import { WaystoneUI } from './ui/waystone-ui';
import { SettingsModal } from './ui/settings-modal';

// Add saveManager to window for global access/debug
declare global {
  interface Window {
    saveManager: SaveManager;
  }
}

// 1. Initialize Canvas & Renderer
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element #game-canvas not found');
}

const renderer: IRenderer = createRenderer(canvas);
const art = new ArtToolkit(renderer);
const camera = new Camera(0, 0);
const player = new Character(CHUNK_PIXEL_SIZE / 2, CHUNK_PIXEL_SIZE / 2); // Center of spawn chunk
camera.snapTo(player.pos.x, player.pos.y);

const input = new InputManager(canvas);
const chunkManager = new ChunkManager();
const particles = new ParticleSystem(chunkManager.seed);
const timeSystem = new TimeSystem(8.0); // Spawn at 8:00 AM sunny morning
const lighting = new LightingSystem();
const weather = new WeatherSystem(chunkManager.seed);
const wildlife = new WildlifeSystem(chunkManager.seed);
wildlife.spawnCreaturesAround(player.pos.x, player.pos.y);
const cat = new Cat(player.pos.x + 24, player.pos.y + 12, 0);
const wildCreatures = new WildCreatureManager();
const diegeticMap = new DiegeticMap();
const photoMode = new PhotoMode();
const saveManager = new SaveManager();
saveManager.loadFromLocalStorage();
window.saveManager = saveManager;
player.speedMultiplier = saveManager.state.settings?.speed2x ? 2.0 : 1.0;
const settingsModal = new SettingsModal(saveManager, chunkManager.seedRaw);
settingsModal.onSpeedChange = (speed2x) => {
  player.speedMultiplier = speed2x ? 2.0 : 1.0;
};
settingsModal.onColourblindChange = (cb) => {
  sparringHud.colourblindMode = cb;
};
settingsModal.onToast = (title, desc) => {
  if (toastBanner && toastTitle && toastDesc && toastCount) {
    toastTitle.textContent = title;
    toastDesc.textContent = desc;
    toastCount.textContent = 'Settings Updated';
    toastBanner.style.display = 'block';
    requestAnimationFrame(() => {
      if (toastBanner) {
        toastBanner.style.opacity = '1';
        toastBanner.style.transform = 'translate(-50%, 0)';
      }
    });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      if (toastBanner) {
        toastBanner.style.opacity = '0';
        toastBanner.style.transform = 'translate(-50%, 10px)';
        setTimeout(() => { if (toastBanner) toastBanner.style.display = 'none'; }, 400);
      }
    }, 3500);
  }
};
saveManager.state.clearedObstacles.forEach(o => chunkManager.clearedObstacles.add(o));
const npcManager = new NPCManager(chunkManager.seedRaw);
npcManager.syncDefeatedBadges(saveManager.state.badges);
const apexMythManager = new ApexMythManager(chunkManager.seedRaw);
apexMythManager.syncSavedPuzzles(saveManager.state.clearedObstacles);
const easterEggs = new EasterEggSystem();
(window as any).triggerSleepPile = () => easterEggs.onSleepPile?.();
easterEggs.onMeteorShower = () => {
  const halfW = (renderer.width / 2) / camera.zoom;
  const halfH = (renderer.height / 2) / camera.zoom;
  for (let i = 0; i < 30; i++) {
    window.setTimeout(() => {
      particles.spawnShootingStar(camera.pos.x, camera.pos.y, halfW, halfH);
    }, i * 140);
  }
  if (toastBanner && toastTitle && toastDesc && toastCount) {
    toastTitle.textContent = `🌠 Meteor Shower Awakened!`;
    toastDesc.textContent = `The celestial meadow answers the ancient code.`;
    toastCount.textContent = `Konami Code Unlocked`;
    toastBanner.style.display = 'block';
    requestAnimationFrame(() => {
      if (toastBanner) {
        toastBanner.style.opacity = '1';
        toastBanner.style.transform = 'translate(-50%, 0)';
      }
    });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      if (toastBanner) {
        toastBanner.style.opacity = '0';
        toastBanner.style.transform = 'translate(-50%, 10px)';
        setTimeout(() => { if (toastBanner) toastBanner.style.display = 'none'; }, 400);
      }
    }, 5000);
  }
};
easterEggs.onSleepPile = () => {
  player.action = 'sit';
  if (toastBanner && toastTitle && toastDesc && toastCount) {
    toastTitle.textContent = `💤 Sleep Pile`;
    toastDesc.textContent = `After 10 minutes of stillness, the party rests together.`;
    toastCount.textContent = `Peaceful Respite`;
    toastBanner.style.display = 'block';
    requestAnimationFrame(() => {
      if (toastBanner) {
        toastBanner.style.opacity = '1';
        toastBanner.style.transform = 'translate(-50%, 0)';
      }
    });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      if (toastBanner) {
        toastBanner.style.opacity = '0';
        toastBanner.style.transform = 'translate(-50%, 10px)';
        setTimeout(() => { if (toastBanner) toastBanner.style.display = 'none'; }, 400);
      }
    }, 5000);
  }
};
easterEggs.onWaterSprite = () => {
  if (toastBanner && toastTitle && toastDesc && toastCount) {
    toastTitle.textContent = `🌊 Shy Water Spirit`;
    toastDesc.textContent = `A tiny water sprite popped up, gave a friendly wave, and splashed away!`;
    toastCount.textContent = `50 Water Ripples`;
    toastBanner.style.display = 'block';
    requestAnimationFrame(() => {
      if (toastBanner) {
        toastBanner.style.opacity = '1';
        toastBanner.style.transform = 'translate(-50%, 0)';
      }
    });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      if (toastBanner) {
        toastBanner.style.opacity = '0';
        toastBanner.style.transform = 'translate(-50%, 10px)';
        setTimeout(() => { if (toastBanner) toastBanner.style.display = 'none'; }, 400);
      }
    }, 5000);
  }
};
const sparring = new SparringSystem();
sparring.onYield = (opponent) => {
  if (opponent.badgeReward) {
    if (!saveManager.state.badges.includes(opponent.badgeReward)) {
      saveManager.state.badges.push(opponent.badgeReward);
      saveManager.saveToLocalStorage();
      npcManager.syncDefeatedBadges(saveManager.state.badges);
      if (toastBanner && toastTitle && toastDesc && toastCount) {
        toastTitle.textContent = `🏆 Badge Claimed: ${opponent.badgeReward}`;
        toastDesc.textContent = `You triumphed in a spar with ${opponent.trainerName || 'the Warden'}!`;
        toastCount.textContent = `Badges: ${saveManager.state.badges.length}/8`;
        toastBanner.style.display = 'block';
        requestAnimationFrame(() => {
          if (toastBanner) {
            toastBanner.style.opacity = '1';
            toastBanner.style.transform = 'translate(-50%, 0)';
          }
        });
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
          if (toastBanner) {
            toastBanner.style.opacity = '0';
            toastBanner.style.transform = 'translate(-50%, 10px)';
            setTimeout(() => { if (toastBanner) toastBanner.style.display = 'none'; }, 400);
          }
        }, 5000);
      }
    }
  } else if (opponent.id === 'rival_kael') {
    npcManager.rival.defeated = true;
    if (toastBanner && toastTitle && toastDesc && toastCount) {
      toastTitle.textContent = `✨ Rival Kael yielded!`;
      toastDesc.textContent = `"Incredible harmony! You and your companions are one with this world."`;
      toastCount.textContent = `Rival Encounter Complete`;
      toastBanner.style.display = 'block';
      requestAnimationFrame(() => {
        if (toastBanner) {
          toastBanner.style.opacity = '1';
          toastBanner.style.transform = 'translate(-50%, 0)';
        }
      });
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        if (toastBanner) {
          toastBanner.style.opacity = '0';
          toastBanner.style.transform = 'translate(-50%, 10px)';
          setTimeout(() => { if (toastBanner) toastBanner.style.display = 'none'; }, 400);
        }
      }, 5000);
    }
  }
};
const sparringHud = new SparringHUD(sparring);
sparringHud.colourblindMode = !!saveManager.state.settings?.colourblindMode;

function getPlayerMaxLevel(): number {
  if (saveManager.state.party.length > 0) {
    return Math.max(...saveManager.state.party.map(p => p.level));
  }
  return 5;
}

function getPlayerCombatant(): Combatant {
  if (saveManager.state.party.length > 0) {
    const lead = saveManager.state.party[0];
    const genome = generateCreatureGenome(chunkManager.seedRaw, lead.speciesId, 1.0);
    const maxResolve = lead.maxResolve ?? (30 + Math.floor(lead.level * 3.5 + genome.stats.vigor * 2));
    return {
      id: lead.id,
      genome: {
        ...genome,
        name: lead.nickname || genome.name
      },
      level: lead.level,
      currentResolve: lead.currentResolve || maxResolve,
      maxResolve,
      status: 'None',
      statusTurns: 0
    };
  }
  return {
    genome: { id: 'player', name: 'Wanderer', type: 'Neutral', stats: { vigor: 25, strike: 15, guard: 12, haste: 12 }, archetype: 'Biped', moves: ['Dash', 'Bramble Lash', 'Aqua Burst', 'Cinder Spark'] } as any,
    level: 5,
    currentResolve: 25,
    maxResolve: 25,
    status: 'None',
    statusTurns: 0
  };
}
let partyLeader: PartyLeader | null = null;
if (saveManager.state.party.length > 0) {
  partyLeader = new PartyLeader(player.pos.x - 20, player.pos.y - 10, saveManager.state.party[0], chunkManager.seedRaw);
}
const sanctuaryUI = new SanctuaryUI(saveManager);
const waystoneUI = new WaystoneUI(saveManager, (tx, ty) => {
  player.pos.x = tx;
  player.pos.y = ty;
  player.vel.x = 0;
  player.vel.y = 0;
  camera.pos.x = tx;
  camera.pos.y = ty;
  for (let i = 0; i < 20; i++) {
    particles.spawnFootstepDust(tx + (Math.random() - 0.5) * 20, ty + (Math.random() - 0.5) * 20, Math.random() * Math.PI * 2);
  }
});

// Current world layer (0 = overworld, -1 = underground)
let currentLayer = saveManager.state.layer || 0;
let shootingStarTimer = 3.0;

// Photo Mode Hooks
const photoBtn = document.getElementById('photo-btn');
const photoHud = document.getElementById('photo-hud');
const photoFilterBtn = document.getElementById('photo-filter-btn');
const photoFilterName = document.getElementById('photo-filter-name');
const photoZoomOut = document.getElementById('photo-zoom-out');
const photoZoomIn = document.getElementById('photo-zoom-in');
const photoZoomLabel = document.getElementById('photo-zoom-label');
const photoSnapBtn = document.getElementById('photo-snap-btn');
const photoCloseBtn = document.getElementById('photo-close-btn');

function togglePhotoMode(): void {
  const active = photoMode.toggle(player.pos, camera.zoom);
  if (photoHud) photoHud.style.display = active ? 'flex' : 'none';
  if (photoBtn) photoBtn.style.display = active ? 'none' : 'flex';
  if (mapBtn) mapBtn.style.display = active ? 'none' : 'flex';
  if (interactPrompt && active) interactPrompt.style.display = 'none';
  updatePhotoUI();
}

function updatePhotoUI(): void {
  if (photoFilterName) photoFilterName.textContent = photoMode.getCurrentFilter().name;
  if (photoZoomLabel) photoZoomLabel.textContent = `${photoMode.targetZoom.toFixed(1)}x`;
}

if (photoBtn) {
  photoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePhotoMode();
  });
}
if (photoCloseBtn) {
  photoCloseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePhotoMode();
  });
}
if (photoFilterBtn) {
  photoFilterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    photoMode.cycleFilter();
    updatePhotoUI();
  });
}
if (photoZoomOut) {
  photoZoomOut.addEventListener('click', (e) => {
    e.stopPropagation();
    photoMode.adjustZoom(-0.2);
    updatePhotoUI();
  });
}
if (photoZoomIn) {
  photoZoomIn.addEventListener('click', (e) => {
    e.stopPropagation();
    photoMode.adjustZoom(0.2);
    updatePhotoUI();
  });
}
if (photoSnapBtn) {
  photoSnapBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    photoMode.triggerShutter(canvas);
  });
}

// Mouse wheel zoom in photo mode
window.addEventListener('wheel', (e) => {
  if (photoMode.isActive) {
    e.preventDefault();
    photoMode.adjustZoom(e.deltaY < 0 ? 0.15 : -0.15);
    updatePhotoUI();
  }
}, { passive: false });

// Settings & Map UI button hooks
const settingsBtn = document.getElementById('settings-btn');
if (settingsBtn) {
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsModal.toggle();
  });
}

// 2x Speed hotkey [T]
window.addEventListener('keydown', (e) => {
  if (e.key === 't' || e.key === 'T') {
    if (document.activeElement?.tagName === 'INPUT') return;
    const s = saveManager.state.settings;
    s.speed2x = !s.speed2x;
    saveManager.saveToLocalStorage();
    player.speedMultiplier = s.speed2x ? 2.0 : 1.0;
    if (toastBanner && toastTitle && toastDesc && toastCount) {
      toastTitle.textContent = s.speed2x ? '⚡ 2.0x Speed Enabled' : '🚶 Normal 1.0x Speed';
      toastDesc.textContent = 'Exploration pace toggled [T]';
      toastCount.textContent = 'QoL Feature';
      toastBanner.style.display = 'block';
      requestAnimationFrame(() => {
        if (toastBanner) {
          toastBanner.style.opacity = '1';
          toastBanner.style.transform = 'translate(-50%, 0)';
        }
      });
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        if (toastBanner) {
          toastBanner.style.opacity = '0';
          toastBanner.style.transform = 'translate(-50%, 10px)';
          setTimeout(() => { if (toastBanner) toastBanner.style.display = 'none'; }, 400);
        }
      }, 2500);
    }
  }
});

const mapBtn = document.getElementById('map-btn');
if (mapBtn) {
  mapBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    diegeticMap.toggle();
  });
}
canvas.addEventListener('click', (e: MouseEvent) => {
  if (diegeticMap.isOpen) {
    diegeticMap.close();
  }
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  const cPos = camera.pos;
  const worldX = cPos.x + (screenX - renderer.width / 2) / camera.zoom;
  const worldY = cPos.y + (screenY - renderer.height / 2) / camera.zoom;
  const isWater = chunkManager.isWaterAt(currentLayer, worldX, worldY);
  easterEggs.handleWaterClick(worldX, worldY, isWater);
});

// Rest Interaction Prompt Hook
const interactPrompt = document.getElementById('interact-prompt');
const interactIcon = document.getElementById('interact-icon');
const interactLabel = document.getElementById('interact-label');
let currentRestSpot: { x: number; y: number; label: string } | null = null;
let currentSparTarget: any = null;

if (interactPrompt) {
  interactPrompt.addEventListener('click', (e) => {
    e.stopPropagation();
    if (player.action === 'sit') {
      player.action = 'idle';
      camera.targetZoom = 1.0;
    } else if (currentSparTarget && !sparring.isActive) {
      if (saveManager.state.settings?.peacefulMode) {
        // Peaceful Observe
        for (let i = 0; i < 8; i++) {
          particles.spawnRipple(currentSparTarget.pos.x + (Math.random() - 0.5) * 16, currentSparTarget.pos.y + (Math.random() - 0.5) * 16, 12);
        }
        if (toastBanner && toastTitle && toastDesc && toastCount) {
          toastTitle.textContent = `🕊️ Peaceful Harmony`;
          toastDesc.textContent = `You sat quietly with ${currentSparTarget.genome.name} (${currentSparTarget.genome.type}).`;
          toastCount.textContent = `No-Combat Mode`;
          toastBanner.style.display = 'block';
          requestAnimationFrame(() => {
            if (toastBanner) {
              toastBanner.style.opacity = '1';
              toastBanner.style.transform = 'translate(-50%, 0)';
            }
          });
          if (toastTimer) clearTimeout(toastTimer);
          toastTimer = window.setTimeout(() => {
            if (toastBanner) {
              toastBanner.style.opacity = '0';
              toastBanner.style.transform = 'translate(-50%, 10px)';
              setTimeout(() => { if (toastBanner) toastBanner.style.display = 'none'; }, 400);
            }
          }, 4000);
        }
      } else {
        // Start Sparring!
        camera.targetZoom = 2.0; // Ease closer
        const playerC = getPlayerCombatant();
        const wildC: Combatant = {
          genome: currentSparTarget.genome,
          level: 3,
          currentResolve: currentSparTarget.genome.stats.vigor,
          maxResolve: currentSparTarget.genome.stats.vigor,
          status: 'None',
          statusTurns: 0
        };
        
        sparring.startSpar(playerC, wildC);
        sparringHud.update();
      }
    } else if (currentRestSpot) {
      player.action = 'sit';
      player.pos.x = currentRestSpot.x;
      player.pos.y = currentRestSpot.y;
      player.facingAngle = Math.PI / 2;
      camera.targetZoom = 0.82;
      for (let s = 0; s < 4; s++) {
        particles.spawnFootstepDust(player.pos.x, player.pos.y, s * (Math.PI / 2));
      }
    }
  });
}

// Dust puffs & water ripples from character footsteps
player.onStep = (pos, angle, isRunning) => {
  if (chunkManager.isWaterAt(currentLayer, pos.x, pos.y)) {
    particles.spawnRipple(pos.x, pos.y, isRunning ? 18 : 12);
  } else {
    const wet = weather.getInfo().wetness;
    if (wet > 0.30) {
      particles.spawnRipple(pos.x, pos.y, isRunning ? 10 : 6);
    }
    particles.spawnFootstepDust(pos.x, pos.y, angle);
    if (isRunning) {
      particles.spawnFootstepDust(pos.x, pos.y, angle);
    }
  }
};

// Seed initial ambient particles across the screen
const initialBiome = chunkManager.getBiomeAt(currentLayer, player.pos.x, player.pos.y);
particles.seedViewport(camera.pos.x, camera.pos.y, renderer.width, renderer.height, camera.zoom, initialBiome, 90);

// Resize handling with devicePixelRatio
function handleResize(): void {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.resize(width, height, dpr);
}
window.addEventListener('resize', handleResize);
handleResize();

// Environmental wind vector
const globalWind: Vec2 = vec2(1.2, 0.4);

// Debug overlay state
let showDebug = false;

// Hook chunk GPU cleanup
chunkManager.onChunkUnloaded = (chunk) => {
  renderer.freeChunk(chunk);
  wildCreatures.onChunkUnloaded(chunk);
};

// Keepsake notification toast banner
const toastBanner = document.getElementById('toast-banner');
const toastTitle = document.getElementById('toast-title');
const toastDesc = document.getElementById('toast-desc');
const toastCount = document.getElementById('toast-count');
let toastTimer: number | null = null;

function showKeepsakeToast(name: string, desc: string, totalCount: number): void {
  if (!toastBanner || !toastTitle || !toastDesc || !toastCount) return;
  toastTitle.textContent = `✨ Found: ${name}`;
  toastDesc.textContent = `"${desc}"`;
  toastCount.textContent = `Keepsakes: ${totalCount} collected`;
  toastBanner.style.display = 'block';
  requestAnimationFrame(() => {
    if (toastBanner) {
      toastBanner.style.opacity = '1';
      toastBanner.style.transform = 'translate(-50%, 0)';
    }
  });

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    if (toastBanner) {
      toastBanner.style.opacity = '0';
      toastBanner.style.transform = 'translate(-50%, 10px)';
      setTimeout(() => {
        if (toastBanner) toastBanner.style.display = 'none';
      }, 400);
    }
  }, 4500);
}

// Reusable depth item buffer to prevent per-frame allocations
interface DepthItem {
  baseY: number;
  draw: () => void;
}
const depthItems: DepthItem[] = [];
const debugOverlay = document.getElementById('debug-overlay');

// 2. Fixed Timestep Loop (120 Hz)
const loop = new GameLoop({
  update: (dt: number) => {
    const inputState = input.poll();

    if (inputState.debugPressed) {
      showDebug = !showDebug;
    }

    if (inputState.mapPressed) {
      diegeticMap.toggle();
    }
    if (inputState.menuPressed && diegeticMap.isOpen) {
      diegeticMap.close();
    }
    diegeticMap.update(dt);

    if (inputState.photoPressed) {
      togglePhotoMode();
    }
    if (inputState.menuPressed && photoMode.isActive) {
      togglePhotoMode();
    }
    if (photoMode.isActive) {
      if (inputState.filterPressed) {
        photoMode.cycleFilter();
        updatePhotoUI();
      }
      if (inputState.actionPressed) {
        photoMode.triggerShutter(canvas);
      }
      photoMode.update(inputState.move, dt);
      inputState.move.x = 0;
      inputState.move.y = 0;
      inputState.isRunning = false;
    } else {
      photoMode.update(vec2(0, 0), dt);
    }

    if (sanctuaryUI.isActive) {
      if (inputState.menuPressed) {
        sanctuaryUI.close();
      }
      inputState.move.x = 0;
      inputState.move.y = 0;
      inputState.isRunning = false;
    }
    
    if (waystoneUI.isActive) {
      if (inputState.menuPressed) {
        waystoneUI.close();
      }
      inputState.move.x = 0;
      inputState.move.y = 0;
      inputState.isRunning = false;
    }

    // Dynamic wind modulation and rainbow check driven by weather
    weather.update(dt, !timeSystem.getInfo().isNight);
    const weatherInfo = weather.getInfo();
    const time = performance.now() / 1000;
    globalWind.x = (1.0 + Math.sin(time * 0.8) * 0.6) * weatherInfo.windMultiplier;
    globalWind.y = (0.3 + Math.cos(time * 0.6) * 0.3) * weatherInfo.windMultiplier;

    // Proposed movement with collision detection
    const oldX = player.pos.x;
    const oldY = player.pos.y;

    player.update(inputState.move, inputState.isRunning, globalWind, dt);

    const canTraverseWater = partyLeader?.genome.type === 'Aqua';
    const padding = 5.0; // Collision radius around feet
    if (
      !chunkManager.isTraversable(currentLayer, player.pos.x - padding, oldY, canTraverseWater) ||
      !chunkManager.isTraversable(currentLayer, player.pos.x + padding, oldY, canTraverseWater) ||
      !chunkManager.isTraversable(currentLayer, player.pos.x, oldY - padding, canTraverseWater) ||
      !chunkManager.isTraversable(currentLayer, player.pos.x, oldY + padding, canTraverseWater)
    ) {
      player.pos.x = oldX;
      player.vel.x = 0;
    }

    if (
      !chunkManager.isTraversable(currentLayer, player.pos.x - padding, player.pos.y, canTraverseWater) ||
      !chunkManager.isTraversable(currentLayer, player.pos.x + padding, player.pos.y, canTraverseWater) ||
      !chunkManager.isTraversable(currentLayer, player.pos.x, player.pos.y - padding, canTraverseWater) ||
      !chunkManager.isTraversable(currentLayer, player.pos.x, player.pos.y + padding, canTraverseWater)
    ) {
      player.pos.y = oldY;
      player.vel.y = 0;
    }

    // Update Camera with Lookahead (or follow Photo Mode pan target)
    if (photoMode.isActive) {
      camera.target.x = photoMode.panPos.x;
      camera.target.y = photoMode.panPos.y;
      camera.pos.x = photoMode.panPos.x;
      camera.pos.y = photoMode.panPos.y;
      camera.zoom = photoMode.zoom;
      camera.targetZoom = photoMode.targetZoom;
    } else {
      camera.update(player.pos, player.vel, dt);
    }

    // Stream and prune chunks around camera
    chunkManager.update(currentLayer, camera.pos.x, camera.pos.y);

    // Update ambient, rain, and footstep particles
    const currentBiome = chunkManager.getBiomeAt(currentLayer, player.pos.x, player.pos.y);
    particles.update(
      dt,
      time,
      camera.pos.x,
      camera.pos.y,
      renderer.width,
      renderer.height,
      camera.zoom,
      currentBiome,
      globalWind,
      weatherInfo.isRaining,
      weatherInfo.isStormy
    );

    // Update flocking birds and butterflies
    wildlife.update(
      dt,
      time,
      player.pos,
      camera.pos.x,
      camera.pos.y,
      renderer.width,
      renderer.height,
      camera.zoom,
      globalWind
    );

    // Update cat companion
    cat.update(dt, time, player.pos, player.vel, globalWind, player.action);

    // Update party leader companion
    if (saveManager.state.party.length > 0) {
      if (!partyLeader || partyLeader.genome.speciesId !== saveManager.state.party[0].speciesId) {
        partyLeader = new PartyLeader(player.pos.x - 20, player.pos.y - 10, saveManager.state.party[0], chunkManager.seedRaw);
      }
      partyLeader.update(dt, time, player.pos, player.action === 'sit');
    } else {
      partyLeader = null;
    }
    // Ambient gentle water ripples (fish / breeze surface disturbances)
    if (Math.sin(time * 1.8) > 0.96) {
      const rx = camera.pos.x + Math.sin(time * 3.1) * 200;
      const ry = camera.pos.y + Math.cos(time * 2.7) * 150;
      if (chunkManager.isWaterAt(currentLayer, rx, ry)) {
        particles.spawnRipple(rx, ry, 9);
      }
    }

    // Collect keepsakes on proximity
    const chunksNearPlayer = chunkManager.getVisibleChunks(
      currentLayer,
      player.pos.x,
      player.pos.y,
      renderer.width,
      renderer.height,
      camera.zoom
    );
    for (const chunk of chunksNearPlayer) {
      const baseWorldX = chunk.chunkX * CHUNK_PIXEL_SIZE;
      const baseWorldY = chunk.chunkY * CHUNK_PIXEL_SIZE;
      for (const k of chunk.data.keepsakes) {
        if (!chunkManager.isKeepsakeCollected(k.id)) {
          const kWorldX = baseWorldX + k.x;
          const kWorldY = baseWorldY + k.y;
          const dist = Math.hypot(player.pos.x - kWorldX, player.pos.y - kWorldY);
          if (dist < 24) {
            chunkManager.collectKeepsake(k.id);
            k.collected = true;
            console.log('[KEEPSAKE CHIME] Collected:', k.name);
            for (let s = 0; s < 6; s++) {
              particles.spawnFootstepDust(kWorldX, kWorldY, s * (Math.PI / 3));
            }
            showKeepsakeToast(k.name, k.desc, chunkManager.collectedKeepsakes.size);
          }
        }
      }
    }

    // Update wild creatures roaming in nearby chunks
    wildCreatures.syncWithChunks(chunksNearPlayer, chunkManager.seedRaw);
    wildCreatures.update(dt, time, (wx, wy) => chunkManager.isTraversable(currentLayer, wx, wy), player.pos);

    // 5. Rest Spots (Benches, Logs, Campfire sitting log)
    currentRestSpot = null;
    let canInteractSanctuary = false;
    let canInteractWaystone: { id: string, name: string, x: number, y: number } | null = null;
    let canClearBrambles: { id: string, x: number, y: number } | null = null;
    let canPushBoulder: { id: string, x: number, y: number } | null = null;
    let canHopGap: { id: string, x: number, y: number } | null = null;
    let canEnterCave = currentLayer < 0; // If underground, can always exit
    let closestRestDist = 32;

    for (const chunk of chunksNearPlayer) {
      for (const s of chunk.data.structures) {
        if (s.type === 'sanctuary_crystal') {
           const d = Math.hypot(player.pos.x - s.x, player.pos.y - s.y);
           if (d < 40) canInteractSanctuary = true;
           continue;
        }

        if (s.type === 'waystone') {
          const d = Math.hypot(player.pos.x - s.x, player.pos.y - s.y);
          if (d < 40) {
            canInteractWaystone = { id: s.id, name: `Waystone of ${chunk.data.biome[0] === 0 ? 'Meadow' : 'Fields'}`, x: s.x, y: s.y + 16 };
          }
          continue;
        }

        if (s.type === 'brambles') {
          const d = Math.hypot(player.pos.x - s.x, player.pos.y - s.y);
          if (d < 35) canClearBrambles = { id: s.id, x: s.x, y: s.y };
          continue;
        }

        if (s.type === 'boulder') {
          const d = Math.hypot(player.pos.x - s.x, player.pos.y - s.y);
          if (d < 35) canPushBoulder = { id: s.id, x: s.x, y: s.y };
          continue;
        }

        if (s.type === 'gap') {
          const d = Math.hypot(player.pos.x - s.x, player.pos.y - s.y);
          if (d < 35) canHopGap = { id: s.id, x: s.x, y: s.y };
          continue;
        }

        if (s.type === 'cave_entrance') {
          const d = Math.hypot(player.pos.x - s.x, player.pos.y - s.y);
          if (d < 45) canEnterCave = true;
          continue;
        }

        let spotX = s.x;
        let spotY = s.y;
        let label = 'Rest on Bench';
        if (s.type === 'bench') {
          spotX = s.x;
          spotY = s.y + 1;
          label = 'Rest on Bench';
        } else if (s.type === 'sitting_log') {
          spotX = s.x;
          spotY = s.y + 1;
          label = 'Rest on Log';
        } else if (s.type === 'campfire') {
          spotX = s.x + 17;
          spotY = s.y + 2;
          label = 'Warm by Fire';
        } else if (s.type === 'resting_crystal') {
          spotX = s.x;
          spotY = s.y + 16;
          label = 'Rest at Crystal';
        } else if (s.type === 'nomad_camp') {
          spotX = s.x;
          spotY = s.y + 16;
          label = 'Rest at Camp';
        } else {
          continue;
        }

        const d = Math.hypot(player.pos.x - spotX, player.pos.y - spotY);
        if (d < closestRestDist) {
          closestRestDist = d;
          currentRestSpot = { x: spotX, y: spotY, label };
        }
      }
    }

    // Apex & Myth Proximity Check
    let canActivatePedestal: { apex: ApexCreature; pedIndex: number; label: string } | null = null;
    let targetApex: ApexCreature | null = null;
    let targetMyth: RoamingMyth | null = null;
    if (currentLayer === 0 && !sparring.isActive) {
      for (const apex of apexMythManager.apexCreatures) {
        if (!apex.puzzleSolved) {
          for (let pi = 0; pi < apex.puzzlePedestals.length; pi++) {
            const ped = apex.puzzlePedestals[pi];
            if (!ped.activated && Math.hypot(player.pos.x - ped.x, player.pos.y - ped.y) < 36) {
              canActivatePedestal = { apex, pedIndex: pi, label: ped.label };
              break;
            }
          }
          if (canActivatePedestal) break;
        } else {
          if (Math.hypot(player.pos.x - apex.x, player.pos.y - apex.y) < 54) {
            targetApex = apex;
            break;
          }
        }
      }

      if (!targetApex && !canActivatePedestal) {
        const m = apexMythManager.roamingMyth;
        if (Math.hypot(player.pos.x - m.pos.x, player.pos.y - m.pos.y) < 54) {
          targetMyth = m;
        }
      }
    }

    // Easter Egg Proximity Check (Creator Camp & Milestone)
    let nearCreator = false;
    let nearMilestone = false;
    if (currentLayer === 0 && !sparring.isActive && !targetApex && !canActivatePedestal && !targetMyth) {
      if (Math.hypot(player.pos.x - easterEggs.creatorX, player.pos.y - easterEggs.creatorY) < 54) {
        nearCreator = true;
      } else if (Math.hypot(player.pos.x - easterEggs.milestoneDist, player.pos.y) < 48) {
        nearMilestone = true;
      }
    }

    // Warden & Rival Proximity Check
    let targetWarden: Warden | null = null;
    let targetRival: RivalWanderer | null = null;
    if (currentLayer === 0 && !sparring.isActive && !targetApex && !canActivatePedestal && !targetMyth && !nearCreator && !nearMilestone) {
      for (const w of npcManager.wardens) {
        if (Math.hypot(player.pos.x - w.x, player.pos.y - w.y) < 48) {
          targetWarden = w;
          break;
        }
      }
      if (!targetWarden && Math.hypot(player.pos.x - npcManager.rival.x, player.pos.y - npcManager.rival.y) < 48) {
        targetRival = npcManager.rival;
      }
    }

    // Sparring Proximity Check
    currentSparTarget = null;
    if (!sparring.isActive && !targetWarden && !targetRival && !targetApex && !targetMyth && !canActivatePedestal && !nearCreator && !nearMilestone) {
      let closestSparDist = 48;
      const wInfo = weather.getInfo();
      const tInfo = timeSystem.getInfo();
      const isCold = chunkManager.getBiomeAt(currentLayer, player.pos.x, player.pos.y) === BiomeType.SnowyPeaks;
      const conditionFilter = { wetness: wInfo.wetness, isSnowing: isCold, phase: tInfo.phase };
      for (const c of wildCreatures.getActiveCreatures(conditionFilter)) {
        const d = Math.hypot(player.pos.x - c.pos.x, player.pos.y - c.pos.y);
        if (d < closestSparDist) {
          closestSparDist = d;
          currentSparTarget = c;
        }
      }
    }

    let canPetLeader = false;
    if (partyLeader && !sparring.isActive && currentSparTarget === null) {
      if (Math.hypot(player.pos.x - partyLeader.pos.x, player.pos.y - partyLeader.pos.y) < 40) {
        canPetLeader = true;
      }
    }

    if (sparring.isActive) {
      camera.targetZoom = 2.0;
      if (interactPrompt) interactPrompt.style.display = 'none';
    } else if (camera.targetZoom === 2.0) {
      camera.targetZoom = 1.0;
    } else if (canInteractWaystone) {
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        interactIcon.textContent = '✧';
        interactLabel.textContent = 'Touch Waystone [E]';
      }
      if (inputState.interactPressed) {
        if (!saveManager.state.waystones.some(w => w.id === canInteractWaystone!.id)) {
          saveManager.state.waystones.push(canInteractWaystone!);
          saveManager.saveToLocalStorage();
          if (toastBanner && toastTitle && toastDesc && toastCount) {
            toastTitle.textContent = `✧ Discovered: ${canInteractWaystone!.name}`;
            toastDesc.textContent = `Fast travel point unlocked.`;
            toastCount.textContent = `Waystones: ${saveManager.state.waystones.length}`;
            toastBanner.style.display = 'block';
            requestAnimationFrame(() => {
              if (toastBanner) {
                toastBanner.style.opacity = '1';
                toastBanner.style.transform = 'translate(-50%, 0)';
              }
            });
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = window.setTimeout(() => {
              if (toastBanner) {
                toastBanner.style.opacity = '0';
                toastBanner.style.transform = 'translate(-50%, 10px)';
                setTimeout(() => { if (toastBanner) toastBanner.style.display = 'none'; }, 400);
              }
            }, 4000);
          }
        }
        waystoneUI.open();
      }
    } else if (canClearBrambles) {
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        interactIcon.textContent = '🌿';
        if (partyLeader?.genome.type === 'Flora') {
          interactLabel.textContent = `Clear Brambles with ${partyLeader.genome.name} [E]`;
        } else {
          interactLabel.textContent = `Blocked by brambles. (Requires Flora)`;
        }
      }
      if (inputState.interactPressed && partyLeader?.genome.type === 'Flora') {
        saveManager.state.clearedObstacles.push(canClearBrambles.id);
        saveManager.saveToLocalStorage();
        chunkManager.clearObstacle(canClearBrambles.id);
        for (let i = 0; i < 15; i++) {
          particles.spawnFootstepDust(canClearBrambles.x + (Math.random() - 0.5) * 32, canClearBrambles.y + (Math.random() - 0.5) * 32, Math.random() * Math.PI * 2);
        }
      }
    } else if (canPushBoulder) {
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        interactIcon.textContent = '🪨';
        if (partyLeader?.genome.type === 'Terra') {
          interactLabel.textContent = `Push Boulder with ${partyLeader.genome.name} [E]`;
        } else {
          interactLabel.textContent = `Blocked by boulder. (Requires Terra)`;
        }
      }
      if (inputState.interactPressed && partyLeader?.genome.type === 'Terra') {
        saveManager.state.clearedObstacles.push(canPushBoulder.id);
        saveManager.saveToLocalStorage();
        chunkManager.clearObstacle(canPushBoulder.id);
        for (let i = 0; i < 15; i++) {
          particles.spawnFootstepDust(canPushBoulder.x + (Math.random() - 0.5) * 32, canPushBoulder.y + (Math.random() - 0.5) * 32, Math.random() * Math.PI * 2);
        }
      }
    } else if (canHopGap) {
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        interactIcon.textContent = '🌪️';
        if (partyLeader?.genome.type === 'Aero') {
          interactLabel.textContent = `Hop Gap with ${partyLeader.genome.name} [E]`;
        } else {
          interactLabel.textContent = `Too wide to jump. (Requires Aero)`;
        }
      }
      if (inputState.interactPressed && partyLeader?.genome.type === 'Aero') {
        // Aero jumps over the gap: set player position across the gap based on current facing direction.
        // Or simply remove the gap from collision like other obstacles? Removing the gap represents having crossed it permanently.
        // Actually, if we "clear" the gap, it means we built a bridge over it using Aero. That works fine for game logic.
        saveManager.state.clearedObstacles.push(canHopGap.id);
        saveManager.saveToLocalStorage();
        chunkManager.clearObstacle(canHopGap.id);
        for (let i = 0; i < 15; i++) {
          particles.spawnFootstepDust(canHopGap.x + (Math.random() - 0.5) * 32, canHopGap.y + (Math.random() - 0.5) * 32, Math.random() * Math.PI * 2);
        }
      }
    } else if (canEnterCave) {
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        interactIcon.textContent = currentLayer === 0 ? '🕳️' : '🧗';
        if (partyLeader?.genome.type === 'Ignis' || currentLayer < 0) {
          interactLabel.textContent = currentLayer === 0 ? `Enter Cave [E]` : `Exit Cave [E]`;
        } else {
          interactLabel.textContent = `Too dark to enter. (Requires Ignis)`;
        }
      }
      if (inputState.interactPressed && (partyLeader?.genome.type === 'Ignis' || currentLayer < 0)) {
        // Toggle Layer
        currentLayer = currentLayer === 0 ? -1 : 0;
        
        saveManager.state.layer = currentLayer;
        saveManager.saveToLocalStorage();

        // Clear chunks to force regeneration at new layer
        chunkManager.clearAllChunks();
        
        // Offset player slightly to avoid immediate re-trigger and ensure not in wall
        player.pos.y += 48;
        camera.pos.x = player.pos.x;
        camera.pos.y = player.pos.y;
        camera.target.x = player.pos.x;
        camera.target.y = player.pos.y;
      }
    } else if (canInteractSanctuary) {
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        interactIcon.textContent = '💎';
        interactLabel.textContent = 'Manage Sanctuary [E]';
      }
      if (inputState.interactPressed) {
        sanctuaryUI.open();
      }
    } else if (canPetLeader) {
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        interactIcon.textContent = '💖';
        interactLabel.textContent = `Pet ${partyLeader!.genome.name} [E]`;
      }
      if (inputState.interactPressed) {
        partyLeader!.state = 'sit';
        partyLeader!.timer = 0;
        // spawn particles
        for (let i = 0; i < 3; i++) {
          particles.spawnRipple(partyLeader!.pos.x + (Math.random() - 0.5) * 10, partyLeader!.pos.y - 10 + (Math.random() - 0.5) * 10, 8);
        }
      }
    } else if (player.action === 'sit') {
      camera.targetZoom = 0.82;
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        interactIcon.textContent = '🌱';
        interactLabel.textContent = 'Stand Up [E / Move]';
      }
      if (inputState.interactPressed) {
        player.action = 'idle';
        camera.targetZoom = 1.0;
      }
    } else if (canActivatePedestal) {
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        interactIcon.textContent = '✧';
        interactLabel.textContent = `Resonate with ${canActivatePedestal.label} [E]`;
      }
      if (inputState.interactPressed) {
        canActivatePedestal.apex.puzzlePedestals[canActivatePedestal.pedIndex].activated = true;
        const allActivated = canActivatePedestal.apex.puzzlePedestals.every(p => p.activated);
        if (allActivated) {
          canActivatePedestal.apex.puzzleSolved = true;
          if (!saveManager.state.clearedObstacles.includes(canActivatePedestal.apex.puzzleId)) {
            saveManager.state.clearedObstacles.push(canActivatePedestal.apex.puzzleId);
            saveManager.saveToLocalStorage();
          }
          if (toastBanner && toastTitle && toastDesc && toastCount) {
            toastTitle.textContent = `✨ Shrine Seal Shattered!`;
            toastDesc.textContent = `${canActivatePedestal.apex.name} (${canActivatePedestal.apex.title}) awakens!`;
            toastCount.textContent = `Apex Shrines Awakened`;
            toastBanner.style.display = 'block';
            requestAnimationFrame(() => {
              if (toastBanner) {
                toastBanner.style.opacity = '1';
                toastBanner.style.transform = 'translate(-50%, 0)';
              }
            });
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = window.setTimeout(() => {
              if (toastBanner) {
                toastBanner.style.opacity = '0';
                toastBanner.style.transform = 'translate(-50%, 10px)';
                setTimeout(() => { if (toastBanner) toastBanner.style.display = 'none'; }, 400);
              }
            }, 5000);
          }
        }
      }
    } else if (targetApex) {
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        interactIcon.textContent = '👑';
        interactLabel.textContent = `Spar with ${targetApex.name} (Lv.${targetApex.level}) [E]`;
      }
      if (inputState.interactPressed) {
        camera.targetZoom = 2.0;
        const playerC = getPlayerCombatant();
        const apexC: Combatant = {
          id: targetApex.id,
          trainerName: targetApex.name,
          genome: targetApex.genome,
          level: targetApex.level,
          currentResolve: targetApex.currentResolve,
          maxResolve: targetApex.maxResolve,
          status: 'None',
          statusTurns: 0
        };
        sparring.startSpar(playerC, apexC);
        sparringHud.update();
      }
    } else if (targetMyth) {
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        interactIcon.textContent = '🌟';
        interactLabel.textContent = `Commune with ${targetMyth.name} (Lv.${targetMyth.level}) [E]`;
      }
      if (inputState.interactPressed) {
        camera.targetZoom = 2.0;
        const playerC = getPlayerCombatant();
        const mythC: Combatant = {
          id: targetMyth.id,
          trainerName: targetMyth.name,
          genome: targetMyth.genome,
          level: targetMyth.level,
          currentResolve: targetMyth.currentResolve,
          maxResolve: targetMyth.maxResolve,
          status: 'None',
          statusTurns: 0
        };
        sparring.startSpar(playerC, mythC);
        sparringHud.update();
      }
    } else if (nearCreator) {
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        interactIcon.textContent = '⛺';
        interactLabel.textContent = 'Speak with Yoshik [E]';
      }
      if (inputState.interactPressed) {
        if (toastBanner && toastTitle && toastDesc && toastCount) {
          toastTitle.textContent = `⛺ Yoshik the Cartographer`;
          toastDesc.textContent = `"You've wandered all the way out to the edge of the world. Take a seat by the fire, traveler."`;
          toastCount.textContent = `Secret Outpost (-999, -999)`;
          toastBanner.style.display = 'block';
          requestAnimationFrame(() => {
            if (toastBanner) {
              toastBanner.style.opacity = '1';
              toastBanner.style.transform = 'translate(-50%, 0)';
            }
          });
          if (toastTimer) clearTimeout(toastTimer);
          toastTimer = window.setTimeout(() => {
            if (toastBanner) {
              toastBanner.style.opacity = '0';
              toastBanner.style.transform = 'translate(-50%, 10px)';
              setTimeout(() => { if (toastBanner) toastBanner.style.display = 'none'; }, 400);
            }
          }, 5000);
        }
      }
    } else if (nearMilestone) {
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        interactIcon.textContent = '🪧';
        interactLabel.textContent = 'Read Milestone [E]';
      }
      if (inputState.interactPressed) {
        if (toastBanner && toastTitle && toastDesc && toastCount) {
          toastTitle.textContent = `🪧 10,000 Paces Milestone`;
          toastDesc.textContent = `"Ten thousand paces walked. The horizon remembers every step."`;
          toastCount.textContent = `Far Traveler Milestone`;
          toastBanner.style.display = 'block';
          requestAnimationFrame(() => {
            if (toastBanner) {
              toastBanner.style.opacity = '1';
              toastBanner.style.transform = 'translate(-50%, 0)';
            }
          });
          if (toastTimer) clearTimeout(toastTimer);
          toastTimer = window.setTimeout(() => {
            if (toastBanner) {
              toastBanner.style.opacity = '0';
              toastBanner.style.transform = 'translate(-50%, 10px)';
              setTimeout(() => { if (toastBanner) toastBanner.style.display = 'none'; }, 400);
            }
          }, 5000);
        }
      }
    } else if (targetWarden) {
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        if (!targetWarden.defeated) {
          interactIcon.textContent = '⚔️';
          interactLabel.textContent = `Challenge ${targetWarden.name} [E]`;
        } else {
          interactIcon.textContent = '💬';
          interactLabel.textContent = `Speak with ${targetWarden.name} [E]`;
        }
      }
      if (inputState.interactPressed) {
        if (!targetWarden.defeated) {
          camera.targetZoom = 2.0;
          const playerC = getPlayerCombatant();
          const wardenC: Combatant = {
            id: targetWarden.id,
            trainerName: targetWarden.name,
            badgeReward: targetWarden.badgeName,
            genome: targetWarden.creature.genome,
            level: targetWarden.creature.level,
            currentResolve: targetWarden.creature.currentResolve,
            maxResolve: targetWarden.creature.maxResolve,
            status: 'None',
            statusTurns: 0
          };
          sparring.startSpar(playerC, wardenC);
          sparringHud.update();
        } else {
          if (toastBanner && toastTitle && toastDesc && toastCount) {
            toastTitle.textContent = `${targetWarden.name} (${targetWarden.title})`;
            toastDesc.textContent = `"${targetWarden.dialogue.defeat}"`;
            toastCount.textContent = `Badge: ${targetWarden.badgeName} (Owned)`;
            toastBanner.style.display = 'block';
            requestAnimationFrame(() => {
              if (toastBanner) {
                toastBanner.style.opacity = '1';
                toastBanner.style.transform = 'translate(-50%, 0)';
              }
            });
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = window.setTimeout(() => {
              if (toastBanner) {
                toastBanner.style.opacity = '0';
                toastBanner.style.transform = 'translate(-50%, 10px)';
                setTimeout(() => { if (toastBanner) toastBanner.style.display = 'none'; }, 400);
              }
            }, 4500);
          }
        }
      }
    } else if (targetRival) {
      const rivalCreature = npcManager.getRivalCreature(getPlayerMaxLevel(), chunkManager.seedRaw);
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        if (!targetRival.defeated) {
          interactIcon.textContent = '⚔️';
          interactLabel.textContent = `Spar with Rival Kael (Lv.${rivalCreature.level}) [E]`;
        } else {
          interactIcon.textContent = '💬';
          interactLabel.textContent = `Speak with Rival Kael [E]`;
        }
      }
      if (inputState.interactPressed) {
        if (!targetRival.defeated) {
          camera.targetZoom = 2.0;
          const playerC = getPlayerCombatant();
          const rivalC: Combatant = {
            id: targetRival.id,
            trainerName: targetRival.name,
            genome: rivalCreature.genome,
            level: rivalCreature.level,
            currentResolve: rivalCreature.currentResolve,
            maxResolve: rivalCreature.maxResolve,
            status: 'None',
            statusTurns: 0
          };
          sparring.startSpar(playerC, rivalC);
          sparringHud.update();
        } else {
          if (toastBanner && toastTitle && toastDesc && toastCount) {
            toastTitle.textContent = `${targetRival.name} (${targetRival.title})`;
            toastDesc.textContent = `"${targetRival.dialogue.defeat}"`;
            toastCount.textContent = `Friendly Rival`;
            toastBanner.style.display = 'block';
            requestAnimationFrame(() => {
              if (toastBanner) {
                toastBanner.style.opacity = '1';
                toastBanner.style.transform = 'translate(-50%, 0)';
              }
            });
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = window.setTimeout(() => {
              if (toastBanner) {
                toastBanner.style.opacity = '0';
                toastBanner.style.transform = 'translate(-50%, 10px)';
                setTimeout(() => { if (toastBanner) toastBanner.style.display = 'none'; }, 400);
              }
            }, 4500);
          }
        }
      }
    } else if (currentSparTarget) {
      const isPeaceful = !!saveManager.state.settings?.peacefulMode;
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        interactIcon.textContent = isPeaceful ? '🕊️' : '⚔️';
        interactLabel.textContent = isPeaceful
          ? `Observe ${currentSparTarget.genome.name} [E]`
          : `Spar with ${currentSparTarget.genome.name} [E]`;
      }
      if (inputState.interactPressed) {
        if (isPeaceful) {
          for (let i = 0; i < 8; i++) {
            particles.spawnRipple(currentSparTarget.pos.x + (Math.random() - 0.5) * 16, currentSparTarget.pos.y + (Math.random() - 0.5) * 16, 12);
          }
          if (toastBanner && toastTitle && toastDesc && toastCount) {
            toastTitle.textContent = `🕊️ Peaceful Harmony`;
            toastDesc.textContent = `You sat quietly with ${currentSparTarget.genome.name} (${currentSparTarget.genome.type}).`;
            toastCount.textContent = `No-Combat Mode`;
            toastBanner.style.display = 'block';
            requestAnimationFrame(() => {
              if (toastBanner) {
                toastBanner.style.opacity = '1';
                toastBanner.style.transform = 'translate(-50%, 0)';
              }
            });
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = window.setTimeout(() => {
              if (toastBanner) {
                toastBanner.style.opacity = '0';
                toastBanner.style.transform = 'translate(-50%, 10px)';
                setTimeout(() => { if (toastBanner) toastBanner.style.display = 'none'; }, 400);
              }
            }, 4000);
          }
        } else {
          camera.targetZoom = 2.0;
          const playerC = getPlayerCombatant();
          const wildC: Combatant = {
            id: currentSparTarget.id,
            genome: currentSparTarget.genome,
            level: 3,
            currentResolve: currentSparTarget.genome.stats.vigor,
            maxResolve: currentSparTarget.genome.stats.vigor,
            status: 'None',
            statusTurns: 0
          };
          sparring.startSpar(playerC, wildC);
          sparringHud.update();
        }
      }
    } else if (currentRestSpot) {
      if (interactPrompt && interactLabel && interactIcon) {
        interactPrompt.style.display = 'flex';
        interactIcon.textContent = '🪑';
        interactLabel.textContent = `${currentRestSpot.label} [E]`;
      }
      if (inputState.interactPressed) {
        player.action = 'sit';
        player.pos.x = currentRestSpot.x;
        player.pos.y = currentRestSpot.y;
        player.facingAngle = Math.PI / 2;
        camera.targetZoom = 0.82;
        for (let s = 0; s < 4; s++) {
          particles.spawnFootstepDust(player.pos.x, player.pos.y, s * (Math.PI / 2));
        }
        
        let healed = false;
        saveManager.state.party.forEach(p => {
          const maxR = p.maxResolve ?? generateCreatureGenome(chunkManager.seedRaw, p.speciesId).stats.vigor;
          if (p.currentResolve < maxR) {
            p.currentResolve = maxR;
            healed = true;
          }
        });
        if (healed) saveManager.saveToLocalStorage();
      }
    } else {
      if (interactPrompt) {
        interactPrompt.style.display = 'none';
      }
      if (camera.targetZoom !== 1.0) {
        camera.targetZoom = 1.0;
      }
    }

    // Update NPCs, Apex Myths & Easter Eggs
    npcManager.update(dt);
    apexMythManager.update(dt);
    easterEggs.update(dt, player.vel.x !== 0 || player.vel.y !== 0);

    // Shooting stars at night
    shootingStarTimer -= dt;
    if (shootingStarTimer <= 0) {
      shootingStarTimer = 4.0 + Math.random() * 5.0;
      if (timeSystem.getInfo().isNight) {
        const halfW = (renderer.width / 2) / camera.zoom;
        const halfH = (renderer.height / 2) / camera.zoom;
        particles.spawnShootingStar(camera.pos.x, camera.pos.y, halfW, halfH);
      }
    }

    // Advance 24-minute Day/Night Cycle
    timeSystem.update(dt);
  },

  render: (alpha: number) => {
    // Clear with calm natural deep green
    renderer.beginFrame(hexToRgba('#2A4A28'));

    // Set Camera with smooth sub-pixel interpolation
    const camPos = camera.getInterpolatedPos(alpha);
    renderer.setCamera(camPos.x, camPos.y, camera.zoom);

    const time = performance.now() / 1000;
    const visibleChunks = chunkManager.getVisibleChunks(
      currentLayer,
      camPos.x,
      camPos.y,
      renderer.width,
      renderer.height,
      camera.zoom
    );

    // ==========================================
    // LAYER 1: Cached Chunk Terrain (Ground, Paths, Riverbeds)
    // ==========================================
    for (const chunk of visibleChunks) {
      renderer.drawChunkTerrain(chunk);
    }

    // ==========================================
    // LAYER 1.5: Dynamic Wet Weather Puddles
    // ==========================================
    const curWeather = weather.getInfo();
    if (curWeather.wetness > 0.04) {
      for (const chunk of visibleChunks) {
        const { chunkX, chunkY, data } = chunk;
        const baseWorldX = chunkX * CHUNK_PIXEL_SIZE;
        const baseWorldY = chunkY * CHUNK_PIXEL_SIZE;

        const puddleCount = 6;
        for (let pIdx = 0; pIdx < puddleCount; pIdx++) {
          const h = (Math.imul(chunkX * 73856093 ^ chunkY * 19349663 ^ pIdx * 83492791, 1000003)) >>> 0;
          const tx = (h & 0x1F);
          const ty = ((h >> 5) & 0x1F);
          const tileIdx = ty * CHUNK_TILES + tx;

          const flag = data.tileFlags[tileIdx];
          if ((flag & TILE_FLAG_WATER) === 0 && (data.collision[tileIdx] === 0)) {
            const isPath = (flag & TILE_FLAG_PATH) !== 0;
            const px = baseWorldX + tx * TILE_SIZE + 12;
            const py = baseWorldY + ty * TILE_SIZE + 12;
            const rx = isPath ? 14 : 10;
            const ry = isPath ? 7 : 5;
            art.drawPuddle(px, py, rx, ry, curWeather.wetness);
          }
        }
      }
    }

    // ==========================================
    // LAYER 2: Cached Chunk Water Shader Batch
    // ==========================================
    for (const chunk of visibleChunks) {
      renderer.drawChunkWater(chunk, time);
    }

    // ==========================================
    // LAYER 3: Cached Bridges & Stepping Stones over Water
    // ==========================================
    for (const chunk of visibleChunks) {
      renderer.drawChunkOverWater(chunk);
    }

    // ==========================================
    // LAYER 4: Water Reflections
    // ==========================================
    player.renderReflection(renderer, alpha);

    // ==========================================
    // LAYER 4.5: Bird Shadows on Ground
    // ==========================================
    wildlife.renderGroundShadows(renderer, art, alpha);

    // ==========================================
    // LAYER 5: Y-Sorted Props, Structures & Entities
    // ==========================================
    depthItems.length = 0;
    const p = player.getInterpolatedPos(alpha);
    const timeInfo = timeSystem.getInfo();
    const curBiome = chunkManager.getBiomeAt(currentLayer, p.x, p.y);
    art.setSun(timeInfo.sunAngle, timeInfo.sunElevation);
    art.setSeason(timeInfo.season.season);

    // Props from visible chunks
    for (const chunk of visibleChunks) {
      const { chunkX, chunkY, data } = chunk;
      const baseWorldX = chunkX * CHUNK_PIXEL_SIZE;
      const baseWorldY = chunkY * CHUNK_PIXEL_SIZE;

      for (const prop of data.props) {
        const px = baseWorldX + prop.x;
        const py = baseWorldY + prop.y;

        if (prop.type === 'oak_tree') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawPaintedTree(px, prop.baseY, time, globalWind, 0)
          });
        } else if (prop.type === 'pine_tree') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawPaintedTree(px, prop.baseY, time, globalWind, 1)
          });
        } else if (prop.type === 'flower') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawPaintedFlower(px, prop.baseY, time, globalWind, prop.variant, p)
          });
        } else if (prop.type === 'grass') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawGrassTuft(px, prop.baseY, time, globalWind, p, prop.variant)
          });
        } else if (prop.type === 'lily_pad') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => {
              const bob = Math.sin(time * 2 + px) * 0.8;
              renderer.drawCircle(px, py + bob, 4.5, hexToRgba('#227733'));
              renderer.drawCircle(px - 1, py - 1 + bob, 1.8, hexToRgba('#FFFFFF'));
            }
          });
        } else if (prop.type === 'rock') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawPaintedRock(px, prop.baseY, prop.variant)
          });
        } else if (prop.type === 'glowing_mushroom') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => {
              art.drawMushroom(px, prop.baseY, prop.variant, true);
            }
          });
        } else if (prop.type === 'log') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => {
              renderer.drawRect(px - 8, py - 3, 16, 6, hexToRgba('#6E2C00'));
              renderer.drawCircle(px + 8, py, 2.5, hexToRgba('#D7CCC8'));
            }
          });
        } else if (prop.type === 'shrub') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawShrub(px, prop.baseY, time, globalWind, prop.variant, p)
          });
        } else if (prop.type === 'mushroom') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawMushroom(px, prop.baseY, prop.variant, false)
          });
        } else if (prop.type === 'mushroom_glowing') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawMushroom(px, prop.baseY, prop.variant, true)
          });
        } else if (prop.type === 'fern') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawFern(px, prop.baseY, time, globalWind, prop.variant, p)
          });
        } else if (prop.type === 'birch_tree') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawBirchTree(px, prop.baseY, time, globalWind)
          });
        }
      }

      // Structures from visible chunks
      for (const struct of data.structures) {
        depthItems.push({
          baseY: struct.baseY,
          draw: () => renderStructure(renderer, struct, time, globalWind, art)
        });
      }

      // Collectible keepsakes in chunk
      for (const k of data.keepsakes) {
        if (!chunkManager.isKeepsakeCollected(k.id)) {
          const kx = baseWorldX + k.x;
          const ky = baseWorldY + k.y;
          depthItems.push({
            baseY: ky,
            draw: () => art.drawKeepsake(kx, ky, k.type, time)
          });
        }
      }
    }

    // Player in Depth sorting
    depthItems.push({
      baseY: p.y,
      draw: () => player.render(renderer, alpha)
    });

    // Cat companion in Depth sorting
    const cp = cat.getInterpolatedPos(alpha);
    depthItems.push({
      baseY: cp.y,
      draw: () => cat.render(renderer, art, alpha, time)
    });

    // Party Leader in Depth sorting
    if (partyLeader) {
      depthItems.push({
        baseY: partyLeader.prevPos.y + (partyLeader.pos.y - partyLeader.prevPos.y) * alpha,
        draw: () => partyLeader!.draw(renderer, art, alpha, time)
      });
    }

    // Wild creatures in Depth sorting
    const isCold = curBiome === BiomeType.SnowyPeaks;
    const condFilter = { wetness: weather.getInfo().wetness, isSnowing: isCold, phase: timeInfo.phase };
    for (const creature of wildCreatures.getActiveCreatures(condFilter)) {
      const crPos = creature.getInterpolatedPos(alpha);
      depthItems.push({
        baseY: crPos.y,
        draw: () => creature.render(renderer, art, alpha, time, p)
      });
    }

    // Elemental Monuments & Apex Shrines & Easter Eggs
    npcManager.renderMonuments(renderer, art, currentLayer, camPos);
    apexMythManager.renderShrines(renderer, art, currentLayer, camPos);
    easterEggs.renderCreatorCamp(renderer, art, currentLayer, camPos, time);
    easterEggs.renderMilestoneSign(renderer, currentLayer, camPos, p);
    easterEggs.renderWaterSprite(renderer, time);

    // NPCs (Wardens & Rival) in Depth sorting
    for (const npc of npcManager.getRenderableEntities(currentLayer, camPos)) {
      depthItems.push({
        baseY: npc.y,
        draw: () => npc.draw(renderer)
      });
    }

    // Apex Creatures & Roaming Myth in Depth sorting
    for (const apex of apexMythManager.getRenderableEntities(currentLayer, camPos)) {
      depthItems.push({
        baseY: apex.y,
        draw: () => apex.draw(renderer, art)
      });
    }

    // Sort and Draw
    depthItems.sort((a, b) => a.baseY - b.baseY);
    for (const item of depthItems) {
      item.draw();
    }

    // ==========================================
    // LAYER 5a: Fluttering Meadow Butterflies
    // ==========================================
    wildlife.renderButterflies(renderer, art, alpha);

    // ==========================================
    // LAYER 6: Atmospheric Particles (Pollen, Petals, Leaves, Dust, Spores)
    // ==========================================
    particles.render(renderer, time);

    // ==========================================
    // LAYER 6.5: Sky Flocking Birds
    // ==========================================
    wildlife.renderSkyCreatures(renderer, art, alpha);

    // ==========================================
    // LAYER 7: Canopy God Rays
    // ==========================================
    lighting.renderGodRays(
      renderer,
      camPos.x,
      camPos.y,
      renderer.width,
      renderer.height,
      camera.zoom,
      timeInfo,
      curBiome,
      time
    );

    // Celestial Aurora in High Cold Biomes
    lighting.renderAurora(
      renderer,
      camPos.x,
      camPos.y,
      renderer.width,
      renderer.height,
      camera.zoom,
      timeInfo,
      curBiome,
      time
    );

    // ==========================================
    // LAYER 8: Weather Ambient Tint & Lightning Overlays
    // ==========================================
    weather.renderWeatherOverlay(
      renderer,
      camPos.x,
      camPos.y,
      renderer.width,
      renderer.height,
      camera.zoom
    );

    // ==========================================
    // LAYER 9: Time of Day Lighting Overlay
    // ==========================================
    timeSystem.renderOverlay(
      currentLayer,
      renderer,
      camPos.x,
      camPos.y,
      renderer.width,
      renderer.height,
      camera.zoom
    );

    // ==========================================
    // LAYER 9.5: Point Light Bloom Halos (Punches through darkness)
    // ==========================================
    lighting.renderPointLights(renderer, currentLayer, visibleChunks, time, timeInfo, p, partyLeader);

    // ==========================================
    // LAYER 10: Touch Virtual Joystick UI
    // ==========================================
    const joy = input.getTouchJoystickDisplay();
    if (joy && joy.active) {
      const screenOrigin = renderer.screenToWorld(joy.origin.x, joy.origin.y);
      const screenCurrent = renderer.screenToWorld(joy.current.x, joy.current.y);

      renderer.drawCircle(screenOrigin.x, screenOrigin.y, 35, hexToRgba('#FFFFFF', 0.2));
      renderer.drawCircle(screenCurrent.x, screenCurrent.y, 16, hexToRgba('#FFFFFF', 0.5));
    }

    // ==========================================
    // LAYER 11: Diegetic Map UI
    // ==========================================
    diegeticMap.render(
      renderer,
      art,
      player.pos,
      player.facingAngle,
      cat.pos,
      chunkManager,
      renderer.width,
      renderer.height,
      camera.zoom,
      camPos.x,
      camPos.y,
      time
    );

    // ==========================================
    // LAYER 12: Photo Mode Letterbox & Postcard Filter
    // ==========================================
    photoMode.render(
      renderer,
      art,
      renderer.width,
      renderer.height,
      camPos.x,
      camPos.y
    );

    // ==========================================
    // LAYER 9: Debug Overlay (F3)
    // ==========================================
    if (debugOverlay) {
      if (showDebug && !photoMode.isActive) {
        const stats = renderer.getStats();
        const timeInfo = timeSystem.getInfo();
        const weatherInfo = weather.getInfo();
        debugOverlay.style.display = 'block';
        debugOverlay.innerHTML = `
          <div style="font-weight: 700; color: #38BDF8; margin-bottom: 4px;">MEADOW [F3 DEBUG]</div>
          <div>FPS: <span style="color: #4ADE80; font-weight: 600;">${loop.fps}</span> (${loop.frameTimeMs.toFixed(1)} ms)</div>
          <div>Time: <span style="color: #FBBF24; font-weight: 600;">${timeInfo.timeString}</span> (${timeInfo.name}) | Season: <span style="color: #F472B6; font-weight: 600;">${timeInfo.season.name}</span> (Day ${timeInfo.season.dayInSeason}/2)</div>
          <div>Weather: <span style="color: #67E8F9; font-weight: 600;">${weatherInfo.name}</span> (wind: ${weatherInfo.windMultiplier.toFixed(1)}x, wetness: ${(weatherInfo.wetness * 100).toFixed(0)}%)</div>
          <div>Sim: 120Hz fixed (interp: ${alpha.toFixed(2)})</div>
          <div>Backend: ${stats.backend.toUpperCase()} (draw calls: ${stats.drawCalls})</div>
          <div>Player: X: ${Math.round(player.pos.x)}, Y: ${Math.round(player.pos.y)} (${player.action})</div>
          <div>Companion: Cat (${cat.state})</div>
          <div>Creatures: <span style="color: #A78BFA; font-weight: 600;">${wildCreatures.getActiveCreatures().length}</span> roaming</div>
          <div>Keepsakes: ${chunkManager.collectedKeepsakes.size} collected</div>
          <div>Chunks: ${chunkManager.getActiveChunkCount()} (${visibleChunks.length} visible)</div>
          <div>Particles: ${particles.getActiveCount()} active</div>
          <div>Speed: <span style="color: #FBBF24;">${player.speedMultiplier.toFixed(1)}x</span> | Mode: <span style="color: #4ADE80;">${saveManager.state.settings?.peacefulMode ? 'Peaceful' : 'Sparring'}</span></div>
          <div>Seed: "${chunkManager.seedRaw}"</div>
        `;
      } else {
        debugOverlay.style.display = 'none';
      }
    }

    renderer.endFrame();
  }
});

// 3. Start Game
loop.start();
console.log(`[MEADOW] Seed: "${chunkManager.seedRaw}" (hash: ${chunkManager.seed}). Wandering at dawn.`);
