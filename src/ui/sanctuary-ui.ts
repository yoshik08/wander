import { SaveManager, SavedCreature } from '../systems/save';

export class SanctuaryUI {
  private container: HTMLDivElement;
  private partyBox: HTMLDivElement;
  private sanctuaryBox: HTMLDivElement;
  public isActive: boolean = false;

  constructor(private saveManager: SaveManager) {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      height: 400px;
      background: rgba(20, 40, 30, 0.85);
      backdrop-filter: blur(8px);
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      display: none;
      flex-direction: row;
      color: white;
      font-family: sans-serif;
      z-index: 200;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    `;

    const leftPanel = document.createElement('div');
    leftPanel.style.cssText = 'flex: 1; padding: 20px; border-right: 1px solid rgba(255,255,255,0.2); overflow-y: auto;';
    leftPanel.innerHTML = '<h3 style="margin-top:0;">Party (Max 6)</h3>';
    this.partyBox = document.createElement('div');
    this.partyBox.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
    leftPanel.appendChild(this.partyBox);

    const rightPanel = document.createElement('div');
    rightPanel.style.cssText = 'flex: 1; padding: 20px; overflow-y: auto;';
    rightPanel.innerHTML = '<h3 style="margin-top:0;">Sanctuary</h3>';
    this.sanctuaryBox = document.createElement('div');
    this.sanctuaryBox.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
    rightPanel.appendChild(this.sanctuaryBox);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      border-radius: 4px;
      cursor: pointer;
      padding: 4px 8px;
    `;
    closeBtn.onclick = () => this.close();

    this.container.appendChild(leftPanel);
    this.container.appendChild(rightPanel);
    this.container.appendChild(closeBtn);

    document.body.appendChild(this.container);
  }

  open() {
    this.isActive = true;
    this.container.style.display = 'flex';
    this.update();
  }

  close() {
    this.isActive = false;
    this.container.style.display = 'none';
  }

  private update() {
    this.partyBox.innerHTML = '';
    this.sanctuaryBox.innerHTML = '';

    const { party, sanctuary } = this.saveManager.state;

    party.forEach((c, idx) => {
      const card = this.createCard(c, 'party', () => {
        party.splice(idx, 1);
        sanctuary.push(c);
        this.saveManager.saveToLocalStorage();
        this.update();
      });
      this.partyBox.appendChild(card);
    });

    sanctuary.forEach((c, idx) => {
      const card = this.createCard(c, 'sanctuary', () => {
        if (party.length < 6) {
          sanctuary.splice(idx, 1);
          party.push(c);
          this.saveManager.saveToLocalStorage();
          this.update();
        }
      });
      this.sanctuaryBox.appendChild(card);
    });
  }

  private createCard(c: SavedCreature, source: 'party' | 'sanctuary', onClick: () => void): HTMLDivElement {
    const card = document.createElement('div');
    card.style.cssText = `
      padding: 10px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.2s;
    `;
    card.onmouseenter = () => card.style.background = 'rgba(255,255,255,0.2)';
    card.onmouseleave = () => card.style.background = 'rgba(255,255,255,0.1)';
    card.onclick = onClick;

    const actionText = source === 'party' ? 'Deposit ➔' : '⬅ Withdraw';
    card.innerHTML = `
      <div>
        <strong>Lv.${c.level} Creature</strong><br/>
        <small style="opacity:0.7">ID: ${c.speciesId}</small>
      </div>
      <div style="font-size: 12px; opacity: 0.8;">${actionText}</div>
    `;

    return card;
  }
}
