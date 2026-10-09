import { describe, it, expect } from 'vitest';
import { ApexMythManager } from '../src/entities/apex-myths';

describe('ApexMythManager - 4 Apex Creatures & Real-Time Roaming Myth', () => {
  it('creates exactly 4 cardinal Apex creatures with distinct elements', () => {
    const manager = new ApexMythManager('test-seed-apex');
    expect(manager.apexCreatures.length).toBe(4);

    const elements = new Set(manager.apexCreatures.map(a => a.element));
    expect(elements.size).toBe(4);
    expect(elements.has('Aero')).toBe(true);
    expect(elements.has('Terra')).toBe(true);
    expect(elements.has('Ignis')).toBe(true);
    expect(elements.has('Aqua')).toBe(true);
  });

  it('places 4 Apex creatures far at the cardinal edges (> 10000px)', () => {
    const manager = new ApexMythManager('test-seed-apex');
    for (const apex of manager.apexCreatures) {
      const dist = Math.hypot(apex.x, apex.y);
      expect(dist).toBeGreaterThan(10000);
      expect(apex.level).toBe(45);
      expect(apex.genome.scale).toBeGreaterThanOrEqual(2.0);
      expect(apex.puzzlePedestals.length).toBe(2);
      expect(apex.puzzleSolved).toBe(false);
    }
  });

  it('solves apex puzzle when both pedestals are activated or loaded from save', () => {
    const manager = new ApexMythManager('test-seed-apex');
    const north = manager.apexCreatures.find(a => a.id === 'apex_north')!;
    expect(north.puzzleSolved).toBe(false);

    // Sync saved puzzles
    manager.syncSavedPuzzles(['puzzle_apex_north']);
    expect(north.puzzleSolved).toBe(true);
    expect(north.puzzlePedestals.every(p => p.activated)).toBe(true);
  });

  it('computes real-time roaming position for the myth Lunaris', () => {
    const manager = new ApexMythManager('test-seed-apex');
    const myth = manager.roamingMyth;
    expect(myth.name).toContain('Lunaris');
    expect(myth.level).toBe(40);
    expect(myth.genome.isPrismatic).toBe(true);

    const pos = myth.getRealTimePosition();
    expect(pos).toBeDefined();
    const radius = Math.hypot(pos.x, pos.y);
    expect(radius).toBeGreaterThan(2000);
    expect(radius).toBeLessThan(3500);
  });
});
