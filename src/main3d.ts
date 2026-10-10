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

const saveManager = new SaveManager();
saveManager.loadFromLocalStorage();

const audioManager = new AudioSystem();
const journalUI = new JournalUI(saveManager);

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

// -------------------------------------------------------------
// 5. Game Loop
// -------------------------------------------------------------
let globalTime = 0;

const loop = new GameLoop({
  update: (dt: number) => {
    globalTime += dt;
    timeSystem.update(dt);
    
    // Update player and camera
    player3d.update(dt, inputManager, chunkManager, renderer3d.camera);
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
    }
    
    // Weather logic
    const tInfo = timeSystem.getInfo();
    // Deterministic weather based on day
    const noiseDay = Math.sin(tInfo.season.dayTotal * 12.9898) * 43758.5453;
    const wNoise = noiseDay - Math.floor(noiseDay);
    
    isSnowing = tInfo.season.season === 'winter' && wNoise > 0.5;
    isRaining = tInfo.season.season !== 'winter' && wNoise > 0.7;
    weatherIntensity = isSnowing || isRaining ? 1.0 : 0.0;
    
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
