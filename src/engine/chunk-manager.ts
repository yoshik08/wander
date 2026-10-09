import { Chunk } from '../world/chunk';

export const CHUNK_SIZE = 32;
export const TILE_SIZE = 16;
export const CHUNK_LOAD_RADIUS = 3; // load chunks within this radius

export class ChunkManager {
  private seed: number;
  private chunks: Map<string, Chunk>; // key: `${chunkX},${chunkY}`
  private worker: Worker | null = null;
  private pendingRequests: Set<string>;

  constructor(seed: number) {
    this.seed = seed;
    this.chunks = new Map();
    this.pendingRequests = new Set();

    // 1. Synchronously pre-generate spawn chunks on load so first frame immediately has full terrain!
    this.generateSpawnChunks(CHUNK_LOAD_RADIUS);

    // 2. Try initializing Web Worker for background requests
    try {
      this.worker = new Worker(new URL('./web-worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
    } catch (e) {
      console.warn('Worker initialization skipped or not supported:', e);
    }
  }

  // Pre-generate spawn chunks synchronously around (0, 0)
  public generateSpawnChunks(radius: number = 3): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const key = `${dx},${dy}`;
        if (!this.chunks.has(key)) {
          const chunk = new Chunk(dx, dy, this.seed);
          this.chunks.set(key, chunk);
        }
      }
    }
  }

  private handleWorkerMessage(e: MessageEvent) {
    const { chunkX, chunkY, data } = e.data;
    const key = `${chunkX},${chunkY}`;
    // If chunk already exists, we can keep or update data
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(chunkX, chunkY, this.seed);
      this.chunks.set(key, chunk);
    }
    chunk.data = data;
    this.pendingRequests.delete(key);
  }

  getChunk(chunkX: number, chunkY: number): Chunk {
    const key = `${chunkX},${chunkY}`;
    let chunk = this.chunks.get(key);
    if (!chunk) {
      // Synchronous fallback so terrain is always guaranteed!
      chunk = new Chunk(chunkX, chunkY, this.seed);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  requestChunk(chunkX: number, chunkY: number) {
    const key = `${chunkX},${chunkY}`;
    if (!this.chunks.has(key) && !this.pendingRequests.has(key)) {
      if (this.worker) {
        this.worker.postMessage({ chunkX, chunkY, seed: this.seed });
        this.pendingRequests.add(key);
      } else {
        this.getChunk(chunkX, chunkY);
      }
    }
  }

  // Get all chunks within a radius of a world position
  getChunksAround(worldX: number, worldY: number, radius: number = CHUNK_LOAD_RADIUS): Chunk[] {
    const result: Chunk[] = [];
    const chunkX = Math.floor(worldX / (CHUNK_SIZE * TILE_SIZE));
    const chunkY = Math.floor(worldY / (CHUNK_SIZE * TILE_SIZE));
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const chunk = this.getChunk(chunkX + dx, chunkY + dy);
        result.push(chunk);
      }
    }
    return result;
  }

  // Request chunks around a world position
  requestChunksAround(worldX: number, worldY: number, radius: number = CHUNK_LOAD_RADIUS) {
    const chunkX = Math.floor(worldX / (CHUNK_SIZE * TILE_SIZE));
    const chunkY = Math.floor(worldY / (CHUNK_SIZE * TILE_SIZE));
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        this.requestChunk(chunkX + dx, chunkY + dy);
      }
    }
  }

  // Clean up
  terminate() {
    if (this.worker) {
      this.worker.terminate();
    }
  }
}