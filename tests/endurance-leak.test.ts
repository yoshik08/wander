import { describe, it, expect, beforeEach } from 'vitest';
import { ChunkManager } from '../src/world/chunk-manager';
import { ParticleSystem } from '../src/systems/particles';
import { TimeSystem } from '../src/systems/time';
import { WeatherSystem } from '../src/systems/weather';
import { WildCreatureManager } from '../src/entities/wild-creature';
import { Character } from '../src/entities/character';
import { vec2 } from '../src/core/math';
import { QualityScaler } from '../src/systems/quality';

describe('Step 15.1: Long Simulated Exploration Endurance & Memory Leak Tests', () => {
  let chunkManager: ChunkManager;
  let particles: ParticleSystem;
  let timeSystem: TimeSystem;
  let weather: WeatherSystem;
  let wildCreatures: WildCreatureManager;
  let player: Character;
  let qualityScaler: QualityScaler;

  beforeEach(() => {
    chunkManager = new ChunkManager();
    particles = new ParticleSystem(chunkManager.seed);
    timeSystem = new TimeSystem(8.0);
    weather = new WeatherSystem(chunkManager.seed);
    wildCreatures = new WildCreatureManager();
    player = new Character(384, 384);
    qualityScaler = new QualityScaler('auto');
  });

  it('maintains strict bounded chunk memory cap over 1,500 frames of diagonal traversal', () => {
    const dt = 1 / 60; // 60 FPS delta
    const move = vec2(1, 1); // Continually walking south-east across new territory

    let peakActiveChunks = 0;

    for (let frame = 0; frame < 1500; frame++) {
      // 1. Move player through coordinates
      player.update(move, true, vec2(1, 0), dt);

      // 2. Update chunk streaming around player
      chunkManager.update(0, player.pos.x, player.pos.y);
      const activeCount = chunkManager.getActiveChunkCount();
      if (activeCount > peakActiveChunks) {
        peakActiveChunks = activeCount;
      }

      // 3. Update weather, time, particles, and quality
      weather.update(dt, true);
      timeSystem.update(dt);
      particles.update(dt, frame * dt, player.pos.x, player.pos.y, 800, 600, 1.0, 0, vec2(1, 0));
      qualityScaler.recordFrame(dt);
    }

    // Active chunk radius cap is bounded by CHUNK_UNLOAD_RADIUS = 5 ((2*5 + 1)^2 = 121 max chunks)
    expect(chunkManager.getActiveChunkCount()).toBeLessThanOrEqual(121);
    expect(peakActiveChunks).toBeLessThanOrEqual(121);
    // Player traveled significant distance
    expect(player.pos.x).toBeGreaterThan(1000);
    expect(player.pos.y).toBeGreaterThan(1000);
  });

  it('keeps active particle allocations strictly within pre-allocated pool ceiling', () => {
    particles.activeParticleLimit = 350;
    
    // Spawn bursts of ambient, footsteps, ripples, and shooting stars
    for (let i = 0; i < 200; i++) {
      particles.spawnFootstepDust(100 + i, 100 + i, 0);
      particles.spawnRipple(200 + i, 200 + i, 12);
      particles.spawnShootingStar(0, 0, 800, 600);
    }

    expect(particles.getActiveCount()).toBeLessThanOrEqual(350);
  });

  it('cycles through all 4 advancing seasons without state corruption or runaway numbers', () => {
    const seasonsSeen = new Set<string>();
    const dt = 1 / 60;

    // Fast-forward through several full seasonal cycles (8 days per cycle)
    timeSystem.timeSpeed = 240.0; // Rapid time flow
    for (let i = 0; i < 2400; i++) {
      timeSystem.update(dt);
      const s = timeSystem.getSeasonInfo().season;
      seasonsSeen.add(s);
    }

    expect(seasonsSeen.has('spring')).toBe(true);
    expect(seasonsSeen.has('summer')).toBe(true);
    expect(seasonsSeen.has('autumn')).toBe(true);
    expect(seasonsSeen.has('winter')).toBe(true);
    expect(timeSystem.currentHour).toBeGreaterThanOrEqual(0);
    expect(timeSystem.currentHour).toBeLessThan(24);
  });
});
