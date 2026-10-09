import { SparringSystem, Combatant, MOVES, Move } from '../systems/sparring';
import { CreatureType } from '../entities/creature';

export class SparringHUD {
  private container: HTMLDivElement;
  private sys: SparringSystem;

  private pName: HTMLDivElement;
  private pResolve: HTMLDivElement;
  
  private wName: HTMLDivElement;
  private wResolve: HTMLDivElement;

  private logBox: HTMLDivElement;
  private movesBox: HTMLDivElement;

  private active: boolean = false;

  constructor(sys: SparringSystem) {
    this.sys = sys;
    this.container = document.createElement('div');
    this.container.id = 'sparring-hud';
    this.container.style.display = 'none';
    this.container.style.position = 'absolute';
    this.container.style.bottom = '20px';
    this.container.style.left = '50%';
    this.container.style.transform = 'translateX(-50%)';
    this.container.style.width = '90%';
    this.container.style.maxWidth = '600px';
    this.container.style.background = 'rgba(20, 28, 22, 0.95)';
    this.container.style.backdropFilter = 'blur(12px)';
    this.container.style.border = '1px solid rgba(255, 235, 180, 0.45)';
    this.container.style.borderRadius = '16px';
    this.container.style.padding = '16px';
    this.container.style.color = '#FFF8E7';
    this.container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    this.container.style.zIndex = '1000';
    this.container.style.userSelect = 'none';

    // Top Row: Stats
    const statsRow = document.createElement('div');
    statsRow.style.display = 'flex';
    statsRow.style.justifyContent = 'space-between';
    statsRow.style.marginBottom = '12px';

    const pStat = this.createStatBox();
    this.pName = pStat.name;
    this.pResolve = pStat.resolve;
    
    const wStat = this.createStatBox();
    wStat.box.style.textAlign = 'right';
    this.wName = wStat.name;
    this.wResolve = wStat.resolve;

    statsRow.appendChild(pStat.box);
    statsRow.appendChild(wStat.box);
    this.container.appendChild(statsRow);

    // Middle Row: Log
    this.logBox = document.createElement('div');
    this.logBox.style.background = 'rgba(0,0,0,0.3)';
    this.logBox.style.borderRadius = '8px';
    this.logBox.style.padding = '10px';
    this.logBox.style.height = '60px';
    this.logBox.style.overflowY = 'auto';
    this.logBox.style.marginBottom = '12px';
    this.logBox.style.fontSize = '14px';
    this.logBox.style.lineHeight = '1.4';
    this.container.appendChild(this.logBox);

    // Bottom Row: Actions
    this.movesBox = document.createElement('div');
    this.movesBox.style.display = 'flex';
    this.movesBox.style.gap = '8px';
    this.movesBox.style.flexWrap = 'wrap';
    this.container.appendChild(this.movesBox);

    document.getElementById('game-container')?.appendChild(this.container);
  }

  private createStatBox() {
    const box = document.createElement('div');
    const name = document.createElement('div');
    name.style.fontWeight = 'bold';
    name.style.fontSize = '16px';
    name.style.color = '#FAD02C';
    
    const resolve = document.createElement('div');
    resolve.style.fontSize = '14px';
    resolve.style.color = '#E8F8F5';

    box.appendChild(name);
    box.appendChild(resolve);
    return { box, name, resolve };
  }

  public update(): void {
    if (!this.sys.isActive) {
      if (this.active) {
        this.container.style.display = 'none';
        this.active = false;
      }
      return;
    }

    if (!this.active) {
      this.container.style.display = 'block';
      this.active = true;
    }

    if (this.sys.playerCreature && this.sys.wildCreature) {
      this.pName.textContent = `Lv.${this.sys.playerCreature.level} ${this.sys.playerCreature.genome.name}`;
      this.pResolve.textContent = `Resolve: ${this.sys.playerCreature.currentResolve}/${this.sys.playerCreature.maxResolve}`;
      
      this.wName.textContent = `Lv.${this.sys.wildCreature.level} ${this.sys.wildCreature.genome.name}`;
      this.wResolve.textContent = `Resolve: ${this.sys.wildCreature.currentResolve}/${this.sys.wildCreature.maxResolve}`;
    }

    this.logBox.innerHTML = this.sys.log.join('<br/>');
    this.logBox.scrollTop = this.logBox.scrollHeight;

    this.renderMoves();
  }

  private renderMoves(): void {
    this.movesBox.innerHTML = '';
    
    if (this.sys.turn !== 'player' || !this.sys.playerCreature || this.sys.wildCreature?.currentResolve === 0) {
      if (this.sys.wildCreature?.currentResolve === 0) {
        const btn = document.createElement('button');
        btn.textContent = 'Offer Resonance Lure';
        btn.style.cssText = this.btnStyle('#A2D9CE');
        btn.onclick = () => {
          this.sys.befriend();
          this.update();
        };
        this.movesBox.appendChild(btn);

        const leave = document.createElement('button');
        leave.textContent = 'Leave';
        leave.style.cssText = this.btnStyle('#999');
        leave.onclick = () => {
          this.sys.endSpar();
          this.update();
        };
        this.movesBox.appendChild(leave);
      }
      return;
    }

    // Basic 4 moves from genome
    const moveNames = this.sys.playerCreature.genome.moves || ['Dash'];
    moveNames.forEach(m => {
      const move = MOVES[m];
      if (!move) return;
      const btn = document.createElement('button');
      btn.textContent = move.name;
      btn.style.cssText = this.btnStyle(this.getTypeColor(move.type));
      btn.onclick = () => {
        this.sys.executeTurn(move);
        this.update();
      };
      this.movesBox.appendChild(btn);
    });

    const fleeBtn = document.createElement('button');
    fleeBtn.textContent = 'Flee';
    fleeBtn.style.cssText = this.btnStyle('#888');
    fleeBtn.onclick = () => {
      this.sys.flee();
      this.update();
    };
    this.movesBox.appendChild(fleeBtn);
  }

  private btnStyle(borderColor: string): string {
    return `
      background: rgba(255,255,255,0.1);
      border: 1px solid ${borderColor};
      border-radius: 8px;
      color: #FFF;
      padding: 6px 12px;
      font-size: 14px;
      cursor: pointer;
      flex: 1;
      min-width: 80px;
    `;
  }

  private getTypeColor(type: string): string {
    switch (type) {
      case 'Flora': return '#2ecc71';
      case 'Aqua': return '#3498db';
      case 'Ignis': return '#e74c3c';
      case 'Terra': return '#e67e22';
      case 'Aero': return '#9b59b6';
      default: return '#bdc3c7';
    }
  }
}
