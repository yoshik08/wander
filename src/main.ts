import { createRenderer, IRenderer } from './render';
import { GameLoop } from './core/loop';
import { InputManager } from './core/input';
import { Camera } from './core/camera';
import { Character } from './entities/character';
import { ChunkManager } from './world/chunk-manager';
import { BIOMES, BiomeType } from './world/biomes';
import { CHUNK_TILES, TILE_SIZE, CHUNK_PIXEL_SIZE } from './world/chunk';
import { hexToRgba, vec2, Vec2 } from './core/math';

// 1. Initialize Canvas & Renderer
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element #game-canvas not found');
}

const renderer: IRenderer = createRenderer(canvas);
const camera = new Camera(0, 0);
const player = new Character(CHUNK_PIXEL_SIZE / 2, CHUNK_PIXEL_SIZE / 2); // Center of spawn chunk
camera.snapTo(player.pos.x, player.pos.y);

const input = new InputManager(canvas);
const chunkManager = new ChunkManager();

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

// 2. Fixed Timestep Loop (120 Hz)
const loop = new GameLoop({
  update: (dt: number) => {
    const inputState = input.poll();

    if (inputState.debugPressed) {
      showDebug = !showDebug;
    }

    // Dynamic wind modulation
    const time = performance.now() / 1000;
    globalWind.x = 1.0 + Math.sin(time * 0.8) * 0.6;
    globalWind.y = 0.3 + Math.cos(time * 0.6) * 0.3;

    // Proposed movement with collision detection
    const oldX = player.pos.x;
    const oldY = player.pos.y;

    player.update(inputState.move, inputState.isRunning, globalWind, dt);

    // Collision check: separate X and Y for smooth wall sliding
    const padding = 5.0; // Collision radius around feet
    if (
      !chunkManager.isTraversable(player.pos.x - padding, oldY) ||
      !chunkManager.isTraversable(player.pos.x + padding, oldY) ||
      !chunkManager.isTraversable(player.pos.x, oldY - padding) ||
      !chunkManager.isTraversable(player.pos.x, oldY + padding)
    ) {
      player.pos.x = oldX;
      player.vel.x = 0;
    }

    if (
      !chunkManager.isTraversable(player.pos.x - padding, player.pos.y) ||
      !chunkManager.isTraversable(player.pos.x + padding, player.pos.y) ||
      !chunkManager.isTraversable(player.pos.x, player.pos.y - padding) ||
      !chunkManager.isTraversable(player.pos.x, player.pos.y + padding)
    ) {
      player.pos.y = oldY;
      player.vel.y = 0;
    }

    // Update Camera with Lookahead
    camera.update(player.pos, player.vel, dt);

    // Stream and prune chunks around camera
    chunkManager.update(camera.pos.x, camera.pos.y);
  },

  render: (alpha: number) => {
    // Clear with calm natural deep green
    renderer.beginFrame(hexToRgba('#2A4A28'));

    // Set Camera
    renderer.setCamera(camera.pos.x, camera.pos.y, camera.zoom);

    const time = performance.now() / 1000;
    const visibleChunks = chunkManager.getVisibleChunks(
      camera.pos.x,
      camera.pos.y,
      renderer.width,
      renderer.height,
      camera.zoom
    );

    // ==========================================
    // LAYER 1: Multi-Biome Procedural Ground
    // ==========================================
    for (const chunk of visibleChunks) {
      const { chunkX, chunkY, data } = chunk;
      const baseWorldX = chunkX * CHUNK_PIXEL_SIZE;
      const baseWorldY = chunkY * CHUNK_PIXEL_SIZE;

      for (let ty = 0; ty < CHUNK_TILES; ty++) {
        for (let tx = 0; tx < CHUNK_TILES; tx++) {
          const idx = ty * CHUNK_TILES + tx;
          const wx = baseWorldX + tx * TILE_SIZE;
          const wy = baseWorldY + ty * TILE_SIZE;

          const bType = data.biome[idx] as BiomeType;
          const biomeDef = BIOMES[bType] || BIOMES[BiomeType.Meadow];
          const elev = data.elevation[idx];

          if (elev < -0.35) {
            // Water tile (shimmering with flow direction)
            const fx = data.flowDirX[idx];
            const fy = data.flowDirY[idx];
            const wave = Math.sin(time * 3 + (wx * fx + wy * fy) * 0.05) * 0.5 + 0.5;

            renderer.drawRect(wx, wy, TILE_SIZE, TILE_SIZE, biomeDef.palette.waterTint);
            if (wave > 0.6) {
              renderer.drawRect(wx + 2, wy + 8, TILE_SIZE - 4, 2, hexToRgba('#FFFFFF', 0.22));
            }
          } else {
            // Land tile (varied shades per tile)
            const tileHash = Math.abs(Math.sin((wx) * 12.9898 + (wy) * 78.233) * 43758.5453);
            const groundColor = tileHash > 0.55
              ? biomeDef.palette.groundPrimary
              : tileHash > 0.25
              ? biomeDef.palette.groundSecondary
              : biomeDef.palette.groundAccent;

            renderer.drawRect(wx, wy, TILE_SIZE, TILE_SIZE, groundColor);

            // Subtle grass blade details on grassy biomes
            if (tileHash > 0.72 && elev > -0.1) {
              const windSway = Math.sin(time * 3 + wx * 0.04 + wy * 0.04) * 2;
              renderer.drawLine(wx + 8, wy + 16, wx + 8 + windSway, wy + 9, 1.5, biomeDef.palette.foliageSecondary);
            }
          }
        }
      }
    }

    // ==========================================
    // LAYER 2: Y-Sorted Props & Entities
    // ==========================================
    interface DepthItem {
      baseY: number;
      draw: () => void;
    }
    const depthItems: DepthItem[] = [];

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
            draw: () => {
              // Shadow
              renderer.drawCircle(px, prop.baseY, 14, hexToRgba('#1B3317', 0.28));
              // Trunk
              renderer.drawRect(px - 3.5, py - 16, 7, 18, hexToRgba('#6E2C00'));
              // Foliage layers
              const windSway = Math.sin(time * 2.5 + px * 0.03) * 3 + globalWind.x * 2;
              renderer.drawCircle(px - 6 + windSway * 0.3, py - 20, 13, hexToRgba('#2D6928'));
              renderer.drawCircle(px + 6 + windSway * 0.4, py - 20, 13, hexToRgba('#3A7D34'));
              renderer.drawCircle(px + windSway * 0.5, py - 28, 15, hexToRgba('#4E9A47'));
            }
          });
        } else if (prop.type === 'pine_tree') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => {
              renderer.drawCircle(px, prop.baseY, 12, hexToRgba('#112211', 0.3));
              renderer.drawRect(px - 2.5, py - 18, 5, 20, hexToRgba('#4A2E16'));
              const windSway = Math.sin(time * 2.5 + px * 0.03) * 2;
              renderer.drawPolygon([
                vec2(px - 14 + windSway * 0.3, py - 10),
                vec2(px + 14 + windSway * 0.3, py - 10),
                vec2(px + windSway * 0.6, py - 28)
              ], hexToRgba('#1E4223'));
              renderer.drawPolygon([
                vec2(px - 10 + windSway * 0.5, py - 22),
                vec2(px + 10 + windSway * 0.5, py - 22),
                vec2(px + windSway * 0.8, py - 38)
              ], hexToRgba('#28582E'));
            }
          });
        } else if (prop.type === 'flower') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => {
              const petalColors = ['#FFFFFF', '#E74C3C', '#F39C12', '#9B59B6', '#F1948A'];
              const pColor = hexToRgba(petalColors[prop.variant % petalColors.length]);
              renderer.drawLine(px, py, px, py - 6, 1.5, hexToRgba('#3B7B34'));
              renderer.drawCircle(px, py - 6, 3.2, pColor);
              renderer.drawCircle(px, py - 6, 1.2, hexToRgba('#F4D03F'));
            }
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
            draw: () => {
              renderer.drawCircle(px, prop.baseY, 6, hexToRgba('#222222', 0.2));
              renderer.drawCircle(px, py, 5, hexToRgba('#7F8C8D'));
              renderer.drawCircle(px - 1, py - 1, 3, hexToRgba('#95A5A6'));
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
        }
      }
    }

    // Player in Depth sorting
    const p = player.getInterpolatedPos(alpha);
    depthItems.push({
      baseY: p.y,
      draw: () => player.render(renderer, alpha)
    });

    // Sort and Draw
    depthItems.sort((a, b) => a.baseY - b.baseY);
    for (const item of depthItems) {
      item.draw();
    }

    // ==========================================
    // LAYER 3: Touch Virtual Joystick UI
    // ==========================================
    const joy = input.getTouchJoystickDisplay();
    if (joy && joy.active) {
      const screenOrigin = renderer.screenToWorld(joy.origin.x, joy.origin.y);
      const screenCurrent = renderer.screenToWorld(joy.current.x, joy.current.y);

      renderer.drawCircle(screenOrigin.x, screenOrigin.y, 35, hexToRgba('#FFFFFF', 0.2));
      renderer.drawCircle(screenCurrent.x, screenCurrent.y, 16, hexToRgba('#FFFFFF', 0.5));
    }

    // ==========================================
    // LAYER 4: Debug Overlay (F3)
    // ==========================================
    if (showDebug) {
      const stats = renderer.getStats();
      const dbgOrigin = renderer.screenToWorld(16, 16);

      renderer.drawRect(dbgOrigin.x, dbgOrigin.y, 240, 180, hexToRgba('#000000', 0.82));
      // Debug indicator quad
      renderer.drawRect(dbgOrigin.x + 8, dbgOrigin.y + 8, 12, 12, hexToRgba('#48CAE4'));
    }

    renderer.endFrame();
  }
});

// 3. Start Game
loop.start();
console.log(`[MEADOW] Seed: "${chunkManager.seedRaw}" (hash: ${chunkManager.seed}). Wandering at dawn.`);
