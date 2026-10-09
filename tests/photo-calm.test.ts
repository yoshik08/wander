import { describe, it, expect, vi } from 'vitest';
import { PhotoMode, PHOTO_FILTERS } from '../src/ui/photo-mode';
import { vec2 } from '../src/core/math';
import { InputManager } from '../src/core/input';

describe('Step 9.2: Photo Mode & Calm Mode', () => {
  it('toggles Photo Mode and animates letterbox progress', () => {
    const photo = new PhotoMode();
    expect(photo.isActive).toBe(false);

    photo.enter(vec2(100, 200), 1.0);
    expect(photo.isActive).toBe(true);
    expect(photo.panPos.x).toBe(100);
    expect(photo.panPos.y).toBe(200);

    // Update advances letterbox progress towards 1.0
    photo.update(vec2(0, 0), 0.5);
    expect(photo.letterboxProgress).toBeGreaterThan(0.5);

    photo.exit();
    expect(photo.isActive).toBe(false);

    photo.update(vec2(0, 0), 0.5);
    expect(photo.letterboxProgress).toBeLessThan(0.2);
  });

  it('cycles through all 5 postcard filters', () => {
    const photo = new PhotoMode();
    expect(photo.filterIndex).toBe(0);
    expect(photo.getCurrentFilter().id).toBe('natural');

    const next1 = photo.cycleFilter();
    expect(next1).toBe('Warm 35mm Film');
    expect(photo.getCurrentFilter().id).toBe('warm');

    const next2 = photo.cycleFilter();
    expect(next2).toBe('Gouache Watercolour');

    const next3 = photo.cycleFilter();
    expect(next3).toBe('Vintage Polaroid');

    const next4 = photo.cycleFilter();
    expect(next4).toBe('Dusk Indigo');

    const wrap = photo.cycleFilter();
    expect(wrap).toBe('Natural Ghibli');
    expect(photo.filterIndex).toBe(0);
  });

  it('adjusts zoom within clamped limits (0.6x to 2.2x)', () => {
    const photo = new PhotoMode();
    photo.targetZoom = 1.0;

    photo.adjustZoom(0.5);
    expect(photo.targetZoom).toBeCloseTo(1.5, 2);

    photo.adjustZoom(2.0);
    expect(photo.targetZoom).toBe(2.2); // clamped at max 2.2

    photo.adjustZoom(-3.0);
    expect(photo.targetZoom).toBe(0.6); // clamped at min 0.6
  });

  it('triggerShutter sets flash and initiates snapshot', () => {
    const photo = new PhotoMode();
    expect(photo.flashAlpha).toBe(0);

    const mockCanvas: any = {
      toDataURL: () => 'data:image/png;base64,mock'
    };

    photo.triggerShutter(mockCanvas);
    expect(photo.flashAlpha).toBe(1.0);

    // Flash decays over time
    photo.update(vec2(0, 0), 0.15);
    expect(photo.flashAlpha).toBeLessThan(1.0);
  });

  it('renders photo frame overlays without error', () => {
    const photo = new PhotoMode();
    photo.enter(vec2(0, 0), 1.0);
    photo.update(vec2(0, 0), 0.5); // letterboxProgress > 0

    const drawRectCalls: any[] = [];
    const drawLineCalls: any[] = [];
    const mockRenderer: any = {
      drawRect: (...args: any[]) => drawRectCalls.push(args),
      drawLine: (...args: any[]) => drawLineCalls.push(args)
    };
    const mockArt: any = {};

    expect(() => {
      photo.render(mockRenderer, mockArt, 1280, 800, 0, 0);
    }).not.toThrow();

    expect(drawRectCalls.length).toBeGreaterThan(0);
    expect(drawLineCalls.length).toBeGreaterThan(0);
  });

  it('polls calmPressed on KeyC in InputManager', () => {
    const input = new InputManager();
    const stateBefore = input.poll();
    expect(stateBefore.calmPressed).toBe(false);

    // Simulate KeyC
    (input as any).handleKeyDown({ code: 'KeyC' });
    const stateDuring = input.poll();
    expect(stateDuring.calmPressed).toBe(true);

    // Clears on next frame
    const stateAfter = input.poll();
    expect(stateAfter.calmPressed).toBe(false);
  });
});
