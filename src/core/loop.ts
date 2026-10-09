export interface GameLoopCallbacks {
  update: (dt: number) => void;
  render: (alpha: number) => void;
}

export class GameLoop {
  readonly fixedTimestep: number = 1 / 120; // 120 Hz fixed simulation
  private maxAccumulator: number = 0.25; // Safety clamp against spiral of death
  private accumulator: number = 0;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private rafId: number = 0;

  // Profiling metrics
  fps: number = 0;
  frameTimeMs: number = 0;
  private fpsFrames: number = 0;
  private fpsLastSample: number = 0;

  private callbacks: GameLoopCallbacks;

  constructor(callbacks: GameLoopCallbacks) {
    this.callbacks = callbacks;
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.tick = this.tick.bind(this);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.fpsLastSample = this.lastTime;
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.isRunning = false;
    cancelAnimationFrame(this.rafId);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      this.isPaused = true;
    } else {
      this.isPaused = false;
      this.lastTime = performance.now();
      this.accumulator = 0;
    }
  }

  private tick(now: number): void {
    if (!this.isRunning) return;

    if (this.isPaused) {
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    const elapsed = Math.min((now - this.lastTime) / 1000, this.maxAccumulator);
    this.frameTimeMs = (now - this.lastTime);
    this.lastTime = now;
    this.accumulator += elapsed;

    // Fixed timestep physics & game logic
    while (this.accumulator >= this.fixedTimestep) {
      this.callbacks.update(this.fixedTimestep);
      this.accumulator -= this.fixedTimestep;
    }

    // Render with interpolation factor alpha [0, 1)
    const alpha = this.accumulator / this.fixedTimestep;
    this.callbacks.render(alpha);

    // Track FPS
    this.fpsFrames++;
    if (now - this.fpsLastSample >= 1000) {
      this.fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLastSample));
      this.fpsFrames = 0;
      this.fpsLastSample = now;
    }

    this.rafId = requestAnimationFrame(this.tick);
  }
}
