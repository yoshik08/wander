import { Player } from '../entities/player';
import { Camera } from './camera';
import { drawCharacter, CharacterParams } from '../art/character-rig';
import { ChunkManager } from './chunk-manager';
import { biomeData } from '../world/biome';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Could not get canvas context');
}
document.body.appendChild(canvas);

// Set canvas size to window size, but we can make it fullscreen
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Get seed from URL or generate random
const urlParams = new URLSearchParams(window.location.search);
let seed = parseInt(urlParams.get('seed') || '');
if (isNaN(seed) || seed === 0) {
  seed = Math.floor(Math.random() * 0xFFFFFFFF);
}
// Update URL with seed for sharing
window.history.replaceState(null, '', `?seed=${seed}`);

// Game constants
const FIXED_TIMESTEP = 1 / 60; // 60 Hz
let lastTime = performance.now();
let accumulator = 0;

// Game entities
const player = new Player();
const camera = new Camera();
const chunkManager = new ChunkManager(seed);

// Input state
const keys: { [key: string]: boolean } = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Player movement constants
const acceleration = 1000; // pixels per second^2
const baseMaxSpeed = 100; // pixels per second (walking)
const runMaxSpeed = 200; // pixels per second (running)
const friction = 0.9; // when no input

// Character parameters
const characterScale = 3;
const characterColor = '#FF6B6B'; // default red
const scarfColor = '#4ECDC4'; // default teal

// Game loop
function loop(now: number) {
  const deltaTime = (now - lastTime) / 1000; // seconds
  lastTime = now;
  accumulator += deltaTime;

  // Update fixed timestep
  while (accumulator >= FIXED_TIMESTEP) {
    update(FIXED_TIMESTEP);
    accumulator -= FIXED_TIMESTEP;
  }

  // Render
  const alpha = accumulator / FIXED_TIMESTEP;
  render(ctx, alpha);

  requestAnimationFrame(loop);
}

function update(dt: number) {
  // Request chunks around the player
  chunkManager.requestChunksAround(player.x, player.y, 3);

  // Horizontal input
  let inputX = 0;
  let inputY = 0;
  if (keys['KeyW'] || keys['ArrowUp']) inputY = -1;
  if (keys['KeyS'] || keys['ArrowDown']) inputY = 1;
  if (keys['KeyA'] || keys['ArrowLeft']) inputX = -1;
  if (keys['KeyD'] || keys['ArrowRight']) inputX = 1;

  // Normalize diagonal input
  if (inputX !== 0 && inputY !== 0) {
    const len = Math.sqrt(inputX * inputX + inputY * inputY);
    inputX /= len;
    inputY /= len;
  }

  // Determine if running
  const runModifier = keys['ShiftLeft'] || keys['ShiftRight'];
  const maxSpeed = runModifier ? runMaxSpeed : baseMaxSpeed;

  // Apply acceleration
  player.vx += inputX * acceleration * dt;
  player.vy += inputY * acceleration * dt;

  // Clamp to max speed
  const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
  if (speed > maxSpeed) {
    player.vx *= maxSpeed / speed;
    player.vy *= maxSpeed / speed;
  }

  // Apply friction when no input
  if (inputX === 0 && inputY === 0) {
    player.vx *= friction;
    player.vy *= friction;
  }

  player.update(dt);
  camera.update(player, canvas.height);
}

function render(ctx: CanvasRenderingContext2D, alpha: number) {
  // Clear screen
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Save context and apply camera transform
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // Draw sky
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(-2000, -2000, 4000, 4000);

  // Draw chunks
  const chunks = chunkManager.getChunksAround(player.x, player.y, 3);
  for (const chunk of chunks) {
    drawChunk(ctx, chunk);
  }

  // Draw player with interpolation
  const playerX = player.x + player.vx * alpha;
  const playerY = player.y + player.vy * alpha;
  const charParams: CharacterParams = {
    position: {
      x: playerX,
      y: playerY - 26 // offset so that feet are at player.y
    },
    direction: player.direction,
    animation: player.animationState,
    frame: player.animationFrame,
    scale: characterScale,
    color: characterColor,
    scarfColor: scarfColor
  };
  drawCharacter(ctx, charParams);

  ctx.restore();

  // Draw UI overlay (debug info) for now
  ctx.fillStyle = '#000000';
  ctx.font = '16px monospace';
  ctx.fillText(`Player: (${player.x.toFixed(1)}, ${player.y.toFixed(1)})`, 10, 20);
  ctx.fillText(`Camera: (${camera.x.toFixed(1)}, ${camera.y.toFixed(1)})`, 10, 40);
  ctx.fillText(`State: ${player.animationState} Frame: ${player.animationFrame}`, 10, 60);
  ctx.fillText(`Dir: ${player.direction.toFixed(2)}`, 10, 80);
  ctx.fillText(`Speed: ${Math.sqrt(player.vx*player.vx+player.vy*player.vy).toFixed(1)}`, 10, 100);
  ctx.fillText(`Seed: ${seed}`, 10, 120);
}

