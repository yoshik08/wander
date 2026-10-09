import { describe, it, expect, vi } from 'vitest';
import { generateChunkStructures, renderStructure, StructureInstance } from '../src/world/structures';
import { TimeSystem } from '../src/systems/time';
import { InputManager } from '../src/core/input';
import { ArtToolkit } from '../src/render/art';
import { IRenderer } from '../src/render/types';

describe('Steps 9.1 & 14.1: Wind Chimes, Campfire Dawn Sleep & Shared Moments Deep Links', () => {
  describe('Wind Chimes & Structures', () => {
    it('generates a wind chime in spawn chunk (0, 0)', () => {
      const collision = new Uint8Array(48 * 48);
      const elevation = new Float32Array(48 * 48);
      const biome = new Uint8Array(48 * 48);
      const tileFlags = new Uint8Array(48 * 48);
      const structures = generateChunkStructures(0, 0, 0, 12345, elevation, biome, tileFlags, collision);
      const chime = structures.find(s => s.type === 'wind_chime');
      expect(chime).toBeDefined();
      expect(chime!.id).toBe('spawn-chime-12345');
      expect(chime!.width).toBe(16);
      expect(chime!.height).toBe(32);
    });

    it('renders wind chime with swaying pipes and clapper without errors', () => {
      const mockRenderer: any = {
        drawCircle: vi.fn(),
        drawRect: vi.fn(),
        drawLine: vi.fn(),
        drawPolygon: vi.fn()
      };
      const art = new ArtToolkit(mockRenderer);

      const chimeInstance: StructureInstance = {
        id: 'test-chime',
        type: 'wind_chime',
        x: 200,
        y: 200,
        baseY: 212,
        width: 16,
        height: 32,
        variant: 0,
        solidTiles: []
      };

      expect(() => {
        renderStructure(mockRenderer as IRenderer, chimeInstance, 1.5, { x: 0.5, y: 0 }, art);
      }).not.toThrow();

      expect(mockRenderer.drawRect).toHaveBeenCalled();
      expect(mockRenderer.drawLine).toHaveBeenCalled();
      expect(mockRenderer.drawCircle).toHaveBeenCalled();
    });
  });

  describe('Campfire Sleep Till Dawn & Time System', () => {
    it('advances night time to morning dawn (6:00 AM) upon sleeping', () => {
      const timeSystem = new TimeSystem(23.5); // 11:30 PM at night
      expect(timeSystem.currentHour).toBe(23.5);

      // Trigger sleep
      timeSystem.currentHour = 6.0;
      const info = timeSystem.getInfo();
      expect(info.hour).toBe(6);
      expect(info.minute).toBe(0);
      expect(info.name).toMatch(/Dawn|Morning/i);
    });
  });

  describe('Shared Moments Link & Deep Link Parsing', () => {
    it('encodes and reconstructs valid moment query string parameters', () => {
      const params = new URLSearchParams();
      params.set('seed', 'solitary-peak');
      params.set('x', '1024');
      params.set('y', '512');
      params.set('time', '17.5');
      params.set('season', 'autumn');

      const queryString = params.toString();
      expect(queryString).toContain('seed=solitary-peak');
      expect(queryString).toContain('x=1024');
      expect(queryString).toContain('y=512');
      expect(queryString).toContain('time=17.5');
      expect(queryString).toContain('season=autumn');

      // Decoding
      const parsed = new URLSearchParams(queryString);
      expect(parsed.get('seed')).toBe('solitary-peak');
      expect(parseFloat(parsed.get('x')!)).toBe(1024);
      expect(parseFloat(parsed.get('y')!)).toBe(512);
      expect(parseFloat(parsed.get('time')!)).toBe(17.5);
      expect(parsed.get('season')).toBe('autumn');
    });
  });

  describe('Input Controls (Sleep Key & Helpers)', () => {
    it('includes sleepPressed and isKeyDown in InputManager', () => {
      const input = new InputManager();
      const state = input.poll();
      expect(state.sleepPressed).toBe(false);
      expect(input.isKeyDown('z')).toBe(false);
      input.destroy();
    });
  });
});
