import { SaveManager } from '../systems/save';

export interface KeepsakeCatalogEntry {
  type: string;
  name: string;
  biome: string;
  season: string;
  icon: string;
  stampColor: string;
  desc: string;
}

export const KEEPSAKE_CATALOG: KeepsakeCatalogEntry[] = [
  {
    type: 'blue_feather',
    name: 'Blue Jay Feather',
    biome: 'Meadow',
    season: 'Spring',
    icon: '🪶',
    stampColor: '#3498DB',
    desc: 'A fallen sapphire feather from high morning boughs, shimmering in dawn light.'
  },
  {
    type: 'pine_cone',
    name: 'Ancient Pinecone',
    biome: 'Pine Forest',
    season: 'Autumn',
    icon: '🌲',
    stampColor: '#8D6E63',
    desc: 'Smells of rich pine resin and sun-warmed forest needles after fresh rain.'
  },
  {
    type: 'acorn',
    name: 'Golden Oak Acorn',
    biome: 'Birch Grove',
    season: 'Autumn',
    icon: '🌰',
    stampColor: '#D35400',
    desc: 'The tiny seed of a mighty forest giant, capped in carved woody scales.'
  },
  {
    type: 'amber_leaf',
    name: 'Autumn Maple Leaf',
    biome: 'Autumn Maple',
    season: 'Autumn',
    icon: '🍁',
    stampColor: '#E67E22',
    desc: 'A radiant amber leaf preserving the warmth and golden glow of late summer.'
  },
  {
    type: 'cherry_petal',
    name: 'Pressed Blossom',
    biome: 'Cherry Blossom',
    season: 'Spring',
    icon: '🌸',
    stampColor: '#F06292',
    desc: 'A delicate fragrant petal pressed softly between pages of parchment.'
  },
  {
    type: 'glowing_spore',
    name: 'Moonlit Spore Pod',
    biome: 'Glowing Hollow',
    season: 'All Seasons',
    icon: '🍄',
    stampColor: '#26C6DA',
    desc: 'Glows with a soft cyan luminescence, guiding night travelers safely home.'
  },
  {
    type: 'smooth_pebble',
    name: 'Riverstone',
    biome: 'Lakes & Rivers',
    season: 'Summer',
    icon: '🪨',
    stampColor: '#78909C',
    desc: 'Worn silky smooth by mountain currents over centuries of wandering waters.'
  },
  {
    type: 'seashell',
    name: 'Sun-Washed Shell',
    biome: 'Sandy Coast',
    season: 'Summer',
    icon: '🐚',
    stampColor: '#FFB74D',
    desc: 'Whispers with the gentle roar of distant ocean tides when held close.'
  },
  {
    type: 'quartz_crystal',
    name: 'Frost Quartz',
    biome: 'Snowy Peaks',
    season: 'Winter',
    icon: '💎',
    stampColor: '#81D4FA',
    desc: 'Catches morning sunlight in clear glacial facets like a frozen star.'
  },
  {
    type: 'wild_clover',
    name: 'Four-Leaf Clover',
    biome: 'Wildflower Fields',
    season: 'Spring',
    icon: '🍀',
    stampColor: '#4CAF50',
    desc: 'A rare lucky four-petaled clover found amidst singing meadow grasses.'
  },
  {
    type: 'meadow_honeycomb',
    name: 'Wild Honeycomb',
    biome: 'Meadow',
    season: 'Summer',
    icon: '🍯',
    stampColor: '#FBC02D',
    desc: 'Golden crystallized sweetness gathered from summer clover blossoms.'
  },
  {
    type: 'birch_scroll',
    name: 'Birch Bark Scroll',
    biome: 'Birch Grove',
    season: 'All Seasons',
    icon: '📜',
    stampColor: '#BCAAA4',
    desc: 'Paper-thin silver bark inscribed with the quiet whispers of the grove.'
  },
  {
    type: 'willow_whistle',
    name: 'Willow Whistle',
    biome: 'Marsh Ponds',
    season: 'Spring',
    icon: '🎋',
    stampColor: '#66BB6A',
    desc: 'Whistles softly like a reed warbler when swept by evening breezes.'
  },
  {
    type: 'obsidian_flake',
    name: 'Volcanic Obsidian',
    biome: 'Volcanic Foothills',
    season: 'All Seasons',
    icon: '✨',
    stampColor: '#424242',
    desc: 'Glassy black mirror holding the dormant warmth of ancient earth fires.'
  },
  {
    type: 'fir_garland',
    name: 'Evergreen Wreath',
    biome: 'Snowy Peaks',
    season: 'Winter',
    icon: '🌿',
    stampColor: '#2E7D32',
    desc: 'Woven scented needles that stay defiantly green beneath heavy snowfalls.'
  },
  {
    type: 'cloud_fleece',
    name: 'Highland Fleece',
    biome: 'High Steppe',
    season: 'Autumn',
    icon: '☁️',
    stampColor: '#ECEFF1',
    desc: 'Gilded thistle silk caught on high alpine crags beneath drifting clouds.'
  }
];