// Draw a single chunk
function drawChunk(ctx: CanvasRenderingContext2D, chunk: any) {
  const data = chunk.data;
  const heightMap = data.heightMap;
  const biomeMap = data.biomeMap;
  const propMap = data.propMap;
  const chunkX = chunk.chunkX;
  const chunkY = chunk.chunkY;

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const worldX = (chunkX * 32 + x) * 16;
      const worldY = (chunkY * 32 + y) * 16;
      const elevation = heightMap[y][x]; // -1 to 1
      const biomeType = biomeMap[y][x];
      const prop = propMap[y][x];

      // Get biome data
      const biome = biomeData[biomeType];

      // Base color from biome
      let r = parseInt(biome.groundColor.slice(1, 3), 16);
      let g = parseInt(biome.groundColor.slice(3, 5), 16);
      let b = parseInt(biome.groundColor.slice(5, 7), 16);

      // Adjust brightness based on elevation (higher elevation = brighter? Actually, we want higher elevation to be cooler and maybe lighter for snow)
      // We'll just use elevation to adjust the color multiplier from biome data
      const [rm, gm, bm] = biome.colorMultiplier;
      r = Math.round(r * rm * (1 + elevation * 0.2)); // elevation from -1 to 1, so adjust by +/-20%
      g = Math.round(g * gm * (1 + elevation * 0.2));
      b = Math.round(b * bm * (1 + elevation * 0.2));

      // Clamp to 0-255
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));

      const color = `rgb(${r},${g},${b})`;

      // Draw the tile
      ctx.fillStyle = color;
      ctx.fillRect(worldX, worldY, 16, 16);

      // Draw prop if any
      if (prop) {
        drawProp(ctx, worldX, worldY, prop, biomeType);
      }
    }
  }
}

// Draw a prop (simple representation for now)
function drawProp(ctx: CanvasRenderingContext2D, worldX: number, worldY: number, prop: string, biomeType: number) {
  // We'll draw simple shapes for each prop type
  ctx.save();
  ctx.translate(worldX, worldY);
  ctx.fillStyle = '#000000'; // default black for props, we'll change per type
  switch (prop) {
    case 'tree':
      ctx.fillRect(6, 0, 4, 8); // trunk
      ctx.beginPath();
      ctx.arc(8, -4, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'flower':
      ctx.beginPath();
      ctx.arc(8, 4, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'rock':
      ctx.fillRect(4, 4, 8, 8);
      break;
    case 'shell':
      ctx.beginPath();
      ctx.arc(8, 8, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'pine':
      ctx.fillRect(6, 0, 4, 10); // trunk
      // Draw pine layers
      ctx.fillRect(4, -2, 8, 4);
      ctx.fillRect(2, -6, 12, 4);
      ctx.fillRect(0, -10, 16, 4);
      break;
    case 'fern':
      ctx.fillRect(6, 0, 4, 6);
      ctx.beginPath();
      ctx.arc(8, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'log':
      ctx.fillRect(0, 6, 16, 4);
      break;
    case 'mushroom':
      ctx.fillRect(6, 2, 4, 6); // stem
      ctx.beginPath();
      ctx.arc(8, -2, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'reed':
      ctx.fillRect(7, 0, 2, 10);
      break;
    case 'lily':
      ctx.beginPath();
      ctx.arc(8, 8, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'cherryTree':
      ctx.fillRect(6, 0, 4, 8); // trunk
      ctx.beginPath();
      ctx.arc(8, -4, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#FFB6C1';
      ctx.fill();
      break;
    case 'petal':
      ctx.beginPath();
      ctx.arc(8, 4, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFB6C1';
      ctx.fill();
      break;
    case 'sparseTree':
      ctx.fillRect(6, 0, 4, 6);
      ctx.beginPath();
      ctx.arc(8, -2, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'stone':
      ctx.fillRect(4, 4, 8, 8);
      break;
    case 'firefly':
      ctx.beginPath();
      ctx.arc(8, 4, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFF00';
      ctx.fill();
      break;
    case 'snow':
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#FFFFFF';
      break;
    case 'ice':
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#E0FFFF';
      break;
    case 'grass':
      // Draw grass blades
      for (let i = 0; i < 5; i++) {
        const bladeX = 4 + i * 3;
        ctx.fillRect(bladeX, 0, 1, 4);
      }
      break;
    default:
      // Do nothing
  }
  ctx.restore();
}

// Start the loop
requestAnimationFrame(loop);