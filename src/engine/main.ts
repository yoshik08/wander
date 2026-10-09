import { Player } from '../entities/player';
import { Camera } from './camera';
import { drawCharacter, type CharacterParams } from '../art/character-rig';
import { ChunkManager } from './chunk-manager';
import { biomeData, BiomeType } from '../world/biome';
import { Wind } from './wind';
import { ParticleSystem } from './particle-system';
import { DayNightCycle } from './day-night';
import { WeatherSystem, WeatherType } from './weather';
import { CreatureManager } from './creature-manager';
import type { Chunk } from '../world/chunk';

// 1. Setup Canvas with devicePixelRatio support
const canvas = document.createElement('canvas');
canvas.id = 'gameCanvas';
const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Could not get canvas context');
}
document.body.appendChild(canvas);

let logicalWidth = window.innerWidth;
let logicalHeight = window.innerHeight;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  logicalWidth = window.innerWidth;
  logicalHeight = window.innerHeight;

  canvas.width = Math.round(logicalWidth * dpr);
  canvas.height = Math.round(logicalHeight * dpr);
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 2. World seed
const urlParams = new URLSearchParams(window.location.search);
let seed = parseInt(urlParams.get('seed') || '');
if (isNaN(seed) || seed === 0) {
  seed = 12345; // consistent meadow seed
  window.history.replaceState(null, '', `?seed=${seed}`);
}

// 3. Engine systems & entities
const FIXED_TIMESTEP = 1 / 60;
let lastTime = performance.now();
let accumulator = 0;

const player = new Player();
player.x = 0;
player.y = 0;

const camera = new Camera(player.x, player.y);
const chunkManager = new ChunkManager(seed);
const wind = new Wind();
const particleSystem = new ParticleSystem(1000);

// Start at 8:00 AM (480 seconds into 1440-second day = 8/24)
const dayNight = new DayNightCycle({ dayLength: 1440, startTime: 480 });
const weather = new WeatherSystem({ changeInterval: 300, weights: [0.6, 0.2, 0.1, 0.05, 0.02, 0.03] });
weather.setWeather(WeatherType.Clear);

const creatureManager = new CreatureManager(wind, chunkManager);

// State
let flowerCount = 0;
let debug = false; // Hidden unless F3 is pressed
let sitPrompt = '';
let sitTimer = 0;

// Input handling
const keys: { [key: string]: boolean } = {};

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyE') {
    handleInteraction();
  }
  if (e.code === 'F3') {
    e.preventDefault();
    debug = !debug;
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Mobile touch controls (drag to walk in direction)
let touchStartX = 0;
let touchStartY = 0;
let touchActive = false;
let touchDirX = 0;
let touchDirY = 0;

window.addEventListener('touchstart', (e) => {
  if (e.touches.length > 0) {
    touchActive = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchDirX = 0;
    touchDirY = 0;
  }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (touchActive && e.touches.length > 0) {
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 10) {
      touchDirX = dx / dist;
      touchDirY = dy / dist;
    } else {
      touchDirX = 0;
      touchDirY = 0;
    }
  }
}, { passive: true });

window.addEventListener('touchend', () => {
  touchActive = false;
  touchDirX = 0;
  touchDirY = 0;
});

// Player movement parameters
const acceleration = 1200;
const baseMaxSpeed = 120;
const runMaxSpeed = 220;
const friction = 0.86;
const characterScale = 2.5;
const characterColor = '#E05A47';
const scarfColor = '#3EC1D3';

// Main Game Loop
function loop(now: number) {
  const deltaTime = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  accumulator += deltaTime;

  while (accumulator >= FIXED_TIMESTEP) {
    update(FIXED_TIMESTEP);
    accumulator -= FIXED_TIMESTEP;
  }

  const alpha = accumulator / FIXED_TIMESTEP;
  render(ctx!, alpha);

  requestAnimationFrame(loop);
}

