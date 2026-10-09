import { generateChunkData } from './chunk';

// Web Worker for asynchronous background procedural chunk generation
self.onmessage = (e: MessageEvent<{ chunkX: number; chunkY: number; seed: string | number }>) => {
  const { chunkX, chunkY, seed } = e.data;
  const chunkData = generateChunkData(chunkX, chunkY, seed);

  // Transfer array buffers to main thread with 0-copy overhead
  const transferables = [
    chunkData.elevation.buffer,
    chunkData.moisture.buffer,
    chunkData.temperature.buffer,
    chunkData.biome.buffer,
    chunkData.flowDirX.buffer,
    chunkData.flowDirY.buffer,
    chunkData.collision.buffer
  ];

  self.postMessage(chunkData, transferables);
};
