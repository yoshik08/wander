import { Chunk, ChunkBufferData, generateChunkData, CHUNK_PIXEL_SIZE, TILE_SIZE, CHUNK_TILES } from './chunk';
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

  constructor(seedInput?: string | number) {
    // 1. Parse or generate seed
    if (!seedInput) {
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
      this.seedRaw = String(seedInput);
    }
    this.seed = hashSeed(this.seedRaw);

    // 2. Pre-generate spawn chunks synchronously so frame 1 is guaranteed to have terrain!
    this.generateSpawnChunksSynchronous(CHUNK_LOAD_RADIUS);

    // 3. Initialize Worker pool (2 workers)
    const workerCount = Math.max(1, Math.min(navigator.hardwareConcurrency ? navigator.hardwareConcurrency - 1 : 2, 4));
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

  private generateSpawnChunksSynchronous(radius: number): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const key = `${dx},${dy}`;
        if (!this.chunks.has(key)) {
          const data = generateChunkData(dx, dy, this.seed);
          this.chunks.set(key, new Chunk(dx, dy, data));
        }
      }
    }
  }

  private handleWorkerMessage(e: MessageEvent<ChunkBufferData>): void {
    const data = e.data;
    const key = `${data.chunkX},${data.chunkY}`;
    this.pendingRequests.delete(key);
    this.chunks.set(key, new Chunk(data.chunkX, data.chunkY, data));
  }

  getChunk(chunkX: number, chunkY: number): Chunk {
    const key = `${chunkX},${chunkY}`;
    let chunk = this.chunks.get(key);
    if (!chunk) {
      // Synchronous fallback ensures zero missing terrain frames
      const data = generateChunkData(chunkX, chunkY, this.seed);
      chunk = new Chunk(chunkX, chunkY, data);
      this.chunks.set(key, chunk);
      this.pendingRequests.delete(key);
    }
    return chunk;
  }

  requestChunk(chunkX: number, chunkY: number): void {
    const key = `${chunkX},${chunkY}`;
    if (this.chunks.has(key) || this.pendingRequests.has(key)) return;

    if (this.workers.length > 0) {
      this.pendingRequests.add(key);
      const worker = this.workers[this.nextWorkerIdx];
      this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
      worker.postMessage({ chunkX, chunkY, seed: this.seed });
    } else {
      this.getChunk(chunkX, chunkY);
    }
  }

  update(cameraWorldX: number, cameraWorldY: number): void {
    const centerChunkX = Math.floor(cameraWorldX / CHUNK_PIXEL_SIZE);
    const centerChunkY = Math.floor(cameraWorldY / CHUNK_PIXEL_SIZE);

    // 1. Request new chunks in load radius
    for (let dy = -CHUNK_LOAD_RADIUS; dy <= CHUNK_LOAD_RADIUS; dy++) {
      for (let dx = -CHUNK_LOAD_RADIUS; dx <= CHUNK_LOAD_RADIUS; dx++) {
        this.requestChunk(centerChunkX + dx, centerChunkY + dy);
      }
    }

    // 2. Prune old chunks beyond unload radius to keep memory flat
    for (const [key, chunk] of this.chunks.entries()) {
      const dist = Math.max(Math.abs(chunk.chunkX - centerChunkX), Math.abs(chunk.chunkY - centerChunkY));
      if (dist > CHUNK_UNLOAD_RADIUS) {
        this.chunks.delete(key);
      }
    }
  }

  getVisibleChunks(cameraWorldX: number, cameraWorldY: number, viewWidth: number, viewHeight: number, zoom: number): Chunk[] {
    const halfW = (viewWidth / 2) / zoom;
    const halfH = (viewHeight / 2) / zoom;

    const minChunkX = Math.floor((cameraWorldX - halfW) / CHUNK_PIXEL_SIZE);
    const maxChunkX = Math.floor((cameraWorldX + halfW) / CHUNK_PIXEL_SIZE);
    const minChunkY = Math.floor((cameraWorldY - halfH) / CHUNK_PIXEL_SIZE);
    const maxChunkY = Math.floor((cameraWorldY + halfH) / CHUNK_PIXEL_SIZE);

    const visible: Chunk[] = [];
    for (let cy = minChunkY; cy <= maxChunkY; cy++) {
      for (let cx = minChunkX; cx <= maxChunkX; cx++) {
        visible.push(this.getChunk(cx, cy));
      }
    }
    return visible;
  }

  isTraversable(worldX: number, worldY: number): boolean {
    const chunkX = Math.floor(worldX / CHUNK_PIXEL_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_PIXEL_SIZE);
    const chunk = this.getChunk(chunkX, chunkY);

    const localPixelX = worldX - chunkX * CHUNK_PIXEL_SIZE;
    const localPixelY = worldY - chunkY * CHUNK_PIXEL_SIZE;
    const tileX = Math.floor(localPixelX / TILE_SIZE);
    const tileY = Math.floor(localPixelY / TILE_SIZE);

    if (tileX < 0 || tileX >= CHUNK_TILES || tileY < 0 || tileY >= CHUNK_TILES) {
      return true;
    }
    return !chunk.isSolid(tileX, tileY);
  }

  getActiveChunkCount(): number {
    return this.chunks.size;
  }

  destroy(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.chunks.clear();
  }
}
