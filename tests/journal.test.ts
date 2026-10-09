import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JournalUI, KEEPSAKE_CATALOG } from '../src/ui/journal';
import { SaveManager } from '../src/systems/save';

describe('Step 8.3: Interactive Journal UI', () => {
  let saveManager: SaveManager;
  let journal: JournalUI;

  beforeEach(() => {
    let store: Record<string, string> = {};
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      clear: () => {
        store = {};
      }
    };
    vi.stubGlobal('localStorage', localStorageMock);

    saveManager = new SaveManager();
    journal = new JournalUI(saveManager);
  });

  it('initializes with keepsakes tab and closed state', () => {
    expect(journal.isOpen).toBe(false);
    expect(journal.activeTab).toBe('keepsakes');
    expect(journal.currentPage).toBe(0);
    expect(KEEPSAKE_CATALOG.length).toBeGreaterThanOrEqual(10);
  });

  it('toggles open and close state properly', () => {
    journal.open();
    expect(journal.isOpen).toBe(true);

    journal.close();
    expect(journal.isOpen).toBe(false);

    journal.toggle();
    expect(journal.isOpen).toBe(true);

    journal.toggle();
    expect(journal.isOpen).toBe(false);
  });

  it('accurately computes collection count and percentage', () => {
    expect(journal.getCollectedCount()).toBe(0);
    expect(journal.getCompletionPercentage()).toBe(0);

    saveManager.state.keepsakes = ['blue_feather', 'pine_cone'];
    expect(journal.isCollected('blue_feather')).toBe(true);
    expect(journal.isCollected('pine_cone')).toBe(true);
    expect(journal.isCollected('cherry_petal')).toBe(false);

    expect(journal.getCollectedCount()).toBe(2);
    const expectedPct = Math.round((2 / KEEPSAKE_CATALOG.length) * 100);
    expect(journal.getCompletionPercentage()).toBe(expectedPct);
  });

  it('turns pages forward and backward within catalogue boundaries', () => {
    const totalPages = Math.ceil(KEEPSAKE_CATALOG.length / journal.pageSize);
    expect(totalPages).toBeGreaterThan(1);

    expect(journal.currentPage).toBe(0);
    journal.prevPage();
    expect(journal.currentPage).toBe(0); // cannot go below 0

    journal.nextPage();
    expect(journal.currentPage).toBe(1);

    journal.prevPage();
    expect(journal.currentPage).toBe(0);
  });

  it('switches between keepsakes and logbook tabs', () => {
    journal.nextPage();
    expect(journal.currentPage).toBe(1);

    journal.setTab('logbook');
    expect(journal.activeTab).toBe('logbook');
    expect(journal.currentPage).toBe(0); // resets page on tab switch

    journal.setTab('keepsakes');
    expect(journal.activeTab).toBe('keepsakes');
  });

  it('renders without throwing when opened', () => {
    expect(() => {
      journal.open();
    }).not.toThrow();
  });
});
