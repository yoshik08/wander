import { SaveManager, GameSettings } from '../systems/save';
import { TYPE_BADGE_INFO, CreatureType } from '../entities/creature';

export class SettingsModal {
  private container: HTMLDivElement;
  isOpen: boolean = false;

  private speedBtn!: HTMLButtonElement;
  private colourblindBtn!: HTMLButtonElement;
  private peacefulBtn!: HTMLButtonElement;
  private seedInput!: HTMLInputElement;
  private copyBtn!: HTMLButtonElement;
  private loadSeedBtn!: HTMLButtonElement;

  onSpeedChange?: (speed2x: boolean) => void;
  onColourblindChange?: (colourblind: boolean) => void;
  onPeacefulChange?: (peaceful: boolean) => void;
  onToast?: (title: string, desc: string) => void;

  constructor(private saveManager: SaveManager, private currentSeed: string) {
    this.container = document.createElement('div');
    this.container.id = 'settings-modal';
    this.container.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 520px;
      max-height: 85vh;
      overflow-y: auto;
      background: rgba(22, 33, 25, 0.96);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 235, 180, 0.45);
      border-radius: 16px;
      padding: 24px;
      color: #FFF8E7;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 16px 40px rgba(0,0,0,0.6);
      z-index: 1500;
      display: none;
      user-select: none;
    `;

    this.buildUI();
    document.getElementById('game-container')?.appendChild(this.container);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.isOpen) {
          this.close();
        }
      } else if (e.key === 'o' || e.key === 'O') {
        // Prevent toggle if typing in input
        if (document.activeElement?.tagName === 'INPUT') return;
        this.toggle();
      }
    });
  }

  private buildUI() {
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 1px solid rgba(255, 235, 180, 0.2);
      padding-bottom: 12px;
    `;

    const title = document.createElement('h2');
    title.style.cssText = 'margin: 0; font-size: 18px; font-weight: 700; color: #FAD02C; letter-spacing: 0.04em;';
    title.textContent = '✦ MEADOW SETTINGS & SEED ✦';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 50%;
      width: 30px;
      height: 30px;
      color: #FFF8E7;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    `;
    closeBtn.onclick = () => this.close();
    header.appendChild(title);
    header.appendChild(closeBtn);
    this.container.appendChild(header);

    // Section 1: 2x Speed
    const s1 = this.createSection(
      '⚡ Exploration Speed',
      'Move twice as fast across the world. Press [T] to toggle on the fly.'
    );
    this.speedBtn = document.createElement('button');
    this.updateSpeedBtn();
    this.speedBtn.onclick = () => {
      const s = this.saveManager.state.settings;
      s.speed2x = !s.speed2x;
      this.saveManager.saveToLocalStorage();
      this.updateSpeedBtn();
      this.onSpeedChange?.(s.speed2x);
    };
    s1.appendChild(this.speedBtn);
    this.container.appendChild(s1);

    // Section 2: Colourblind Type Icons
    const s2 = this.createSection(
      '🎨 Colourblind Type Glyphs',
      'Display distinct geometric silhouettes (▲ ● ◆ ■ ⬡) alongside elemental colors.'
    );
    this.colourblindBtn = document.createElement('button');
    this.updateColourblindBtn();
    this.colourblindBtn.onclick = () => {
      const s = this.saveManager.state.settings;
      s.colourblindMode = !s.colourblindMode;
      this.saveManager.saveToLocalStorage();
      this.updateColourblindBtn();
      this.onColourblindChange?.(s.colourblindMode);
    };
    s2.appendChild(this.colourblindBtn);

