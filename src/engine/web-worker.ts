import { Chunk } from '../world/chunk';

// The worker listens for messages containing chunk generation requests
self.onmessage = (e: MessageEvent) => {
  const { chunkX, chunkY, seed } = e.data;
  const chunk = new Chunk(chunkX, chunkY, seed);
  // Post the chunk data back to the main thread
  self.postMessage({ chunkX, chunkY, data: chunk.data });
};