export class JournalUI {
  isOpen: boolean = false;
  currentPage: number = 0;
  readonly pageSize: number = 6;
  activeTab: 'keepsakes' | 'logbook' = 'keepsakes';

  private container: HTMLElement | null = null;
  private saveManager: SaveManager;

  constructor(saveManager: SaveManager) {
    this.saveManager = saveManager;
    if (typeof document !== 'undefined') {
      this.initDOM();
    }
  }

  private initDOM(): void {
    const existing = document.getElementById('journal-modal');
    if (existing) existing.remove();

    this.container = document.createElement('div');
    this.container.id = 'journal-modal';
    this.container.style.cssText = `
      display: none;
      position: absolute;
      inset: 0;
      background: rgba(14, 22, 16, 0.75);
      backdrop-filter: blur(8px);
      z-index: 1200;
      justify-content: center;
      align-items: center;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, serif;
      user-select: none;
      animation: journalFadeIn 0.25s ease-out;
    `;

    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });

    document.body.appendChild(this.container);
  }

  toggle(): boolean {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
    return this.isOpen;
  }

  open(): void {
    this.isOpen = true;
    if (this.container) {
      this.container.style.display = 'flex';
      this.render();
    }
  }

  close(): void {
    this.isOpen = false;
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  nextPage(): void {
    const maxPages = Math.ceil(KEEPSAKE_CATALOG.length / this.pageSize);
    if (this.currentPage < maxPages - 1) {
      this.currentPage++;
      this.render();
    }
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.render();
    }
  }

  setTab(tab: 'keepsakes' | 'logbook'): void {
    this.activeTab = tab;
    this.currentPage = 0;
    this.render();
  }

  isCollected(type: string): boolean {
    const keepsakes = this.saveManager.state.keepsakes || [];
    // Check if type or matching prefix is in save state
    return keepsakes.some(k => k === type || k.includes(type));
  }

  getCollectedCount(): number {
    return KEEPSAKE_CATALOG.filter(entry => this.isCollected(entry.type)).length;
  }

  getCompletionPercentage(): number {
    return Math.round((this.getCollectedCount() / KEEPSAKE_CATALOG.length) * 100);
  }

  render(): void {
    if (!this.container) return;

    const collectedCount = this.getCollectedCount();
    const totalCount = KEEPSAKE_CATALOG.length;
    const pct = this.getCompletionPercentage();
    const maxPages = Math.ceil(totalCount / this.pageSize);

    const startIndex = this.currentPage * this.pageSize;
    const pageItems = KEEPSAKE_CATALOG.slice(startIndex, startIndex + this.pageSize);

    this.container.innerHTML = `
      <div style="
        position: relative;
        width: 100%;
        max-width: 820px;
        max-height: 90vh;
        background: #FDFBF4;
        border: 4px solid #5C3A21;
        border-radius: 16px;
        box-shadow: 0 16px 40px rgba(0,0,0,0.55), inset 0 0 80px rgba(181, 137, 0, 0.08);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #2D3748;
      ">
        <!-- Leather Header & Tabs -->
        <div style="
          background: #4A2E1B;
          color: #FFF8E7;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 3px solid #8D5B4C;
        ">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">📖</span>
            <span style="font-size: 16px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">Wanderer's Journal</span>
          </div>

          <!-- Navigation Tabs -->
          <div style="display: flex; gap: 8px;">
            <button id="tab-keepsakes" style="
              background: ${this.activeTab === 'keepsakes' ? '#FDFBF4' : 'rgba(255,255,255,0.15)'};
              color: ${this.activeTab === 'keepsakes' ? '#4A2E1B' : '#FFF8E7'};
              border: none;
              padding: 5px 14px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 700;
              cursor: pointer;
            ">✨ Keepsakes & Curios</button>
            <button id="tab-logbook" style="
              background: ${this.activeTab === 'logbook' ? '#FDFBF4' : 'rgba(255,255,255,0.15)'};
              color: ${this.activeTab === 'logbook' ? '#4A2E1B' : '#FFF8E7'};
              border: none;
              padding: 5px 14px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 700;
              cursor: pointer;
            ">🧭 Expedition Log</button>
          </div>

          <button id="journal-close-btn" style="
            background: rgba(255,255,255,0.12);
            border: 1px solid rgba(255,255,255,0.25);
            color: #FFF8E7;
            border-radius: 6px;
            padding: 4px 10px;
            font-size: 13px;
            cursor: pointer;
          ">✕ Esc</button>
        </div>

        <!-- Progress Banner -->
        <div style="
          background: #F4EEDC;
          border-bottom: 1px solid #D5C9B1;
          padding: 8px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        ">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
            <span style="font-weight: 700; color: #5C3A21;">Collection Progress:</span>
            <div style="
              flex: 1;
              max-width: 280px;
              height: 10px;
              background: #E2D7C2;
              border-radius: 5px;
              overflow: hidden;
              box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
            ">
              <div style="
                width: ${pct}%;
                height: 100%;
                background: linear-gradient(90deg, #27AE60, #2ECC71);
                transition: width 0.3s ease;
              "></div>
            </div>
            <span style="font-weight: 600; color: #27AE60;">${collectedCount} / ${totalCount} (${pct}%)</span>
          </div>
          <span style="font-size: 12px; color: #7F8C8D; font-style: italic;">Seed: ${this.saveManager.state.seed}</span>
        </div>

        <!-- Book Content Body -->
        <div style="padding: 20px 24px; overflow-y: auto; flex: 1;">
          ${this.activeTab === 'keepsakes' ? `
            <div style="
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
              gap: 16px;
            ">
              ${pageItems.map(item => {
                const found = this.isCollected(item.type);
                return `
                  <div style="
                    background: ${found ? '#FFFDF8' : '#F2ECE1'};
                    border: 2px dashed ${found ? item.stampColor : '#BDC3C7'};
                    border-radius: 12px;
                    padding: 14px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    box-shadow: ${found ? '0 4px 12px rgba(0,0,0,0.06)' : 'none'};
                    opacity: ${found ? '1' : '0.65'};
                    position: relative;
                  ">
                    <!-- Watercolor stamp wash seal -->
                    <div style="
                      width: 54px;
                      height: 54px;
                      border-radius: 50%;
                      background: ${found ? item.stampColor + '22' : '#E0D8CB'};
                      border: 2px solid ${found ? item.stampColor : '#BDC3C7'};
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 26px;
                      margin-bottom: 10px;
                    ">
                      ${found ? item.icon : '🔒'}
                    </div>

                    <div style="
                      font-size: 14px;
                      font-weight: 700;
                      color: ${found ? '#2C3E50' : '#7F8C8D'};
                      margin-bottom: 4px;
                    ">
                      ${found ? item.name : 'Undiscovered Keepsake'}
                    </div>

                    <div style="
                      font-size: 11px;
                      color: ${found ? item.stampColor : '#95A5A6'};
                      font-weight: 600;
                      text-transform: uppercase;
                      letter-spacing: 0.05em;
                      margin-bottom: 8px;
                    ">
                      ${item.biome} • ${item.season}
                    </div>

                    <div style="
                      font-size: 12px;
                      color: #555;
                      font-style: italic;
                      line-height: 1.4;
                    ">
                      ${found ? `"${item.desc}"` : 'Hidden in wild clearings and silent groves...'}
                    </div>

                    ${found ? `
                      <div style="
                        margin-top: 10px;
                        font-size: 10px;
                        font-weight: 700;
                        color: #27AE60;
                        background: #E8F8F5;
                        padding: 2px 8px;
                        border-radius: 10px;
                        border: 1px solid #A2D9CE;
                      ">
                        ✓ Discovered
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <!-- Expedition Logbook Tab -->
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div style="background: #FFFDF8; border: 1px solid #E2D7C2; border-radius: 10px; padding: 16px;">
                <h3 style="font-size: 15px; color: #4A2E1B; margin-bottom: 12px;">🌟 Wanderer's Field Statistics</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
                  <div style="background: #F9F5EC; padding: 10px; border-radius: 8px;">
                    <div style="font-size: 11px; color: #7F8C8D;">Explored Chunks</div>
                    <div style="font-size: 18px; font-weight: 700; color: #27AE60;">${this.saveManager.state.exploredChunks.length}</div>
                  </div>
                  <div style="background: #F9F5EC; padding: 10px; border-radius: 8px;">
                    <div style="font-size: 11px; color: #7F8C8D;">Companion Party</div>
                    <div style="font-size: 18px; font-weight: 700; color: #2980B9;">${this.saveManager.state.party.length} / 6</div>
                  </div>
                  <div style="background: #F9F5EC; padding: 10px; border-radius: 8px;">
                    <div style="font-size: 11px; color: #7F8C8D;">Sanctuary Inhabitants</div>
                    <div style="font-size: 18px; font-weight: 700; color: #8E44AD;">${this.saveManager.state.sanctuary.length}</div>
                  </div>
                  <div style="background: #F9F5EC; padding: 10px; border-radius: 8px;">
                    <div style="font-size: 11px; color: #7F8C8D;">Warden Badges</div>
                    <div style="font-size: 18px; font-weight: 700; color: #D35400;">${this.saveManager.state.badges.length} / 8</div>
                  </div>
                  <div style="background: #F9F5EC; padding: 10px; border-radius: 8px;">
                    <div style="font-size: 11px; color: #7F8C8D;">Waystones Attuned</div>
                    <div style="font-size: 18px; font-weight: 700; color: #16A085;">${this.saveManager.state.waystones.length}</div>
                  </div>
                  <div style="background: #F9F5EC; padding: 10px; border-radius: 8px;">
                    <div style="font-size: 11px; color: #7F8C8D;">Hidden Landmarks</div>
                    <div style="font-size: 18px; font-weight: 700; color: #E67E22;">${(this.saveManager.state.landmarks || []).length} / 20</div>
                  </div>
                </div>
              </div>

              <div style="background: #FFFDF8; border: 1px solid #E2D7C2; border-radius: 10px; padding: 16px;">
                <h3 style="font-size: 15px; color: #4A2E1B; margin-bottom: 8px;">📜 Meadow Natural Lore</h3>
                <p style="font-size: 13px; line-height: 1.6; color: #4A5568;">
                  Every leaf, pebble, and feather tells a quiet story of the seasons. Rare creatures roam far from spawn, and mythical spirits awaken under shooting stars or during ancient rainfall. Wander gently, listen to the wind, and let the wilderness guide your footsteps.
                </p>
              </div>
            </div>
          `}
        </div>

        <!-- Footer & Page Controls -->
        <div style="
          background: #F4EEDC;
          border-top: 1px solid #D5C9B1;
          padding: 10px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <button id="journal-prev-btn" style="
            background: #FFF8E7;
            border: 1px solid #D5C9B1;
            padding: 6px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            color: #5C3A21;
            cursor: pointer;
            visibility: ${this.activeTab === 'keepsakes' && this.currentPage > 0 ? 'visible' : 'hidden'};
          ">← Previous Page</button>

          <span style="font-size: 12px; color: #7F8C8D; font-weight: 600;">
            ${this.activeTab === 'keepsakes' ? `Page ${this.currentPage + 1} of ${maxPages}` : 'Expedition Folio'}
          </span>

          <button id="journal-next-btn" style="
            background: #FFF8E7;
            border: 1px solid #D5C9B1;
            padding: 6px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            color: #5C3A21;
            cursor: pointer;
            visibility: ${this.activeTab === 'keepsakes' && this.currentPage < maxPages - 1 ? 'visible' : 'hidden'};
          ">Next Page →</button>
        </div>
      </div>
    `;

    // Hook listeners
    const closeBtn = document.getElementById('journal-close-btn');
    if (closeBtn) closeBtn.onclick = () => this.close();

    const prevBtn = document.getElementById('journal-prev-btn');
    if (prevBtn) prevBtn.onclick = () => this.prevPage();

    const nextBtn = document.getElementById('journal-next-btn');
    if (nextBtn) nextBtn.onclick = () => this.nextPage();

    const tabKeepsakes = document.getElementById('tab-keepsakes');
    if (tabKeepsakes) tabKeepsakes.onclick = () => this.setTab('keepsakes');

    const tabLogbook = document.getElementById('tab-logbook');
    if (tabLogbook) tabLogbook.onclick = () => this.setTab('logbook');
  }
}
