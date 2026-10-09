import { describe, it, expect } from 'vitest';
import { WildlifeSystem } from '../src/entities/boids';
import { vec2 } from '../src/core/math';

describe('Step 7.3: Ground Wildlife Species', () => {
  it('spawns ground wildlife including deer, rabbits, foxes, frogs, and fireflies', () => {
    const wildlife = new WildlifeSystem(12345);
    wildlife.spawnCreaturesAround(0, 0);

    const ground = wildlife.getGroundCreatures();
    expect(ground.length).toBeGreaterThanOrEqual(20);

    const types = ground.map(g => g.type);
    expect(types).toContain('deer');
    expect(types).toContain('rabbit');
    expect(types).toContain('fox');
    expect(types).toContain('frog');
  });

  it('triggers fleeing state in deer when player approaches closely', () => {
    const wildlife = new WildlifeSystem(12345);
    wildlife.spawnCreaturesAround(0, 0);

    const ground = wildlife.getGroundCreatures();
    const deer = ground.find(g => g.type === 'deer')!;
    expect(deer).toBeDefined();

    // Position player right next to deer
    const closePlayer = vec2(deer.pos.x + 10, deer.pos.y + 10);
    wildlife.update(0.1, 1.0, closePlayer, 0, 0, 1280, 800, 1.0, vec2(0, 0));

    expect(deer.isFleeing).toBe(true);
    expect(deer.speed).toBeGreaterThan(50);
  });

  it('rabbits and frogs transition through hop and rest cycles', () => {
    const wildlife = new WildlifeSystem(12345);
    wildlife.spawnCreaturesAround(0, 0);

    const ground = wildlife.getGroundCreatures();
    const rabbit = ground.find(g => g.type === 'rabbit')!;
    const frog = ground.find(g => g.type === 'frog')!;

    expect(rabbit).toBeDefined();
    expect(frog).toBeDefined();

    const farPlayer = vec2(5000, 5000);

    // Run several updates to verify hopping cycle occurs
    let rabbitHopped = false;
    let frogHopped = false;

    for (let step = 0; step < 40; step++) {
      wildlife.update(0.1, step * 0.1, farPlayer, 0, 0, 1280, 800, 1.0, vec2(0, 0));
      if (rabbit.isHopping) rabbitHopped = true;
      if (frog.isHopping) frogHopped = true;
    }

    expect(rabbitHopped).toBe(true);
    expect(frogHopped).toBe(true);
  });

  it('renders fireflies only during nocturnal hours without throwing', () => {
    const wildlife = new WildlifeSystem(12345);
    wildlife.spawnCreaturesAround(0, 0);

    const drawCircleCalls: any[] = [];
    const mockRenderer: any = {
      drawCircle: (...args: any[]) => drawCircleCalls.push(args),
      drawLine: () => {},
      drawRect: () => {}
    };
    const mockArt: any = {
      drawFirefly: (x: number, y: number, time: number) => {
        mockRenderer.drawCircle(x, y, 4, null);
      }
    };

    // Daytime: no fireflies drawn
    wildlife.renderFireflies(mockRenderer, mockArt, 1.0, 10.0, false);
    expect(drawCircleCalls.length).toBe(0);

    // Nighttime: fireflies rendered
    wildlife.renderFireflies(mockRenderer, mockArt, 1.0, 10.0, true);
    expect(drawCircleCalls.length).toBeGreaterThan(0);
  });
});