function update(dt: number) {
  wind.update(dt);
  particleSystem.setWind(wind);
  dayNight.update(dt);
  weather.update(dt);
  creatureManager.update(dt, player.x, player.y);

  if (sitTimer > 0) {
    sitTimer -= dt;
    if (sitTimer <= 0) sitPrompt = '';
  }

  // Request chunks around player
  chunkManager.requestChunksAround(player.x, player.y, 3);

  // 8-directional input
  let inputX = 0;
  let inputY = 0;
  if (keys['KeyW'] || keys['ArrowUp']) inputY -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) inputY += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) inputX -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) inputX += 1;

  if (touchActive && (touchDirX !== 0 || touchDirY !== 0)) {
    inputX = touchDirX;
    inputY = touchDirY;
  } else if (inputX !== 0 && inputY !== 0) {
    const len = Math.sqrt(inputX * inputX + inputY * inputY);
    inputX /= len;
    inputY /= len;
  }

  const isRunning = keys['ShiftLeft'] || keys['ShiftRight'];
  const maxSpeed = isRunning ? runMaxSpeed : baseMaxSpeed;

  player.vx += inputX * acceleration * dt;
  player.vy += inputY * acceleration * dt;

  const curSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
  if (curSpeed > maxSpeed) {
    player.vx = (player.vx / curSpeed) * maxSpeed;
    player.vy = (player.vy / curSpeed) * maxSpeed;
  }

  if (inputX === 0 && inputY === 0 && !touchActive) {
    player.vx *= friction;
    player.vy *= friction;
    if (Math.abs(player.vx) < 1) player.vx = 0;
    if (Math.abs(player.vy) < 1) player.vy = 0;
  }

  // Dust particles when running
  if (isRunning && curSpeed > 40) {
    if (Math.random() < 0.4) {
      particleSystem.emit(
        player.x + (Math.random() - 0.5) * 8,
        player.y + (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 15,
        -Math.random() * 10,
        0.5 + Math.random() * 0.4,
        '#A5B68D',
        1.5 + Math.random() * 1.5
      );
    }
  }

  // Weather particles
  const rainIntensity = weather.getRainIntensity();
  if (rainIntensity > 0) {
    const count = Math.floor(rainIntensity * 12);
    for (let i = 0; i < count; i++) {
      const rx = camera.x + (Math.random() - 0.5) * logicalWidth;
      const ry = camera.y - logicalHeight * 0.5;
      particleSystem.emit(
        rx, ry,
        wind.getWind(rx, ry, performance.now() / 1000).dx * 20 - 15,
        180 + Math.random() * 40,
        0.7,
        'rgba(180, 210, 240, 0.7)',
        1.5
      );
    }
  }

  player.update(dt);
  camera.update(player, dt);
}

function handleInteraction() {
  const interactionRadius = 36;
  const chunks = chunkManager.getChunksAround(player.x, player.y, 2);

  for (const chunk of chunks) {
    const { propMap, propVariantMap } = chunk.data;
    const { chunkX, chunkY } = chunk;

    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const prop = propMap[y][x];
        if (!prop) continue;

        const worldX = (chunkX * 32 + x) * 16 + 8;
        const worldY = (chunkY * 32 + y) * 16 + 8;
        const dist = Math.hypot(worldX - player.x, worldY - player.y);

        if (dist < interactionRadius) {
          if (prop === 'flower') {
            flowerCount++;
            propMap[y][x] = '';

            // Emit colorful flower petal burst
            const colors = ['#FFFFFF', '#FF4E50', '#F9D423', '#A8E6CF', '#FF8B94'];
            const variant = propVariantMap ? propVariantMap[y][x] : 0;
            const pColor = colors[variant % colors.length];

            for (let j = 0; j < 8; j++) {
              const angle = (Math.PI * 2 * j) / 8 + Math.random() * 0.5;
              const spd = 20 + Math.random() * 25;
              particleSystem.emit(
                worldX, worldY,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd - 15,
                0.7 + Math.random() * 0.5,
                pColor,
                2 + Math.random() * 2
              );
            }
            return;
          }

          if (prop === 'log') {
            sitPrompt = 'Resting peacefully on the fallen log...';
            sitTimer = 3.0;
            return;
          }
        }
      }
    }
  }
}

