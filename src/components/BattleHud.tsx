import React from 'react';

/* Peças visuais do HUD da batalha: bolinhas de vida, pote de mana,
   ícones desenhados das magias e as camadas de recarga. */

/** Esfera de vidro vermelha com o número da vida; o vermelho baixa conforme a base perde vida. */
export const HpOrb: React.FC<{ hp: number; max: number; size?: number; label: string }> = ({ hp, max, size = 78, label }) => {
  const pct = Math.max(0, Math.min(1, max > 0 ? hp / max : 0));
  return (
    <div className="relative select-none rounded-full" style={{ width: size, height: size, boxShadow: '0 3px 6px rgba(0,0,0,0.55)' }} title={`${label}: ${Math.ceil(hp)} / ${max}`}>
      <div className="absolute inset-0 rounded-full overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 45%,#5a1414,#2a0404 70%,#140000)', border: '2px solid #3a0606' }}>
        <div
          className="absolute left-0 right-0 bottom-0 transition-[height] duration-300 ease-out"
          style={{ height: `${pct * 100}%`, background: 'radial-gradient(circle at 50% 0%,#ff7a6e,#e0262a 40%,#a40c12 75%,#6a0408)' }}
        />
        {/* reflexos do vidro */}
        <div className="absolute rounded-full" style={{ left: '14%', top: '6%', width: '72%', height: '42%', background: 'linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0.08))' }} />
        <div className="absolute rounded-full" style={{ left: '30%', bottom: '6%', width: '40%', height: '14%', background: 'radial-gradient(ellipse,rgba(255,190,180,0.55),rgba(255,190,180,0))' }} />
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: 'inset 0 -6px 10px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.25)' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-extrabold text-white tracking-[0.12em]" style={{ fontSize: size * 0.27, fontFamily: 'Arial Black, Arial, sans-serif', textShadow: '0 0 2px #400, 1px 1px 0 #400, -1px -1px 0 #400, 1px -1px 0 #400, -1px 1px 0 #400' }}>
            {Math.ceil(hp)}
          </span>
        </div>
      </div>
    </div>
  );
};

/** Frasco redondo de mana: vidro claro, líquido azul e o valor numa etiqueta escura. */
export const ManaFlask: React.FC<{ mana: number; max?: number }> = ({ mana, max = 100 }) => {
  const pct = Math.max(0, Math.min(1, mana / max));
  const top = 66 - pct * 40; // corpo do frasco vai de y=26 a y=66
  return (
    <div className="relative select-none" style={{ width: 46, height: 54 }} title={`Mana: ${Math.floor(mana)} / ${max}`}>
      <svg viewBox="0 0 46 58" width={46} height={54} className="absolute inset-0" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}>
        <defs>
          <clipPath id="flask-clip"><path d="M18 4 h10 v14 c9 3 15 11 15 21 c0 11 -9 18 -20 18 s-20 -7 -20 -18 c0 -10 6 -18 15 -21 z" /></clipPath>
          <radialGradient id="flask-glass" cx="0.35" cy="0.35" r="0.8"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#c8dcf0" /></radialGradient>
          <linearGradient id="flask-liquid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7cc4ff" /><stop offset="1" stopColor="#1d5fd0" /></linearGradient>
        </defs>
        <g clipPath="url(#flask-clip)">
          <rect width="46" height="58" fill="url(#flask-glass)" />
          <rect x="0" y={top} width="46" height={58 - top} fill="url(#flask-liquid)" style={{ transition: 'y .3s, height .3s' }} />
          <ellipse cx="14" cy="30" rx="4" ry="7" fill="rgba(255,255,255,0.8)" transform="rotate(25 14 30)" />
        </g>
        <path d="M18 4 h10 v14 c9 3 15 11 15 21 c0 11 -9 18 -20 18 s-20 -7 -20 -18 c0 -10 6 -18 15 -21 z" fill="none" stroke="#5b7fa6" strokeWidth="1.5" />
        <rect x="16" y="1" width="14" height="5" rx="1.5" fill="#e8eef5" stroke="#5b7fa6" strokeWidth="1" />
      </svg>
      <div className="absolute left-1/2 -translate-x-1/2 rounded-full bg-slate-900/85 px-1.5 text-[11px] font-extrabold text-white leading-[15px]" style={{ top: 30, fontFamily: 'Arial, sans-serif' }}>
        {Math.floor(mana)}
      </div>
    </div>
  );
};

