import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  UNIT_DEFINITIONS, 
  STAR_MULTIPLIERS, 
  ResourceType 
} from '../types/game';
import { ArrowLeft, Trash2, Shield, Plus, Swords } from 'lucide-react';
import { sound } from '../utils/audio';
import { UnitSpriteCanvas } from '../utils/unitSprites';

interface DeckBuilderProps {
  onBack: () => void;
  onGoToCrafting: () => void;
  onStartGame: () => void;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({ 
  onBack, 
  onGoToCrafting, 
  onStartGame 
}) => {
  const { 
    inventory, 
    activeDeck, 
    addToDeck, 
    removeFromDeck, 
    deleteUnit 
  } = useGame();

  const [typeFilter, setTypeFilter] = useState<'all' | ResourceType>('all');
  const [starFilter, setStarFilter] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'hp' | 'dmg' | 'cost'>('recent');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter inventory
  let filteredUnits = [...inventory];

  if (typeFilter !== 'all') {
    filteredUnits = filteredUnits.filter(u => UNIT_DEFINITIONS[u.type].res === typeFilter);
  }

  if (starFilter !== 'all') {
    filteredUnits = filteredUnits.filter(u => u.stars === starFilter);
  }

  // Sort inventory
  filteredUnits.sort((a, b) => {
    const defA = UNIT_DEFINITIONS[a.type];
    const defB = UNIT_DEFINITIONS[b.type];
    const multA = STAR_MULTIPLIERS[a.stars];
    const multB = STAR_MULTIPLIERS[b.stars];

    if (sortBy === 'hp') {
      return (defB.baseHp * multB) - (defA.baseHp * multA);
    }
    if (sortBy === 'dmg') {
      return (defB.dmg * multB) - (defA.dmg * multA);
    }
    if (sortBy === 'cost') {
      return defA.cost - defB.cost;
    }
    return b.timestamp - a.timestamp;
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      deleteUnit(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3500);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold transition-colors border border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Menu</span>
        </button>

        <div className="text-center">
          <h1 className="font-cinzel text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 tracking-wide">
            MONTAR EQUIPE DE COMBATE
          </h1>
          <p className="text-xs text-slate-400">Monte seu esquadrão tático com até 6 guerreiros forjados</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onGoToCrafting}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold transition-colors border border-slate-700"
          >
            <Plus className="w-4 h-4 text-fuchsia-400" />
            <span>Forjar Tropas</span>
          </button>
          <button
            onClick={onStartGame}
            disabled={activeDeck.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-emerald-700/30"
          >
            <Swords className="w-4 h-4" />
            <span>Ir para Batalha</span>
          </button>
        </div>
      </div>

      {/* Active Deck Section */}
      <div className="bg-slate-900/90 rounded-2xl border border-indigo-950/80 p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Deck Ativo de Combate</h2>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 bg-slate-950 rounded-full border border-indigo-900/50 text-indigo-300">
            {activeDeck.length} / 6 Selecionados
          </span>
        </div>

        {activeDeck.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-slate-800 rounded-xl text-center flex flex-col items-center justify-center gap-2">
            <span className="text-sm text-slate-400">Seu deck está vazio.</span>
            <p className="text-xs text-slate-500">Clique nas cartas do inventário abaixo para adicioná-las à equipe.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {activeDeck.map(unitId => {
              const unit = inventory.find(u => u.id === unitId);
              if (!unit) return null;
              const uDef = UNIT_DEFINITIONS[unit.type];
              const mult = STAR_MULTIPLIERS[unit.stars];
              const hp = Math.floor(uDef.baseHp * mult);
              const dmg = Math.floor(uDef.dmg * mult);

              return (
                <div
                  key={unit.id}
                  onClick={() => removeFromDeck(unit.id)}
                  className="group relative bg-slate-950 rounded-xl border border-indigo-500/50 p-3 flex flex-col items-center gap-1.5 shadow-lg hover:border-rose-500 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="text-[10px] text-yellow-400 font-mono font-bold tracking-widest">
                    {'★'.repeat(unit.stars)}
                  </div>
                  <div className="my-0.5 flex items-center justify-center h-12 group-hover:scale-110 transition-transform">
                    <UnitSpriteCanvas type={unit.type} stars={unit.stars} size={46} />
                  </div>
                  <div className="text-xs font-bold text-slate-100 text-center truncate w-full">
                    {uDef.name}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="text-emerald-400 font-mono font-semibold">{hp} HP</span>
                    <span>·</span>
                    <span className="text-rose-400 font-mono font-semibold">{dmg} ATK</span>
                  </div>
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${uDef.res === 'sun' ? 'bg-amber-950/80 text-amber-300' : 'bg-rose-950/80 text-rose-300'}`}>
                    {uDef.cost} {uDef.res === 'sun' ? '☀️' : '🥩'}
                  </div>

                  {/* Hover Remove Overlay */}
                  <div className="absolute inset-0 bg-rose-950/90 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-bold text-rose-200 uppercase tracking-wider">Remover</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inventory & Filters */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-2xl flex flex-col gap-4">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Inventário de Guerreiros</h2>
            <span className="text-xs text-slate-500 font-mono">({inventory.length} total)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | ResourceType)}
              className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Todos os Tipos</option>
              <option value="sun">Plantas / Defesa (Sol ☀️)</option>
              <option value="meat">Monstros / Ataque (Carne 🥩)</option>
            </select>

            {/* Star selector */}
            <select
              value={starFilter}
              onChange={(e) => setStarFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Todas as Estrelas</option>
              <option value="1">1 Estrela (★)</option>
              <option value="2">2 Estrelas (★★)</option>
              <option value="3">3 Estrelas (★★★)</option>
              <option value="4">4 Estrelas (★★★★)</option>
              <option value="5">5 Estrelas (★★★★★)</option>
            </select>

            {/* Sort selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'hp' | 'dmg' | 'cost')}
              className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
            >
              <option value="recent">Mais Recentes</option>
              <option value="hp">Maior Vida (HP)</option>
              <option value="dmg">Maior Dano (ATK)</option>
              <option value="cost">Menor Custo</option>
            </select>
          </div>
        </div>

        {/* Inventory Cards Grid */}
        {filteredUnits.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
            <span className="text-sm text-slate-400">Nenhum guerreiro encontrado com esses filtros.</span>
            <button
              onClick={onGoToCrafting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Forjar Novos Guerreiros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredUnits.map(unit => {
              const inDeck = activeDeck.includes(unit.id);
              const uDef = UNIT_DEFINITIONS[unit.type];
              const mult = STAR_MULTIPLIERS[unit.stars];
              const hp = Math.floor(uDef.baseHp * mult);
              const dmg = Math.floor(uDef.dmg * mult);

              return (
                <div
                  key={unit.id}
                  onClick={() => {
                    if (inDeck) {
                      removeFromDeck(unit.id);
                    } else {
                      addToDeck(unit.id);
                    }
                  }}
                  className={`relative p-4 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                    inDeck 
                      ? 'bg-slate-950/90 border-indigo-500 shadow-indigo-950/40 shadow-lg' 
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-600 hover:bg-slate-950/90'
                  }`}
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(unit.id, e)}
                    title="Excluir guerreiro permanentemente"
                    className={`absolute top-2.5 right-2.5 p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors ${
                      confirmDeleteId === unit.id ? 'bg-rose-900/80 text-rose-200' : ''
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div>
                    {/* Stars & Resource Tag */}
                    <div className="flex items-center justify-between pr-8 mb-2">
                      <span className="text-yellow-400 text-xs font-mono font-bold tracking-wider">
                        {'★'.repeat(unit.stars)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        uDef.res === 'sun' ? 'bg-amber-950/60 text-amber-300' : 'bg-rose-950/60 text-rose-300'
                      }`}>
                        {uDef.cost} {uDef.res === 'sun' ? '☀️' : '🥩'}
                      </span>
                    </div>

                    {/* Unit Main Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 flex items-center justify-center overflow-hidden">
                        <UnitSpriteCanvas type={unit.type} stars={unit.stars} size={46} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-100 truncate">{uDef.name}</h3>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{uDef.desc}</p>
                      </div>
                    </div>

                    {/* Attributes Bar */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/80 p-2 rounded-lg border border-slate-850">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Vida (HP)</span>
                        <span className="font-bold text-emerald-400 font-mono">{hp}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Dano (ATK)</span>
                        <span className="font-bold text-rose-400 font-mono">{dmg}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Indicator */}
                  <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      {confirmDeleteId === unit.id ? (
                        <span className="text-rose-400 font-bold">Confirmar exclusão?</span>
                      ) : (
                        uDef.speed > 0 ? `Avanço: ${uDef.speed} vel.` : 'Defesa Estática'
                      )}
                    </span>
                    <span className={`font-semibold text-xs ${inDeck ? 'text-indigo-400' : 'text-slate-500'}`}>
                      {inDeck ? '✓ No Deck' : '+ Adicionar'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
