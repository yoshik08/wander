import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Character, COLORWAYS, CharacterCustomization } from '../src/entities/character';
import { SaveManager } from '../src/systems/save';
import { InputManager } from '../src/core/input';

describe('Step 11.1: Character Customization & Touch Controls', () => {
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

  describe('Character Customization & Wardrobe', () => {
    it('provides 8 distinct cohesive colorways', () => {
      expect(COLORWAYS.length).toBe(8);
      const names = new Set(COLORWAYS.map(c => c.name));
      expect(names.size).toBe(8);
      COLORWAYS.forEach(c => {
        expect(c.coat).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(c.scarf).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('initializes character with default customization', () => {
      const char = new Character(50, 50);
      expect(char.customization).toEqual({
        colorwayIndex: 0,
        hatIndex: 0,
        backpackIndex: 0
      });
    });

    it('allows changing colorway, hat, and backpack', () => {
      const char = new Character(100, 100);
      const newCust: CharacterCustomization = {
        colorwayIndex: 5,
        hatIndex: 3,
        backpackIndex: 2
      };
      char.customization = newCust;
      expect(char.customization.colorwayIndex).toBe(5);
      expect(char.customization.hatIndex).toBe(3);
      expect(char.customization.backpackIndex).toBe(2);
    });

    it('persists and loads customization in SaveManager', () => {
      saveManager.state.customization = {
        colorwayIndex: 3,
        hatIndex: 2,
        backpackIndex: 1
      };
      saveManager.saveToLocalStorage();

      const loadedManager = new SaveManager();
      const success = loadedManager.loadFromLocalStorage();
      expect(success).toBe(true);
      expect(loadedManager.state.customization).toEqual({
        colorwayIndex: 3,
        hatIndex: 2,
        backpackIndex: 1
      });
    });

    it('renders without throwing with all hat variants and backpack variants', () => {
      const char = new Character(10, 10);
      const mockRenderer = {
        drawRect: vi.fn(),
        drawCircle: vi.fn(),
        drawLine: vi.fn(),
        drawPolygon: vi.fn()
      } as any;

      // Test each hat (0 = Beanie, 1 = Straw Sunhat, 2 = Alpine Beret, 3 = Floral Crown)
      // and each backpack (0 = Rucksack, 1 = Satchel, 2 = Herb Basket)
      for (let h = 0; h < 4; h++) {
        for (let b = 0; b < 3; b++) {
          char.customization = { colorwayIndex: 2, hatIndex: h, backpackIndex: b };
          expect(() => char.render(mockRenderer, 1.0)).not.toThrow();
        }
      }
    });
  });

  describe('Touch Controls & Virtual Joystick Input', () => {
    it('triggerTouchAction sets interactPressed on poll', () => {
      const input = new InputManager();
      let state = input.poll();
      expect(state.interactPressed).toBe(false);

      input.triggerTouchAction();
      state = input.poll();
      expect(state.interactPressed).toBe(true);
      expect(state.interact).toBe(true);

      // On next poll frame, single-frame press is cleared
      const nextState = input.poll();
      expect(nextState.interactPressed).toBe(false);
      expect(nextState.interact).toBe(false);
      input.destroy();
    });

    it('returns null for touch joystick display when not active', () => {
      const input = new InputManager();
      expect(input.getTouchJoystickDisplay()).toBeNull();
      input.destroy();
    });
  });
});
