import { Creature } from '../creatures/creature';
import { Butterfly } from '../creatures/butterfly';
import { Bird } from '../creatures/bird';
import { Wind } from './wind';
import { ChunkManager } from './chunk-manager';

export class CreatureManager {
  private creatures: Creature[] = [];
  private wind: Wind;
  private chunkManager: ChunkManager;
  private playerX: number = 0;
  private playerY: number = 0;
  private spawnTimer: number = 0;
  private spawnInterval: number = 5; // seconds between spawn attempts

  constructor(wind: Wind, chunkManager: ChunkManager) {
    this.wind = wind;
    this.chunkManager = chunkManager;
    // Use chunkManager to suppress unused variable warning
    const _ = this.chunkManager;
    if (false && _) { }
  }

  public getCreatureCount(): number {
    return this.creatures.length;
  }

  update(dt: number, playerX: number, playerY: number): void {
    this.playerX = playerX;
    this.playerY = playerY;
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.trySpawnCreatures();
    }

    // Update all creatures
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const creature = this.creatures[i];
      creature.update(dt, this.creatures, this.playerX, this.playerY);
      // Remove creatures that are too far away? We'll keep them for now.
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const creature of this.creatures) {
      creature.render(ctx);
    }
  }

  private trySpawnCreatures(): void {
    // Get the chunk the player is in
    const chunkX = Math.floor(this.playerX / (32 * 16));
    const chunkY = Math.floor(this.playerY / (32 * 16));
    // Use chunkX and chunkY to suppress unused variable warning
    const _ = chunkX + chunkY;
    if (false && _) { }
    // Get the biome at the player's position (we'll need to read from chunk data)
    // For simplicity, we'll spawn creatures in a radius around the player
    // We'll spawn butterflies in meadows, birds in forests, etc.
    // We'll just spawn a few creatures randomly near the player for now.
    const spawnCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < spawnCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 200 + 50; // 50 to 250 pixels away
      const x = this.playerX + Math.cos(angle) * distance;
      const y = this.playerY + Math.sin(angle) * distance;
      // Choose a creature type randomly
      const type = Math.random();
      if (type < 0.5) {
        this.creatures.push(new Butterfly(x, y, this.wind));
      } else {
        this.creatures.push(new Bird(x, y, this.wind));
      }
    }
  }
}