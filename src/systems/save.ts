export interface SavedCreature {
  id: string;
  speciesId: number;
  level: number;
  nickname?: string;
  currentResolve: number;
  maxResolve?: number;
}

export interface FolioEntry {
  seen: boolean;
  befriended: boolean;
}

export type QualityPreset = 'auto' | 'low' | 'medium' | 'high' | 'ultra';

export interface GameSettings {
  speed2x: boolean;
  colourblindMode: boolean;
  peacefulMode: boolean;
  qualityPreset?: QualityPreset;
  reducedMotion?: boolean;
  highContrast?: boolean;
  masterVolume?: number;
  musicVolume?: number;
  ambienceVolume?: number;
  sfxVolume?: number;
  muted?: boolean;
}

export interface SavedGardenPlot {
  id: number;
  seedType: string;
  stage: 'empty' | 'sprout' | 'growing' | 'blooming';
  growth: number;
}

export interface SaveState {
  version: number;
  seed: string;
  timeOfDay: number;
  layer: number;
  player: { x: number; y: number };
  keepsakes: string[];
  exploredChunks: string[];
  folio: Record<number, FolioEntry>;
  party: SavedCreature[];
  sanctuary: SavedCreature[];
  inventory: Record<string, number>;
  badges: string[];
  waystones: { id: string; name: string; x: number; y: number }[];
  clearedObstacles: string[];
  settings: GameSettings;
  landmarks: string[];
  discoveredStructures: string[];
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  garden: SavedGardenPlot[];
  catches: string[];
  stonesSkipped: number;
  customization?: {
    colorwayIndex: number;
    hatIndex: number;
    backpackIndex: number;
  };
}

export class SaveManager {
  private static readonly CURRENT_VERSION = 1;
  private static readonly STORAGE_KEY = 'meadow_save_data';
  private static readonly IDB_NAME = 'meadow_db';
  private static readonly IDB_STORE = 'saves';

  state: SaveState;

  constructor() {
    this.state = this.getDefaultState();
  }

  private getDefaultState(): SaveState {
    return {
      version: SaveManager.CURRENT_VERSION,
      seed: 'dawn-meadow',
      timeOfDay: 8.0,
      season: 'spring',
      layer: 0,
      player: { x: 384, y: 384 },
      keepsakes: [],
      exploredChunks: [],
      folio: {},
      party: [],
      sanctuary: [],
      inventory: {},
      badges: [],
      waystones: [],
      clearedObstacles: [],
      landmarks: [],
      discoveredStructures: [],
      garden: [],
      catches: [],
      stonesSkipped: 0,
      customization: {
        colorwayIndex: 0,
        hatIndex: 0,
        backpackIndex: 0
      },
      settings: {
        speed2x: false,
        colourblindMode: false,
        peacefulMode: false
      }
    };
  }

  loadFromLocalStorage(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      const dataStr = localStorage.getItem(SaveManager.STORAGE_KEY);
      if (!dataStr) return false;

      const data = JSON.parse(dataStr) as Partial<SaveState>;
      if (!data || data.version !== SaveManager.CURRENT_VERSION) {
        console.warn('[SaveManager] Version mismatch or corrupt data. Creating new save.');
        return false;
      }

      this.state = {
        ...this.getDefaultState(),
        ...data,
        settings: {
          ...this.getDefaultState().settings,
          ...(data.settings || {})
        }
      };
      console.log('[SaveManager] Loaded game state from localStorage');
      return true;
    } catch (e) {
      console.error('[SaveManager] Error loading save data', e);
      return false;
    }
  }

  saveToLocalStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SaveManager.STORAGE_KEY, JSON.stringify(this.state));
        console.log('[SaveManager] Saved game state to localStorage');
      }
      this.saveToIndexedDB().catch(() => {});
    } catch (e) {
      console.error('[SaveManager] Error saving game state', e);
    }
  }

  async saveToIndexedDB(): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    return new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(SaveManager.IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(SaveManager.IDB_STORE)) {
            db.createObjectStore(SaveManager.IDB_STORE);
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(SaveManager.IDB_STORE, 'readwrite');
          const store = tx.objectStore(SaveManager.IDB_STORE);
          store.put(JSON.stringify(this.state), 'current_save');
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async loadFromIndexedDB(): Promise<boolean> {
    if (typeof indexedDB === 'undefined') return false;
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(SaveManager.IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(SaveManager.IDB_STORE)) {
            db.createObjectStore(SaveManager.IDB_STORE);
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(SaveManager.IDB_STORE, 'readonly');
          const store = tx.objectStore(SaveManager.IDB_STORE);
          const getReq = store.get('current_save');
          getReq.onsuccess = () => {
            db.close();
            if (getReq.result && typeof getReq.result === 'string') {
              try {
                const data = JSON.parse(getReq.result) as Partial<SaveState>;
                if (data && data.version === SaveManager.CURRENT_VERSION) {
                  this.state = {
                    ...this.getDefaultState(),
                    ...data,
                    settings: {
                      ...this.getDefaultState().settings,
                      ...(data.settings || {})
                    }
                  };
                  console.log('[SaveManager] Loaded game state from IndexedDB');
                  resolve(true);
                  return;
                }
              } catch {
                // fall through
              }
            }
            resolve(false);
          };
          getReq.onerror = () => {
            db.close();
            resolve(false);
          };
        };
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
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

  async importFromFile(file: File): Promise<boolean> {
    try {
      let content = '';
      if (typeof file.text === 'function') {
        content = await file.text();
      } else if (typeof FileReader !== 'undefined') {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || '');
          reader.onerror = () => reject(reader.error);
          reader.readAsText(file);
        });
      } else {
        throw new Error('No method available to read file content');
      }

      const data = JSON.parse(content) as Partial<SaveState>;
      if (!data || !data.version) {
        console.error('[SaveManager] Invalid save file format');
        return false;
      }

      this.state = { ...this.getDefaultState(), ...data };
      this.saveToLocalStorage();
      console.log('[SaveManager] Imported and saved game state');
      return true;
    } catch (err) {
      console.error('[SaveManager] Error importing save file', err);
      return false;
    }
  }
}
