import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  PlayerUnit, 
  CraftHistoryEntry, 
  UnitType, 
  UNIT_DEFINITIONS, 
  STAR_MULTIPLIERS,
  RECIPES_MAP,
  ElementStone,
  StageId,
  BattleDropResult 
} from '../types/game';
import { sound } from '../utils/audio';

interface GameStats {
  victories: number;
  defeats: number;
  totalCrafts: number;
  enemiesDefeated: number;
  highestWave: number;
}

interface GameContextType {
  inventory: PlayerUnit[];
  activeDeck: string[];
  discoveredRecipes: string[];
  discoveredBestiary: UnitType[];
  craftHistory: CraftHistoryEntry[];
  stats: GameStats;
  materials: { B: number; G: number; R: number };
  isMuted: boolean;
  selectedStage: StageId;
  setSelectedStage: (stage: StageId) => void;
  lastDropResult: BattleDropResult | null;
  toggleMute: () => void;
  addToDeck: (unitId: string) => boolean;
  removeFromDeck: (unitId: string) => void;
  deleteUnit: (unitId: string) => void;
  unlockBestiaryEntry: (type: UnitType, playFeedback?: boolean) => void;
  synthesizeUnit: (slots: ElementStone[]) => { 
    success: boolean; 
    unit?: PlayerUnit; 
    reason?: string; 
  };
  recordBattleResult: (won: boolean, enemiesKilled: number, waveReached: number, stage: StageId) => BattleDropResult;
  refillMaterials: () => void;
  resetAllData: () => void;
}

const STORAGE_KEY = 'elfender_game_save_v1';

const INITIAL_STARTER_TYPES: UnitType[] = ['sunplant', 'melee', 'sniper'];

