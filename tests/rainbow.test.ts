import { describe, it, expect, vi } from 'vitest';
import { WeatherSystem } from '../src/systems/weather';

describe('Step 6.4: Post-rain Daylight Rainbow', () => {
  it('triggers rainbow and manages intensity fade curve', () => {
    const ws = new WeatherSystem(1234, 'clear');
    expect(ws.getRainbowIntensity()).toBe(0);

    ws.triggerRainbow(50.0);
    // At start (0 elapsed), intensity starts low and rises
    expect(ws.getRainbowIntensity()).toBeGreaterThanOrEqual(0);

    // After 10s (20% progress), reaches full intensity
    ws.update(10.0, true);
    expect(ws.getRainbowIntensity()).toBeCloseTo(1.0, 1);

    // After 40s total (80% progress), starts fading out
    ws.update(30.0, true);
    expect(ws.getRainbowIntensity()).toBeLessThan(1.0);
    expect(ws.getRainbowIntensity()).toBeGreaterThan(0.0);

    // After full duration elapsed, returns to 0
    ws.update(15.0, true);
    expect(ws.getRainbowIntensity()).toBe(0);
  });

  it('automatically triggers rainbow when rain ends during daylight', () => {
    const ws = new WeatherSystem(1234, 'drizzle');
    ws.targetState = 'drizzle';
    ws.update(1.0, true); // establishes wasRaining = true

    // Rain stops during daylight
    ws.currentState = 'clear';
    ws.targetState = 'clear';
    ws.update(0.1, true);

    expect(ws.rainbowTimer).toBeGreaterThan(0);
  });

  it('does NOT trigger rainbow when rain ends at night', () => {
    const ws = new WeatherSystem(1234, 'drizzle');
    ws.targetState = 'drizzle';
    ws.update(1.0, false); // establishes wasRaining = true at night

    // Rain stops at night
    ws.currentState = 'clear';
    ws.targetState = 'clear';
    ws.update(0.1, false); // isDaylight = false

    expect(ws.rainbowTimer).toBe(0);
  });

  it('renders rainbow lines across daylight sky without error', () => {
    const ws = new WeatherSystem(1234, 'clear');
    ws.triggerRainbow(40.0);
    ws.update(8.0, true); // full intensity

    const drawLineCalls: any[] = [];
    const mockRenderer: any = {
      drawLine: (...args: any[]) => drawLineCalls.push(args),
      drawRect: () => {}
    };

    expect(() => {
      ws.renderRainbow(mockRenderer, 500, 500, 1280, 800, 1.0);
    }).not.toThrow();

    // 7 colors * 28 steps = 196 line segments
    expect(drawLineCalls.length).toBe(7 * 28);
  });
});
