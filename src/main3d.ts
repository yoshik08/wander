import * as THREE from 'three';
import { Renderer3D } from './render/renderer3d';
import { Terrain3D } from './render/terrain3d';
import { GameLoop } from './core/loop';
import { QualityScaler } from './systems/quality';
import { ChunkManager } from './world/chunk-manager';
import { TimeSystem } from './systems/time';
import { InputManager } from './core/input';
import { Player3D } from './entities/player3d';
import { SaveManager } from './systems/save';
import { AudioSystem } from './audio/engine';
import { JournalUI } from './ui/journal';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { lerp } from './core/math';

// -------------------------------------------------------------
// 1. Initialization
// -------------------------------------------------------------
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas 'game-canvas' not found.");
}

const renderer3d = new Renderer3D(canvas);
const qualityScaler = new QualityScaler('auto');
qualityScaler.onQualityChange = (tier, config) => {
  console.log(`[QualityScaler] Switched to ${tier} tier`);
  handleResize();
};

const chunkManager = new ChunkManager();
const terrain3d = new Terrain3D(renderer3d.scene);
const timeSystem = new TimeSystem(8.0); // Start at 8 AM
const inputManager = new InputManager();
const player3d = new Player3D(renderer3d.scene, renderer3d.camera);

import { WildCreatureManager } from './entities/wild-creature';
import { WildlifeManager3D } from './world/wildlife3d';
import { PartyLeader } from './entities/party-leader';
import { SparringSystem, Combatant } from './systems/sparring';
import { SparringHUD } from './ui/sparring-hud';
import { generateCreatureGenome } from './entities/creature';
import { NPCManager } from './entities/npc';
import { NPCManager3D } from './world/npc3d';
import { ApexMythManager } from './entities/apex-myths';
import { ApexMythManager3D } from './world/apex3d';

const saveManager = new SaveManager();
saveManager.loadFromLocalStorage();

const audioManager = new AudioSystem();
const journalUI = new JournalUI(saveManager);
const wildCreatureManager = new WildCreatureManager();
const wildlifeManager3D = new WildlifeManager3D(wildCreatureManager);
renderer3d.scene.add(wildlifeManager3D.group);

const npcManager = new NPCManager(chunkManager.seedRaw);
const npcManager3D = new NPCManager3D(npcManager);
renderer3d.scene.add(npcManager3D.group);

const apexMythManager = new ApexMythManager(chunkManager.seedRaw);
const apexMythManager3D = new ApexMythManager3D(apexMythManager);
renderer3d.scene.add(apexMythManager3D.group);

const sparring = new SparringSystem();
const sparringHud = new SparringHUD(sparring);

function getPlayerCombatant(): Combatant {
  if (saveManager.state.party && saveManager.state.party.length > 0) {
    const p = saveManager.state.party[0];
    const genome = generateCreatureGenome(chunkManager.seedRaw, p.speciesId);
    return {
      genome: genome,
      level: p.level,
      currentResolve: p.currentResolve,
      maxResolve: p.maxResolve ?? genome.stats.vigor,
      status: 'None',
      statusTurns: 0
    };
  }
  const defaultGenome = generateCreatureGenome(chunkManager.seedRaw, 1);
  return {
    genome: defaultGenome,
    level: 1,
    currentResolve: 25,
    maxResolve: 25,
    status: 'None',
    statusTurns: 0
  };
}

let partyLeader: PartyLeader | null = null;
if (saveManager.state.party && saveManager.state.party.length > 0) {
  partyLeader = new PartyLeader(player3d.pos.x - 20, player3d.pos.z - 10, saveManager.state.party[0], chunkManager.seedRaw);
}

// Journal overlay logic
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyJ') {
    if (journalUI.isOpen) {
      journalUI.close();
    } else {
      journalUI.open();
    }
  }
});

// Apply save data
if (saveManager.state.player) {
  player3d.pos.x = saveManager.state.player.x;
  player3d.pos.z = saveManager.state.player.y; // 2D y is 3D z
}

