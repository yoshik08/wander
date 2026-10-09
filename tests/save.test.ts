import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveManager, SaveState } from '../src/systems/save';

describe('SaveManager', () => {
  let saveManager: SaveManager;

  beforeEach(() => {
    saveManager = new SaveManager();
    // Mock localStorage
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value.toString();
        },
        clear: () => {
          store = {};
        }
      };
    })();
    
    vi.stubGlobal('localStorage', localStorageMock);
  });

  it('initializes with default state', () => {
    expect(saveManager.state.version).toBe(1);
    expect(saveManager.state.seed).toBe('dawn-meadow');
  });

  it('can save and load to localStorage', () => {
    saveManager.state.seed = 'test-seed';
    saveManager.state.player = { x: 100, y: 200 };
    saveManager.saveToLocalStorage();

    const newSaveManager = new SaveManager();
    const success = newSaveManager.loadFromLocalStorage();

    expect(success).toBe(true);
    expect(newSaveManager.state.seed).toBe('test-seed');
    expect(newSaveManager.state.player.x).toBe(100);
    expect(newSaveManager.state.player.y).toBe(200);
  });
  
  it('handles corrupt data in localStorage gracefully', () => {
    localStorage.setItem('meadow_save_data', '{ "invalid": json }');
    const success = saveManager.loadFromLocalStorage();
    expect(success).toBe(false);
  });
});