// Renderable interface for depth sorting
interface DepthItem {
  baseY: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

function render(ctx: CanvasRenderingContext2D, alpha: number) {
  const dpr = window.devicePixelRatio || 1;

  // Reset transform and clear
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply devicePixelRatio scale
  ctx.scale(dpr, dpr);

  // Background clear color: calm meadow green
  ctx.fillStyle = '#4f9b43';
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // World transform with Camera centering
  ctx.save();
  const screenCenterX = Math.round(logicalWidth / 2);
  const screenCenterY = Math.round(logicalHeight / 2);
  ctx.translate(screenCenterX - Math.round(camera.x), screenCenterY - Math.round(camera.y));

  const time = performance.now() / 1000;
  const chunks = chunkManager.getChunksAround(camera.x, camera.y, 3);

  // ==========================================
  // LAYER 1: Ground Tiles (Grass & Stream)
  // ==========================================
  for (const chunk of chunks) {
    drawGroundTiles(ctx, chunk, time);
  }

  // ==========================================
  // LAYER 2: Depth-Sorted Entities & Props
  // ==========================================
  const depthItems: DepthItem[] = [];

  // 2A. Visible Props from Chunks
  for (const chunk of chunks) {
    const { propMap, propVariantMap } = chunk.data;
    const { chunkX, chunkY } = chunk;

    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const prop = propMap[y][x];
        if (!prop) continue;

        const worldX = (chunkX * 32 + x) * 16;
        const worldY = (chunkY * 32 + y) * 16;
        const variant = propVariantMap ? propVariantMap[y][x] : 0;

        if (prop === 'tree') {
          // Tree base is at bottom of trunk
          const baseY = worldY + 14;
          depthItems.push({
            baseY,
            draw: (c) => drawTree(c, worldX, worldY, wind, time)
          });
        } else if (prop === 'flower') {
          const baseY = worldY + 12;
          depthItems.push({
            baseY,
            draw: (c) => drawFlower(c, worldX, worldY, variant, wind, time)
          });
        } else if (prop === 'grass') {
          const baseY = worldY + 14;
          depthItems.push({
            baseY,
            draw: (c) => drawGrassTuft(c, worldX, worldY, wind, time, player)
          });
        } else if (prop === 'log') {
          const baseY = worldY + 10;
          depthItems.push({
            baseY,
            draw: (c) => drawLog(c, worldX, worldY)
          });
        } else if (prop === 'rock') {
          const baseY = worldY + 12;
          depthItems.push({
            baseY,
            draw: (c) => drawRock(c, worldX, worldY)
          });
        } else if (prop === 'reed') {
          const baseY = worldY + 13;
          depthItems.push({
            baseY,
            draw: (c) => drawReed(c, worldX, worldY, wind, time)
          });
        } else if (prop === 'lily') {
          const baseY = worldY + 8;
          depthItems.push({
            baseY,
            draw: (c) => drawLilyPad(c, worldX, worldY, time)
          });
        }
      }
    }
  }

  // 2B. Player Character
  const playerInterpX = player.x + player.vx * alpha * FIXED_TIMESTEP;
  const playerInterpY = player.y + player.vy * alpha * FIXED_TIMESTEP;

  depthItems.push({
    baseY: playerInterpY,
    draw: (c) => {
      const charParams: CharacterParams = {
        position: { x: playerInterpX, y: playerInterpY },
        direction: player.direction,
        animation: player.animationState,
        frame: player.animationFrame,
        scale: characterScale,
        color: characterColor,
        scarfColor: scarfColor,
        wind: wind.getWind(playerInterpX, playerInterpY, time)
      };
      drawCharacter(c, charParams);
    }
  });

  // Sort by baseY (Y-depth sorting)
  depthItems.sort((a, b) => a.baseY - b.baseY);

  // Draw sorted items
  for (const item of depthItems) {
    item.draw(ctx);
  }

  // 2C. Creatures & Particles
  creatureManager.render(ctx);
  particleSystem.render(ctx);

  ctx.restore(); // Restore world transform

  // ==========================================
  // LAYER 3: Day-Night Lighting / Atmosphere
  // ==========================================
  const t = dayNight.getTimeOfDay();
  // Sunny morning at 8am (t = 0.333): No dark overlay!
  // Night falls only when t < 0.22 or t > 0.78
  if (t < 0.22 || t > 0.78) {
    let nightAlpha = 0;
    if (t <= 0.15 || t >= 0.85) {
      nightAlpha = 0.35; // Maximum night alpha is light and calm
    } else if (t < 0.22) {
      nightAlpha = ((0.22 - t) / 0.07) * 0.35;
    } else {
      nightAlpha = ((t - 0.78) / 0.07) * 0.35;
    }

    ctx.save();
    ctx.fillStyle = `rgba(15, 25, 55, ${nightAlpha})`;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
    ctx.restore();
  }

  // ==========================================
  // LAYER 4: UI & On-Screen Prompts
  // ==========================================
  if (sitPrompt) {
    ctx.save();
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    const textWidth = ctx.measureText(sitPrompt).width;
    ctx.fillRect(logicalWidth / 2 - textWidth / 2 - 14, logicalHeight - 65, textWidth + 28, 34);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(sitPrompt, logicalWidth / 2, logicalHeight - 43);
    ctx.restore();
  }

  // Flower count badge (top right)
  if (flowerCount > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.beginPath();
    ctx.roundRect(logicalWidth - 110, 16, 94, 32, 16);
    ctx.fill();
    ctx.fillStyle = '#E05A47';
    ctx.beginPath();
    ctx.arc(logicalWidth - 92, 32, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`${flowerCount} picked`, logicalWidth - 80, 37);
    ctx.restore();
  }

  // Debug Overlay (ONLY shown if F3 is pressed)
  if (debug) {
    renderDebugOverlay(ctx, t);
  }
}

