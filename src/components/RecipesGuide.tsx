import React from 'react';
import { UNIT_DEFINITIONS, RECIPES_MAP, UnitType, STAR_MULTIPLIERS } from '../types/game';
import { UnitIcon } from '../utils/unitSprites';
import { ArrowLeft, BookOpen, Shield, Flame, Sparkles } from 'lucide-react';

interface RecipesGuideProps {
  onBack: () => void;
  onGoToCrafting: () => void;
  onGoToPortfolio?: () => void;
}

export const RecipesGuide: React.FC<RecipesGuideProps> = ({ 
  onBack, 
  onGoToCrafting,
  onGoToPortfolio 
}) => {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold transition-colors border border-slate-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Menu</span>
        </button>

        <div className="text-center">
          <h1 className="font-cinzel text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 tracking-wide">
            GRIMÓRIO & GUIA DE RECEITAS
          </h1>
          <p className="text-xs text-slate-400">Guia de alquimia elemental e manual tático de combate</p>
        </div>

        <div className="flex items-center gap-2">
          {onGoToPortfolio && (
            <button
              onClick={onGoToPortfolio}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 rounded-lg text-xs font-semibold transition-colors border border-amber-600/50 cursor-pointer shadow-md"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Ver Bestiário</span>
            </button>
          )}

          <button
            onClick={onGoToCrafting}
            className="flex items-center gap-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-fuchsia-600/30 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ir para a Forja</span>
          </button>
        </div>
      </div>

      {/* Rarity & Star System Card */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span>Sistema de Estrelas & Multiplicadores de Poder</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((stars) => {
            const mult = STAR_MULTIPLIERS[stars];
            const percentBonus = Math.round((mult - 1) * 100);
            return (
              <div key={stars} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center flex flex-col gap-1">
                <span className="text-yellow-400 text-xs font-mono font-bold tracking-widest">
                  {'★'.repeat(stars)}
                </span>
                <span className="text-sm font-bold text-slate-100 font-mono">{mult}x Stats</span>
                <span className="text-[10px] text-emerald-400">
                  {percentBonus > 0 ? `+${percentBonus}% HP & Dano` : 'Atributos Base'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Farming System Guide Card */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col gap-3">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Sistema de Farming de Pedras Rúnicas (3 Fases)</span>
        </h2>
        <p className="text-xs text-slate-400">
          Você começa com 10 pedras de cada elemento. Cada tentativa de síntese na forja consome 3 pedras. Para conseguir mais, você deve vencer as fases de combate:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-900/50 flex flex-col justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Fase 1 - Fácil</span>
              <span className="text-[11px] text-slate-300 font-semibold">IA Iniciante (1★)</span>
              <p className="text-[11px] text-slate-400 mt-1">Usa apenas tropas básicas de 1 estrela. Não utiliza magias.</p>
            </div>
            <div className="bg-emerald-950/60 text-emerald-300 font-mono text-xs font-bold p-2 rounded-lg text-center border border-emerald-900/60">
              50% chance de dropar 1 pedra
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-900/50 flex flex-col justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Fase 2 - Intermediário</span>
              <span className="text-[11px] text-slate-300 font-semibold">IA Estrategista (2~4★)</span>
              <p className="text-[11px] text-slate-400 mt-1">Usa tropas avançadas de 2 a 4 estrelas. Conjura magias de Cura e Meteoro em momentos oportunos.</p>
            </div>
            <div className="bg-amber-950/60 text-amber-300 font-mono text-xs font-bold p-2 rounded-lg text-center border border-amber-900/60">
              50% chance de dropar 2 pedras
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-rose-900/50 flex flex-col justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">Fase 3 - Pesadelo</span>
              <span className="text-[11px] text-slate-300 font-semibold">IA Expert (Todas 5★)</span>
              <p className="text-[11px] text-slate-400 mt-1">Desafio supremo: todas as tropas inimigas são 5 estrelas lendárias com magias agressivas constantes!</p>
            </div>
            <div className="bg-rose-950/60 text-rose-300 font-mono text-xs font-bold p-2 rounded-lg text-center border border-rose-900/60">
              100% chance de dropar 100 pedras!
            </div>
          </div>
        </div>
      </div>

      {/* Complete Unit & Recipe Registry */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col gap-4">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span>Fórmulas Alquímicas de Invocação</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.keys(RECIPES_MAP).map((typeKey) => {
            const type = typeKey as UnitType;
            const uDef = UNIT_DEFINITIONS[type];
            const recipeStones = RECIPES_MAP[type];

            return (
              <div
                key={type}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <UnitIcon type={type} size={38} />
                      <div>
                        <h3 className="text-sm font-bold text-white">{uDef.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          uDef.category === 'plant' ? 'bg-emerald-950/80 text-emerald-300' : 'bg-rose-950/80 text-rose-300'
                        }`}>
                          {uDef.category === 'plant' ? 'Defesa / Planta Estática' : 'Monstro / Atacante de Avanço'}
                        </span>
                      </div>
                    </div>

                    {/* Stone Recipe Combination */}
                    <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      {recipeStones.map((s, idx) => (
                        <span
                          key={idx}
                          className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center font-mono ${
                            s === 'B' ? 'bg-blue-500 text-slate-950' : s === 'G' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-slate-950'
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-1">{uDef.desc}</p>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs bg-slate-900/80 p-2 rounded-lg border border-slate-850">
                  <div>
                    <span className="text-slate-500 block text-[9px]">Vida Base</span>
                    <span className="font-bold text-emerald-400 font-mono">{uDef.baseHp}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Dano Base</span>
                    <span className="font-bold text-rose-400 font-mono">{uDef.dmg}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Velocidade</span>
                    <span className="font-bold text-blue-400 font-mono">{uDef.speed}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Custo</span>
                    <span className="font-bold text-amber-400 font-mono">{uDef.cost} {uDef.res === 'sun' ? '☀️' : '🥩'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tactical Strategy Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Shield className="w-4 h-4" />
            <span>Dicas de Defesa (Sol ☀️)</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Plante <strong>Plantas de Sol</strong> nas primeiras colunas logo no início da batalha. Posicione <strong>Plantas</strong> nas pistas: elas nunca param de atirar e continuam bombardeando a pista mesmo sem monstros à frente para derrubar o <strong>Portão Inimigo</strong> à distância!
          </p>
        </div>

        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <Flame className="w-4 h-4" />
            <span>Dicas de Ataque (Carne 🥩)</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Monstros avançam pelas pistas e quebram as barreiras centrais de pedra até alcançar a base inimiga. Invoque <strong>Monstros</strong> para abrir caminho enquanto suas <strong>Plantas</strong> dão cobertura à distância!
          </p>
        </div>
      </div>
    </div>
  );
};