    // Glyph Legend
    const legend = document.createElement('div');
    legend.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
      background: rgba(0, 0, 0, 0.25);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
    `;
    const types: CreatureType[] = ['Flora', 'Aqua', 'Ignis', 'Terra', 'Aero'];
    for (const t of types) {
      const info = TYPE_BADGE_INFO[t];
      const item = document.createElement('span');
      item.style.cssText = `color: ${info.color}; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;`;
      item.textContent = `${info.icon} ${info.symbol} ${info.name}`;
      legend.appendChild(item);
    }
    s2.appendChild(legend);
    this.container.appendChild(s2);

    // Section 3: No-Combat / Peaceful Mode
    const s3 = this.createSection(
      '🕊️ Peaceful Wander Mode (No-Combat)',
      'Wild creatures will not challenge you to sparring bouts. Explore and befriend in pure peace.'
    );
    this.peacefulBtn = document.createElement('button');
    this.updatePeacefulBtn();
    this.peacefulBtn.onclick = () => {
      const s = this.saveManager.state.settings;
      s.peacefulMode = !s.peacefulMode;
      this.saveManager.saveToLocalStorage();
      this.updatePeacefulBtn();
      this.onPeacefulChange?.(s.peacefulMode);
    };
    s3.appendChild(this.peacefulBtn);
    this.container.appendChild(s3);

    // Section 4: Seed Sharing & Custom Seed
    const s4 = this.createSection(
      '🌱 World Seed & Sharing',
      'The procedural universe is deterministic. Sharing the seed generates an identical meadow.'
    );

    const seedRow = document.createElement('div');
    seedRow.style.cssText = 'display: flex; gap: 8px; margin-top: 8px;';

    this.seedInput = document.createElement('input');
    this.seedInput.type = 'text';
    this.seedInput.value = this.currentSeed;
    this.seedInput.style.cssText = `
      flex: 1;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 235, 180, 0.3);
      border-radius: 8px;
      color: #FAD02C;
      padding: 8px 12px;
      font-family: ui-monospace, monospace;
      font-size: 13px;
    `;

    this.copyBtn = document.createElement('button');
    this.copyBtn.textContent = '📋 Copy Link';
    this.copyBtn.style.cssText = this.btnStyle('#3498DB');
    this.copyBtn.onclick = () => {
      const shareUrl = `${window.location.origin}${window.location.pathname}?seed=${encodeURIComponent(this.seedInput.value.trim() || this.currentSeed)}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          this.onToast?.('📋 Seed Link Copied', `Copied link for seed "${this.seedInput.value.trim()}" to clipboard!`);
        });
      }
    };

    this.loadSeedBtn = document.createElement('button');
    this.loadSeedBtn.textContent = '🚀 Load Seed';
    this.loadSeedBtn.style.cssText = this.btnStyle('#E67E22');
    this.loadSeedBtn.onclick = () => {
      const s = this.seedInput.value.trim();
      if (s && s !== this.currentSeed) {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('seed', s);
        window.location.href = nextUrl.toString();
      }
    };

    seedRow.appendChild(this.seedInput);
    seedRow.appendChild(this.copyBtn);
    seedRow.appendChild(this.loadSeedBtn);
    s4.appendChild(seedRow);
    this.container.appendChild(s4);
  }

  private createSection(titleText: string, descText: string): HTMLDivElement {
    const sec = document.createElement('div');
    sec.style.cssText = `
      margin-bottom: 20px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 14px 16px;
    `;

    const title = document.createElement('div');
    title.style.cssText = 'font-weight: 700; font-size: 14px; color: #FFF8E7; margin-bottom: 4px;';
    title.textContent = titleText;

    const desc = document.createElement('div');
    desc.style.cssText = 'font-size: 12px; color: #A2D9CE; line-height: 1.4; margin-bottom: 10px;';
    desc.textContent = descText;

    sec.appendChild(title);
    sec.appendChild(desc);
    return sec;
  }

  private updateSpeedBtn() {
    const speed2x = !!this.saveManager.state.settings?.speed2x;
    this.speedBtn.textContent = speed2x ? '⚡ 2.0x Speed (Active)' : '🚶 1.0x Normal Speed';
    this.speedBtn.style.cssText = this.btnStyle(speed2x ? '#F39C12' : '#5D6D7E');
  }

  private updateColourblindBtn() {
    const cb = !!this.saveManager.state.settings?.colourblindMode;
    this.colourblindBtn.textContent = cb ? '🎨 Glyphs Enabled (Active)' : '🎨 Standard Color Mode';
    this.colourblindBtn.style.cssText = this.btnStyle(cb ? '#2ECC71' : '#5D6D7E');
  }

  private updatePeacefulBtn() {
    const p = !!this.saveManager.state.settings?.peacefulMode;
    this.peacefulBtn.textContent = p ? '🕊️ Peaceful Mode (Active)' : '⚔️ Sparring Bouts Enabled';
    this.peacefulBtn.style.cssText = this.btnStyle(p ? '#1ABC9C' : '#5D6D7E');
  }

  private btnStyle(bgColor: string): string {
    return `
      background: ${bgColor};
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      color: #FFF;
      font-weight: 600;
      font-size: 12px;
      padding: 7px 14px;
      cursor: pointer;
      transition: filter 0.2s, transform 0.1s;
    `;
  }

  open() {
    this.isOpen = true;
    this.container.style.display = 'block';
    this.updateSpeedBtn();
    this.updateColourblindBtn();
    this.updatePeacefulBtn();
  }

  close() {
    this.isOpen = false;
    this.container.style.display = 'none';
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}