// ---------------------------------------------------------------------
// PROCEDURAL ART & GROUND RENDERING
// ---------------------------------------------------------------------

function drawGroundTiles(ctx: CanvasRenderingContext2D, chunk: Chunk, time: number) {
  const { heightMap, biomeMap } = chunk.data;
  const { chunkX, chunkY } = chunk;

  // Meadow grass color palette (varied, warm sunny tones)
  const grassShades = ['#52A638', '#5BB03F', '#4B9E34', '#62BA44', '#56A83A'];

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const worldX = (chunkX * 32 + x) * 16;
      const worldY = (chunkY * 32 + y) * 16;
      const biome = biomeMap[y][x];

      if (biome === BiomeType.StreamLake) {
        // Stream Water
        // Gentle wave shimmer
        const wave = Math.sin(time * 3 + worldX * 0.08 + worldY * 0.05) * 0.5 + 0.5;
        ctx.fillStyle = wave > 0.6 ? '#4AA5E6' : '#398FD4';
        ctx.fillRect(worldX, worldY, 16, 16);

        // Water current lines
        if ((x + y) % 3 === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.fillRect(worldX + 2, worldY + 7, 10, 1.5);
        }
      } else {
        // Meadow & Land
        const tileIndex = Math.abs((chunkX * 32 + x) * 31 + (chunkY * 32 + y) * 17) % grassShades.length;
        ctx.fillStyle = grassShades[tileIndex];
        ctx.fillRect(worldX, worldY, 16, 16);

        // Subtle grass pixel texture on select tiles
        if ((x * 7 + y * 13) % 4 === 0) {
          ctx.fillStyle = 'rgba(70, 140, 45, 0.35)';
          ctx.fillRect(worldX + 3, worldY + 11, 2, 3);
          ctx.fillRect(worldX + 10, worldY + 5, 2, 3);
        }
      }
    }
  }
}