function generateInitialInventory(): { inventory: PlayerUnit[]; activeDeck: string[] } {
  const inv: PlayerUnit[] = INITIAL_STARTER_TYPES.map((type, idx) => ({
    id: `starter_${type}_${idx}`,
    type,
    stars: 1,
    timestamp: Date.now() + idx,
  }));
  return {
    inventory: inv,
    activeDeck: inv.map(i => i.id),
  };
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const isKnownType = (t: unknown): t is UnitType =>
  typeof t === 'string' && t in UNIT_DEFINITIONS;

// Lê o save uma única vez; cada estado inicial usa este objeto.
// Tropas que não existem mais no jogo são descartadas do save.
function loadSave(): Record<string, any> | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const data = JSON.parse(saved);
    if (Array.isArray(data.inventory)) {
      data.inventory = data.inventory.filter((u: PlayerUnit) => isKnownType(u?.type));
      const ids = new Set(data.inventory.map((u: PlayerUnit) => u.id));
      if (Array.isArray(data.activeDeck)) {
        data.activeDeck = data.activeDeck.filter((id: string) => ids.has(id));
      }
    }
    if (Array.isArray(data.discoveredRecipes)) {
      data.discoveredRecipes = data.discoveredRecipes.filter(isKnownType);
    }
    if (Array.isArray(data.discoveredBestiary)) {
      data.discoveredBestiary = data.discoveredBestiary.filter(isKnownType);
    }
    if (Array.isArray(data.craftHistory)) {
      data.craftHistory = data.craftHistory.filter((h: CraftHistoryEntry) => !h.type || isKnownType(h.type));
    }
    return data;
  } catch (e) {
    console.error('Failed to load save from storage', e);
    return null;
  }
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialData = generateInitialInventory();
  const [save] = useState(loadSave);

  const [inventory, setInventory] = useState<PlayerUnit[]>(() => {
    if (save) {
      if (Array.isArray(save.inventory) && save.inventory.length > 0) {
        return save.inventory;
      }
    }
    return initialData.inventory;
  });

  const [activeDeck, setActiveDeck] = useState<string[]>(() => {
    if (save) {
      if (Array.isArray(save.activeDeck) && Array.isArray(save.inventory) && save.inventory.length > 0) {
        return save.activeDeck;
      }
    }
    return initialData.activeDeck;
  });

  const [discoveredRecipes, setDiscoveredRecipes] = useState<string[]>(() => {
    if (save) {
      if (Array.isArray(save.discoveredRecipes)) {
        return save.discoveredRecipes;
      }
    }
    return [...INITIAL_STARTER_TYPES];
  });

  const [discoveredBestiary, setDiscoveredBestiary] = useState<UnitType[]>(() => {
    if (save) {
      if (Array.isArray(save.discoveredBestiary) && save.discoveredBestiary.length > 0) {
        return save.discoveredBestiary;
      }
    }
    return [...INITIAL_STARTER_TYPES];
  });

  useEffect(() => {
    // If inventory contains any unit types not yet in discoveredBestiary, include them
    setDiscoveredBestiary(prev => {
      const missing = inventory.map(i => i.type).filter(t => !prev.includes(t));
      if (missing.length > 0) {
        return [...prev, ...missing];
      }
      return prev;
    });
  }, [inventory]);

  const [craftHistory, setCraftHistory] = useState<CraftHistoryEntry[]>(() => {
    if (save) {
      if (Array.isArray(save.craftHistory)) {
        return save.craftHistory;
      }
    }
    return [];
  });

  const [materials, setMaterials] = useState<{ B: number; G: number; R: number }>(() => {
    if (save) {
      if (save.materials) return save.materials;
    }
    return { B: 10, G: 10, R: 10 };
  });

  const [selectedStage, setSelectedStage] = useState<StageId>(1);
  const [lastDropResult, setLastDropResult] = useState<BattleDropResult | null>(null);

  const [stats, setStats] = useState<GameStats>(() => {
    if (save) {
      if (save.stats) return save.stats;
    }
    return {
      victories: 0,
      defeats: 0,
      totalCrafts: 0,
      enemiesDefeated: 0,
      highestWave: 1,
    };
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      const m = localStorage.getItem('elfender_muted');
      return m === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    sound.muted = isMuted;
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('elfender_muted', String(next));
      sound.muted = next;
      return next;
    });
  };

  // Save to localStorage whenever critical state changes
  useEffect(() => {
    try {
      const data = {
        inventory,
        activeDeck,
        discoveredRecipes,
        discoveredBestiary,
        craftHistory,
        stats,
        materials,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save game state to storage', e);
    }
  }, [inventory, activeDeck, discoveredRecipes, discoveredBestiary, craftHistory, stats, materials]);

  const unlockBestiaryEntry = (type: UnitType, playFeedback: boolean = true) => {
    setDiscoveredBestiary(prev => {
      if (prev.includes(type)) return prev;
      if (playFeedback) {
        sound.playUnlock();
      }
      return [...prev, type];
    });
  };

  const addToDeck = (unitId: string): boolean => {
    if (activeDeck.includes(unitId)) return false;
    if (activeDeck.length >= 6) return false;
    setActiveDeck(prev => [...prev, unitId]);
    sound.playClick();
    return true;
  };

  const removeFromDeck = (unitId: string) => {
    setActiveDeck(prev => prev.filter(id => id !== unitId));
    sound.playClick();
  };

  const deleteUnit = (unitId: string) => {
    setInventory(prev => prev.filter(u => u.id !== unitId));
    setActiveDeck(prev => prev.filter(id => id !== unitId));
    sound.playClick();
  };

  const synthesizeUnit = (slots: ElementStone[]): { success: boolean; unit?: PlayerUnit; reason?: string } => {
    if (slots.length < 3) {
      return { success: false, reason: 'Selecione as 3 pedras rúnicas!' };
    }

    // Check material costs
    const requiredCounts: Record<ElementStone, number> = { B: 0, G: 0, R: 0 };
    slots.forEach(s => requiredCounts[s]++);

    if (materials.B < requiredCounts.B || materials.G < requiredCounts.G || materials.R < requiredCounts.R) {
      return { success: false, reason: 'Materiais insuficientes! Colete mais ou reabasteça.' };
    }

    // Deduct materials
    setMaterials(prev => ({
      B: prev.B - requiredCounts.B,
      G: prev.G - requiredCounts.G,
      R: prev.R - requiredCounts.R,
    }));

    const recipeCode = slots.join('');
    let matchingType: UnitType | null = null;

    // Find recipe match
    for (const [type, recipe] of Object.entries(RECIPES_MAP)) {
      if (recipe.join('') === recipeCode) {
        matchingType = type as UnitType;
        break;
      }
    }

    if (!matchingType) {
      // Invalid combination
      const failEntry: CraftHistoryEntry = {
        id: Math.random().toString(36).slice(2, 11),
        success: false,
        timestamp: Date.now(),
        recipeCode,
      };
      setCraftHistory(prev => [failEntry, ...prev.slice(0, 14)]);
      setStats(prev => ({ ...prev, totalCrafts: prev.totalCrafts + 1 }));
      sound.playForgeFail();
      return { success: false, reason: 'A energia rúnica se dissipou! Combinação instável desconhecida.' };
    }

    // 85% base success rate
    const isSuccess = Math.random() <= 0.85;
    if (!isSuccess) {
      const failEntry: CraftHistoryEntry = {
        id: Math.random().toString(36).slice(2, 11),
        success: false,
        timestamp: Date.now(),
        recipeCode,
      };
      setCraftHistory(prev => [failEntry, ...prev.slice(0, 14)]);
      setStats(prev => ({ ...prev, totalCrafts: prev.totalCrafts + 1 }));
      sound.playForgeFail();
      return { success: false, reason: 'Instabilidade na forja! Materiais fundiram incorretamente (15% falha).' };
    }

    // RNG for Star Rarity
    // 5⭐: 2%
    // 4⭐: 8%
    // 3⭐: 22%
    // 2⭐: 38%
    // 1⭐: 30%
    const rand = Math.random() * 100;
    let stars = 1;
    if (rand <= 2.5) stars = 5;
    else if (rand <= 10.5) stars = 4;
    else if (rand <= 32.5) stars = 3;
    else if (rand <= 70.0) stars = 2;
    else stars = 1;

    const newUnit: PlayerUnit = {
      id: `unit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: matchingType,
      stars,
      timestamp: Date.now(),
    };

    const unitDef = UNIT_DEFINITIONS[matchingType];
    const mult = STAR_MULTIPLIERS[stars];
    const finalHp = Math.floor(unitDef.baseHp * mult);
    const finalDmg = Math.floor(unitDef.dmg * mult);

    const successEntry: CraftHistoryEntry = {
      id: newUnit.id,
      success: true,
      type: matchingType,
      stars,
      hp: finalHp,
      dmg: finalDmg,
      timestamp: Date.now(),
      recipeCode,
    };

    setInventory(prev => [newUnit, ...prev]);
    setCraftHistory(prev => [successEntry, ...prev.slice(0, 14)]);
    setDiscoveredRecipes(prev => prev.includes(matchingType!) ? prev : [...prev, matchingType!]);
    unlockBestiaryEntry(matchingType, false);
    setStats(prev => ({ ...prev, totalCrafts: prev.totalCrafts + 1 }));

    sound.playForgeSuccess(stars);

    return { success: true, unit: newUnit };
  };

  const recordBattleResult = (
    won: boolean, 
    enemiesKilled: number, 
    waveReached: number,
    stage: StageId = 1
  ): BattleDropResult => {
    let dropped = false;
    let totalDropped = 0;
    const stonesReward: { B: number; G: number; R: number } = { B: 0, G: 0, R: 0 };

    if (won) {
      if (stage === 1) {
        // Fase 1: 50% de chance de dropar 1 pedra
        if (Math.random() < 0.5) {
          dropped = true;
          totalDropped = 1;
          const choices: ElementStone[] = ['B', 'G', 'R'];
          const picked = choices[Math.floor(Math.random() * choices.length)];
          stonesReward[picked] = 1;
        }
      } else if (stage === 2) {
        // Fase 2: 50% de chance de dropar 2 pedras
        if (Math.random() < 0.5) {
          dropped = true;
          totalDropped = 2;
          const choices: ElementStone[] = ['B', 'G', 'R'];
          for (let i = 0; i < 2; i++) {
            const picked = choices[Math.floor(Math.random() * choices.length)];
            stonesReward[picked] += 1;
          }
        }
      } else if (stage === 3) {
        // Fase 3: 100% de chance de dropar 100 pedras!
        dropped = true;
        totalDropped = 100;
        stonesReward.B = 33;
        stonesReward.G = 33;
        stonesReward.R = 34;
      }

      if (totalDropped > 0) {
        setMaterials(prev => ({
          B: prev.B + stonesReward.B,
          G: prev.G + stonesReward.G,
          R: prev.R + stonesReward.R,
        }));
      }
    }

    const dropResult: BattleDropResult = {
      won,
      stage,
      dropped,
      totalDropped,
      stones: stonesReward,
    };
    setLastDropResult(dropResult);

    setStats(prev => ({
      ...prev,
      victories: won ? prev.victories + 1 : prev.victories,
      defeats: won ? prev.defeats : prev.defeats + 1,
      enemiesDefeated: prev.enemiesDefeated + enemiesKilled,
      highestWave: Math.max(prev.highestWave, waveReached),
    }));

    return dropResult;
  };

  const refillMaterials = () => {
    setMaterials(prev => ({
      B: prev.B + 5,
      G: prev.G + 5,
      R: prev.R + 5,
    }));
    sound.playStoneAdd();
  };

  const resetAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = generateInitialInventory();
    setInventory(fresh.inventory);
    setActiveDeck(fresh.activeDeck);
    setDiscoveredRecipes([...INITIAL_STARTER_TYPES]);
    setDiscoveredBestiary([...INITIAL_STARTER_TYPES]);
    setCraftHistory([]);
    setMaterials({ B: 10, G: 10, R: 10 });
    setSelectedStage(1);
    setLastDropResult(null);
    setStats({
      victories: 0,
      defeats: 0,
      totalCrafts: 0,
      enemiesDefeated: 0,
      highestWave: 1,
    });
  };

  return (
    <GameContext.Provider
      value={{
        inventory,
        activeDeck,
        discoveredRecipes,
        discoveredBestiary,
        craftHistory,
        stats,
        materials,
        isMuted,
        selectedStage,
        setSelectedStage,
        lastDropResult,
        toggleMute,
        addToDeck,
        removeFromDeck,
        deleteUnit,
        unlockBestiaryEntry,
        synthesizeUnit,
        recordBattleResult,
        refillMaterials,
        resetAllData,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
