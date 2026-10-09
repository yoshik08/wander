import { CreatureGenome, CreatureType } from '../entities/creature';

export type CombatStatus = 'None' | 'Sleep' | 'Daze' | 'Rooted';

export interface Combatant {
  id?: string;
  genome: CreatureGenome;
  level: number;
  currentResolve: number;
  maxResolve: number;
  status: CombatStatus;
  statusTurns: number;
}

export type MoveType = 'Physical' | 'Elemental' | 'Status';

export interface Move {
  name: string;
  type: CreatureType | 'Neutral';
  category: MoveType;
  power: number;
  statusEffect?: CombatStatus;
  description: string;
}

export const MOVES: Record<string, Move> = {
  'Dash': { name: 'Dash', type: 'Neutral', category: 'Physical', power: 40, description: 'A basic physical strike.' },
  'Bramble Lash': { name: 'Bramble Lash', type: 'Flora', category: 'Physical', power: 45, description: 'Strikes with a swift vine.' },
  'Aqua Burst': { name: 'Aqua Burst', type: 'Aqua', category: 'Elemental', power: 40, description: 'A blast of water.' },
  'Cinder Spark': { name: 'Cinder Spark', type: 'Ignis', category: 'Elemental', power: 40, description: 'A small flame.' },
  'Pebble Toss': { name: 'Pebble Toss', type: 'Terra', category: 'Physical', power: 50, description: 'Throws a solid rock.' },
  'Breeze Strike': { name: 'Breeze Strike', type: 'Aero', category: 'Elemental', power: 40, description: 'A sharp gust of wind.' },
  'Spores': { name: 'Spores', type: 'Flora', category: 'Status', power: 0, statusEffect: 'Sleep', description: 'Induces sleep.' },
  'Intimidate': { name: 'Intimidate', type: 'Neutral', category: 'Status', power: 0, statusEffect: 'Daze', description: 'Dazes the target.' }
};

export class SparringSystem {
  isActive: boolean = false;
  playerCreature: Combatant | null = null;
  wildCreature: Combatant | null = null;
  
  turn: 'player' | 'wild' = 'player';
  log: string[] = [];

  startSpar(playerC: Combatant, wildC: Combatant) {
    this.isActive = true;
    this.playerCreature = playerC;
    this.wildCreature = wildC;
    this.turn = 'player';
    this.log = [`A wild ${wildC.genome.name} appeared!`, `Go, ${playerC.genome.name}! `];

    // Auto-win check
    if (playerC.level >= wildC.level + 10) {
      this.wildCreature.currentResolve = 0;
      this.log.push(`The wild ${wildC.genome.name} yielded immediately to your overwhelming strength.`);
    }
  }

  endSpar() {
    this.isActive = false;
    this.playerCreature = null;
    this.wildCreature = null;
  }

  getEffectiveness(attackType: CreatureType | 'Neutral', defendType: CreatureType): number {
    if (attackType === 'Neutral') return 1.0;
    
    // Flora > Aqua > Ignis > Flora
    // Terra > Aero > Terra
    // Additional cross-links: Ignis > Terra, Aqua > Terra, Aero > Flora (just some simple logic)
    const advantages: Record<string, string[]> = {
      'Flora': ['Aqua', 'Terra'],
      'Aqua': ['Ignis', 'Terra'],
      'Ignis': ['Flora', 'Aero'],
      'Terra': ['Ignis'],
      'Aero': ['Flora']
    };
    
    const disadvantages: Record<string, string[]> = {
      'Flora': ['Ignis', 'Aero'],
      'Aqua': ['Flora'],
      'Ignis': ['Aqua', 'Terra'],
      'Terra': ['Aqua', 'Flora'],
      'Aero': ['Ignis']
    };

    if (advantages[attackType] && advantages[attackType].includes(defendType)) return 2.0;
    if (disadvantages[attackType] && disadvantages[attackType].includes(defendType)) return 0.5;
    return 1.0;
  }

