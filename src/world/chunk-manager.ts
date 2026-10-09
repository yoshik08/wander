import { Chunk, ChunkBufferData, generateChunkData, CHUNK_PIXEL_SIZE, TILE_SIZE, CHUNK_TILES, TILE_FLAG_WATER, TILE_FLAG_STEPPING_STONE } from './chunk';
import { BiomeType } from './biomes';
import { hashSeed } from '../core/prng';

export const CHUNK_LOAD_RADIUS = 3;   // Active radius around camera (7x7 chunks = 49 chunks)
export const CHUNK_UNLOAD_RADIUS = 5; // Unload chunks beyond this radius to keep memory flat

export class ChunkManager {
  readonly seedRaw: string;
  readonly seed: number;

  private chunks: Map<string, Chunk> = new Map();
  private pendingRequests: Set<string> = new Set();
  private workers: Worker[] = [];
  private nextWorkerIdx: number = 0;
  readonly collectedKeepsakes: Set<string> = new Set();
  readonly exploredChunks: Set<string> = new Set();
  readonly clearedObstacles: Set<string> = new Set();
  onChunkUnloaded?: (chunk: Chunk) => void;

  collectKeepsake(id: string): boolean {
    if (this.collectedKeepsakes.has(id)) return false;
    this.collectedKeepsakes.add(id);
    return true;
  }

  isKeepsakeCollected(id: string): boolean {
    return this.collectedKeepsakes.has(id);
  }

  clearObstacle(id: string): void {
    this.clearedObstacles.add(id);
    // Iterate over loaded chunks and remove it from structures & collision
    for (const chunk of this.chunks.values()) {
      const idx = chunk.data.structures.findIndex(s => s.id === id);
      if (idx !== -1) {
        const s = chunk.data.structures[idx];
        const localX = s.x - chunk.chunkX * CHUNK_PIXEL_SIZE;
        const localY = s.y - chunk.chunkY * CHUNK_PIXEL_SIZE;
        const tx = Math.floor(localX / TILE_SIZE);
        const ty = Math.floor(localY / TILE_SIZE);
        for (const st of s.solidTiles) {
           const cx = tx + st.dx;
           const cy = ty + st.dy;
           if (cx >= 0 && cx < CHUNK_TILES && cy >= 0 && cy < CHUNK_TILES) {
             chunk.data.collision[cy * CHUNK_TILES + cx] = 0;
           }
        }
        chunk.data.structures.splice(idx, 1);
      }
    }
  }

  markExplored(chunkX: number, chunkY: number): void {
    this.exploredChunks.add(`${chunkX},${chunkY}`);
  }

  isExplored(chunkX: number, chunkY: number): boolean {
    return this.exploredChunks.has(`${chunkX},${chunkY}`);
  }

  constructor(seedInput?: string | number) {
    // 1. Parse or generate seed
    if (!seedInput) {
      if (typeof window !== 'undefined' && window.location) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlSeed = urlParams.get('seed');
        if (urlSeed) {
          this.seedRaw = urlSeed;
        } else {
          this.seedRaw = 'dawn-meadow';
          // Persist seed in URL
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.set('seed', this.seedRaw);
          window.history.replaceState(null, '', nextUrl.toString());
        }
      } else {
        this.seedRaw = 'dawn-meadow';
      }
    } else {
      this.seedRaw = String(seedInput);
    }
    this.seed = hashSeed(this.seedRaw);

    // 2. Pre-generate spawn chunks synchronously so frame 1 is guaranteed to have terrain!
    this.generateSpawnChunksSynchronous(CHUNK_LOAD_RADIUS);