chunkManager.onChunkUnloaded = (chunk) => {
  terrain3d.unloadChunk(chunk.layer, chunk.chunkX, chunk.chunkY);
  wildCreatureManager.onChunkUnloaded(chunk);
};

// -------------------------------------------------------------
// 1.5 UI Canvas (for Minimap)
// -------------------------------------------------------------
import { createRenderer } from './render/index';
import { ArtToolkit } from './render/art';
import { DiegeticMap } from './ui/map';

const uiCanvas = document.createElement('canvas');
uiCanvas.id = 'ui-canvas';
uiCanvas.style.position = 'absolute';
uiCanvas.style.top = '0';
uiCanvas.style.left = '0';
uiCanvas.style.width = '100%';
uiCanvas.style.height = '100%';
uiCanvas.style.pointerEvents = 'none'; // Only enable when map is open
document.body.appendChild(uiCanvas);

const uiRenderer = createRenderer(uiCanvas);
const artToolkit = new ArtToolkit(uiRenderer);
const diegeticMap = new DiegeticMap();

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') {
    if (diegeticMap.isOpen) {
      diegeticMap.close();
      uiCanvas.style.pointerEvents = 'none';
    } else {
      diegeticMap.open();
      uiCanvas.style.pointerEvents = 'auto';
    }
  }
});

// -------------------------------------------------------------
// 2. Scene Setup & Lighting
// -------------------------------------------------------------
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(100, 150, 100);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.left = -2000;
dirLight.shadow.camera.right = 2000;
dirLight.shadow.camera.top = 2000;
dirLight.shadow.camera.bottom = -2000;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 1000;
renderer3d.scene.add(dirLight);

const ambient = new THREE.AmbientLight(0x606080, 0.6);
renderer3d.scene.add(ambient);

renderer3d.scene.fog = new THREE.FogExp2(0x87CEEB, 0.0005);
renderer3d.scene.background = new THREE.Color(0x87CEEB);

// -------------------------------------------------------------
// 2.2 Weather System (Rain / Snow Particles)
// -------------------------------------------------------------
const weatherGeo = new THREE.BufferGeometry();
const weatherCount = 5000;
const weatherPos = new Float32Array(weatherCount * 3);
for (let i = 0; i < weatherCount * 3; i++) {
  weatherPos[i] = (Math.random() - 0.5) * 1000;
}
weatherGeo.setAttribute('position', new THREE.BufferAttribute(weatherPos, 3));
const weatherMat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 2.0,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending
});
const weatherSystem = new THREE.Points(weatherGeo, weatherMat);
renderer3d.scene.add(weatherSystem);

let isRaining = false;
let isSnowing = false;
let weatherIntensity = 0.0;

// -------------------------------------------------------------
// 2.5 Post-Processing (Grain / Painterly effect)
// -------------------------------------------------------------
const composer = new EffectComposer(renderer3d.renderer);
const renderPass = new RenderPass(renderer3d.scene, renderer3d.camera);
composer.addPass(renderPass);

const GrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    varying vec2 vUv;
    float rand(vec2 n) { 
      return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
    }
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      float noise = (rand(vUv * time) - 0.5) * 0.05;
      gl_FragColor = vec4(texel.rgb + noise, texel.a);
    }
  `
};
const grainPass = new ShaderPass(GrainShader);
composer.addPass(grainPass);

// -------------------------------------------------------------
// 3. UI and Overlay
// -------------------------------------------------------------
let debugMode = true;
const debugHUD = document.createElement('div');
debugHUD.style.position = 'absolute';
debugHUD.style.top = '12px';
debugHUD.style.left = '12px';
debugHUD.style.color = '#00FF00';
debugHUD.style.fontFamily = 'monospace';
debugHUD.style.fontSize = '12px';
debugHUD.style.pointerEvents = 'none';
debugHUD.style.textShadow = '1px 1px 2px #000';
debugHUD.style.whiteSpace = 'pre';
document.body.appendChild(debugHUD);

window.addEventListener('keydown', (e) => {
  if (e.code === 'F3') {
    e.preventDefault();
    debugMode = !debugMode;
    debugHUD.style.display = debugMode ? 'block' : 'none';
  }
});

function updateDebugHUD(fps: number, frameTime: number, timeInfo: any) {
  if (!debugMode) return;
  const info = renderer3d.renderer.info;
  const drawCalls = info.render.calls;
  const triangles = info.render.triangles;
  
  debugHUD.textContent = 
    `MEADOW 3D\n` +
    `FPS: ${fps} | ${frameTime.toFixed(1)}ms\n` +
    `Time: ${timeInfo.timeString} | Phase: ${timeInfo.phase}\n` +
    `Pos: ${player3d.pos.x.toFixed(0)}, ${player3d.pos.z.toFixed(0)}\n` +
    `Tier: ${qualityScaler.currentTier}\n` +
    `Draw Calls: ${drawCalls}\n` +
    `Triangles: ${triangles}\n` +
    `Res: ${renderer3d.width}x${renderer3d.height}\n` +
    `PixelRatio: ${renderer3d.renderer.getPixelRatio().toFixed(1)}\n` +
    `Chunks Loaded: ${terrain3d.chunkMeshes.size}`;
}

// -------------------------------------------------------------
// 4. Resize Handling
// -------------------------------------------------------------
function handleResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio, 2) * qualityScaler.config.resolutionScale;
  renderer3d.resize(w, h, dpr);
  composer.setSize(w, h);
  uiRenderer.resize(w, h, Math.min(window.devicePixelRatio, 2));
}
window.addEventListener('resize', handleResize);
handleResize();

const interactPrompt = document.getElementById('interact-prompt');
const interactIcon = document.getElementById('interact-icon');
const interactLabel = document.getElementById('interact-label');

const toastBanner = document.getElementById('toast-banner');
const toastTitle = document.getElementById('toast-title');
const toastDesc = document.getElementById('toast-desc');
const toastCount = document.getElementById('toast-count');
let toastTimer: number | null = null;

// -------------------------------------------------------------
// 5. Game Loop
// -------------------------------------------------------------
let globalTime = 0;

let currentSparTarget3D: import('./entities/wild-creature').WildCreature | null = null;
let currentSparTargetRival: any = null; // if we do rivals later

// VFX system for sparring
const hitFlashes: { mesh: THREE.Mesh; timer: number; maxTimer: number }[] = [];
function spawnHitFlash(pos: THREE.Vector3, color: number) {
  const geo = new THREE.SphereGeometry(12, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.position.y += 15;
  renderer3d.scene.add(mesh);
  hitFlashes.push({ mesh, timer: 0.3, maxTimer: 0.3 });
}

// Hook into SparringSystem for VFX
const originalUseMove = sparring.useMove.bind(sparring);
sparring.useMove = (attacker: Combatant, defender: Combatant, move: import('./systems/sparring').Move) => {
  const defenderResolveBefore = defender.currentResolve;
  originalUseMove(attacker, defender, move);
  const defenderResolveAfter = defender.currentResolve;
  
  if (defenderResolveAfter < defenderResolveBefore) {
    // Hit!
    const isPlayerAttacking = attacker.id === undefined || attacker.id === 'player';
    const targetPos = isPlayerAttacking ? (currentSparTarget3D ? new THREE.Vector3(currentSparTarget3D.pos.x, 0, currentSparTarget3D.pos.y) : player3d.pos) : player3d.pos;
    
    // Choose color based on type
    let color = 0xffffff;
    if (move.type === 'Ignis') color = 0xe74c3c;
    else if (move.type === 'Aqua') color = 0x3498db;
    else if (move.type === 'Flora') color = 0x2ecc71;
    else if (move.type === 'Terra') color = 0xe67e22;
    else if (move.type === 'Aero') color = 0x9b59b6;
    
    spawnHitFlash(targetPos, color);
  }
};

const loop = new GameLoop({
  update: (dt: number) => {
    globalTime += dt;
    timeSystem.update(dt);
    
    const inputState = inputManager.poll();
    
    // --- Interactions ---
    if (interactPrompt) interactPrompt.style.display = 'none';
    
    let interactHandled = false;
    
    if (!sparring.isActive) {
      // 1. Check Wardens
      let nearWarden = null;
      for (const w of npcManager.wardens) {
        const dx = player3d.pos.x - w.x;
        const dy = player3d.pos.z - w.y;
        if (dx * dx + dy * dy < 1600) { nearWarden = w; break; }
      }
      
      // 2. Check Villagers
      let nearVillager = null;
      if (!nearWarden) {
        for (const v of npcManager.villagers) {
          const dx = player3d.pos.x - v.x;
          const dy = player3d.pos.z - v.y;
          if (dx * dx + dy * dy < 1600) { nearVillager = v; break; }
        }
      }
      
      // 2.5 Check Rival
      let nearRival = null;
      if (!nearWarden && !nearVillager) {
        const dx = player3d.pos.x - npcManager.rival.x;
        const dy = player3d.pos.z - npcManager.rival.y;
        if (dx * dx + dy * dy < 1600) { nearRival = npcManager.rival; }
      }
      
      // 2.7 Check Apex Creatures
      let nearApex = null;
      if (!nearWarden && !nearVillager && !nearRival) {
        for (const apex of apexMythManager.apexCreatures) {
          const dx = player3d.pos.x - apex.x;
          const dy = player3d.pos.z - apex.y;
          if (dx * dx + dy * dy < 3600) { nearApex = apex; break; }
        }
      }
      
      // 3. Check Wild Creatures
      const nearC = !nearWarden && !nearVillager && !nearRival && !nearApex ? wildCreatureManager.getCreatureNear(player3d.pos.x, player3d.pos.z, 40) : null;
      
      if (nearWarden) {
        if (interactPrompt && interactLabel && interactIcon) {
          interactPrompt.style.display = 'flex';
          if (!nearWarden.defeated) {
            interactIcon.textContent = '⚔️';
            interactLabel.textContent = `Challenge ${nearWarden.name} [E]`;
          } else {
            interactIcon.textContent = '💬';
            interactLabel.textContent = `Speak with ${nearWarden.name} [E]`;
          }
        }
        if (inputState.interactPressed) {
          interactHandled = true;
          if (!nearWarden.defeated) {
            const playerC = getPlayerCombatant();
            const wardenC: Combatant = {
              id: nearWarden.id,
              trainerName: nearWarden.name,
              badgeReward: nearWarden.badgeName,
              genome: nearWarden.creature.genome,
              level: nearWarden.creature.level,
              currentResolve: nearWarden.creature.currentResolve,
              maxResolve: nearWarden.creature.maxResolve,
              status: 'None',
              statusTurns: 0
            };
            sparring.startSpar(playerC, wardenC);
            sparringHud.update();
            player3d.targetZoom = 150;
            // No 3D target for now, camera stays on player
          } else {
            // Dialogue
            if (toastBanner && toastTitle && toastDesc && toastCount) {
              toastTitle.textContent = `${nearWarden.name} (${nearWarden.title})`;
              toastDesc.textContent = `"${nearWarden.dialogue.defeat}"`;
              toastCount.textContent = `Badge: ${nearWarden.badgeName} (Owned)`;
              toastBanner.style.display = 'block';
              toastBanner.style.opacity = '1';
              toastBanner.style.transform = 'translate(-50%, 0)';
              if (toastTimer) clearTimeout(toastTimer);
              toastTimer = window.setTimeout(() => {
                toastBanner.style.opacity = '0';
                toastBanner.style.transform = 'translate(-50%, 10px)';
                setTimeout(() => { toastBanner.style.display = 'none'; }, 400);
              }, 4500);
            }
          }
        }
      } else if (nearVillager) {
        if (interactPrompt && interactLabel && interactIcon) {
          interactPrompt.style.display = 'flex';
          interactIcon.textContent = '💬';
          interactLabel.textContent = `Speak with ${nearVillager.name} [E]`;
        }
        if (inputState.interactPressed) {
          interactHandled = true;
          if (toastBanner && toastTitle && toastDesc && toastCount) {
            toastTitle.textContent = `${nearVillager.name}`;
            toastDesc.textContent = `"${nearVillager.dialogue.greeting}"`;
            toastCount.textContent = `Role: ${nearVillager.role}`;
            toastBanner.style.display = 'block';
            toastBanner.style.opacity = '1';
            toastBanner.style.transform = 'translate(-50%, 0)';
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = window.setTimeout(() => {
              toastBanner.style.opacity = '0';
              toastBanner.style.transform = 'translate(-50%, 10px)';
              setTimeout(() => { toastBanner.style.display = 'none'; }, 400);
            }, 4500);
          }
        }
      } else if (nearRival) {
        if (interactPrompt && interactLabel && interactIcon) {
          interactPrompt.style.display = 'flex';
          if (!nearRival.defeated) {
            interactIcon.textContent = '⚔️';
            const rivalCreature = npcManager.getRivalCreature(10, chunkManager.seedRaw);
            interactLabel.textContent = `Spar with Rival Kael (Lv.${rivalCreature.level}) [E]`;
          } else {
            interactIcon.textContent = '💬';
            interactLabel.textContent = `Speak with Rival Kael [E]`;
          }
        }
        if (inputState.interactPressed) {
          interactHandled = true;
          if (!nearRival.defeated) {
            const playerC = getPlayerCombatant();
            const rC = npcManager.getRivalCreature(playerC.level, chunkManager.seedRaw);
            const rivalC: Combatant = {
              id: nearRival.id,
              trainerName: nearRival.name,
              genome: rC.genome,
              level: rC.level,
              currentResolve: rC.currentResolve,
              maxResolve: rC.maxResolve,
              status: 'None',
              statusTurns: 0
            };
            sparring.startSpar(playerC, rivalC);
            sparringHud.update();
            player3d.targetZoom = 150;
            currentSparTargetRival = nearRival;
          } else {
            // Dialogue
            if (toastBanner && toastTitle && toastDesc && toastCount) {
              toastTitle.textContent = `${nearRival.name} (${nearRival.title})`;
              toastDesc.textContent = `"${nearRival.dialogue.defeat}"`;
              toastCount.textContent = `Rival (Friendly)`;
              toastBanner.style.display = 'block';
              toastBanner.style.opacity = '1';
              toastBanner.style.transform = 'translate(-50%, 0)';
              if (toastTimer) clearTimeout(toastTimer);
              toastTimer = window.setTimeout(() => {
                toastBanner.style.opacity = '0';
                toastBanner.style.transform = 'translate(-50%, 10px)';
                setTimeout(() => { toastBanner.style.display = 'none'; }, 400);
              }, 4500);
            }
          }
        }
      } else if (nearApex) {
        if (interactPrompt && interactLabel && interactIcon) {
          interactPrompt.style.display = 'flex';
          interactIcon.textContent = '⚔️';
          interactLabel.textContent = `Challenge ${nearApex.name} [E]`;
        }
        if (inputState.interactPressed) {
          interactHandled = true;
          const playerC = getPlayerCombatant();
          const apexC: Combatant = {
            id: nearApex.id,
            trainerName: nearApex.name,
            genome: nearApex.genome,
            level: nearApex.level,
            currentResolve: nearApex.currentResolve,
            maxResolve: nearApex.maxResolve,
            status: 'None',
            statusTurns: 0
          };
          sparring.startSpar(playerC, apexC);
          sparringHud.update();
          player3d.targetZoom = 150;
          // No currentSparTargetRival/3D since they use separate tracking for now
        }
      } else if (nearC) {
        if (interactPrompt && interactLabel && interactIcon) {
          interactPrompt.style.display = 'flex';
          interactIcon.textContent = '⚔️';
          interactLabel.textContent = `Spar with ${nearC.genome.name} (Lv.${nearC.level}) [E]`;
        }
        if (inputState.interactPressed) {
          interactHandled = true;
          currentSparTarget3D = nearC;
          // Start sparring!
          const playerC = getPlayerCombatant();
          const wildC: Combatant = {
            id: nearC.id,
            genome: nearC.genome,
            level: nearC.level,
            currentResolve: nearC.resolve,
            maxResolve: nearC.maxResolve,
            status: 'None',
            statusTurns: 0
          };
          sparring.startSpar(playerC, wildC);
          sparringHud.update();
          player3d.targetZoom = 150;
        }
      }
    }
    
    if (sparring.isActive) {
      // Rotate camera to view both combatants
      let sparTargetPos = currentSparTarget3D ? currentSparTarget3D.pos : (currentSparTargetRival ? new THREE.Vector2(currentSparTargetRival.x, currentSparTargetRival.y) : null);
      if (sparTargetPos) {
        const dx = sparTargetPos.x - player3d.pos.x;
        const dz = sparTargetPos.y - player3d.pos.z;
        const targetAngle = Math.atan2(dx, dz);
        player3d.yaw = lerp(player3d.yaw, targetAngle + Math.PI/4, dt * 2.0); // Offset angle for nice view
        player3d.pitch = lerp(player3d.pitch, 0.2, dt * 2.0);
        player3d.currentZoom = lerp(player3d.currentZoom, player3d.targetZoom, dt * 5.0);
        
        player3d.cameraPivot.position.copy(player3d.pos);
        player3d.cameraPivot.position.y += 20;
        player3d.cameraPivot.rotation.y = player3d.yaw;
        player3d.cameraPivot.rotation.x = -player3d.pitch;
      }
      
      // We still update chunk based on current pos
    } else {
      player3d.targetZoom = 300;
      // Update player and camera
      player3d.update(dt, inputState, chunkManager, renderer3d.camera);
      if (currentSparTarget3D) currentSparTarget3D = null;
    }
    terrain3d.updateTime(globalTime);
    
    // Chunk loading based on player position
    const layer = 0;
    const centerChunkX = Math.floor(player3d.pos.x / 768);
    const centerChunkY = Math.floor(player3d.pos.z / 768);
    chunkManager.update(layer, centerChunkX, centerChunkY);
    
    const w = window.innerWidth;
    const h = window.innerHeight;
    const visible = chunkManager.getVisibleChunks(layer, player3d.pos.x, player3d.pos.z, w * 5, h * 5, 1);
    for (const chunk of visible) {
      terrain3d.updateChunk(chunk.data);
      for (const s of chunk.data.structures) {
        if (s.type === 'village_well') {
          npcManager.registerVillage(chunk.data.chunkX, chunk.data.chunkY, s.x, s.y, Number(chunkManager.seedRaw));
        }
      }
    }
    
    // Sync and update wildlife
    wildCreatureManager.syncWithChunks(visible, chunkManager.seedRaw);
    wildCreatureManager.update(
      dt,
      globalTime,
      (x, y) => !chunkManager.isWaterAt(0, x, y), // basic collision logic for animals
      { x: player3d.pos.x, y: player3d.pos.z }
    );
    
    if (partyLeader) {
      partyLeader.update(dt, globalTime, { x: player3d.pos.x, y: player3d.pos.z }, false);
    }
    
    npcManager.update(dt);
    npcManager3D.update(dt, globalTime);
    apexMythManager3D.update(dt, globalTime);
    
    // Update hit flashes
    for (let i = hitFlashes.length - 1; i >= 0; i--) {
      const hf = hitFlashes[i];
      hf.timer -= dt;
      if (hf.timer <= 0) {
        renderer3d.scene.remove(hf.mesh);
        hf.mesh.geometry.dispose();
        (hf.mesh.material as THREE.Material).dispose();
        hitFlashes.splice(i, 1);
      } else {
        const scale = 1.0 + (1.0 - hf.timer / hf.maxTimer) * 2.0;
        hf.mesh.scale.set(scale, scale, scale);
        (hf.mesh.material as THREE.MeshBasicMaterial).opacity = (hf.timer / hf.maxTimer) * 0.8;
      }
    }
    
    // Weather logic
    const tInfo = timeSystem.getInfo();
    // Deterministic weather based on day
    const noiseDay = Math.sin(tInfo.season.dayTotal * 12.9898) * 43758.5453;
    const wNoise = noiseDay - Math.floor(noiseDay);
    
    isSnowing = tInfo.season.season === 'winter' && wNoise > 0.5;
    isRaining = tInfo.season.season !== 'winter' && wNoise > 0.7;
    weatherIntensity = isSnowing || isRaining ? 1.0 : 0.0;
    
    wildlifeManager3D.update(dt, globalTime, { wetness: isRaining ? 1 : 0, isSnowing, phase: tInfo.phase });
    wildlifeManager3D.updatePartyLeader(partyLeader, globalTime);
    
    if (weatherIntensity > 0) {
      weatherSystem.visible = true;
      const positions = weatherGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < weatherCount; i++) {
        const fallSpeed = isSnowing ? 100 : 800;
        positions[i * 3 + 1] -= dt * fallSpeed;
        if (positions[i * 3 + 1] < -100) {
          positions[i * 3 + 1] = player3d.pos.y + 400 + Math.random() * 200;
          positions[i * 3] = player3d.pos.x + (Math.random() - 0.5) * 1000;
          positions[i * 3 + 2] = player3d.pos.z + (Math.random() - 0.5) * 1000;
        }
      }
      weatherGeo.attributes.position.needsUpdate = true;
      weatherMat.color.setHex(isSnowing ? 0xffffff : 0x88bbff);
      weatherMat.size = isSnowing ? 4.0 : 1.5;
    } else {
      weatherSystem.visible = false;
    }
  },
  render: (alpha: number) => {
    // Dynamic Sky and Lighting
    const tInfo = timeSystem.getInfo();
    const c = tInfo.ambientColor;
    const threeColor = new THREE.Color(c.r, c.g, c.b);
    
    // Base ambient and fog on time of day
    ambient.color.copy(threeColor).multiplyScalar(0.7);
    (renderer3d.scene.fog as THREE.FogExp2).color.copy(threeColor).lerp(new THREE.Color(0x87CEEB), Math.max(0, tInfo.sunElevation));
    (renderer3d.scene.background as THREE.Color).copy((renderer3d.scene.fog as THREE.FogExp2).color);
    
    // Move sun based on time
    const sunAngle = (timeSystem.currentHour / 24) * Math.PI * 2;
    dirLight.position.set(Math.sin(sunAngle) * 500 + player3d.pos.x, Math.cos(sunAngle) * 500, 100 + player3d.pos.z);
    dirLight.intensity = Math.max(0, Math.cos(sunAngle)) * 1.5;
    
    // Update materials sun dir
    terrain3d.material.uniforms.uSunLightDir.value.copy(dirLight.position).normalize();
    terrain3d.material.uniforms.uSunLightColor.value.copy(threeColor);

    // Render with composer
    grainPass.uniforms.time.value = globalTime;
    composer.render();
    
    qualityScaler.recordFrame(loop.frameTimeMs / 1000);
    updateDebugHUD(loop.fps, loop.frameTimeMs, tInfo);
    
    // UI Rendering
    uiRenderer.beginFrame();
    if (diegeticMap.isOpen || diegeticMap.openProgress > 0) {
      const dtMap = loop.frameTimeMs / 1000;
      diegeticMap.update(dtMap);
      // DiegeticMap expects player pos in x,y format, which maps to x,z in 3D
      const mapPos = { x: player3d.pos.x, y: player3d.pos.z };
      
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      // we don't have cat yet, just use player pos for now
      diegeticMap.render(
        uiRenderer, 
        artToolkit, 
        mapPos as any, 
        0, 
        mapPos as any, 
        chunkManager, 
        saveManager, 
        w, h, 
        1, // zoom
        mapPos.x, mapPos.y, 
        globalTime
      );
    }
  }
});

loop.start();
console.log('MEADOW 3D Engine Started!');