// Draw stylized Meadow Tree
function drawTree(ctx: CanvasRenderingContext2D, worldX: number, worldY: number, wind: Wind, time: number) {
  const windVec = wind.getWind(worldX, worldY, time);
  const sway = Math.sin(time * 2.2 + worldX * 0.03) * 2.2 + windVec.dx * 3.5;

  ctx.save();
  ctx.translate(worldX + 8, worldY + 12);

  // Soft ground shadow under tree
  ctx.fillStyle = 'rgba(20, 40, 15, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wooden Trunk
  ctx.fillStyle = '#654321';
  ctx.fillRect(-3, -12, 6, 14);
  // Bark highlight
  ctx.fillStyle = '#7A542B';
  ctx.fillRect(-1, -12, 2, 14);

  // Foliage Canopy (sways with wind)
  ctx.save();
  ctx.translate(0, -18);
  ctx.rotate(sway * 0.03);

  // Dark background foliage cluster
  ctx.fillStyle = '#2E6928';
  ctx.beginPath();
  ctx.arc(-7, 2, 10, 0, Math.PI * 2);
  ctx.arc(7, 2, 10, 0, Math.PI * 2);
  ctx.arc(0, -6, 12, 0, Math.PI * 2);
  ctx.fill();

  // Midtone lush green foliage
  ctx.fillStyle = '#3E8E36';
  ctx.beginPath();
  ctx.arc(-5, 0, 9, 0, Math.PI * 2);
  ctx.arc(6, 0, 9, 0, Math.PI * 2);
  ctx.arc(0, -7, 10.5, 0, Math.PI * 2);
  ctx.fill();

  // Sunny top foliage highlight
  ctx.fillStyle = '#5BB54D';
  ctx.beginPath();
  ctx.arc(-2, -9, 7.5, 0, Math.PI * 2);
  ctx.arc(4, -4, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

// Draw Wildflowers
function drawFlower(ctx: CanvasRenderingContext2D, worldX: number, worldY: number, variant: number, wind: Wind, time: number) {
  const sway = Math.sin(time * 3 + worldX * 0.1) * 1.5;

  ctx.save();
  ctx.translate(worldX + 8, worldY + 12);

  // Stem
  ctx.strokeStyle = '#3E8E36';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(sway * 0.5, -4, sway, -7);
  ctx.stroke();

  // Blossom at top of stem
  ctx.translate(sway, -7);

  // Color variants: 0=Daisy, 1=Poppy, 2=Buttercup, 3=Lavender, 4=Pink Rose
  const petalColors = ['#FFFFFF', '#FF3B30', '#FFCC00', '#7E57C2', '#FF69B4'];
  const centerColors = ['#FFCC00', '#3E1B1B', '#E65100', '#FFF9C4', '#FFE082'];

  const petalColor = petalColors[variant % petalColors.length];
  const centerColor = centerColors[variant % centerColors.length];

  // Petals
  ctx.fillStyle = petalColor;
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 * i) / 5;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * 3, Math.sin(angle) * 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Center
  ctx.fillStyle = centerColor;
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Draw Grass Tuft that parts when player walks through
function drawGrassTuft(ctx: CanvasRenderingContext2D, worldX: number, worldY: number, wind: Wind, time: number, p: Player) {
  const dx = worldX + 8 - p.x;
  const dy = worldY + 10 - p.y;
  const dist = Math.hypot(dx, dy);

  const partingFactor = Math.max(0, 1 - dist / 32);
  const partingBend = (dx < 0 ? -1 : 1) * partingFactor * 0.6;
  const windBend = Math.sin(time * 2.5 + worldX * 0.05) * 0.25;
  const totalBend = windBend + partingBend;

  ctx.save();
  ctx.translate(worldX + 8, worldY + 12);

  ctx.fillStyle = '#448E2E';
  // 3 blades of grass
  for (let i = -1; i <= 1; i++) {
    ctx.save();
    ctx.translate(i * 3, 0);
    ctx.rotate(totalBend + i * 0.15);
    ctx.fillRect(-0.7, -6, 1.4, 6);
    ctx.restore();
  }

  ctx.restore();
}

// Draw Fallen Log
function drawLog(ctx: CanvasRenderingContext2D, worldX: number, worldY: number) {
  ctx.save();
  ctx.translate(worldX + 8, worldY + 10);

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(-7, 2, 14, 3);

  // Log bark
  ctx.fillStyle = '#6D4C41';
  ctx.beginPath();
  ctx.roundRect(-7, -3, 14, 6, 2);
  ctx.fill();

  // Bark ring on end
  ctx.fillStyle = '#D7CCC8';
  ctx.beginPath();
  ctx.ellipse(6, 0, 1.8, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8D6E63';
  ctx.beginPath();
  ctx.ellipse(6, 0, 0.8, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Draw River Stone
function drawRock(ctx: CanvasRenderingContext2D, worldX: number, worldY: number) {
  ctx.save();
  ctx.translate(worldX + 8, worldY + 10);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#78909C';
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#90A4AE';
  ctx.beginPath();
  ctx.ellipse(-1, -1, 2.5, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Draw Riverbank Reeds
function drawReed(ctx: CanvasRenderingContext2D, worldX: number, worldY: number, wind: Wind, time: number) {
  const sway = Math.sin(time * 2.8 + worldX * 0.1) * 0.3;

  ctx.save();
  ctx.translate(worldX + 8, worldY + 12);

  ctx.strokeStyle = '#558B2F';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(sway * 8, -6, sway * 12, -14);
  ctx.stroke();

  // Brown reed head
  ctx.fillStyle = '#4E342E';
  ctx.save();
  ctx.translate(sway * 10, -11);
  ctx.fillRect(-1.2, -5, 2.4, 5);
  ctx.restore();

  ctx.restore();
}

// Draw Floating Water Lily
function drawLilyPad(ctx: CanvasRenderingContext2D, worldX: number, worldY: number, time: number) {
  const bob = Math.sin(time * 2 + worldX) * 0.8;

  ctx.save();
  ctx.translate(worldX + 8, worldY + 8 + bob);

  // Green pad
  ctx.fillStyle = '#2E7D32';
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0.2, Math.PI * 1.9);
  ctx.fill();

  // Lily blossom
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-1, -1, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFEB3B';
  ctx.beginPath();
  ctx.arc(-1, -1, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Debug Overlay (Rendered ONLY when F3 is toggled)
function renderDebugOverlay(ctx: CanvasRenderingContext2D, dayTime: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.roundRect(10, 10, 240, 250, 8);
  ctx.fill();

  ctx.fillStyle = '#4ECDC4';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('=== WANDER DEBUG (F3) ===', 20, 30);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '12px monospace';
  ctx.fillText(`Player: (${player.x.toFixed(1)}, ${player.y.toFixed(1)})`, 20, 50);
  ctx.fillText(`Camera: (${camera.x.toFixed(1)}, ${camera.y.toFixed(1)})`, 20, 70);
  ctx.fillText(`Anim: ${player.animationState} [F${player.animationFrame}]`, 20, 90);
  ctx.fillText(`Dir: ${player.direction.toFixed(2)} rad`, 20, 110);
  const speed = Math.hypot(player.vx, player.vy);
  ctx.fillText(`Speed: ${speed.toFixed(1)} px/s`, 20, 130);
  ctx.fillText(`Seed: ${seed}`, 20, 150);
  ctx.fillText(`Time: ${(dayTime * 24).toFixed(1)}h (8.0h start)`, 20, 170);
  ctx.fillText(`Weather: ${['Clear','Breezy','Rain','Fog','Storm','Snow'][weather.getCurrentWeather()]}`, 20, 190);
  ctx.fillText(`Wind: x=${wind.getWind(player.x, player.y, 0).dx.toFixed(2)}`, 20, 210);
  ctx.fillText(`Flowers: ${flowerCount}`, 20, 230);
  ctx.fillText(`Creatures: ${creatureManager.getCreatureCount()}`, 20, 250);

  ctx.restore();
}

// Start Game Loop
requestAnimationFrame(loop);