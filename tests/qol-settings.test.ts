import { describe, it, expect } from 'vitest';
import { Character } from '../src/entities/character';
import { SaveManager } from '../src/systems/save';
import { getTypeBadge, TYPE_BADGE_INFO, CreatureType } from '../src/entities/creature';
import { vec2 } from '../src/core/math';

describe('Step C8.2: QoL Features (2x Speed, Colourblind Glyphs, Peaceful Mode)', () => {
  it('applies speedMultiplier in Character physics', () => {
    const char = new Character(0, 0);
    expect(char.speedMultiplier).toBe(1.0);

    // Update with 1.0 speed
    char.update(vec2(1, 0), false, vec2(0, 0), 0.1);
    const speed1x = Math.hypot(char.vel.x, char.vel.y);

    // Reset and update with 2.0 speed
    const char2 = new Character(0, 0);
    char2.speedMultiplier = 2.0;
    char2.update(vec2(1, 0), false, vec2(0, 0), 0.1);
    const speed2x = Math.hypot(char2.vel.x, char2.vel.y);

    expect(speed2x).toBeGreaterThan(speed1x * 1.5);
  });

  it('manages and persists game settings in SaveManager', () => {
    const sm = new SaveManager();
    expect(sm.state.settings).toBeDefined();
    expect(sm.state.settings.speed2x).toBe(false);
    expect(sm.state.settings.colourblindMode).toBe(false);
    expect(sm.state.settings.peacefulMode).toBe(false);

    sm.state.settings.speed2x = true;
    sm.state.settings.colourblindMode = true;
    sm.state.settings.peacefulMode = true;

    // Simulate serialization & deserialization
    const serialized = JSON.stringify(sm.state);
    const parsed = JSON.parse(serialized);
    expect(parsed.settings.speed2x).toBe(true);
    expect(parsed.settings.colourblindMode).toBe(true);
    expect(parsed.settings.peacefulMode).toBe(true);
  });

  it('provides distinct colourblind type glyphs and shapes for all 5 elemental types', () => {
    const types: CreatureType[] = ['Flora', 'Aqua', 'Ignis', 'Terra', 'Aero'];
    const expectedSymbols: Record<CreatureType, string> = {
      Flora: '▲',
      Aqua: '●',
      Ignis: '◆',
      Terra: '■',
      Aero: '⬡'
    };

    types.forEach(t => {
      const normalBadge = getTypeBadge(t, false);
      const cbBadge = getTypeBadge(t, true);

      expect(normalBadge).toContain(t);
      expect(cbBadge).toContain(t);
      expect(cbBadge).toContain(expectedSymbols[t]);
      expect(TYPE_BADGE_INFO[t].symbol).toBe(expectedSymbols[t]);
    });
  });
});
