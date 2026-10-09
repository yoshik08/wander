import { describe, it, expect } from 'vitest';
import { NPCManager } from '../src/entities/npc';

describe('NPCManager - Wardens and Rival', () => {
  it('initializes exactly 8 wardens with distinct elemental badges', () => {
    const npc = new NPCManager('test-seed-wardens');
    expect(npc.wardens.length).toBe(8);

    const badgeNames = new Set(npc.wardens.map(w => w.badgeName));
    expect(badgeNames.size).toBe(8);
    expect(badgeNames.has('Verdant Badge')).toBe(true);
    expect(badgeNames.has('Tide Badge')).toBe(true);
    expect(badgeNames.has('Ember Badge')).toBe(true);
    expect(badgeNames.has('Crag Badge')).toBe(true);
    expect(badgeNames.has('Gale Badge')).toBe(true);
    expect(badgeNames.has('Bloom Badge')).toBe(true);
    expect(badgeNames.has('Frost Badge')).toBe(true);
    expect(badgeNames.has('Astral Badge')).toBe(true);
  });

  it('places wardens and elemental monuments far from spawn', () => {
    const npc = new NPCManager('test-seed-wardens');
    for (const w of npc.wardens) {
      const distFromSpawn = Math.hypot(w.x, w.y);
      expect(distFromSpawn).toBeGreaterThan(3000);
      expect(w.creature.level).toBeGreaterThanOrEqual(18);
      expect(w.creature.maxResolve).toBeGreaterThan(50);
      expect(w.creature.genome.complexity).toBe(2.0);
    }
  });

  it('rival level dynamically scales to player party top level + 1', () => {
    const npc = new NPCManager('test-seed-wardens');
    const rivalAt5 = npc.getRivalCreature(5, 'test-seed');
    expect(rivalAt5.level).toBe(6);

    const rivalAt20 = npc.getRivalCreature(20, 'test-seed');
    expect(rivalAt20.level).toBe(21);
    expect(rivalAt20.maxResolve).toBeGreaterThan(rivalAt5.maxResolve);
  });

  it('syncs defeated status when badges are loaded', () => {
    const npc = new NPCManager('test-seed-wardens');
    expect(npc.wardens[0].defeated).toBe(false);

    npc.syncDefeatedBadges(['Verdant Badge']);
    expect(npc.wardens.find(w => w.badgeName === 'Verdant Badge')?.defeated).toBe(true);
    expect(npc.wardens.find(w => w.badgeName === 'Tide Badge')?.defeated).toBe(false);
  });
});
