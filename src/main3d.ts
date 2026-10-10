import * as THREE from 'three';
import { Renderer3D } from './render/renderer3d';
import { Terrain3D } from './render/terrain3d';
import { GameLoop } from './core/loop';
import { QualityScaler } from './systems/quality';
import { ChunkManager } from './world/chunk-manager';

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

chunkManager.onChunkUnloaded = (chunk) => {
  terrain3d.unloadChunk(chunk.layer, chunk.chunkX, chunk.chunkY);
};

// -------------------------------------------------------------
// 2. Scene Setup (Basic test)
// -------------------------------------------------------------
// Lighting
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(100, 150, 100);
dirLight.castShadow = true;
// Increase shadow map resolution and size for terrain
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.left = -2000;
dirLight.shadow.camera.right = 2000;
dirLight.shadow.camera.top = 2000;
dirLight.shadow.camera.bottom = -2000;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 1000;
renderer3d.scene.add(dirLight);

const ambient = new THREE.AmbientLight(0x606080, 0.6); // slight blueish ambient
renderer3d.scene.add(ambient);

renderer3d.scene.fog = new THREE.FogExp2(0x87CEEB, 0.0005);

// Let's set a starting camera position
let camX = 0;
let camZ = 0;
renderer3d.camera.position.set(camX, 200, camZ + 300);
renderer3d.camera.lookAt(camX, 0, camZ);

// -------------------------------------------------------------
// 3. UI and Overlay
// -------------------------------------------------------------
let debugMode = true; // F3 Overlay
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

function updateDebugHUD(fps: number, frameTime: number) {
  if (!debugMode) return;
  const info = renderer3d.renderer.info;
  const drawCalls = info.render.calls;
  const triangles = info.render.triangles;
  
  debugHUD.textContent = 
    `MEADOW 3D\n` +
    `FPS: ${fps} | ${frameTime.toFixed(1)}ms\n` +
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
  // Apply resolution scale from QualityScaler
  const dpr = Math.min(window.devicePixelRatio, 2) * qualityScaler.config.resolutionScale;
  renderer3d.resize(w, h, dpr);
}
window.addEventListener('resize', handleResize);
handleResize(); // Initial call

// -------------------------------------------------------------
// 5. Game Loop
// -------------------------------------------------------------
let globalTime = 0;

const loop = new GameLoop({
  update: (dt: number) => {
    globalTime += dt;
    
    // Very basic camera movement to see chunks generating
    camX += 50 * dt; 
    renderer3d.camera.position.x = camX;
    renderer3d.camera.position.z = camZ + 400;
    renderer3d.camera.lookAt(camX, 0, camZ);
    
    const layer = 0;
    const centerChunkX = Math.floor(camX / 768);
    const centerChunkY = Math.floor(camZ / 768);
    
    chunkManager.update(layer, centerChunkX, centerChunkY);
    
    // Get visible chunks and add to terrain
    const w = window.innerWidth;
    const h = window.innerHeight;
    const visible = chunkManager.getVisibleChunks(layer, camX, camZ, w * 5, h * 5, 1);
    for (const chunk of visible) {
      terrain3d.updateChunk(chunk.data);
    }
  },
  render: (alpha: number) => {
    renderer3d.render();
    qualityScaler.recordFrame(loop.frameTimeMs / 1000);
    updateDebugHUD(loop.fps, loop.frameTimeMs);
  }
});

loop.start();
console.log('MEADOW 3D Engine Started!');
