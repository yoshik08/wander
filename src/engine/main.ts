import { Player } from '../entities/player';
import { Camera } from './camera';
import { drawCharacter, CharacterParams } from '../art/character-rig';
import { ChunkManager } from './chunk-manager';
import { biomeData } from '../world/biome';
import { Wind } from './wind';
import { ParticleSystem } from './particle-system';

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
const wind = new Wind();
const particleSystem = new ParticleSystem(1000);

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

  // Update wind
  wind.update(deltaTime);
  particleSystem.setWind(wind);

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

  // Emit dust particles when running
  if (runModifier && Math.sqrt(player.vx*player.vx+player.vy*player.vy) > 20) {
    // Emit dust particles at the player's feet
    const speed = Math.sqrt(player.vx*player.vx+player.vy*player.vy);
    const dustCount = Math.floor(speed / 10);
    for (let i = 0; i < dustCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * (Math.random() * 20 + 10);
      const vy = Math.sin(angle) * (Math.random() * 20 + 10) - 5; // slightly upward
      particleSystem.emit(
        player.x + (Math.random() - 0.5) * 10,
        player.y - 26 + (Math.random() - 0.5) * 10, // approximate feet position
        vx,
        vy,
        Math.random() * 1 + 0.5, // life 0.5 to 1.5 seconds
        '#8B8B83', // dust color
        Math.random() * 2 + 1 // size 1 to 3
      );
    }
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
    drawChunk(ctx, chunk, wind, performance.now() / 1000, player);
  }

  // Draw particles
  particleSystem.render(ctx);

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
    scarfColor: scarfColor,
    wind: wind.getWind(playerX, playerY, performance.now() / 1000) // pass wind vector
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
  ctx.fillText(`Wind: (${wind.getWind(playerX, playerY, performance.now() / 1000).dx.toFixed(2)}, ${wind.getWind(playerX, playerY, performance.now() / 1000).dy.toFixed(2)})`, 10, 140);
  ctx.fillText(`Particles: ${particleSystem.getParticles().length}`, 10, 160);
}

// Draw a single chunk
function drawChunk(ctx: CanvasRenderingContext2D, chunk: any, wind: Wind, time: number, player: Player) {
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
        drawProp(ctx, worldX, worldY, prop, biomeType, wind, time, player);
      }

      // Water animation: animate water tiles with a sine wave
      if (biomeType === 4 /* StreamLake */) {
        // We'll animate the water by shifting the color slightly over time
        const wave = Math.sin(time * 2 + worldX * 0.1 + worldY * 0.1) * 0.1;
        // We'll adjust the color brightness to simulate waves
        const waveIntensity = Math.abs(wave);
        r = Math.round(r * (1 + waveIntensity * 0.2));
        g = Math.round(g * (1 + waveIntensity * 0.2));
        b = Math.round(b * (1 + waveIntensity * 0.2));
        // Clamp again
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));
        const waterColor = `rgb(${r},${g},${b})`;
        ctx.fillStyle = waterColor;
        ctx.fillRect(worldX, worldY, 16, 16);
        // Redraw prop if any (since we overwrote it)
        if (prop) {
          drawProp(ctx, worldX, worldY, prop, biomeType, wind, time, player);
        }
      }
    }
  }
}

// Draw a prop (simple representation for now)
function drawProp(ctx: CanvasRenderingContext2D, worldX: number, worldY: number, prop: string, biomeType: number, wind: Wind, time: number, player: Player) {
  // We'll draw simple shapes for each prop type
  ctx.save();
  ctx.translate(worldX, worldY);
  ctx.fillStyle = '#000000'; // default black for props, we'll change per type
  switch (prop) {
    case 'tree':
      ctx.fillRect(6, 0, 4, 8); // trunk
      // Sway the top of the tree with wind
      const windVec = wind.getWind(worldX, worldY, time);
      const sway = Math.atan2(windVec.dy, windVec.dx) * 0.2; // sway angle
      ctx.save();
      ctx.translate(8, -4); // center of foliage
      ctx.rotate(sway);
      ctx.fillRect(-6, -8, 12, 8); // foliage
      ctx.restore();
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
      // Sway pine layers with wind
      const windVec = wind.getWind(worldX, worldY, time);
      const sway = Math.atan2(windVec.dy, windVec.dx) * 0.15;
      // Draw pine layers with sway
      ctx.save();
      ctx.translate(8, -2); // center of first layer
      ctx.rotate(sway);
      ctx.fillRect(-4, -2, 8, 4);
      ctx.restore();
      ctx.save();
      ctx.translate(8, -6); // center of second layer
      ctx.rotate(sway * 0.8);
      ctx.fillRect(-2, -6, 12, 4);
      ctx.restore();
      ctx.save();
      ctx.translate(8, -10); // center of third layer
      ctx.rotate(sway * 0.6);
      ctx.fillRect(-8, -10, 16, 4);
      ctx.restore();
      break;
    case 'fern':
      ctx.fillRect(6, 0, 4, 6);
      // Sway fern with wind
      const windVec = wind.getWind(worldX, worldY, time);
      const sway = Math.atan2(windVec.dy, windVec.dx) * 0.2;
      ctx.save();
      ctx.translate(8, -2);
      ctx.rotate(sway);
      ctx.fillRect(-3, -2, 6, 6);
      ctx.restore();
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
      // Bend reed with wind
      const windVec = wind.getWind(worldX, worldY, time);
      const bend = Math.atan2(windVec.dy, windVec.dx) * 0.3;
      ctx.save();
      ctx.translate(8, 5); // middle of reed
      ctx.rotate(bend);
      ctx.fillRect(-1, -5, 2, 10);
      ctx.restore();
      break;
    case 'lily':
      ctx.beginPath();
      ctx.arc(8, 8, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'cherryTree':
      ctx.fillRect(6, 0, 4, 8); // trunk
      // Sway cherry tree with wind
      const windVec = wind.getWind(worldX, worldY, time);
      const sway = Math.atan2(windVec.dy, windVec.dx) * 0.2;
      ctx.save();
      ctx.translate(8, -4); // center of foliage
      ctx.rotate(sway);
      ctx.fillStyle = '#FFB6C1';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    case 'petal':
      // Petals are affected by wind and will be handled by particle system
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
      // Draw grass blades with wind bending and grass interaction (parting)
      const windVec = wind.getWind(worldX, worldY, time);
      const bend = Math.atan2(windVec.dy, windVec.dx) * 0.4;
      // Grass interaction: parting around the player
      const dx = worldX + 8 - player.x; // distance from player to blade center (approx)
      const dy = worldY + 8 - (player.y - 26); // approximate feet position
      const dist = Math.sqrt(dx*dx + dy*dy);
      const partingFactor = Math.max(0, 1 - dist / 30); // parting within 30 pixels
      const partingBend = partingFactor * 0.5; // additional bend away from player
      const totalBend = bend + partingBend;
      for (let i = 0; i < 5; i++) {
        const bladeX = 4 + i * 3;
        ctx.save();
        ctx.translate(bladeX + 0.5, 0);
        ctx.rotate(totalBend);
        ctx.fillRect(-0.5, 0, 1, 4);
        ctx.restore();
      }
      break;
    default:
      // Do nothing
  }
  ctx.restore();
}

// Start the loop
requestAnimationFrame(loop);