  useMove(attacker: Combatant, defender: Combatant, move: Move) {
    if (attacker.status === 'Sleep') {
      this.log.push(`${attacker.genome.name} is fast asleep...`);
      attacker.statusTurns--;
      if (attacker.statusTurns <= 0) attacker.status = 'None';
      return;
    }
    
    if (attacker.status === 'Daze' && Math.random() < 0.5) {
      this.log.push(`${attacker.genome.name} is dazed and couldn't act!`);
      attacker.statusTurns--;
      if (attacker.statusTurns <= 0) attacker.status = 'None';
      return;
    }

    this.log.push(`${attacker.genome.name} uses ${move.name}!`);

    if (move.category === 'Status') {
      if (move.statusEffect && defender.status === 'None') {
        defender.status = move.statusEffect;
        defender.statusTurns = 3;
        this.log.push(`${defender.genome.name} is inflicted with ${move.statusEffect}!`);
      } else {
        this.log.push(`It failed!`);
      }
    } else {
      // Calculate damage (Resolve damage)
      // Base calculation
      let damage = (((2 * attacker.level) / 5 + 2) * move.power * (attacker.genome.stats.strike / defender.genome.stats.guard)) / 50 + 2;
      
      // STAB
      if (move.type === attacker.genome.type) {
        damage *= 1.5;
      }
      
      // Effectiveness
      const eff = this.getEffectiveness(move.type, defender.genome.type);
      damage *= eff;
      
      if (eff > 1) this.log.push(`It's super effective!`);
      if (eff < 1) this.log.push(`It's not very effective...`);

      damage = Math.max(1, Math.floor(damage));
      defender.currentResolve = Math.max(0, defender.currentResolve - damage);
      
      this.log.push(`${defender.genome.name} lost ${damage} Resolve.`);
      
      if (defender.currentResolve === 0) {
        this.log.push(`${defender.genome.name} yielded!`);
      }
    }
  }

  executeTurn(playerMove: Move) {
    if (!this.isActive || !this.playerCreature || !this.wildCreature) return;
    if (this.wildCreature.currentResolve <= 0) return;

    this.log = []; // Clear log for this turn
    
    const pSpeed = this.playerCreature.genome.stats.haste;
    const wSpeed = this.wildCreature.genome.stats.haste;
    
    // AI picks a random move (for now, assume Dash)
    const wildMove = MOVES['Dash']; 

    if (pSpeed >= wSpeed) {
      this.useMove(this.playerCreature, this.wildCreature, playerMove);
      if (this.wildCreature.currentResolve > 0) {
        this.useMove(this.wildCreature, this.playerCreature, wildMove);
      }
    } else {
      this.useMove(this.wildCreature, this.playerCreature, wildMove);
      if (this.playerCreature.currentResolve > 0) {
        this.useMove(this.playerCreature, this.wildCreature, playerMove);
      }
    }

    // Pass turn
    this.turn = 'player';
  }

  flee() {
    this.log = ['Got away safely!'];
    this.endSpar();
  }

  befriend() {
    if (this.wildCreature && this.wildCreature.currentResolve === 0) {
      const saved: any = {
        id: this.wildCreature.id || `cr_${Date.now()}`,
        speciesId: this.wildCreature.genome.speciesId,
        level: this.wildCreature.level,
        currentResolve: this.wildCreature.maxResolve
      };
      
      let dest = 'Sanctuary';
      if (window.saveManager.state.party.length < 6) {
        window.saveManager.state.party.push(saved);
        dest = 'Party';
      } else {
        window.saveManager.state.sanctuary.push(saved);
      }
      
      window.saveManager.saveToLocalStorage();
      
      this.log.push(`You offered a Resonance Lure... ${this.wildCreature.genome.name} joined your ${dest}!`);
      this.endSpar();
      return true;
    }
    return false;
  }
}