    // 3. Initialize Worker pool (2 workers)
    const concurrency = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
    const workerCount = Math.max(1, Math.min(concurrency - 1, 4));
    if (typeof Worker !== 'undefined') {
      for (let i = 0; i < workerCount; i++) {
        try {
          const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
          worker.onmessage = this.handleWorkerMessage.bind(this);
          this.workers.push(worker);
        } catch (err) {
          console.warn('[ChunkManager] Web Worker initialization failed, falling back to synchronous:', err);
          break;
        }
      }
    }
  }

  private generateSpawnChunksSynchronous(radius: number): void {
    const layer = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const key = `${layer},${dx},${dy}`;
        this.markExplored(dx, dy); // maybe add layer to explored? Later.
        if (!this.chunks.has(key)) {
          const data = generateChunkData(layer, dx, dy, this.seed);
          this.chunks.set(key, new Chunk(layer, dx, dy, data));
        }
      }
    }
  }

  private processChunkData(data: ChunkBufferData): void {
    const chunkX = data.chunkX;
    const chunkY = data.chunkY;
    data.structures = data.structures.filter(s => {
      if (this.clearedObstacles.has(s.id)) {
        const localX = s.x - chunkX * CHUNK_PIXEL_SIZE;
        const localY = s.y - chunkY * CHUNK_PIXEL_SIZE;
        const tx = Math.floor(localX / TILE_SIZE);
        const ty = Math.floor(localY / TILE_SIZE);
        for (const st of s.solidTiles) {
           const cx = tx + st.dx;
           const cy = ty + st.dy;
           if (cx >= 0 && cx < CHUNK_TILES && cy >= 0 && cy < CHUNK_TILES) {
             data.collision[cy * CHUNK_TILES + cx] = 0;
           }
        }
        return false;
      }
      return true;
    });
  }

  private handleWorkerMessage(e: MessageEvent<ChunkBufferData>): void {
    const data = e.data;
    const key = `${data.layer},${data.chunkX},${data.chunkY}`;
    this.pendingRequests.delete(key);
    this.processChunkData(data);
    this.chunks.set(key, new Chunk(data.layer, data.chunkX, data.chunkY, data));
  }

  getChunk(layer: number, chunkX: number, chunkY: number): Chunk {
    const key = `${layer},${chunkX},${chunkY}`;
    let chunk = this.chunks.get(key);
    if (!chunk) {
      // Synchronous fallback ensures zero missing terrain frames
      const data = generateChunkData(layer, chunkX, chunkY, this.seed);
      this.processChunkData(data);
      chunk = new Chunk(layer, chunkX, chunkY, data);
      this.chunks.set(key, chunk);
      this.pendingRequests.delete(key);
    }
    return chunk;
  }

  requestChunk(layer: number, chunkX: number, chunkY: number): void {
    const key = `${layer},${chunkX},${chunkY}`;
    if (this.chunks.has(key) || this.pendingRequests.has(key)) return;

    if (this.workers.length > 0) {
      this.pendingRequests.add(key);
      const worker = this.workers[this.nextWorkerIdx];
      this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
      worker.postMessage({ layer, chunkX, chunkY, seed: this.seed });
    } else {
      this.getChunk(layer, chunkX, chunkY);
    }
  }

  update(layer: number, cameraWorldX: number, cameraWorldY: number): void {
    const centerChunkX = Math.floor(cameraWorldX / CHUNK_PIXEL_SIZE);
    const centerChunkY = Math.floor(cameraWorldY / CHUNK_PIXEL_SIZE);
    this.markExplored(centerChunkX, centerChunkY);

    // 1. Request new chunks in load radius
    for (let dy = -CHUNK_LOAD_RADIUS; dy <= CHUNK_LOAD_RADIUS; dy++) {
      for (let dx = -CHUNK_LOAD_RADIUS; dx <= CHUNK_LOAD_RADIUS; dx++) {
        this.requestChunk(layer, centerChunkX + dx, centerChunkY + dy);
      }
    }

    // 2. Prune old chunks beyond unload radius to keep memory flat
    for (const [key, chunk] of this.chunks.entries()) {
      const dist = Math.max(Math.abs(chunk.chunkX - centerChunkX), Math.abs(chunk.chunkY - centerChunkY));
      if (dist > CHUNK_UNLOAD_RADIUS) {
        if (this.onChunkUnloaded) {
          this.onChunkUnloaded(chunk);
        }
        this.chunks.delete(key);
      }
    }
  }

  getVisibleChunks(layer: number, cameraWorldX: number, cameraWorldY: number, viewWidth: number, viewHeight: number, zoom: number): Chunk[] {
    const halfW = (viewWidth / 2) / zoom;
    const halfH = (viewHeight / 2) / zoom;

    const minChunkX = Math.floor((cameraWorldX - halfW) / CHUNK_PIXEL_SIZE);
    const maxChunkX = Math.floor((cameraWorldX + halfW) / CHUNK_PIXEL_SIZE);
    const minChunkY = Math.floor((cameraWorldY - halfH) / CHUNK_PIXEL_SIZE);
    const maxChunkY = Math.floor((cameraWorldY + halfH) / CHUNK_PIXEL_SIZE);

    const visible: Chunk[] = [];
    for (let cy = minChunkY; cy <= maxChunkY; cy++) {
      for (let cx = minChunkX; cx <= maxChunkX; cx++) {
        visible.push(this.getChunk(layer, cx, cy));
      }
    }
    return visible;
  }

  isTraversable(layer: number, worldX: number, worldY: number, canTraverseWater: boolean = false): boolean {
    const chunkX = Math.floor(worldX / CHUNK_PIXEL_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_PIXEL_SIZE);
    const chunk = this.getChunk(layer, chunkX, chunkY);

    const localPixelX = worldX - chunkX * CHUNK_PIXEL_SIZE;
    const localPixelY = worldY - chunkY * CHUNK_PIXEL_SIZE;
    const tileX = Math.floor(localPixelX / TILE_SIZE);
    const tileY = Math.floor(localPixelY / TILE_SIZE);

    if (tileX < 0 || tileX >= CHUNK_TILES || tileY < 0 || tileY >= CHUNK_TILES) {
      return true;
    }
    
    if (canTraverseWater) {
      const idx = tileY * CHUNK_TILES + tileX;
      if (chunk.data.tileFlags[idx] === TILE_FLAG_WATER) {
        return true;
      }
    }
    return !chunk.isSolid(tileX, tileY);
  }

  getBiomeAt(layer: number, worldX: number, worldY: number): BiomeType {
    const chunkX = Math.floor(worldX / CHUNK_PIXEL_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_PIXEL_SIZE);
    const chunk = this.getChunk(layer, chunkX, chunkY);

    const localPixelX = worldX - chunkX * CHUNK_PIXEL_SIZE;
    const localPixelY = worldY - chunkY * CHUNK_PIXEL_SIZE;
    const tileX = Math.max(0, Math.min(CHUNK_TILES - 1, Math.floor(localPixelX / TILE_SIZE)));
    const tileY = Math.max(0, Math.min(CHUNK_TILES - 1, Math.floor(localPixelY / TILE_SIZE)));

    return chunk.data.biome[tileY * CHUNK_TILES + tileX] as BiomeType;
  }

  isWaterAt(layer: number, worldX: number, worldY: number): boolean {
    const chunkX = Math.floor(worldX / CHUNK_PIXEL_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_PIXEL_SIZE);
    const chunk = this.getChunk(layer, chunkX, chunkY);

    const localPixelX = worldX - chunkX * CHUNK_PIXEL_SIZE;
    const localPixelY = worldY - chunkY * CHUNK_PIXEL_SIZE;
    const tileX = Math.max(0, Math.min(CHUNK_TILES - 1, Math.floor(localPixelX / TILE_SIZE)));
    const tileY = Math.max(0, Math.min(CHUNK_TILES - 1, Math.floor(localPixelY / TILE_SIZE)));
    const flag = chunk.data.tileFlags[tileY * CHUNK_TILES + tileX];
    return flag === TILE_FLAG_WATER || flag === TILE_FLAG_STEPPING_STONE;
  }

  getActiveChunkCount(): number {
    return this.chunks.size;
  }

  clearAllChunks(): void {
    this.chunks.clear();
    this.pendingRequests.clear();
  }

  destroy(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.chunks.clear();
  }
}
