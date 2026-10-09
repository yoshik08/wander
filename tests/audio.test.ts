import { describe, it, expect, vi } from 'vitest';
import { AudioSystem } from '../src/audio/engine';
import { BiomeType } from '../src/world/biomes';

describe('Milestone 10: Web Audio Synthesis & Generative Music', () => {
  it('instantiates safely without error in headless/Node environment', () => {
    const audio = new AudioSystem();
    expect(audio).toBeDefined();
    expect(audio.isAudioActive).toBe(false);

    // Calling unlock in headless environment returns false gracefully without throwing
    expect(() => {
      const unlocked = audio.unlock();
      expect(unlocked).toBe(false);
    }).not.toThrow();
  });

  it('manages and clamps volume controls between 0.0 and 1.0', () => {
    const audio = new AudioSystem();

    audio.setMasterVolume(1.5);
    expect(audio.settings.masterVolume).toBe(1.0);

    audio.setMasterVolume(-0.4);
    expect(audio.settings.masterVolume).toBe(0.0);

    audio.setMusicVolume(0.65);
    expect(audio.settings.musicVolume).toBe(0.65);

    audio.setAmbienceVolume(0.42);
    expect(audio.settings.ambienceVolume).toBe(0.42);

    audio.setSfxVolume(0.95);
    expect(audio.settings.sfxVolume).toBe(0.95);

    // Mute toggle
    expect(audio.settings.muted).toBe(false);
    const muted = audio.toggleMute();
    expect(muted).toBe(true);
    expect(audio.settings.muted).toBe(true);
    const unmuted = audio.toggleMute();
    expect(unmuted).toBe(false);
  });

  it('selects time-appropriate pentatonic scales throughout the 24h cycle', () => {
    const audio = new AudioSystem();

    const dawnScale = (audio as any).getScaleForTime(8.0);
    const afternoonScale = (audio as any).getScaleForTime(14.0);
    const sunsetScale = (audio as any).getScaleForTime(18.5);
    const nightScale = (audio as any).getScaleForTime(23.0);

    expect(dawnScale.length).toBeGreaterThanOrEqual(5);
    expect(afternoonScale.length).toBeGreaterThanOrEqual(5);
    expect(sunsetScale.length).toBeGreaterThanOrEqual(5);
    expect(nightScale.length).toBeGreaterThanOrEqual(5);

    // Dawn starts on C (approx 261.63Hz)
    expect(dawnScale[0]).toBeCloseTo(261.63, 1);
    // Night starts on A (approx 220.00Hz)
    expect(nightScale[0]).toBeCloseTo(220.00, 1);
  });

  it('safely triggers micro-sounds and SFX routines without throwing', () => {
    const audio = new AudioSystem();

    expect(() => {
      audio.playStep('grass');
      audio.playStep('water');
      audio.playStep('stone');
      audio.playStoneSkip(1);
      audio.playStoneSkip(3);
      audio.playFanfare();
      audio.playButtonClick();
    }).not.toThrow();
  });

  it('runs ambient update cycle safely across varied conditions', () => {
    const audio = new AudioSystem();

    expect(() => {
      // Dawn meadow with high wind
      audio.update(0.1, 7.5, 0.9, 0.0, 0.0, BiomeType.Meadow);
      // Stormy afternoon near river
      audio.update(0.1, 15.0, 0.7, 0.85, 1.0, BiomeType.MarshPonds);
      // Quiet starry night
      audio.update(0.1, 23.5, 0.2, 0.0, 0.0, BiomeType.PineForest);
    }).not.toThrow();
  });
});
