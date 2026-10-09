import { Vec2 } from '../core/math';
import { BiomeType } from '../world/biomes';

export type SurfaceType = 'grass' | 'stone' | 'water' | 'wood' | 'sand';

export interface AudioSettings {
  masterVolume: number;   // 0 to 1
  musicVolume: number;    // 0 to 1
  ambienceVolume: number; // 0 to 1
  sfxVolume: number;      // 0 to 1
  muted: boolean;
}

// Pentatonic note frequencies in Hz
const PENTATONIC_FREQS = {
  // C Major Pentatonic (Dawn & Morning)
  dawn: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25],
  // F Lydian Pentatonic (Afternoon)
  afternoon: [349.23, 392.00, 440.00, 523.25, 587.33, 698.46, 783.99],
  // G Golden Pentatonic (Sunset / Dusk)
  sunset: [196.00, 246.94, 293.66, 329.63, 392.00, 493.88, 587.33],
  // A Minor Pentatonic (Night)
  night: [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25]
};

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;

  // Master Busses
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Ambient Nodes
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  private riverSource: AudioBufferSourceNode | null = null;
  private riverFilter: BiquadFilterNode | null = null;
  private riverGain: GainNode | null = null;

  private rainSource: AudioBufferSourceNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;

  // Music State
  private activeMusicOscs: { osc: OscillatorNode; gain: GainNode }[] = [];
  private musicChordTimer: number = 0;
  private chimeTimer: number = 4.0;
  private birdChirpTimer: number = 3.5;

  settings: AudioSettings = {
    masterVolume: 0.8,
    musicVolume: 0.7,
    ambienceVolume: 0.75,
    sfxVolume: 0.85,
    muted: false
  };

  constructor() {
    this.handleFirstUserGesture = this.handleFirstUserGesture.bind(this);
    if (typeof window !== 'undefined') {
      window.addEventListener('click', this.handleFirstUserGesture, { once: true });
      window.addEventListener('keydown', this.handleFirstUserGesture, { once: true });
      window.addEventListener('touchstart', this.handleFirstUserGesture, { once: true });
    }
  }

  private handleFirstUserGesture(): void {
    this.unlock();
  }

  /**
   * Initializes and resumes the Web Audio Context upon user interaction.
   */
  unlock(): boolean {
    if (this.isUnlocked && this.ctx && this.ctx.state === 'running') {
      return true;
    }

    const AudioContextClass = typeof window !== 'undefined'
      ? (window.AudioContext || (window as any).webkitAudioContext)
      : null;

    if (!AudioContextClass) {
      return false; // Headless / unsupported environment
    }

    try {
      if (!this.ctx) {
        this.ctx = new AudioContextClass();
        this.setupAudioGraph();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.isUnlocked = true;
      console.log('[AudioSystem] Web Audio engine unlocked and active.');
      return true;
    } catch (e) {
      console.warn('[AudioSystem] Failed to unlock audio context', e);
      return false;
    }
  }

  get isAudioActive(): boolean {
    return this.isUnlocked && !!this.ctx && this.ctx.state === 'running';
  }

  private setupAudioGraph(): void {
    if (!this.ctx) return;

    // Master Bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.settings.muted ? 0 : this.settings.masterVolume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Sub-Busses
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.settings.musicVolume, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.gain.setValueAtTime(this.settings.ambienceVolume, this.ctx.currentTime);
    this.ambienceGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    // Setup Continuous Procedural Ambience
    this.initAmbienceGenerators();
  }

  /**
   * Creates seamless procedural loop buffers for wind, stream, and rain.
   */
  private initAmbienceGenerators(): void {
    if (!this.ctx || !this.ambienceGain) return;

    const sampleRate = this.ctx.sampleRate;
    const bufferDuration = 5.0; // 5-second seamless loops
    const bufferLength = sampleRate * bufferDuration;

    // 1. Wind Loop (Smooth Pink Noise)
    const windBuffer = this.ctx.createBuffer(1, bufferLength, sampleRate);
    const windData = windBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferLength; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      windData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = windBuffer;
    this.windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.ambienceGain);
    this.windSource.start();

    // 2. River Stream Loop (Bandpass bubbling texture)
    const riverBuffer = this.ctx.createBuffer(1, bufferLength, sampleRate);
    const riverData = riverBuffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i++) {
      riverData[i] = (Math.random() * 2 - 1) * 0.15;
    }

    this.riverSource = this.ctx.createBufferSource();
    this.riverSource.buffer = riverBuffer;
    this.riverSource.loop = true;

    this.riverFilter = this.ctx.createBiquadFilter();
    this.riverFilter.type = 'bandpass';
    this.riverFilter.frequency.setValueAtTime(850, this.ctx.currentTime);
    this.riverFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);

    this.riverGain = this.ctx.createGain();
    this.riverGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // dynamically fades based on water proximity

    this.riverSource.connect(this.riverFilter);
    this.riverFilter.connect(this.riverGain);
    this.riverGain.connect(this.ambienceGain);
    this.riverSource.start();

    // 3. Rain Loop (Broadband soft patter)
    const rainBuffer = this.ctx.createBuffer(1, bufferLength, sampleRate);
    const rainData = rainBuffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i++) {
      rainData[i] = (Math.random() * 2 - 1) * 0.12;
    }

    this.rainSource = this.ctx.createBufferSource();
    this.rainSource.buffer = rainBuffer;
    this.rainSource.loop = true;

    this.rainFilter = this.ctx.createBiquadFilter();
    this.rainFilter.type = 'lowpass';
    this.rainFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.rainSource.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.ambienceGain);
    this.rainSource.start();
  }

  /**
   * Updates ambient audio modulation and generative music progression.
   */
  update(
    dt: number,
    timeOfDayHours: number,
    windStrength: number,
    wetness: number,
    nearWaterProximity: number, // 0 to 1
    biome: BiomeType
  ): void {
    if (!this.ctx || !this.isUnlocked || this.settings.muted) return;

    const t = this.ctx.currentTime;

    // 1. Modulate Wind Noise
    if (this.windFilter && this.windGain) {
      const targetCutoff = 220 + windStrength * 480;
      this.windFilter.frequency.setTargetAtTime(targetCutoff, t, 0.4);
      const targetGain = 0.12 + windStrength * 0.28;
      this.windGain.gain.setTargetAtTime(targetGain, t, 0.4);
    }

    // 2. Modulate River Stream Sound (Spatialized by water proximity)
    if (this.riverGain) {
      const streamVolume = Math.max(0, Math.min(1, nearWaterProximity)) * 0.35;
      this.riverGain.gain.setTargetAtTime(streamVolume, t, 0.3);
    }

    // 3. Modulate Rain Sound
    if (this.rainGain) {
      const rainVol = Math.max(0, Math.min(1, wetness)) * 0.32;
      this.rainGain.gain.setTargetAtTime(rainVol, t, 0.5);
    }

    // 4. Procedural Bird Chirps (Daylight, nature biomes)
    const isDay = timeOfDayHours >= 5.5 && timeOfDayHours <= 19.0;
    const isNatureBiome = biome === BiomeType.Meadow || biome === BiomeType.BirchGrove ||
                          biome === BiomeType.PineForest || biome === BiomeType.WildflowerFields;

    if (isDay && isNatureBiome && wetness < 0.35) {
      this.birdChirpTimer -= dt;
      if (this.birdChirpTimer <= 0) {
        this.birdChirpTimer = 3.0 + Math.random() * 5.0;
        this.playBirdChirp();
      }
    }

    // 5. Generative Pentatonic Music Progression
    this.musicChordTimer -= dt;
    if (this.musicChordTimer <= 0) {
      this.musicChordTimer = 9.0 + Math.random() * 4.0; // new pad progression every 9-13s
      this.playGenerativeChord(timeOfDayHours);
    }

    // 6. Occasional Plucked Chimes / Bells
    this.chimeTimer -= dt;
    if (this.chimeTimer <= 0) {
      this.chimeTimer = 5.0 + Math.random() * 7.0;
      this.playPentatonicChime(timeOfDayHours);
    }
  }

  /**
   * Synthesizes an organic bird chirp with modulated pitch frequency sweep.
   */
  private playBirdChirp(): void {
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const baseFreq = 2400 + Math.random() * 800;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, t + 0.05);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, t + 0.12);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.16);
    } catch {
      // Ignore audio synthesis errors in edge cases
    }
  }

  /**
   * Synthesizes warm ethereal pentatonic pads evolving over time.
   */
  private playGenerativeChord(timeOfDayHours: number): void {
    if (!this.ctx || !this.musicGain) return;

    try {
      const t = this.ctx.currentTime;
      const freqs = this.getScaleForTime(timeOfDayHours);

      // Select 3 harmonious notes from scale
      const rootIdx = Math.floor(Math.random() * (freqs.length - 3));
      const note1 = freqs[rootIdx];
      const note2 = freqs[rootIdx + 2] || freqs[rootIdx + 1];
      const note3 = freqs[(rootIdx + 4) % freqs.length];

      const chordNotes = [note1, note2, note3];
      const padDuration = 8.5;

      chordNotes.forEach(freq => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        // Warm detuned triangle/sine blend
        osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 1.2, t);

        // Gentle 2.5s attack, 3.5s release
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.045, t + 2.5);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + padDuration);

        osc.connect(gain);
        gain.connect(this.musicGain!);

        osc.start(t);
        osc.stop(t + padDuration + 0.1);
      });
    } catch {
      // Ignore audio synthesis errors in edge cases
    }
  }

  /**
   * Plays a delicate bell chime on a pentatonic note.
   */
  private playPentatonicChime(timeOfDayHours: number): void {
    if (!this.ctx || !this.musicGain) return;

    try {
      const t = this.ctx.currentTime;
      const scale = this.getScaleForTime(timeOfDayHours);
      const freq = scale[Math.floor(Math.random() * scale.length)];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 2, t); // Upper octave bell

      // Crisp strike, long peaceful decay
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 2.9);
    } catch {
      // Ignore
    }
  }

  private getScaleForTime(hours: number): number[] {
    if (hours >= 5.0 && hours < 11.5) {
      return PENTATONIC_FREQS.dawn;
    } else if (hours >= 11.5 && hours < 17.0) {
      return PENTATONIC_FREQS.afternoon;
    } else if (hours >= 17.0 && hours < 20.5) {
      return PENTATONIC_FREQS.sunset;
    } else {
      return PENTATONIC_FREQS.night;
    }
  }

  // =========================================================================
  // Micro-Sound Effects (SFX)
  // =========================================================================

  /**
   * Plays a subtle, tactile footstep sound based on terrain surface.
   */
  playStep(surface: SurfaceType = 'grass'): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;

    try {
      const t = this.ctx.currentTime;

      if (surface === 'water') {
        // Water splash droplet
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(190, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);

        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.1);
      } else {
        // Gentle noise rustle / thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const pitch = surface === 'stone' ? 140 : 85;

        osc.frequency.setValueAtTime(pitch, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.04);

        gain.gain.setValueAtTime(surface === 'stone' ? 0.05 : 0.03, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.06);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Plays a stone skip bounce impact with rising pitch and water plop.
   */
  playStoneSkip(skipIndex: number): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;

    try {
      const t = this.ctx.currentTime;
      // High stone tap
      const tapOsc = this.ctx.createOscillator();
      const tapGain = this.ctx.createGain();
      const tapFreq = 1400 + skipIndex * 180;

      tapOsc.frequency.setValueAtTime(tapFreq, t);
      tapGain.gain.setValueAtTime(0.09, t);
      tapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      tapOsc.connect(tapGain);
      tapGain.connect(this.sfxGain);
      tapOsc.start(t);
      tapOsc.stop(t + 0.05);

      // Water ripple body
      const plopOsc = this.ctx.createOscillator();
      const plopGain = this.ctx.createGain();
      plopOsc.frequency.setValueAtTime(260, t);
      plopOsc.frequency.exponentialRampToValueAtTime(90, t + 0.09);

      plopGain.gain.setValueAtTime(0.07, t);
      plopGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      plopOsc.connect(plopGain);
      plopGain.connect(this.sfxGain);
      plopOsc.start(t);
      plopOsc.stop(t + 0.11);
    } catch {
      // Ignore
    }
  }

  /**
   * Plays an uplifting 3-note pentatonic fanfare on keepsake pickup or fish catch.
   */
  playFanfare(): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;

    try {
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

      notes.forEach((freq, idx) => {
        const noteTime = t + idx * 0.1;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.08, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(noteTime);
        osc.stop(noteTime + 0.36);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Soft wooden acoustic pop for UI button clicks.
   */
  playButtonClick(): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.frequency.setValueAtTime(650, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.035);

      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch {
      // Ignore
    }
  }

  // =========================================================================
  // Volume Controls
  // =========================================================================

  setMasterVolume(val: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.settings.muted) {
      this.masterGain.gain.setTargetAtTime(this.settings.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  setMusicVolume(val: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.settings.musicVolume, this.ctx.currentTime, 0.05);
    }
  }

  setAmbienceVolume(val: number): void {
    this.settings.ambienceVolume = Math.max(0, Math.min(1, val));
    if (this.ambienceGain && this.ctx) {
      this.ambienceGain.gain.setTargetAtTime(this.settings.ambienceVolume, this.ctx.currentTime, 0.05);
    }
  }

  setSfxVolume(val: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume, this.ctx.currentTime, 0.05);
    }
  }

  toggleMute(): boolean {
    this.settings.muted = !this.settings.muted;
    if (this.masterGain && this.ctx) {
      const target = this.settings.muted ? 0 : this.settings.masterVolume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    return this.settings.muted;
  }
}
