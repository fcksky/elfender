import React, { useState } from 'react';
import { 
  ElementStone, 
  UNIT_DEFINITIONS, 
  RECIPES_MAP, 
  UnitType, 
  STAR_MULTIPLIERS,
  PlayerUnit
} from '../types/game';
import { useGame } from '../context/GameContext';
import { sound } from '../utils/audio';
import { UnitSpriteCanvas, UnitIcon } from '../utils/unitSprites';
import { Sparkles, ArrowLeft, RotateCcw, BookOpen, Clock, PlusCircle } from 'lucide-react';

interface CraftingScreenProps {
  onBack: () => void;
  onGoToDeck: () => void;
  onGoToPortfolio?: () => void;
}

export const CraftingScreen: React.FC<CraftingScreenProps> = ({ 
  onBack, 
  onGoToDeck,
  onGoToPortfolio 
}) => {
  const { 
    materials, 
    discoveredRecipes, 
    craftHistory, 
    synthesizeUnit, 
    refillMaterials 
  } = useGame();

  const [slots, setSlots] = useState<ElementStone[]>([]);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    unit?: PlayerUnit;
    reason?: string;
  } | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const addStone = (stone: ElementStone) => {
    if (slots.length >= 3) return;
    if (materials[stone] <= 0) return;
    sound.playStoneAdd();
    setSlots(prev => [...prev, stone]);
    setLastResult(null);
  };

  const removeSlot = (index: number) => {
    sound.playClick();
    setSlots(prev => prev.filter((_, i) => i !== index));
    setLastResult(null);
  };

  const clearSlots = () => {
    sound.playClick();
    setSlots([]);
    setLastResult(null);
  };

  const autoFillRecipe = (type: UnitType) => {
    const recipe = RECIPES_MAP[type];
    if (!recipe) return;
    sound.playStoneAdd();
    setSlots([...recipe]);
    setLastResult(null);
  };

  const handleSynthesize = () => {
    if (slots.length < 3) return;
    setIsSynthesizing(true);
    sound.playClick();

    setTimeout(() => {
      const result = synthesizeUnit(slots);
      setLastResult(result);
      setIsSynthesizing(false);
      if (result.success) {
        setSlots([]);
      }
    }, 400);
  };

  const getStoneDetails = (stone: ElementStone) => {
    switch (stone) {
      case 'B':
        return {
          name: 'Pedra Azul',
          element: 'Cosmo / Arcano',
          bg: 'bg-blue-600',
          border: 'border-blue-400',
          shadow: 'shadow-blue-500/50',
          text: 'text-blue-300',
          iconColor: 'bg-blue-400',
        };
      case 'G':
        return {
          name: 'Pedra Verde',
          element: 'Natureza / Vida',
          bg: 'bg-emerald-600',
          border: 'border-emerald-400',
          shadow: 'shadow-emerald-500/50',
          text: 'text-emerald-300',
          iconColor: 'bg-emerald-400',
        };
      case 'R':
        return {
          name: 'Pedra Vermelha',
          element: 'Fogo / Fúria',
          bg: 'bg-rose-600',
          border: 'border-rose-400',
          shadow: 'shadow-rose-500/50',
          text: 'text-rose-300',
          iconColor: 'bg-rose-400',
        };
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold transition-colors border border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Menu</span>
        </button>

        <div className="text-center">
          <h1 className="font-cinzel text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-indigo-300 tracking-wide">
            FORJA ANCESTRAL
          </h1>
          <p className="text-xs text-slate-400">Combine 3 pedras rúnicas para despertar guerreiros e defesas ancestrais</p>
        </div>

        <div className="flex items-center gap-2">
          {onGoToPortfolio && (
            <button
              onClick={onGoToPortfolio}
              className="flex items-center gap-2 px-3 py-2 bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 rounded-lg text-xs font-semibold transition-colors border border-amber-600/50 cursor-pointer shadow-md"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Bestiário & Lore</span>
            </button>
          )}

          <button
            onClick={onGoToDeck}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <span>Ver Meu Deck</span>
          </button>
        </div>
      </div>

      {/* Main Forge Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Stones & Materials */}
        <div className="lg:col-span-3 bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Pedras Rúnicas</h2>
            <span className="text-xs text-amber-400 font-semibold font-mono">
              Consome 3 por craft
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {(['B', 'G', 'R'] as ElementStone[]).map((stone) => {
              const details = getStoneDetails(stone);
              const count = materials[stone];
              const isAvailable = count > 0;

              return (
                <button
                  key={stone}
                  onClick={() => addStone(stone)}
                  disabled={!isAvailable || slots.length >= 3}
                  className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    isAvailable && slots.length < 3
                      ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 hover:border-slate-500 cursor-pointer shadow-md'
                      : 'bg-slate-950/50 border-slate-850 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${details.iconColor} shadow-[0_0_12px_currentColor] flex items-center justify-center font-bold text-slate-950 text-xs`}>
                      {stone}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-slate-100">{details.name}</div>
                      <div className="text-[11px] text-slate-400">{details.element}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-300 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                      {count} disp.
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-300 block mb-1">Sistema de Farming:</span>
            Cada tentativa consome 3 pedras do seu inventário. Para farmar mais pedras, vença as batalhas nas Fases 1, 2 e 3 no Campo de Batalha!
          </div>
        </div>

        {/* Center Column: Altar & Crucible */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900/95 rounded-2xl border border-slate-800 p-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-radial from-fuchsia-950/20 via-transparent to-transparent pointer-events-none" />

            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-slate-100 font-cinzel">Cadinho de Transmutação</h2>
              <div className="flex items-center justify-center gap-2 mt-1 text-xs text-slate-400">
                <span>Chance de Sucesso: <strong className="text-emerald-400 font-semibold">85%</strong></span>
                <span>·</span>
                <span>Raridade: <strong className="text-yellow-400 font-semibold">1★ a 5★</strong></span>
              </div>
            </div>

            {/* 3 Rune Slots */}
            <div className="flex items-center justify-center gap-4 my-4">
              {[0, 1, 2].map((idx) => {
                const stone = slots[idx];
                const details = stone ? getStoneDetails(stone) : null;

                return (
                  <div
                    key={idx}
                    onClick={() => stone && removeSlot(idx)}
                    className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative ${
                      details
                        ? `${details.border} bg-slate-950 shadow-lg ${details.shadow} cursor-pointer hover:scale-105`
                        : 'border-slate-800 border-dashed bg-slate-950/40 text-slate-600'
                    }`}
                  >
                    {details ? (
                      <>
                        <div className={`w-10 h-10 rounded-full ${details.iconColor} shadow-[0_0_16px_currentColor] flex items-center justify-center font-bold text-slate-950 text-sm`} />
                        <span className="text-[10px] font-mono mt-1 text-slate-300 font-semibold">Slot {idx + 1}</span>
                        <span className="text-[9px] text-rose-400 opacity-0 hover:opacity-100 absolute -top-2 -right-2 bg-slate-900 border border-slate-700 px-1 rounded-full">×</span>
                      </>
                    ) : (
                      <span className="text-xs font-mono font-medium text-slate-600">Vazio</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-4 w-full max-w-xs">
              <button
                onClick={clearSlots}
                disabled={slots.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>

              <button
                onClick={handleSynthesize}
                disabled={slots.length < 3 || isSynthesizing}
                className={`flex-2 flex items-center justify-center gap-2 py-2.5 px-6 font-bold text-xs rounded-xl shadow-lg transition-all ${
                  slots.length === 3 && !isSynthesizing
                    ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-fuchsia-900/50 hover:scale-[1.02] cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSynthesizing ? 'Fundindo...' : 'Sintetizar Tropa'}</span>
              </button>
            </div>

            {/* Last Result Box */}
            {lastResult && (
              <div className={`mt-6 w-full p-4 rounded-xl border transition-all ${
                lastResult.success 
                  ? 'bg-slate-950/90 border-emerald-500/50 text-slate-200' 
                  : 'bg-slate-950/90 border-rose-500/40 text-slate-300'
              }`}>
                {lastResult.success && lastResult.unit ? (
                  (() => {
                    const uDef = UNIT_DEFINITIONS[lastResult.unit.type];
                    const mult = STAR_MULTIPLIERS[lastResult.unit.stars];
                    const hp = Math.floor(uDef.baseHp * mult);
                    const dmg = Math.floor(uDef.dmg * mult);

                    return (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                            Síntese Concluída com Sucesso!
                          </span>
                          <span className="text-yellow-400 text-xs font-bold tracking-widest">
                            {'★'.repeat(lastResult.unit.stars)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 flex items-center justify-center overflow-hidden">
                            <UnitSpriteCanvas type={lastResult.unit.type} stars={lastResult.unit.stars} size={48} />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{uDef.name}</div>
                            <div className="text-xs text-slate-400">{uDef.desc}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-900/90 p-2 rounded-lg border border-slate-800 mt-1">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Vida (HP)</span>
                            <span className="font-bold text-emerald-400 font-mono">{hp}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Ataque (ATK)</span>
                            <span className="font-bold text-rose-400 font-mono">{dmg}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Custo</span>
                            <span className="font-bold text-amber-400 font-mono">{uDef.cost} {uDef.res === 'sun' ? '☀️' : '🥩'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-2">
                    <span className="text-rose-400 font-bold text-xs block mb-1">Falha na Síntese!</span>
                    <p className="text-[11px] text-slate-400">{lastResult.reason}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recipe Book / Portfolio */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-fuchsia-400" />
                <h3 className="text-sm font-bold text-slate-200">Grimório de Fórmulas Descobertas</h3>
              </div>
              <span className="text-xs text-slate-400">
                {discoveredRecipes.length} / {Object.keys(RECIPES_MAP).length} fórmulas
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {Object.keys(RECIPES_MAP).map((typeKey) => {
                const type = typeKey as UnitType;
                const isKnown = discoveredRecipes.includes(type);
                const uDef = UNIT_DEFINITIONS[type];
                const recipeStones = RECIPES_MAP[type];

                return (
                  <button
                    key={type}
                    onClick={() => isKnown && autoFillRecipe(type)}
                    disabled={!isKnown}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      isKnown
                        ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 hover:border-fuchsia-500/50 cursor-pointer'
                        : 'bg-slate-950/40 border-slate-900 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {isKnown ? <UnitIcon type={type} size={30} /> : <span className="text-xl">❓</span>}
                      <div className="flex gap-0.5">
                        {recipeStones.map((s, i) => (
                          <span
                            key={i}
                            className={`w-3.5 h-3.5 rounded-full text-[9px] font-bold flex items-center justify-center ${
                              s === 'B' ? 'bg-blue-500 text-slate-950' : s === 'G' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-slate-950'
                            }`}
                          >
                            {isKnown ? s : '?'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-200 truncate mt-1">
                      {isKnown ? uDef.name : 'Fórmula Oculta'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isKnown ? (uDef.res === 'sun' ? `${uDef.cost} Sol` : `${uDef.cost} Carne`) : 'Transmute para descobrir'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Craft History Log */}
        <div className="lg:col-span-4 bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-200">Histórico de Transmutações</h3>
          </div>

          <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
            {craftHistory.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-12 italic">
                Nenhuma síntese recente nesta sessão.
              </div>
            ) : (
              craftHistory.map((item) => {
                if (item.success && item.type) {
                  const uDef = UNIT_DEFINITIONS[item.type];
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <UnitIcon type={item.type} size={18} />
                          <span>{uDef.name}</span>
                        </span>
                        <span className="text-yellow-400 font-bold font-mono">
                          {'★'.repeat(item.stars || 1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                        <span>HP: <strong className="text-emerald-300 font-mono">{item.hp}</strong></span>
                        <span>ATK: <strong className="text-rose-300 font-mono">{item.dmg}</strong></span>
                        <span className="font-mono text-slate-500">[{item.recipeCode}]</span>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-rose-950/40 text-xs flex items-center justify-between text-slate-400"
                    >
                      <span className="text-rose-400 font-semibold">Falha na Fusão</span>
                      <span className="text-[10px] font-mono text-slate-500">[{item.recipeCode}]</span>
                    </div>
                  );
                }
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
