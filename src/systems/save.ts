export interface SavedCreature {
  id: string;
  speciesId: number;
  level: number;
  nickname?: string;
  currentResolve: number;
}

export interface FolioEntry {
  seen: boolean;
  befriended: boolean;
}

export interface SaveState {
  version: number;
  seed: string;
  timeOfDay: number;
  player: { x: number; y: number };
  keepsakes: string[];
  exploredChunks: string[];
  folio: Record<number, FolioEntry>;
  party: SavedCreature[];
  sanctuary: SavedCreature[];
  inventory: Record<string, number>;
  badges: string[];
}

export class SaveManager {
  private static readonly CURRENT_VERSION = 1;
  private static readonly STORAGE_KEY = 'meadow_save_data';

  state: SaveState;

  constructor() {
    this.state = this.getDefaultState();
  }

  private getDefaultState(): SaveState {
    return {
      version: SaveManager.CURRENT_VERSION,
      seed: 'dawn-meadow',
      timeOfDay: 8.0,
      player: { x: 384, y: 384 },
      keepsakes: [],
      exploredChunks: [],
      folio: {},
      party: [],
      sanctuary: [],
      inventory: {},
      badges: []
    };
  }

  loadFromLocalStorage(): boolean {
    try {
      const dataStr = localStorage.getItem(SaveManager.STORAGE_KEY);
      if (!dataStr) return false;

      const data = JSON.parse(dataStr) as Partial<SaveState>;
      if (!data || data.version !== SaveManager.CURRENT_VERSION) {
        console.warn('[SaveManager] Version mismatch or corrupt data. Creating new save.');
        return false;
      }

      this.state = { ...this.getDefaultState(), ...data };
      console.log('[SaveManager] Loaded game state from localStorage');
      return true;
    } catch (e) {
      console.error('[SaveManager] Error loading save data', e);
      return false;
    }
  }

  saveToLocalStorage(): void {
    try {
      localStorage.setItem(SaveManager.STORAGE_KEY, JSON.stringify(this.state));
      console.log('[SaveManager] Saved game state to localStorage');
    } catch (e) {
      console.error('[SaveManager] Error saving game state', e);
    }
  }

  exportToFile(): void {
    try {
      const dataStr = JSON.stringify(this.state, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `meadow_save_${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('[SaveManager] Exported save file');
    } catch (e) {
      console.error('[SaveManager] Error exporting save file', e);
    }
  }

  importFromFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          if (!e.target || typeof e.target.result !== 'string') throw new Error('Invalid file content');
          const data = JSON.parse(e.target.result) as Partial<SaveState>;
          
          if (!data || !data.version) {
            console.error('[SaveManager] Invalid save file format');
            resolve(false);
            return;
          }

          // Simple migration for future versions could happen here
          
          this.state = { ...this.getDefaultState(), ...data };
          this.saveToLocalStorage();
          console.log('[SaveManager] Imported and saved game state');
          resolve(true);
        } catch (err) {
          console.error('[SaveManager] Error importing save file', err);
          resolve(false);
        }
      };
      reader.onerror = () => {
        console.error('[SaveManager] FileReader error');
        resolve(false);
      };
      reader.readAsText(file);
    });
  }
}
