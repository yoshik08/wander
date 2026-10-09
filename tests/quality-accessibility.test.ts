import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QualityScaler, TIER_CONFIGS, QualityTier } from '../src/systems/quality';
import { SaveManager } from '../src/systems/save';

describe('Step 13.1: Quality Scaler & Accessibility Toggles', () => {
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

  describe('Quality Configurations & Tiers', () => {
    it('defines 4 graduated tiers with monotonic resource limits', () => {
      const tiers: QualityTier[] = ['low', 'medium', 'high', 'ultra'];
      for (let i = 0; i < tiers.length - 1; i++) {
        const cur = TIER_CONFIGS[tiers[i]];
        const next = TIER_CONFIGS[tiers[i + 1]];
        expect(cur.resolutionScale).toBeLessThanOrEqual(next.resolutionScale);
        expect(cur.particleLimit).toBeLessThan(next.particleLimit);
        expect(cur.grassDensity).toBeLessThan(next.grassDensity);
      }
    });

    it('initializes scaler with preset and config', () => {
      const scaler = new QualityScaler('low', true, true);
      expect(scaler.preset).toBe('low');
      expect(scaler.currentTier).toBe('low');
      expect(scaler.config.resolutionScale).toBe(0.75);
      expect(scaler.config.enableBloom).toBe(false);
      expect(scaler.reducedMotion).toBe(true);
      expect(scaler.highContrast).toBe(true);
    });

    it('allows changing preset and fires onQualityChange', () => {
      const scaler = new QualityScaler('high');
      let changedTier: string | null = null;
      scaler.onQualityChange = (tier) => {
        changedTier = tier;
      };

      scaler.setPreset('medium');
      expect(scaler.currentTier).toBe('medium');
      expect(changedTier).toBe('medium');
      expect(scaler.config.resolutionScale).toBe(0.88);
    });
  });

  describe('Dynamic Frame Budget Scaling', () => {
    it('calculates average FPS accurately from frame times', () => {
      const scaler = new QualityScaler('auto');
      // Simulate 60 frames at 16.6ms (60 FPS)
      for (let i = 0; i < 60; i++) {
        scaler.recordFrame(0.0166);
      }
      expect(scaler.fps).toBeGreaterThanOrEqual(58);
      expect(scaler.fps).toBeLessThanOrEqual(62);
    });

    it('steps down tier when experiencing sustained frame drop in auto mode', () => {
      const scaler = new QualityScaler('auto');
      scaler.currentTier = 'ultra';

      // Simulate 180 slow frames at 25ms (40 FPS, 3 seconds total)
      for (let i = 0; i < 180; i++) {
        scaler.recordFrame(0.025);
      }
      expect(scaler.currentTier).toBe('high');
    });

    it('steps up tier when experiencing sustained high performance in auto mode', () => {
      const scaler = new QualityScaler('auto');
      scaler.currentTier = 'medium';

      // Simulate 500 fast frames at 8ms (125 FPS, > 4 seconds total)
      for (let i = 0; i < 500; i++) {
        scaler.recordFrame(0.008);
      }
      expect(scaler.currentTier).toBe('high');
    });
  });

  describe('Accessibility & Settings Persistence', () => {
    it('persists qualityPreset, reducedMotion, and highContrast in SaveManager', () => {
      saveManager.state.settings = {
        speed2x: true,
        colourblindMode: true,
        peacefulMode: true,
        qualityPreset: 'medium',
        reducedMotion: true,
        highContrast: true
      };
      saveManager.saveToLocalStorage();

      const loadedManager = new SaveManager();
      const success = loadedManager.loadFromLocalStorage();
      expect(success).toBe(true);
      expect(loadedManager.state.settings?.qualityPreset).toBe('medium');
      expect(loadedManager.state.settings?.reducedMotion).toBe(true);
      expect(loadedManager.state.settings?.highContrast).toBe(true);
      expect(loadedManager.state.settings?.colourblindMode).toBe(true);
    });

    it('handles reducedMotion and highContrast toggles cleanly', () => {
      const scaler = new QualityScaler('high');
      expect(scaler.reducedMotion).toBe(false);
      expect(scaler.highContrast).toBe(false);

      scaler.setReducedMotion(true);
      scaler.setHighContrast(true);

      expect(scaler.reducedMotion).toBe(true);
      expect(scaler.highContrast).toBe(true);
    });
  });
});
