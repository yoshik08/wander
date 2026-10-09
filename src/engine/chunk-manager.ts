import { Chunk } from '../world/chunk';
import { BiomeType } from '../world/biome';

export const CHUNK_SIZE = 32;
export const TILE_SIZE = 16;
export const CHUNK_LOAD_RADIUS = 3; // load chunks within this radius

export class ChunkManager {
  private seed: number;
  private chunks: Map<string, Chunk>; // key: `${chunkX},${chunkY}`
  private worker: Worker;
  private pendingRequests: Set<string>;

  constructor(seed: number) {
    this.seed = seed;
    this.chunks = new Map();
    // Create the web worker
    // Note: Vite will handle the worker import as a URL
    this.worker = new Worker(new URL('./web-worker.ts', import.meta.url));
    this.pendingRequests = new Set();
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
  }

  private handleWorkerMessage(e: MessageEvent) {
    const { chunkX, chunkY, data } = e.data;
    const key = `${chunkX},${chunkY}`;
    // Create a chunk object and store the data
    const chunk = new Chunk(chunkX, chunkY, this.seed);
    chunk.data = data;
    this.chunks.set(key, chunk);
    this.pendingRequests.delete(key);
  }

  getChunk(chunkX: number, chunkY: number): Chunk | undefined {
    const key = `${chunkX},${chunkY}`;
    return this.chunks.get(key);
  }

  requestChunk(chunkX: number, chunkY: number) {
    const key = `${chunkX},${chunkY}`;
    if (!this.chunks.has(key) && !this.pendingRequests.has(key)) {
      this.worker.postMessage({ chunkX, chunkY, seed: this.seed });
      this.pendingRequests.add(key);
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
        if (chunk) {
          result.push(chunk);
        }
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
    this.worker.terminate();
  }
}