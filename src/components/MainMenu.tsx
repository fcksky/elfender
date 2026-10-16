import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Play, 
  Shield, 
  Sparkles, 
  BookOpen, 
  Volume2, 
  VolumeX, 
  Trophy, 
  Swords, 
  RotateCcw,
  Zap,
  Flame,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { sound } from '../utils/audio';
import { StageId, STAGE_CONFIGS, UNIT_DEFINITIONS } from '../types/game';

interface MainMenuProps {
  onStartGame: () => void;
  onGoToDeck: () => void;
  onGoToCrafting: () => void;
  onGoToGuide: () => void;
  onGoToPortfolio: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onGoToDeck,
  onGoToCrafting,
  onGoToGuide,
  onGoToPortfolio,
}) => {
  const { 
    activeDeck, 
    stats, 
    materials, 
    isMuted, 
    toggleMute, 
    resetAllData,
    selectedStage,
    setSelectedStage,
    discoveredBestiary
  } = useGame();

  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = () => {
    if (confirmReset) {
      resetAllData();
      setConfirmReset(false);
      sound.playDefeat();
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
    }
  };

  const currentStageConfig = STAGE_CONFIGS[selectedStage];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between py-6 px-4 bg-radial from-slate-900 via-slate-950 to-slate-950 text-slate-100">
      {/* Top Header Utilities */}
      <header className="w-full max-w-5xl flex items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <span className="font-cinzel text-xl font-bold tracking-wider text-slate-200">
            ELFENDER
          </span>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            v1.3 · Farming & Fases
          </span>
        </div>

        {/* Resources Preview & Audio */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-blue-400 font-bold">{materials.B} 🔵</span>
            <span className="text-emerald-400 font-bold">{materials.G} 🟢</span>
            <span className="text-rose-400 font-bold">{materials.R} 🔴</span>
          </div>

          <button
            onClick={toggleMute}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-colors cursor-pointer"
            title={isMuted ? 'Ativar Sons' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Hero Title & Farming Stage Selection */}
      <main className="w-full max-w-2xl flex flex-col items-center text-center my-auto py-4">
        {/* Emblem */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 p-0.5 shadow-2xl shadow-indigo-500/20 mb-3 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-3xl">
            🧙‍♂️
          </div>
        </div>

        <h1 className="font-cinzel text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 tracking-wider mb-1">
          ELFENDER
        </h1>
        <p className="text-xs font-semibold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 uppercase mb-2">
          Forja Alquímica & Combate em Pistas
        </p>
        <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          Farme pedras rúnicas vencendo batalhas e forje tropas lendárias de até 5 estrelas!
        </p>

        {/* Stage Farming Selector Card */}
        <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Selecione a Fase de Farming:</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Dificuldade Progressiva</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as StageId[]).map((stId) => {
              const conf = STAGE_CONFIGS[stId];
              const isSelected = selectedStage === stId;

              return (
                <button
                  key={stId}
                  onClick={() => {
                    setSelectedStage(stId);
                    sound.playClick();
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer ${
                    isSelected
                      ? stId === 3
                        ? 'bg-rose-950/80 border-rose-500 shadow-lg shadow-rose-950/70 ring-1 ring-rose-500/50 scale-[1.02]'
                        : stId === 2
                        ? 'bg-amber-950/80 border-amber-500 shadow-lg shadow-amber-950/70 ring-1 ring-amber-500/50 scale-[1.02]'
                        : 'bg-emerald-950/80 border-emerald-500 shadow-lg shadow-emerald-950/70 ring-1 ring-emerald-500/50 scale-[1.02]'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-1 text-xs font-bold mb-1">
                    {stId === 3 ? <Flame className="w-3.5 h-3.5 text-rose-400" /> : (stId === 2 ? <Zap className="w-3.5 h-3.5 text-amber-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />)}
                    <span className={isSelected ? 'text-white' : 'text-slate-300'}>Fase {stId}</span>
                  </div>

                  <span className={`text-[10px] font-semibold block leading-tight ${
                    stId === 3 ? 'text-rose-300' : (stId === 2 ? 'text-amber-300' : 'text-emerald-300')
                  }`}>
                    {conf.badge}
                  </span>

                  <span className="text-[9px] text-slate-400 font-mono mt-1">
                    {stId === 3 ? '100% de 100 pedras' : (stId === 2 ? '50% de 2 pedras' : '50% de 1 pedra')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Details of Selected Stage */}
          <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-850 text-left text-xs flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-200">
              <strong className="font-semibold text-white">{currentStageConfig.name}</strong>
              <span className="text-[10px] text-amber-400 font-mono font-bold">
                Portão: {currentStageConfig.enemyGateHp} HP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              {currentStageConfig.aiDesc}
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] text-slate-300">
              <span>Nível Inimigo: <strong className="text-yellow-400">{currentStageConfig.starLevel}</strong></span>
              <span>Drop: <strong className="text-emerald-400">{currentStageConfig.dropRateText}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3 max-w-sm">
          <button
            onClick={() => {
              sound.playClick();
              onStartGame();
            }}
            disabled={activeDeck.length === 0}
            className={`w-full py-4 px-6 text-white font-extrabold text-sm rounded-xl shadow-xl border transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer ${
              selectedStage === 3
                ? 'bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 border-rose-400/40 shadow-rose-950/60'
                : selectedStage === 2
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border-amber-400/40 shadow-amber-950/60'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-400/30 shadow-emerald-950/60'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>JOGAR FASE {selectedStage} ({currentStageConfig.badge.toUpperCase()})</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onGoToDeck();
            }}
            className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700/80 hover:border-indigo-500/60 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5 shadow-md cursor-pointer"
          >
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>MONTAR EQUIPE ({activeDeck.length}/6)</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onGoToCrafting();
            }}
            className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700/80 hover:border-fuchsia-500/60 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5 shadow-md cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            <span>FORJA ANCESTRAL (CRAFTING)</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onGoToPortfolio();
            }}
            className="w-full py-3 px-6 bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/70 hover:from-amber-900/80 hover:to-indigo-900/80 text-amber-200 hover:text-white font-bold text-xs rounded-xl border border-amber-500/40 hover:border-amber-400/80 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between shadow-lg cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>PORTFÓLIO DE PERSONAGENS (BESTIÁRIO)</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {discoveredBestiary.length}/{Object.keys(UNIT_DEFINITIONS).length}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onGoToGuide();
            }}
            className="w-full py-2.5 px-6 bg-slate-950 hover:bg-slate-900 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-teal-400" />
            <span>GRIMÓRIO & GUIA DE ESTRATÉGIAS</span>
          </button>
        </div>
      </main>

      {/* Bottom Career Stats Strip */}
      <footer className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-850 pt-4 text-xs text-slate-400">
        <div className="flex flex-wrap items-center justify-center gap-6">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span>Vitórias: <strong className="text-slate-200 font-mono">{stats.victories}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            <span>Inimigos Batidos: <strong className="text-slate-200 font-mono">{stats.enemiesDefeated}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Transmutações: <strong className="text-slate-200 font-mono">{stats.totalCrafts}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Maior Onda: <strong className="text-emerald-300 font-mono">{stats.highestWave}</strong></span>
          </div>
        </div>

        <button
          onClick={handleReset}
          className={`flex items-center gap-1 text-[11px] transition-colors cursor-pointer ${
            confirmReset ? 'text-rose-400 font-bold' : 'text-slate-600 hover:text-slate-400'
          }`}
          title="Reiniciar todo o progresso do jogo"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{confirmReset ? 'Confirmar Reset?' : 'Resetar Dados'}</span>
        </button>
      </footer>
    </div>
  );
};
