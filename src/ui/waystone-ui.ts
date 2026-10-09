import { SaveManager } from '../systems/save';

export class WaystoneUI {
  private container: HTMLDivElement;
  private listContainer: HTMLDivElement;
  public isActive: boolean = false;
  private onTeleport: (x: number, y: number) => void;

  constructor(private saveManager: SaveManager, onTeleport: (x: number, y: number) => void) {
    this.onTeleport = onTeleport;
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      max-height: 500px;
      background: rgba(20, 30, 40, 0.9);
      backdrop-filter: blur(8px);
      border: 2px solid rgba(52, 152, 219, 0.4);
      border-radius: 12px;
      display: none;
      flex-direction: column;
      color: white;
      font-family: sans-serif;
      z-index: 200;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
      overflow: hidden;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'padding: 16px; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(52, 152, 219, 0.4); display: flex; justify-content: space-between; align-items: center;';
    header.innerHTML = '<h3 style="margin:0; color: #5DADE2;">Waystone Network</h3>';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    closeBtn.style.cssText = `
      background: transparent;
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      border-radius: 4px;
      cursor: pointer;
      padding: 4px 8px;
    `;
    closeBtn.onclick = () => this.close();
    header.appendChild(closeBtn);

    this.listContainer = document.createElement('div');
    this.listContainer.style.cssText = 'padding: 16px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; flex: 1;';

    this.container.appendChild(header);
    this.container.appendChild(this.listContainer);
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
    this.listContainer.innerHTML = '';

    const waystones = this.saveManager.state.waystones;
    
    if (waystones.length === 0) {
      this.listContainer.innerHTML = '<div style="opacity: 0.7; text-align: center; padding: 20px;">No waystones discovered yet.</div>';
      return;
    }

    waystones.forEach(w => {
      const card = document.createElement('div');
      card.style.cssText = `
        padding: 12px;
        background: rgba(52, 152, 219, 0.1);
        border: 1px solid rgba(52, 152, 219, 0.3);
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.2s;
      `;
      card.onmouseenter = () => {
        card.style.background = 'rgba(52, 152, 219, 0.2)';
        card.style.borderColor = 'rgba(52, 152, 219, 0.6)';
      };
      card.onmouseleave = () => {
        card.style.background = 'rgba(52, 152, 219, 0.1)';
        card.style.borderColor = 'rgba(52, 152, 219, 0.3)';
      };
      card.onclick = () => {
        this.onTeleport(w.x, w.y);
        this.close();
      };

      card.innerHTML = `
        <div>
          <strong style="color: #A9CCE3;">${w.name}</strong><br/>
          <small style="opacity: 0.6;">Coordinates: ${Math.round(w.x)}, ${Math.round(w.y)}</small>
        </div>
        <div style="font-size: 20px;">✧</div>
      `;

      this.listContainer.appendChild(card);
    });
  }
}
