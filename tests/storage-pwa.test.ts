import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveManager, SaveState } from '../src/systems/save';
import { TimeSystem } from '../src/systems/time';

describe('Step 12.1: Storage, Autosave & PWA Offline Support', () => {
  let saveManager: SaveManager;

  beforeEach(() => {
    saveManager = new SaveManager();
    const store: Record<string, string> = {};
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      clear: () => {
        for (const k in store) delete store[k];
      }
    };
    vi.stubGlobal('localStorage', localStorageMock);
  });

  describe('Comprehensive Save State Fields', () => {
    it('persists and loads season, timeOfDay, layer, and player position', () => {
      saveManager.state.player = { x: 1250, y: -450 };
      saveManager.state.timeOfDay = 17.5; // 5:30 PM
      saveManager.state.season = 'autumn';
      saveManager.state.layer = -1; // Cave
      saveManager.state.catches = ['River Trout', 'Golden Carp'];
      saveManager.state.stonesSkipped = 14;

      saveManager.saveToLocalStorage();

      const newManager = new SaveManager();
      const loaded = newManager.loadFromLocalStorage();
      expect(loaded).toBe(true);
      expect(newManager.state.player).toEqual({ x: 1250, y: -450 });
      expect(newManager.state.timeOfDay).toBe(17.5);
      expect(newManager.state.season).toBe('autumn');
      expect(newManager.state.layer).toBe(-1);
      expect(newManager.state.catches).toEqual(['River Trout', 'Golden Carp']);
      expect(newManager.state.stonesSkipped).toBe(14);
    });

    it('TimeSystem integrates with saved season and time', () => {
      const timeSystem = new TimeSystem(8.0);
      timeSystem.currentHour = 19.2;
      timeSystem.setSeason('winter');

      expect(timeSystem.getInfo().hour).toBe(19);
      expect(timeSystem.getSeasonInfo().season).toBe('winter');

      timeSystem.setSeason('summer');
      expect(timeSystem.getSeasonInfo().season).toBe('summer');
    });
  });

  describe('File Import & Export JSON Validation', () => {
    it('rejects invalid JSON file import without throwing', async () => {
      const invalidFile = new File(['invalid content {'], 'corrupt.json', { type: 'application/json' });
      const success = await saveManager.importFromFile(invalidFile);
      expect(success).toBe(false);
    });

    it('successfully imports and validates valid save state JSON file', async () => {
      const validState: Partial<SaveState> = {
        version: 1,
        seed: 'test-import-seed',
        timeOfDay: 14.0,
        season: 'autumn',
        player: { x: 999, y: 888 },
        keepsakes: ['amber_leaf']
      };

      const file = new File([JSON.stringify(validState)], 'save.json', { type: 'application/json' });
      const success = await saveManager.importFromFile(file);
      expect(success).toBe(true);
      expect(saveManager.state.seed).toBe('test-import-seed');
      expect(saveManager.state.season).toBe('autumn');
      expect(saveManager.state.player).toEqual({ x: 999, y: 888 });
      expect(saveManager.state.keepsakes).toContain('amber_leaf');
    });
  });

  describe('IndexedDB Resilience', () => {
    it('saveToIndexedDB handles absent indexedDB gracefully without unhandled rejection', async () => {
      await expect(saveManager.saveToIndexedDB()).resolves.toBeUndefined();
    });

    it('loadFromIndexedDB returns false when indexedDB is undefined', async () => {
      const result = await saveManager.loadFromIndexedDB();
      expect(result).toBe(false);
    });
  });
});
