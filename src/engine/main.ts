import { Player } from '../entities/player';
import { Camera } from './camera';

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

// Game constants
const FIXED_TIMESTEP = 1 / 60; // 60 Hz
let lastTime = performance.now();
let accumulator = 0;

// Game entities
const player = new Player();
const camera = new Camera();

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
const maxSpeed = 150; // pixels per second
const friction = 0.9; // when no input

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
  // Clear screen (we'll draw sky and ground, so we don't need to clear, but we'll clear for safety)
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Save context and apply camera transform
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // Draw sky
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(-2000, -2000, 4000, 4000);

  // Draw ground (from y=-200 to y=0 in world coordinates)
  ctx.fillStyle = '#228B22';
  ctx.fillRect(-2000, -200, 4000, 200);

  // Draw player with interpolation
  const playerX = player.x + player.vx * alpha;
  const playerY = player.y + player.vy * alpha;
  ctx.fillStyle = '#FF0000'; // Red for player placeholder
  ctx.fillRect(playerX - 8, playerY - 16, 16, 16); // 16x16 rectangle, feet at playerY

  ctx.restore();

  // Draw UI overlay (debug info) for now
  ctx.fillStyle = '#000000';
  ctx.font = '16px monospace';
  ctx.fillText(`Player: (${player.x.toFixed(1)}, ${player.y.toFixed(1)})`, 10, 20);
  ctx.fillText(`Camera: (${camera.x.toFixed(1)}, ${camera.y.toFixed(1)})`, 10, 40);
}

// Start the loop
requestAnimationFrame(loop);