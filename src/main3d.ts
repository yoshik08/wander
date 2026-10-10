import * as THREE from 'three';
import { Renderer3D } from './render/renderer3d';
import { GameLoop } from './core/loop';
import { QualityScaler } from './systems/quality';

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

// -------------------------------------------------------------
// 2. Scene Setup (Basic test)
// -------------------------------------------------------------
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshStandardMaterial({ 
  color: 0x27AE60, 
  roughness: 0.8,
  metalness: 0.1
});
const cube = new THREE.Mesh(geometry, material);
cube.castShadow = true;
cube.receiveShadow = true;
renderer3d.scene.add(cube);

const planeGeo = new THREE.PlaneGeometry(20, 20);
const planeMat = new THREE.MeshStandardMaterial({ color: 0x7F8C8D });
const plane = new THREE.Mesh(planeGeo, planeMat);
plane.rotation.x = -Math.PI / 2;
plane.position.y = -1;
plane.receiveShadow = true;
renderer3d.scene.add(plane);

// Lighting
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(10, 15, 10);
dirLight.castShadow = true;
renderer3d.scene.add(dirLight);
const ambient = new THREE.AmbientLight(0x404040, 0.6);
renderer3d.scene.add(ambient);

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
    `PixelRatio: ${renderer3d.renderer.getPixelRatio().toFixed(1)}`;
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
    
    // Rotate cube
    cube.rotation.x += 1.0 * dt;
    cube.rotation.y += 0.5 * dt;
  },
  render: (alpha: number) => {
    // We could apply alpha interpolation to mesh transforms here if needed
    renderer3d.render();
    
    // Feed dt to quality scaler
    qualityScaler.recordFrame(loop.frameTimeMs / 1000);
    
    updateDebugHUD(loop.fps, loop.frameTimeMs);
  }
});

loop.start();
console.log('MEADOW 3D Engine Started!');
