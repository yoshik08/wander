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
  // Update player based on input
  const speed = 100; // pixels per second
  let dx = 0;
  let dy = 0;
  if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  player.vx = dx * speed;
  player.vy = dy * speed;

  player.update(dt);
  camera.update(player, dt);
}

function render(ctx: CanvasRenderingContext2D, alpha: number) {
  // Clear screen with sky color (light blue)
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw flat meadow (green ground)
  ctx.fillStyle = '#228B22';
  ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);

  // Draw player with interpolation
  const playerX = player.x + player.vx * alpha;
  const playerY = player.y + player.vy * alpha;
  camera.apply(ctx, () => {
    ctx.fillStyle = '#FF0000'; // Red for player placeholder
    ctx.fillRect(playerX - 8, playerY - 16, 16, 16); // 16x16 rectangle
  });
}

// Start the loop
requestAnimationFrame(loop);