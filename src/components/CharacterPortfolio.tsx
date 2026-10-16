import React, { useState } from 'react';
import { 
  UnitType, 
  UNIT_DEFINITIONS, 
  RECIPES_MAP, 
  STAR_MULTIPLIERS, 
  ElementType,
  UnitCategory,
  ElementStone
} from '../types/game';
import { useGame } from '../context/GameContext';
import { sound } from '../utils/audio';
import { UnitSpriteCanvas, UnitIcon } from '../utils/unitSprites';
import { 
  ArrowLeft, 
  BookOpen, 
  Sparkles, 
  Shield, 
  Swords, 
  Heart, 
  Zap, 
  Lock, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Compass,
  Hammer
} from 'lucide-react';

interface CharacterPortfolioProps {
  onBack: () => void;
  onGoToCrafting?: () => void;
}

export const CharacterPortfolio: React.FC<CharacterPortfolioProps> = ({ 
  onBack, 
  onGoToCrafting 
}) => {
  const { discoveredBestiary, inventory } = useGame();

  const [categoryFilter, setCategoryFilter] = useState<'all' | UnitCategory>('all');
  const [elementFilter, setElementFilter] = useState<'all' | ElementType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType | null>(null);
  const [modalStar, setModalStar] = useState<number>(1);

  const allUnitTypes = Object.keys(UNIT_DEFINITIONS) as UnitType[];
  const totalCount = allUnitTypes.length;
  const unlockedCount = allUnitTypes.filter(t => discoveredBestiary.includes(t)).length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  // Filtered unit list
  const filteredTypes = allUnitTypes.filter(type => {
    const def = UNIT_DEFINITIONS[type];
    const isUnlocked = discoveredBestiary.includes(type);

    if (categoryFilter !== 'all' && def.category !== categoryFilter) return false;
    if (elementFilter !== 'all' && def.element !== elementFilter) return false;
    if (statusFilter === 'unlocked' && !isUnlocked) return false;
    if (statusFilter === 'locked' && isUnlocked) return false;

    return true;
  });

  const openDossier = (type: UnitType) => {
    const isUnlocked = discoveredBestiary.includes(type);
    if (!isUnlocked) {
      sound.playClick();
      return;
    }
    // Set default star to the highest star of this unit in player's inventory or 1
    const playerInstances = inventory.filter(u => u.type === type);
    const maxStar = playerInstances.length > 0 
      ? Math.max(...playerInstances.map(u => u.stars)) 
      : 1;

    setModalStar(maxStar);
    setSelectedUnitType(type);
    sound.playUnlock();
  };

  const closeModal = () => {
    setSelectedUnitType(null);
    sound.playClick();
  };

  const getElementBadgeColor = (elem: ElementType) => {
    switch (elem) {
      case 'Luz': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Floresta': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Arcano': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'Terra': return 'bg-lime-600/20 text-lime-300 border-lime-500/40';
      case 'Trovão': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'Gelo': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'Fogo': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'Sombra': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default: return 'bg-slate-700/20 text-slate-300 border-slate-600';
    }
  };

  const getHintForUnit = (type: UnitType): string => {
    switch (type) {
      case 'melee':
        return 'Dica Alquímica: Combine 3 pedras azuis (B + B + B) para invocar o Monstro.';
      case 'sniper':
        return 'Dica Alquímica: Combine 3 pedras verdes (G + G + G) para fazer brotar a Planta atiradora de longo alcance.';
      case 'sunplant':
        return 'Dica Alquímica: Combine 3 pedras vermelhas (R + R + R) para fazer brotar a Planta de Sol.';
      case 'peanut':
        return 'Dica Alquímica: Combine 2 pedras verdes e 1 vermelha (G + G + R) para criar o Peanut, o escudo da clareira.';
      case 'coconut':
        return 'Dica Alquímica: Combine 1 pedra verde e 2 vermelhas (G + R + R) para criar o Coconut, a catapulta que joga por cima do muro.';
      default:
        return 'Dica: Transmute pedras rúnicas na Forja Ancestral ou enfrente este guerreiro nas fases para revelar este dossiê!';
    }
  };

  const selectedDef = selectedUnitType ? UNIT_DEFINITIONS[selectedUnitType] : null;
  const selectedRecipe = selectedUnitType ? RECIPES_MAP[selectedUnitType] : null;
  const currentMultiplier = STAR_MULTIPLIERS[modalStar] || 1.0;
  const calculatedHp = selectedDef ? Math.floor(selectedDef.baseHp * currentMultiplier) : 0;
  const calculatedDmg = selectedDef ? Math.floor(selectedDef.dmg * currentMultiplier) : 0;

  // Inventory stats for this unit
  const playerCopies = selectedUnitType ? inventory.filter(u => u.type === selectedUnitType) : [];
  const highestOwnedStar = playerCopies.length > 0 ? Math.max(...playerCopies.map(u => u.stars)) : 0;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col py-6 px-4">
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Top Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sound.playClick();
                onBack();
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-850 text-slate-200 rounded-xl text-xs font-bold border border-slate-700/80 transition-all cursor-pointer shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Menu</span>
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <span className="font-cinzel text-lg font-bold text-slate-200">
                BESTIÁRIO & CÓDICE
              </span>
              <span className="text-xs text-slate-500 font-mono">v1.3</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onGoToCrafting && (
              <button
                onClick={() => {
                  sound.playClick();
                  onGoToCrafting();
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-fuchsia-950/70 hover:bg-fuchsia-900/80 text-fuchsia-300 rounded-xl text-xs font-bold border border-fuchsia-700/60 transition-all cursor-pointer shadow-md"
              >
                <Hammer className="w-4 h-4 text-fuchsia-400" />
                <span>Ir Para a Forja</span>
              </button>
            )}
          </div>
        </header>

        {/* Hero Section & Codex Progress */}
        <section className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-indigo-500 p-0.5 shadow-xl flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-3xl">
                📖
              </div>
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <h1 className="font-cinzel text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-emerald-200 to-teal-300">
                  Códice das Criaturas Ancestrais
                </h1>
                <span className="text-xs bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30 font-mono">
                  Bestiário
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                Enciclopédia tática das tropas e forças da floresta élfica. Revele silhuetas misteriosas forjando na Forja Ancestral ou enfrentando inimigos nas fases de combate!
              </p>
            </div>
          </div>

          {/* Collection Progress Bar */}
          <div className="w-full md:w-72 bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Coleção Revelada:</span>
              </span>
              <span className="font-mono font-bold text-amber-400">
                {unlockedCount} / {totalCount} ({progressPercent}%)
              </span>
            </div>

            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/40"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>{totalCount - unlockedCount} Silhuetas restantes</span>
              <span className="text-emerald-400 font-semibold">{unlockedCount === totalCount ? 'Coleção Completa!' : 'Em Descoberta'}</span>
            </div>
          </div>
        </section>

        {/* Filter Controls Bar */}
        <section className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
            <button
              onClick={() => { setStatusFilter('all'); sound.playClick(); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                statusFilter === 'all' 
                  ? 'bg-slate-700 text-white shadow-md' 
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas ({totalCount})
            </button>
            <button
              onClick={() => { setStatusFilter('unlocked'); sound.playClick(); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                statusFilter === 'unlocked' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950' 
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              Reveladas ({unlockedCount})
            </button>
            <button
              onClick={() => { setStatusFilter('locked'); sound.playClick(); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                statusFilter === 'locked' 
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950' 
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              Silhuetas ({totalCount - unlockedCount})
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Tipo:</span>
            <button
              onClick={() => { setCategoryFilter('all'); sound.playClick(); }}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                categoryFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => { setCategoryFilter('plant'); sound.playClick(); }}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                categoryFilter === 'plant' ? 'bg-amber-600 text-white' : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🌻</span>
              <span>Defesa Vegetal</span>
            </button>
            <button
              onClick={() => { setCategoryFilter('monster'); sound.playClick(); }}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                categoryFilter === 'monster' ? 'bg-rose-600 text-white' : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🐺</span>
              <span>Monstros de Linha</span>
            </button>
          </div>

          {/* Element Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Elemento:</span>
            {(['all', 'Luz', 'Floresta', 'Arcano', 'Terra', 'Trovão', 'Gelo', 'Fogo', 'Sombra'] as ('all' | ElementType)[]).map((elem) => (
              <button
                key={elem}
                onClick={() => { setElementFilter(elem); sound.playClick(); }}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  elementFilter === elem 
                    ? 'bg-slate-200 text-slate-950 shadow-sm' 
                    : 'bg-slate-950/40 text-slate-400 hover:text-slate-300'
                }`}
              >
                {elem === 'all' ? 'Todos' : elem}
              </button>
            ))}
          </div>
        </section>

        {/* Character Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTypes.map((type) => {
            const def = UNIT_DEFINITIONS[type];
            const isUnlocked = discoveredBestiary.includes(type);
            const recipe = RECIPES_MAP[type];
            const copies = inventory.filter(u => u.type === type);
            const maxStar = copies.length > 0 ? Math.max(...copies.map(u => u.stars)) : 0;

            if (isUnlocked) {
              return (
                <div
                  key={type}
                  onClick={() => openDossier(type)}
                  className="group relative bg-slate-900/90 hover:bg-slate-850 rounded-2xl border border-slate-800 hover:border-amber-500/60 p-4 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-[1.02] cursor-pointer flex flex-col justify-between gap-3 overflow-hidden"
                >
                  {/* Elemental Ambient Aura */}
                  <div 
                    className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"
                    style={{ backgroundColor: def.color }}
                  />

                  {/* Header Strip with Element Badge & Star Level */}
                  <div className="flex items-center justify-between gap-2 relative z-10">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono ${getElementBadgeColor(def.element)}`}>
                      {def.element}
                    </span>

                    {maxStar > 0 ? (
                      <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/40 flex items-center gap-1">
                        <span>★</span>
                        <span>{maxStar}★ na Bolsa</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">
                        Ainda não forjada
                      </span>
                    )}
                  </div>

                  {/* Avatar & Hero Identity */}
                  <div className="flex items-center gap-3 relative z-10 my-1">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border relative shrink-0 transition-transform group-hover:scale-105 overflow-hidden"
                      style={{ 
                        backgroundColor: `${def.color}15`,
                        borderColor: `${def.color}40`,
                      }}
                    >
                      <UnitSpriteCanvas type={type} stars={Math.max(1, maxStar)} size={48} />
                    </div>

                    <div className="flex flex-col text-left overflow-hidden">
                      <h3 className="font-bold text-sm text-slate-100 group-hover:text-amber-200 transition-colors truncate">
                        {def.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 truncate">
                        {def.title}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {def.res === 'sun' ? `${def.cost} Sol ☀️` : `${def.cost} Carne 🥩`}
                      </span>
                    </div>
                  </div>

                  {/* Quick Stat Bar */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/80 rounded-xl p-2 border border-slate-850/80 text-[11px] relative z-10">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Heart className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>HP: <strong className="text-emerald-300 font-mono">{def.baseHp}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>ATK: <strong className="text-rose-300 font-mono">{def.dmg}</strong></span>
                    </div>
                  </div>

                  {/* Recipe Runes & Click CTA */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] relative z-10">
                    <div className="flex items-center gap-1 font-mono">
                      <span className="text-[10px] text-slate-500">Forja:</span>
                      {recipe.map((stone: ElementStone, i: number) => (
                        <span 
                          key={i} 
                          className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shadow-sm ${
                            stone === 'B' ? 'bg-blue-500 text-slate-950' : stone === 'G' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-slate-950'
                          }`}
                        >
                          {stone}
                        </span>
                      ))}
                    </div>

                    <span className="text-amber-400 group-hover:text-amber-300 font-semibold text-[10px] flex items-center gap-1">
                      <span>Dossiê</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              );
            } else {
              // Silhouette Card (Locked / Mystical Shadow)
              return (
                <div
                  key={type}
                  className="relative bg-slate-950/90 rounded-2xl border border-slate-800/80 p-4 flex flex-col justify-between gap-3 overflow-hidden shadow-inner opacity-80 hover:opacity-100 transition-all border-dashed"
                >
                  {/* Locked Badge */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 font-mono flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-500" />
                      <span>Silhueta Oculta</span>
                    </span>

                    <span className="text-[10px] font-mono text-slate-500">
                      Elemento: ???
                    </span>
                  </div>

                  {/* Mystical Dark Shadow Avatar */}
                  <div className="flex items-center gap-3 my-1">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-center relative shadow-inner shrink-0 group">
                      {/* Dark silhouette filter with question mark */}
                      <UnitIcon type={type} size={34} className="filter grayscale brightness-0 opacity-20 select-none" />
                      <HelpCircle className="w-5 h-5 text-amber-500/70 absolute animate-pulse" />
                    </div>

                    <div className="flex flex-col text-left">
                      <h3 className="font-bold text-sm text-slate-400 font-mono">
                        ??? Desconhecido
                      </h3>
                      <p className="text-[10px] text-slate-500 italic mt-0.5">
                        Ainda não enfrentado ou forjado
                      </p>
                    </div>
                  </div>

                  {/* Mysterious Hint Box */}
                  <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/60 text-[11px] text-slate-400 leading-snug">
                    <p className="line-clamp-3 italic text-[10px] text-slate-400">
                      {getHintForUnit(type)}
                    </p>
                  </div>

                  {/* How to unlock footer */}
                  <div className="pt-1 border-t border-slate-900 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Desbloqueio:</span>
                    <strong className="text-amber-400/90 font-medium">Forja ou Batalha</strong>
                  </div>
                </div>
              );
            }
          })}
        </section>

        {/* Modal: Detailed Creature Dossier / Lore & Calculator */}
        {selectedDef && selectedRecipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div 
              className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
              style={{
                boxShadow: `0 0 50px ${selectedDef.color}25`
              }}
            >
              {/* Close Button */}
              <button
                onClick={closeModal}
                className="absolute top-5 right-5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full transition-colors cursor-pointer border border-slate-700"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Dossier Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-slate-800 pb-4 pr-10">
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl border relative shrink-0 overflow-hidden"
                  style={{
                    backgroundColor: `${selectedDef.color}20`,
                    borderColor: `${selectedDef.color}50`
                  }}
                >
                  <UnitSpriteCanvas type={selectedDef.type} stars={modalStar} size={72} />
                  <div 
                    className="absolute -inset-1 rounded-2xl blur-lg opacity-30 -z-10"
                    style={{ backgroundColor: selectedDef.color }}
                  />
                </div>

                <div className="flex flex-col text-left">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="font-cinzel text-2xl font-black text-white">
                      {selectedDef.name}
                    </h2>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border font-mono ${getElementBadgeColor(selectedDef.element)}`}>
                      Elemento {selectedDef.element}
                    </span>
                  </div>
                  <p className="text-xs text-amber-300 font-semibold font-mono tracking-wide">
                    {selectedDef.title}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>Categoria: <strong className="text-slate-200">{selectedDef.category === 'plant' ? 'Defesa Vegetal' : 'Monstro de Linha'}</strong></span>
                    <span>Custo: <strong className="text-slate-200">{selectedDef.cost} {selectedDef.res === 'sun' ? 'Sol' : 'Carne'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Lore / Biografia Mitológica */}
              <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800/90 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <BookOpen className="w-4 h-4" />
                  <span>Crônicas e Origem na Floresta Élfica</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "{selectedDef.lore}"
                </p>
              </div>

              {/* Interactive Star Calculator (1★ to 5★) */}
              <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Calculadora de Atributos por Estrelas
                    </span>
                  </div>
                  <span className="text-xs font-mono text-yellow-400 font-bold">
                    Multiplicador: {currentMultiplier}x
                  </span>
                </div>

                {/* Star Selector Buttons */}
                <div className="grid grid-cols-5 gap-2">
                  {([1, 2, 3, 4, 5]).map((starNum) => {
                    const isSelected = modalStar === starNum;
                    const mult = STAR_MULTIPLIERS[starNum];
                    return (
                      <button
                        key={starNum}
                        onClick={() => {
                          setModalStar(starNum);
                          sound.playClick();
                        }}
                        className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-950/80 border-amber-500 shadow-lg shadow-amber-950/80 ring-1 ring-amber-400 scale-[1.02]'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <span className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-slate-300'}`}>
                          {'★'.repeat(starNum)}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                          {mult}x
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Scaled Attribute Gauges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-900 text-xs">
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-850 flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Vida Máxima (HP)</span>
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <strong className="text-lg font-mono font-black text-emerald-300">
                        {calculatedHp}
                      </strong>
                      <span className="text-[10px] text-slate-500 font-mono">
                        (Base: {selectedDef.baseHp})
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-850 flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Swords className="w-3.5 h-3.5 text-rose-400" />
                      <span>Dano por Ataque (ATK)</span>
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <strong className="text-lg font-mono font-black text-rose-300">
                        {calculatedDmg}
                      </strong>
                      <span className="text-[10px] text-slate-500 font-mono">
                        (Base: {selectedDef.dmg})
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-850 flex flex-col gap-1 col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-blue-400" />
                      <span>Cadência de Ação</span>
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <strong className="text-lg font-mono font-black text-blue-300">
                        {(selectedDef.attackInterval / 1000).toFixed(1)}s
                      </strong>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {selectedDef.speed > 0 ? `Vel. ${selectedDef.speed}` : 'Estacionária'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tactical Strategy Role */}
              <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Shield className="w-4 h-4" />
                  <span>Função Tática no Tabuleiro</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedDef.tacticalRole}
                </p>
              </div>

              {/* Synthesis Recipe Sequence */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/90 rounded-2xl p-4 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-200">Fórmula de Síntese na Forja:</span>
                    <span className="text-[10px] text-slate-400">Combine a sequência exata de pedras rúnicas</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {selectedRecipe.map((stone: ElementStone, idx: number) => (
                      <span
                        key={idx}
                        className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center font-mono shadow-md ${
                          stone === 'B' 
                            ? 'bg-blue-600 text-white shadow-blue-900/50' 
                            : stone === 'G' 
                            ? 'bg-emerald-600 text-white shadow-emerald-900/50' 
                            : 'bg-rose-600 text-white shadow-rose-900/50'
                        }`}
                      >
                        {stone}
                      </span>
                    ))}
                  </div>
                </div>

                {onGoToCrafting && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      onGoToCrafting();
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Hammer className="w-4 h-4" />
                    <span>Forjar Esta Tropa Agora</span>
                  </button>
                )}
              </div>

              {/* Status on Player's Squad */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-850">
                <span>
                  Cópias em sua equipe: <strong className="text-white font-mono">{playerCopies.length}</strong>
                </span>
                {highestOwnedStar > 0 && (
                  <span className="text-amber-400 font-mono font-bold">
                    Maior Raridade Conquistada: {'★'.repeat(highestOwnedStar)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