/** Ícones desenhados para cada magia. */
export const SpellIcon: React.FC<{ id: string; size?: number }> = ({ id, size = 40 }) => {
  if (id === 'heal') {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size}>
        <defs>
          <radialGradient id="heal-g" cx="0.5" cy="0.4" r="0.6">
            <stop offset="0" stopColor="#d9f99d" />
            <stop offset="1" stopColor="#16a34a" />
          </radialGradient>
        </defs>
        <path d="M24 42 C10 32 6 24 6 17 C6 11 11 7 16 7 C20 7 22.5 9.5 24 12 C25.5 9.5 28 7 32 7 C37 7 42 11 42 17 C42 24 38 32 24 42 Z" fill="url(#heal-g)" stroke="#14532d" strokeWidth="2" />
        <path d="M21 16 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 v-6 h6 z" fill="#f0fdf4" stroke="#166534" strokeWidth="1.2" />
        <path d="M38 6 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5 l3.5 -1.5 z" fill="#fef9c3" />
        <circle cx="9" cy="36" r="1.8" fill="#bbf7d0" />
      </svg>
    );
  }
  if (id === 'fireball') {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size}>
        <defs>
          <radialGradient id="fire-core" cx="0.6" cy="0.62" r="0.5">
            <stop offset="0" stopColor="#fef08a" />
            <stop offset="0.45" stopColor="#f97316" />
            <stop offset="1" stopColor="#991b1b" />
          </radialGradient>
        </defs>
        <path d="M6 6 C14 10 18 14 22 18 C18 12 17 8 18 4 C22 10 26 14 30 18 C30 14 31 11 33 9 C34 16 40 22 40 30 C40 37 35 42 28 42 C20 42 15 36 15 30 C9 24 7 14 6 6 Z" fill="url(#fire-core)" stroke="#7f1d1d" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="28" cy="31" r="7" fill="#57301f" stroke="#2b140b" strokeWidth="1.5" />
        <circle cx="25.5" cy="29" r="1.8" fill="#2b140b" />
        <circle cx="30.5" cy="33.5" r="1.3" fill="#2b140b" />
        <path d="M23 27 a6 6 0 0 1 6 -3" stroke="#fdba74" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" width={size} height={size}>
      <defs>
        <linearGradient id="bolt-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="0.5" stopColor="#facc15" />
          <stop offset="1" stopColor="#ca8a04" />
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="10" rx="17" ry="7" fill="#64748b" stroke="#1e293b" strokeWidth="1.5" />
      <ellipse cx="16" cy="9" rx="8" ry="5" fill="#94a3b8" />
      <ellipse cx="30" cy="8" rx="9" ry="5" fill="#94a3b8" />
      <path d="M27 13 L15 28 H23 L18 45 L34 24 H25 L31 13 Z" fill="url(#bolt-g)" stroke="#713f12" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
};

/** Camada escura que vai clareando de cima para baixo enquanto a carta recarrega. */
export const CardCooldown: React.FC<{ remaining: number; total: number }> = ({ remaining, total }) => {
  if (remaining <= 0) return null;
  const pct = Math.min(1, remaining / total);
  return (
    <div className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden">
      <div className="absolute left-0 right-0 bottom-0 bg-slate-950/75" style={{ height: `${pct * 100}%` }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono font-extrabold text-white text-lg" style={{ textShadow: '0 1px 3px #000, 0 0 2px #000' }}>
          {(remaining / 1000).toFixed(remaining < 10000 ? 1 : 0)}
        </span>
      </div>
    </div>
  );
};

/** Varredura circular (estilo relógio) para a recarga das magias. */
export const OrbCooldown: React.FC<{ remaining: number; total: number }> = ({ remaining, total }) => {
  if (remaining <= 0) return null;
  const deg = Math.min(1, remaining / total) * 360;
  return (
    <div className="absolute inset-0 rounded-full pointer-events-none flex items-center justify-center"
      style={{ background: `conic-gradient(rgba(2,6,23,0.78) ${deg}deg, rgba(0,0,0,0) ${deg}deg)` }}>
      <span className="font-mono font-extrabold text-white text-base" style={{ textShadow: '0 1px 3px #000, 0 0 2px #000' }}>
        {Math.ceil(remaining / 1000)}
      </span>
    </div>
  );
};

/** Número e nível de vida por cima da esfera vermelha do cenário. */
export const OrbOverlay: React.FC<{ hp: number; max: number; cx: number; cy: number; r: number; label: string }> = ({ hp, max, cx, cy, r, label }) => {
  const lost = 1 - Math.max(0, Math.min(1, max > 0 ? hp / max : 0));
  return (
    <div className="absolute rounded-full overflow-hidden pointer-events-auto" style={{ left: cx - r, top: cy - r, width: r * 2, height: r * 2 }} title={`${label}: ${Math.ceil(hp)} / ${max}`}>
      {/* parte vazia da esfera escurece de cima para baixo */}
      <div className="absolute left-0 right-0 top-0 transition-[height] duration-300 ease-out" style={{ height: `${lost * 100}%`, background: 'linear-gradient(180deg,rgba(30,0,0,0.55),rgba(60,0,0,0.72))', borderBottom: lost > 0.02 && lost < 0.98 ? '2px solid rgba(255,150,140,0.6)' : undefined }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold" style={{ fontSize: r * 0.5, letterSpacing: r * 0.06, fontFamily: '"Arial Black", Arial, sans-serif', WebkitTextStroke: '1.5px #3a0000', paintOrder: 'stroke fill', textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>
          {Math.ceil(hp)}
        </span>
      </div>
    </div>
  );
};
