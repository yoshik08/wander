import { createRenderer, IRenderer } from './render';
import { GameLoop } from './core/loop';
import { InputManager } from './core/input';
import { Camera } from './core/camera';
import { Character } from './entities/character';
import { ChunkManager } from './world/chunk-manager';
import { BIOMES, BiomeType } from './world/biomes';
import {
  CHUNK_TILES,
  TILE_SIZE,
  CHUNK_PIXEL_SIZE,
  TILE_FLAG_WATER,
  TILE_FLAG_PATH,
  TILE_FLAG_BRIDGE,
  TILE_FLAG_WATERFALL,
  TILE_FLAG_STEPPING_STONE
} from './world/chunk';
import { renderStructure } from './world/structures';
import { WaterTileRenderData } from './render/types';
import { hexToRgba, vec2, Vec2 } from './core/math';
import { ArtToolkit } from './render/art';

// 1. Initialize Canvas & Renderer
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element #game-canvas not found');
}

const renderer: IRenderer = createRenderer(canvas);
const art = new ArtToolkit(renderer);
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

    const waterTiles: WaterTileRenderData[] = [];
    interface BridgeTile {
      wx: number;
      wy: number;
      isHorizontal: boolean;
    }
    const bridgeTiles: BridgeTile[] = [];
    interface SteppingStoneTile {
      wx: number;
      wy: number;
    }
    const steppingStones: SteppingStoneTile[] = [];

    // ==========================================
    // LAYER 1: Ground & Terrain Passes
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
          const flag = data.tileFlags[idx];

          if (flag === TILE_FLAG_WATER || flag === TILE_FLAG_WATERFALL) {
            // Queue for specialized water shader batch
            waterTiles.push({
              x: wx,
              y: wy,
              w: TILE_SIZE,
              h: TILE_SIZE,
              flowX: data.flowDirX[idx],
              flowY: data.flowDirY[idx],
              depth: elev < -0.45 ? 1.0 : 0.4,
              foamMask: data.foamMask[idx],
              isWaterfall: flag === TILE_FLAG_WATERFALL
            });
          } else if (flag === TILE_FLAG_BRIDGE) {
            // Stream flows under the bridge
            waterTiles.push({
              x: wx,
              y: wy,
              w: TILE_SIZE,
              h: TILE_SIZE,
              flowX: data.flowDirX[idx],
              flowY: data.flowDirY[idx],
              depth: 0.7,
              foamMask: 0,
              isWaterfall: false
            });
            bridgeTiles.push({
              wx,
              wy,
              isHorizontal: Math.abs(data.flowDirX[idx]) <= Math.abs(data.flowDirY[idx])
            });
          } else if (flag === TILE_FLAG_STEPPING_STONE) {
            // Stream flows around stepping stone
            waterTiles.push({
              x: wx,
              y: wy,
              w: TILE_SIZE,
              h: TILE_SIZE,
              flowX: data.flowDirX[idx],
              flowY: data.flowDirY[idx],
              depth: 0.3,
              foamMask: data.foamMask[idx],
              isWaterfall: false
            });
            steppingStones.push({ wx, wy });
          } else if (flag === TILE_FLAG_PATH) {
            // Winding dirt path
            const pathHash = Math.abs(Math.sin(wx * 11.3 + wy * 67.1));
            const pathColor = pathHash > 0.5 ? hexToRgba('#93704C') : hexToRgba('#A1805B');
            renderer.drawRect(wx, wy, TILE_SIZE, TILE_SIZE, pathColor);

            // Small trail pebbles
            if (pathHash > 0.75) {
              renderer.drawCircle(wx + 8, wy + 14, 2, hexToRgba('#755635', 0.8));
              renderer.drawCircle(wx + 16, wy + 8, 1.5, hexToRgba('#B3926B', 0.8));
            }
          } else {
            // Natural land tile
            const tileHash = Math.abs(Math.sin(wx * 12.9898 + wy * 78.233) * 43758.5453);
            const groundColor = tileHash > 0.55
              ? biomeDef.palette.groundPrimary
              : tileHash > 0.25
              ? biomeDef.palette.groundSecondary
              : biomeDef.palette.groundAccent;

            renderer.drawRect(wx, wy, TILE_SIZE, TILE_SIZE, groundColor);

            // Swaying grass blades on grassy biomes
            if (tileHash > 0.72 && elev > -0.1) {
              art.drawGrassBlade(wx + 8, wy + 16, time, globalWind);
            }
          }
        }
      }
    }

    // ==========================================
    // LAYER 2: Water Shader Batch
    // ==========================================
    renderer.drawWaterBatch(waterTiles, time);

    // ==========================================
    // LAYER 3: Stepping Stones & Bridges over Water
    // ==========================================
    for (const stone of steppingStones) {
      renderer.drawCircle(stone.wx + 12, stone.wy + 13, 7, hexToRgba('#1B2631', 0.35)); // shadow
      renderer.drawCircle(stone.wx + 12, stone.wy + 11, 6.5, hexToRgba('#7F8C8D'));
      renderer.drawCircle(stone.wx + 10, stone.wy + 9, 4, hexToRgba('#95A5A6')); // highlight
      renderer.drawCircle(stone.wx + 14, stone.wy + 12, 2.5, hexToRgba('#27AE60', 0.7)); // moss
    }

    for (const b of bridgeTiles) {
      renderer.drawRect(b.wx, b.wy, TILE_SIZE, TILE_SIZE, hexToRgba('#3E2723'));

      if (b.isHorizontal) {
        // Horizontal bridge (East-West path)
        for (let pIdx = 0; pIdx < 3; pIdx++) {
          const px = b.wx + pIdx * 8;
          renderer.drawRect(px + 1, b.wy + 2, 6, TILE_SIZE - 4, hexToRgba('#6D4C41'));
          renderer.drawRect(px + 1, b.wy + 2, 2, TILE_SIZE - 4, hexToRgba('#8D6E63'));
        }
        // Top and bottom railings
        renderer.drawRect(b.wx, b.wy, TILE_SIZE, 2.5, hexToRgba('#4A2E16'));
        renderer.drawRect(b.wx, b.wy + TILE_SIZE - 2.5, TILE_SIZE, 2.5, hexToRgba('#4A2E16'));
        renderer.drawCircle(b.wx + 2, b.wy + 1, 2, hexToRgba('#2C180E'));
        renderer.drawCircle(b.wx + TILE_SIZE - 2, b.wy + 1, 2, hexToRgba('#2C180E'));
        renderer.drawCircle(b.wx + 2, b.wy + TILE_SIZE - 1, 2, hexToRgba('#2C180E'));
        renderer.drawCircle(b.wx + TILE_SIZE - 2, b.wy + TILE_SIZE - 1, 2, hexToRgba('#2C180E'));
      } else {
        // Vertical bridge (North-South path)
        for (let pIdx = 0; pIdx < 3; pIdx++) {
          const py = b.wy + pIdx * 8;
          renderer.drawRect(b.wx + 2, py + 1, TILE_SIZE - 4, 6, hexToRgba('#6D4C41'));
          renderer.drawRect(b.wx + 2, py + 1, TILE_SIZE - 4, 2, hexToRgba('#8D6E63'));
        }
        // Left and right railings
        renderer.drawRect(b.wx, b.wy, 2.5, TILE_SIZE, hexToRgba('#4A2E16'));
        renderer.drawRect(b.wx + TILE_SIZE - 2.5, b.wy, 2.5, TILE_SIZE, hexToRgba('#4A2E16'));
        renderer.drawCircle(b.wx + 1, b.wy + 2, 2, hexToRgba('#2C180E'));
        renderer.drawCircle(b.wx + 1, b.wy + TILE_SIZE - 2, 2, hexToRgba('#2C180E'));
        renderer.drawCircle(b.wx + TILE_SIZE - 1, b.wy + 2, 2, hexToRgba('#2C180E'));
        renderer.drawCircle(b.wx + TILE_SIZE - 1, b.wy + TILE_SIZE - 2, 2, hexToRgba('#2C180E'));
      }
    }

    // ==========================================
    // LAYER 4: Water Reflections
    // ==========================================
    // Player reflection on water
    player.renderReflection(renderer, alpha);

    // ==========================================
    // LAYER 5: Y-Sorted Props, Structures & Entities
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
            draw: () => art.drawPaintedTree(px, prop.baseY, time, globalWind, 0)
          });
        } else if (prop.type === 'pine_tree') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawPaintedTree(px, prop.baseY, time, globalWind, 1)
          });
        } else if (prop.type === 'flower') {
          depthItems.push({
            baseY: prop.baseY,
            draw: () => art.drawPaintedFlower(px, prop.baseY, time, globalWind, prop.variant)
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
            draw: () => art.drawPaintedRock(px, prop.baseY, prop.variant)
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

      // Structures from visible chunks
      for (const struct of data.structures) {
        depthItems.push({
          baseY: struct.baseY,
          draw: () => renderStructure(renderer, struct, time, globalWind)
        });
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
    // LAYER 6: Touch Virtual Joystick UI
    // ==========================================
    const joy = input.getTouchJoystickDisplay();
    if (joy && joy.active) {
      const screenOrigin = renderer.screenToWorld(joy.origin.x, joy.origin.y);
      const screenCurrent = renderer.screenToWorld(joy.current.x, joy.current.y);

      renderer.drawCircle(screenOrigin.x, screenOrigin.y, 35, hexToRgba('#FFFFFF', 0.2));
      renderer.drawCircle(screenCurrent.x, screenCurrent.y, 16, hexToRgba('#FFFFFF', 0.5));
    }

    // ==========================================
    // LAYER 7: Debug Overlay (F3)
    // ==========================================
    if (showDebug) {
      const stats = renderer.getStats();
      const dbgOrigin = renderer.screenToWorld(16, 16);

      renderer.drawRect(dbgOrigin.x, dbgOrigin.y, 240, 180, hexToRgba('#000000', 0.82));
      renderer.drawRect(dbgOrigin.x + 8, dbgOrigin.y + 8, 12, 12, hexToRgba('#48CAE4'));
    }

    renderer.endFrame();
  }
});

// 3. Start Game
loop.start();
console.log(`[MEADOW] Seed: "${chunkManager.seedRaw}" (hash: ${chunkManager.seed}). Wandering at dawn.`);
