import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { 
  UNIT_DEFINITIONS, 
  STAR_MULTIPLIERS, 
  SPELL_DEFINITIONS,
  UnitType,
  PlayerUnit,
  StageId,
  STAGE_CONFIGS,
  BattleDropResult 
} from '../types/game';
import { sound } from '../utils/audio';
import { getSceneLayer, renderSceneGlow, renderStonePillar, SCENE_GRID_TOP, SCENE_HEIGHT } from '../utils/battleScene';
import { renderUnitSprite, UnitSpriteCanvas, getElfoMuzzle, getCoconutLaunch, drawCoconutPod, ELFO_ATTACK_WINDUP_MS, SpriteRenderOptions } from '../utils/unitSprites';
import { 
  Play, 
  Pause, 
  FastForward, 
  RotateCcw, 
  ArrowLeft, 
  Trophy, 
  Skull, 
  Sparkles, 
    ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { OrbOverlay, SpellIcon, CardCooldown, OrbCooldown } from './BattleHud';

interface BattlefieldProps {
  onBackToMenu: () => void;
  onGoToCrafting: () => void;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  velocity: number;
}

interface SpellEffect {
  x: number;
  y: number;
  type: 'heal' | 'fireball' | 'thunder' | 'coconut';
  life: number;
  maxLife: number;
  radius: number;
}

interface Barrier {
  col: number;
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
}

interface PlantInstance {
  id: string;
  col: number;
  row: number;
  type: UnitType;
  stars: number;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  baseDmg: number;
  actionTimer: number;
  shotAge?: number; // ms desde o último tiro (animação de recuo)
  hitAge?: number; // ms desde o último dano recebido (animação de impacto)
  facing?: number; // 1 = olhando para a direita, -1 = para a esquerda (Coconut vira para o alvo)
  emoji: string;
}

interface MonsterInstance {
  id: string;
  col: number;
  row: number;
  team: 'player' | 'enemy';
  type: UnitType | 'enemy_basic' | 'enemy_tank' | 'enemy_fast' | 'enemy_boss';
  stars: number;
  r: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackInterval: number;
  attackTimer: number;
  shotAge?: number; // ms desde o último tiro (animação de recuo)
  hitAge?: number; // ms desde o último dano recebido
  isMoving?: boolean;
  emoji: string;
  dir: number;
}

interface ProjectileInstance {
  x: number;
  y: number;
  row: number;
  team: 'player' | 'enemy';
  source: UnitType;
  damage: number;
  speed: number;
  r: number;
  active: boolean;
  dir: number;
  prevX?: number;
}

// Coco do Coconut: voa em arco por cima do muro do meio até o alvo (tropa inimiga ou base)
interface LobInstance {
  x0: number;
  y0: number;
  x: number;
  y: number;
  tx: number; // ponto de queda (atualizado enquanto o alvo anda)
  ty: number;
  row: number;
  target: { hp: number; x?: number; y?: number; w?: number; h?: number; r?: number };
  damage: number;
  age: number;
  dur: number;
  active: boolean;
}

const COLS = 14;
const ROWS = 6;
const CANVAS_WIDTH = 1120;
const CANVAS_HEIGHT = 480;
const CELL_W = CANVAS_WIDTH / COLS; // 80px
const CELL_H = CANVAS_HEIGHT / ROWS; // 80px
// O canvas inteiro tem margens em cima e embaixo para o cenário; a grade começa em GRID_TOP
const GRID_TOP = SCENE_GRID_TOP;
const VIEW_HEIGHT = SCENE_HEIGHT;

// Tempo de recarga de cada tropa e magia depois de usada (ms)
const UNIT_COOLDOWNS: Record<string, number> = { sunplant: 5000, melee: 6000, sniper: 8000, peanut: 20000, coconut: 10000 };
const SPELL_COOLDOWNS: Record<string, number> = { heal: 8000, fireball: 10000, thunder: 6000 };
const WAVE_DURATION = 35000;
// Posições das caixinhas e círculos no cenário (x da esquerda de cada caixinha e centro de cada círculo)
const SLOT_LEFT = [288.8, 354.3, 419.8, 485.3, 550.8, 616.3, 681.8, 747.4, 812.9, 878.4];
const SPELL_CX = [472.6, 515.2, 557.8];

// Unidades inimigas que atacam à distância em vez de avançar até o corpo a corpo
const RANGED_TYPES = new Set<MonsterInstance['type']>(['sniper']);
const ENEMY_RANGE = CELL_W * 3.5;
const ENEMY_RANGED_SPEED = 26;
const SNIPER_INTERVAL = 2600;
// O Elfo plantado é desenhado maior que as outras plantas para ocupar a casa inteira
const PLANT_ELFO_SCALE = 1.1;
const PLANT_PEANUT_SCALE = 1.0;
// O corpo do Coconut ocupa só a metade de baixo da arte (o caule sobe), então ele é desenhado um pouco maior
const PLANT_COCONUT_SCALE = 1.25;
const COCONUT_INTERVAL = UNIT_DEFINITIONS.coconut.attackInterval;
const COCONUT_ARC = 130; // altura do arco do coco acima do ponto mais alto (px)
const plantSpriteSize = (p: { w: number }) => p.w * 1.0;
const monsterSpriteSize = (m: { r: number }) => m.r * 2.8;
const windupFor = (timer: number, interval: number) =>
  Math.max(0, Math.min(1, (timer - (interval - ELFO_ATTACK_WINDUP_MS)) / ELFO_ATTACK_WINDUP_MS));
// Onde o coco cai: no centro da tropa alvo, ou na frente da base inimiga na pista de quem jogou
const lobAimPoint = (target: { x?: number; y?: number; w?: number; r?: number }, row: number) =>
  target.r !== undefined
    ? { x: target.x ?? 0, y: target.y ?? row * CELL_H + CELL_H / 2 }
    : { x: (target.x ?? 0) + (target.w ?? 0) / 2, y: row * CELL_H + CELL_H / 2 };

export const Battlefield: React.FC<BattlefieldProps> = ({ onBackToMenu, onGoToCrafting }) => {
  const { 
    activeDeck, 
    inventory, 
    recordBattleResult, 
    selectedStage, 
    setSelectedStage,
    unlockBestiaryEntry
  } = useGame();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  // O HUD é desenhado em 1120px de largura e acompanha o tamanho real do campo
  const [hudScale, setHudScale] = useState(1);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setHudScale(el.clientWidth / CANVAS_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Resources state for HUD
  const [sun, setSun] = useState<number>(150);
  const [meat, setMeat] = useState<number>(150);
  const [mana, setMana] = useState<number>(100);
  const [gameSpeed, setGameSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentWave, setCurrentWave] = useState<number>(1);
  const [gameOverResult, setGameOverResult] = useState<'victory' | 'defeat' | null>(null);
  const [lastBattleDrop, setLastBattleDrop] = useState<BattleDropResult | null>(null);
  // Fotografia do estado para o HUD (recargas, vida das bases, onda), atualizada ~10x por segundo
  const [hud, setHud] = useState({
    cooldowns: {} as Record<string, number>,
    playerHp: 1600, playerMax: 1600, enemyHp: 1200, enemyMax: 1200, waveProgress: 0,
  });
  const hudTimerRef = useRef(0);

  // Selected card / spell for click-to-deploy accessibility
  const [selectedAction, setSelectedAction] = useState<{
    kind: 'unit' | 'spell';
    id: string;
    unit?: PlayerUnit;
  } | null>(null);

  // Refs for real-time game loop state (avoids React render lag)
  const gameLoopRef = useRef<number | null>(null);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const gameSpeedRef = useRef(gameSpeed);
  gameSpeedRef.current = gameSpeed;
  const selectedActionRef = useRef(selectedAction);
  selectedActionRef.current = selectedAction;
  const lastTimeRef = useRef<number>(0);
  const statsKillsRef = useRef<number>(0);
  const draggedSpellRef = useRef<string | null>(null);
  const draggedUnitRef = useRef<PlayerUnit | null>(null);
  const updateGameRef = useRef<(dt: number) => void>(() => {});
  const renderGameRef = useRef<() => void>(() => {});

  const gameStateRef = useRef<{
    stage: StageId;
    sun: number;
    meat: number;
    mana: number;
    enemyMana: number;
    enemySpellTimer: number;
    wave: number;
    waveTimer: number;
    enemySpawnTimer: number;
    sunPassiveTimer: number;
    meatPassiveTimer: number;
    manaPassiveTimer: number;
    hoverCol: number;
    hoverRow: number;
    isOver: boolean;
    bases: {
      player: { x: number; w: number; hp: number; maxHp: number; emoji: string };
      enemy: { x: number; w: number; hp: number; maxHp: number; emoji: string };
    };
    plants: PlantInstance[];
    playerMonsters: MonsterInstance[];
    enemyMonsters: MonsterInstance[];
    projectiles: ProjectileInstance[];
    lobs: LobInstance[];
    barriers: Barrier[];
    floatingTexts: FloatingText[];
    spells: SpellEffect[];
    cooldowns: Record<string, number>; // 'u:<tipo>' e 's:<magia>' -> ms restantes
  }>({
    stage: selectedStage,
    sun: 150,
    meat: 150,
    mana: 100,
    enemyMana: 40,
    enemySpellTimer: 0,
    wave: 1,
    waveTimer: 0,
    enemySpawnTimer: 0,
    sunPassiveTimer: 0,
    meatPassiveTimer: 0,
    manaPassiveTimer: 0,
    hoverCol: -1,
    hoverRow: -1,
    isOver: false,
    bases: {
      player: { x: 0, w: CELL_W, hp: 1600, maxHp: 1600, emoji: '🧙‍♂️' },
      enemy: { x: 13 * CELL_W, w: CELL_W, hp: 1200, maxHp: 1200, emoji: '🧛‍♂️' },
    },
    plants: [],
    playerMonsters: [],
    enemyMonsters: [],
    projectiles: [],
    lobs: [],
    barriers: [],
    floatingTexts: [],
    spells: [],
    cooldowns: {},
  });

  // Expõe o estado da batalha só em desenvolvimento, para testes automatizados
  useEffect(() => {
    if (import.meta.env.DEV) (window as any).__ELFENDER__ = gameStateRef;
  }, []);

  // Spawn damage indicator text
  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    gameStateRef.current.floatingTexts.push({
      x: x + (Math.random() * 16 - 8),
      y,
      text,
      color,
      life: 0.9,
      velocity: -45,
    });
  };

  const applyDamage = useCallback((
    target: { hp: number; x?: number; y?: number; w?: number; h?: number; r?: number }, 
    amount: number, 
    color = '#f87171',
    impactY?: number
  ) => {
    if (amount <= 0 || target.hp <= 0) return;
    target.hp -= amount;
    if ('hitAge' in target) (target as { hitAge?: number }).hitAge = 0;
    const isBase = target === gameStateRef.current.bases.enemy || target === gameStateRef.current.bases.player;
    const tx = (target.x ?? 0) + (target.w ? target.w / 2 : target.r ?? 0);
    const ty = impactY !== undefined 
      ? impactY - 15 
      : isBase 
      ? (Math.random() * (CANVAS_HEIGHT - 140)) + 70 
      : (target.y ?? 0) + (target.h ? target.h / 2 : 0) - 15;
    addFloatingText(tx, ty, `${Math.floor(amount)}`, color);
    sound.playHit();
  }, []);

  const resetGame = useCallback((stageOverride?: StageId) => {
    const stageToRun = stageOverride ?? selectedStage;
    const stageConf = STAGE_CONFIGS[stageToRun];

    gameStateRef.current = {
      stage: stageToRun,
      sun: 150,
      meat: 150,
      mana: 100,
      enemyMana: stageToRun === 3 ? 70 : (stageToRun === 2 ? 50 : 0),
      enemySpellTimer: 0,
      wave: 1,
      waveTimer: 0,
      enemySpawnTimer: 0,
      sunPassiveTimer: 0,
      meatPassiveTimer: 0,
      manaPassiveTimer: 0,
      hoverCol: -1,
      hoverRow: -1,
      isOver: false,
      bases: {
        player: { x: 0, w: CELL_W, hp: 1600, maxHp: 1600, emoji: '🧙‍♂️' },
        enemy: { x: 13 * CELL_W, w: CELL_W, hp: stageConf.enemyGateHp, maxHp: stageConf.enemyGateHp, emoji: '🧛‍♂️' },
      },
      plants: [],
      playerMonsters: [],
      enemyMonsters: [],
      projectiles: [],
      lobs: [],
      barriers: [],
      floatingTexts: [],
      spells: [],
      cooldowns: {},
    };

    // Spawn 2 columns of stone obstacles in the middle
    for (let r = 0; r < ROWS; r++) {
      gameStateRef.current.barriers.push({
        col: 6,
        row: r,
        x: 6 * CELL_W + 8,
        y: r * CELL_H + 8,
        w: CELL_W - 16,
        h: CELL_H - 16,
        hp: 350,
        maxHp: 350,
      });
      gameStateRef.current.barriers.push({
        col: 7,
        row: r,
        x: 7 * CELL_W + 8,
        y: r * CELL_H + 8,
        w: CELL_W - 16,
        h: CELL_H - 16,
        hp: 350,
        maxHp: 350,
      });
    }

    statsKillsRef.current = 0;
    setSun(150);
    setMeat(150);
    setMana(100);
    setCurrentWave(1);
    setGameOverResult(null);
    setLastBattleDrop(null);
    setSelectedAction(null);
    lastTimeRef.current = performance.now();
  }, [selectedStage]);

  const switchStage = (stageId: StageId) => {
    setSelectedStage(stageId);
    resetGame(stageId);
    sound.playClick();
  };

  // Deploy unit to grid
  const deployUnit = useCallback((unit: PlayerUnit, col: number, row: number) => {
    const state = gameStateRef.current;
    if (state.isOver) return false;

    if (col < 1 || col > 5) {
      addFloatingText(col * CELL_W + CELL_W / 2, row * CELL_H + CELL_H / 2, 'Zona Inválida!', '#f87171');
      return false;
    }

    const cdKey = `u:${unit.type}`;
    if ((state.cooldowns[cdKey] ?? 0) > 0) {
      addFloatingText(col * CELL_W + CELL_W / 2, row * CELL_H + CELL_H / 2, 'Recarregando!', '#93c5fd');
      return false;
    }

    const uDef = UNIT_DEFINITIONS[unit.type];
    const isSun = uDef.res === 'sun';
    const cost = uDef.cost;
    const currentRes = isSun ? state.sun : state.meat;

    if (currentRes < cost) {
      addFloatingText(
        col * CELL_W + CELL_W / 2, 
        row * CELL_H + CELL_H / 2, 
        `${isSun ? 'Sol' : 'Carne'} Insuficiente!`, 
        '#f87171'
      );
      return false;
    }

    if (uDef.category === 'plant') {
      const cellBlocked = state.plants.some(p => p.col === col && p.row === row) ||
                          state.barriers.some(b => b.col === col && b.row === row);
      if (cellBlocked) {
        addFloatingText(col * CELL_W + CELL_W / 2, row * CELL_H + CELL_H / 2, 'Espaço Ocupado!', '#fbbf24');
        return false;
      }

      state.sun -= cost;
      setSun(state.sun);

      const mult = STAR_MULTIPLIERS[unit.stars];
      state.plants.push({
        id: `plant_${Date.now()}_${Math.random()}`,
        col,
        row,
        type: unit.type,
        stars: unit.stars,
        x: col * CELL_W + (CELL_W - 56) / 2,
        y: row * CELL_H + (CELL_H - 56) / 2,
        w: 56,
        h: 56,
        hp: uDef.baseHp * mult,
        maxHp: uDef.baseHp * mult,
        baseDmg: uDef.dmg * mult,
        actionTimer: 0,
        hitAge: Infinity,
        emoji: uDef.emoji,
      });

      state.cooldowns[cdKey] = UNIT_COOLDOWNS[unit.type] ?? 5000;
      sound.playSpawn();
      unlockBestiaryEntry(unit.type, false);
      return true;
    } else {
      // Monster
      state.meat -= cost;
      setMeat(state.meat);

      const mult = STAR_MULTIPLIERS[unit.stars];
      state.playerMonsters.push({
        id: `p_monster_${Date.now()}_${Math.random()}`,
        col,
        row,
        team: 'player',
        type: unit.type,
        stars: unit.stars,
        r: 22,
        x: col * CELL_W + CELL_W / 2,
        y: row * CELL_H + CELL_H / 2,
        hp: uDef.baseHp * mult,
        maxHp: uDef.baseHp * mult,
        speed: uDef.speed,
        damage: uDef.dmg * mult,
        attackInterval: uDef.attackInterval,
        attackTimer: 0,
        hitAge: Infinity,
        emoji: uDef.emoji,
        dir: 1,
      });

      state.cooldowns[cdKey] = UNIT_COOLDOWNS[unit.type] ?? 5000;
      sound.playSpawn();
      unlockBestiaryEntry(unit.type, false);
      return true;
    }
  }, [unlockBestiaryEntry]);

  // Cast spells by player
  const triggerSpell = useCallback((spellId: string, col: number, row: number) => {
    const state = gameStateRef.current;
    if (state.isOver) return false;
    if ((state.cooldowns[`s:${spellId}`] ?? 0) > 0) {
      addFloatingText(col * CELL_W + CELL_W / 2, row * CELL_H + CELL_H / 2, 'Recarregando!', '#93c5fd');
      return false;
    }
    const casted = castSpell(spellId, col, row);
    if (casted) state.cooldowns[`s:${spellId}`] = SPELL_COOLDOWNS[spellId] ?? 6000;
    return casted;
  }, []);

  const castSpell = (spellId: string, col: number, row: number) => {
    const state = gameStateRef.current;

    if (spellId === 'heal') {
      if (state.mana < 50) {
        addFloatingText(col * CELL_W + CELL_W / 2, row * CELL_H + CELL_H / 2, 'Mana Insuficiente!', '#60a5fa');
        return false;
      }
      state.mana -= 50;
      setMana(state.mana);

      const targetX = col * CELL_W + CELL_W / 2;
      const targetY = row * CELL_H + CELL_H / 2;

      state.spells.push({
        x: targetX,
        y: targetY,
        type: 'heal',
        life: 0.6,
        maxLife: 0.6,
        radius: CELL_W * 1.5,
      });

      // Heal allies in 3x3 area
      state.plants.forEach(p => {
        if (Math.abs(p.col - col) <= 1 && Math.abs(p.row - row) <= 1) {
          p.hp = Math.min(p.maxHp, p.hp + 150);
          addFloatingText(p.x + p.w / 2, p.y, '+150', '#4ade80');
        }
      });
      state.playerMonsters.forEach(m => {
        if (Math.abs(m.col - col) <= 1 && Math.abs(m.row - row) <= 1) {
          m.hp = Math.min(m.maxHp, m.hp + 150);
          addFloatingText(m.x, m.y - m.r, '+150', '#4ade80');
        }
      });

      sound.playHeal();
      return true;
    } else if (spellId === 'fireball') {
      if (state.mana < 50) {
        addFloatingText(col * CELL_W + CELL_W / 2, row * CELL_H + CELL_H / 2, 'Mana Insuficiente!', '#60a5fa');
        return false;
      }
      state.mana -= 50;
      setMana(state.mana);

      const targetX = col * CELL_W + CELL_W / 2;
      const targetY = row * CELL_H + CELL_H / 2;

      state.spells.push({
        x: targetX,
        y: targetY,
        type: 'fireball',
        life: 0.5,
        maxLife: 0.5,
        radius: CELL_W * 1.2,
      });

      // Damage enemies & barriers in 2x2
      state.enemyMonsters.forEach(m => {
        if (Math.abs(m.col - col) <= 1 && Math.abs(m.row - row) <= 1) {
          applyDamage(m, 140, '#fde047', m.y);
        }
      });
      state.barriers.forEach(b => {
        if (Math.abs(b.col - col) <= 1 && Math.abs(b.row - row) <= 1) {
          applyDamage(b, 140, '#cbd5e1', b.y + b.h / 2);
        }
      });
      if (col >= 12) {
        applyDamage(state.bases.enemy, 140, '#fde047', targetY);
      }

      sound.playFireball();
      return true;
    } else if (spellId === 'thunder') {
      const cost = SPELL_DEFINITIONS.thunder.cost;
      if (state.mana < cost) {
        addFloatingText(col * CELL_W + CELL_W / 2, row * CELL_H + CELL_H / 2, 'Mana Insuficiente!', '#60a5fa');
        return false;
      }
      state.mana -= cost;
      setMana(state.mana);

      state.spells.push({
        x: col * CELL_W + CELL_W / 2,
        y: CANVAS_HEIGHT / 2,
        type: 'thunder',
        life: 0.45,
        maxLife: 0.45,
        radius: CELL_W / 2,
      });

      // Eletrocuta a coluna inteira: inimigos e barreiras
      state.enemyMonsters.forEach(m => {
        if (m.col === col) {
          applyDamage(m, 90, '#facc15', m.y);
        }
      });
      state.barriers.forEach(b => {
        if (b.col === col) {
          applyDamage(b, 90, '#cbd5e1', b.y + b.h / 2);
        }
      });
      if (col >= 13) {
        applyDamage(state.bases.enemy, 90, '#facc15', row * CELL_H + CELL_H / 2);
      }

      sound.playShoot();
      return true;
    }

    return false;
  };

  // Main canvas interaction
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedAction) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = VIEW_HEIGHT / rect.height;

    const col = Math.floor((e.clientX - rect.left) * scaleX / CELL_W);
    const row = Math.floor(((e.clientY - rect.top) * scaleY - GRID_TOP) / CELL_H);

    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    if (selectedAction.kind === 'unit' && selectedAction.unit) {
      deployUnit(selectedAction.unit, col, row);
    } else if (selectedAction.kind === 'spell') {
      const casted = triggerSpell(selectedAction.id, col, row);
      if (casted) {
        setSelectedAction(null);
      }
    }
  };

  // Mouse move and hover handlers for previewing spells and units
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = VIEW_HEIGHT / rect.height;

    const hc = Math.floor((e.clientX - rect.left) * scaleX / CELL_W);
    const hr = Math.floor(((e.clientY - rect.top) * scaleY - GRID_TOP) / CELL_H);
    const inside = hc >= 0 && hc < COLS && hr >= 0 && hr < ROWS;
    gameStateRef.current.hoverCol = inside ? hc : -1;
    gameStateRef.current.hoverRow = inside ? hr : -1;
  };

  const handleMouseLeave = () => {
    gameStateRef.current.hoverCol = -1;
    gameStateRef.current.hoverRow = -1;
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = VIEW_HEIGHT / rect.height;

    const hc = Math.floor((e.clientX - rect.left) * scaleX / CELL_W);
    const hr = Math.floor(((e.clientY - rect.top) * scaleY - GRID_TOP) / CELL_H);
    const inside = hc >= 0 && hc < COLS && hr >= 0 && hr < ROWS;
    gameStateRef.current.hoverCol = inside ? hc : -1;
    gameStateRef.current.hoverRow = inside ? hr : -1;
  };

  const handleDragLeave = () => {
    gameStateRef.current.hoverCol = -1;
    gameStateRef.current.hoverRow = -1;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    gameStateRef.current.hoverCol = -1;
    gameStateRef.current.hoverRow = -1;
    draggedSpellRef.current = null;
    draggedUnitRef.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = VIEW_HEIGHT / rect.height;

    const col = Math.floor((e.clientX - rect.left) * scaleX / CELL_W);
    const row = Math.floor(((e.clientY - rect.top) * scaleY - GRID_TOP) / CELL_H);

    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    const kind = e.dataTransfer.getData('kind');
    const dataStr = e.dataTransfer.getData('data');

    if (kind === 'unit') {
      try {
        const unit = JSON.parse(dataStr) as PlayerUnit;
        deployUnit(unit, col, row);
      } catch (err) {
        console.error('Drop error:', err);
      }
    } else if (kind === 'spell') {
      triggerSpell(dataStr, col, row);
    }
  };

  // Initialize and run game loop.
  // O loop só reinicia a partida quando a fase muda (resetGame depende de selectedStage).
  // Pausa, velocidade e a carta selecionada são lidas por refs, sem recriar o loop.
  useEffect(() => {
    resetGame(selectedStage);

    const loop = (time: number) => {
      const rawDt = time - (lastTimeRef.current || time);
      lastTimeRef.current = time;

      const dt = Math.min(rawDt, 60) * (isPausedRef.current ? 0 : gameSpeedRef.current);

      if (dt > 0) {
        updateGameRef.current(dt);
      }
      renderGameRef.current();

      hudTimerRef.current += rawDt;
      if (hudTimerRef.current >= 100) {
        hudTimerRef.current = 0;
        const st = gameStateRef.current;
        setHud({
          cooldowns: { ...st.cooldowns },
          playerHp: Math.max(0, st.bases.player.hp),
          playerMax: st.bases.player.maxHp,
          enemyHp: Math.max(0, st.bases.enemy.hp),
          enemyMax: st.bases.enemy.maxHp,
          waveProgress: st.waveTimer / WAVE_DURATION,
        });
      }

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [resetGame]);

  // Update Game Logic
  const updateGame = (dt: number) => {
    const s = gameStateRef.current;
    if (s.isOver) return;

    // Passive generation for Player
    s.sunPassiveTimer += dt;
    if (s.sunPassiveTimer >= 3000) {
      s.sun += 10;
      s.sunPassiveTimer = 0;
      setSun(s.sun);
    }

    s.meatPassiveTimer += dt;
    if (s.meatPassiveTimer >= 2200) {
      s.meat += 10;
      s.meatPassiveTimer = 0;
      setMeat(s.meat);
    }

    s.manaPassiveTimer += dt;
    if (s.manaPassiveTimer >= 2800) {
      s.mana = Math.min(100, s.mana + 5);
      s.manaPassiveTimer = 0;
      setMana(s.mana);
    }

    // Passive generation for Enemy AI (Stage 2 and 3)
    if (s.stage >= 2) {
      const manaRate = s.stage === 3 ? 1800 : 2500;
      const manaGain = s.stage === 3 ? 8 : 5;
      if (Math.random() < (dt / manaRate)) {
        s.enemyMana = Math.min(100, s.enemyMana + manaGain);
      }
    }

    // Wave Progression
    for (const key in s.cooldowns) {
      s.cooldowns[key] = Math.max(0, s.cooldowns[key] - dt);
    }

    s.waveTimer += dt;
    s.enemySpawnTimer += dt;
    s.enemySpellTimer += dt;

    if (s.waveTimer >= WAVE_DURATION) {
      s.wave += 1;
      s.waveTimer = 0;
      setCurrentWave(s.wave);
      addFloatingText(CANVAS_WIDTH / 2, 80, `⚔️ NOVA ONDA ${s.wave}!`, '#fbbf24');
    }

    // Enemy AI Spawning according to Stage rules
    // Stage 1: Pacing ~4.5s - 5.5s (Basic 1-star only)
    // Stage 2: Pacing ~2.8s - 3.6s (2~4 stars)
    // Stage 3: Pacing ~1.8s - 2.5s (All 5-stars)
    const baseInterval = s.stage === 3 ? 2200 : (s.stage === 2 ? 3200 : 4800);
    const spawnInterval = Math.max(1200, baseInterval - s.wave * 250);

    if (s.enemySpawnTimer >= spawnInterval) {
      s.enemySpawnTimer = 0;
      const targetRow = Math.floor(Math.random() * ROWS);

      // Inimigos usam as mesmas tropas de combate do jogador: Monstro (corpo a corpo) e Elfo (à distância).
      // Fase 1: só 1★ · Fase 2: 2★ a 4★ · Fase 3: todas 5★
      const enemyType: UnitType = Math.random() < 0.6 ? 'melee' : 'sniper';
      const stars = s.stage === 3 ? 5 : s.stage === 2 ? Math.floor(Math.random() * 3) + 2 : 1;
      const def = UNIT_DEFINITIONS[enemyType];
      const mult = STAR_MULTIPLIERS[stars];
      const hp = Math.floor(def.baseHp * mult);

      unlockBestiaryEntry(enemyType);

      s.enemyMonsters.push({
        id: `e${s.stage}_${Date.now()}_${Math.random()}`,
        col: 13,
        row: targetRow,
        team: 'enemy',
        type: enemyType,
        stars,
        r: 22,
        x: s.bases.enemy.x - 20,
        y: targetRow * CELL_H + CELL_H / 2,
        hp,
        maxHp: hp,
        // O Elfo do jogador fica parado, mas o inimigo precisa caminhar até entrar no alcance
        speed: def.speed > 0 ? def.speed : ENEMY_RANGED_SPEED,
        damage: Math.floor(def.dmg * mult),
        attackInterval: def.attackInterval,
        attackTimer: 0,
        hitAge: Infinity,
        emoji: def.emoji,
        dir: -1,
      });
    }

    // ENEMY AI SPELL CASTING (Fase 2 & Fase 3)
    // IA inteligente em momentos oportunos
    if (s.stage >= 2 && s.enemySpellTimer >= 1800) {
      s.enemySpellTimer = 0;

      // 1. Oportunidade de Cura: Se tiver monstros inimigos feridos (HP < 50%) na linha de frente
      if (s.enemyMana >= 50) {
        const woundedMonsters = s.enemyMonsters.filter(m => m.hp < m.maxHp * 0.55 && m.x < 11 * CELL_W);
        if (woundedMonsters.length > 0) {
          // Cast Heal on the most wounded cluster
          const target = woundedMonsters[0];
          s.enemyMana -= 50;

          s.spells.push({
            x: target.x,
            y: target.y,
            type: 'heal',
            life: 0.6,
            maxLife: 0.6,
            radius: CELL_W * 1.5,
          });

          // Heal nearby enemy monsters
          s.enemyMonsters.forEach(m => {
            if (Math.abs(m.x - target.x) <= CELL_W * 1.5 && Math.abs(m.y - target.y) <= CELL_H * 1.5) {
              m.hp = Math.min(m.maxHp, m.hp + 160);
              addFloatingText(m.x, m.y - m.r, '+160', '#4ade80');
            }
          });

          addFloatingText(target.x, target.y - 30, '💖 IA Curou Tropas!', '#4ade80');
          sound.playHeal();
        }
      }

      // 2. Oportunidade de Dano (Meteoro): Se o jogador tiver agrupamento de plantas ou monstros
      if (s.enemyMana >= 50) {
        // Encontra célula com maior concentração de unidades do jogador
        let bestTarget: { x: number; y: number; count: number } | null = null;
        for (let c = 1; c <= 5; c++) {
          for (let r = 0; r < ROWS; r++) {
            const plantsInArea = s.plants.filter(p => Math.abs(p.col - c) <= 1 && Math.abs(p.row - r) <= 1).length;
            const monstersInArea = s.playerMonsters.filter(m => Math.abs(m.col - c) <= 1 && Math.abs(m.row - r) <= 1).length;
            const total = plantsInArea + monstersInArea;
            const threshold = s.stage === 3 ? 1 : 2;
            if (total >= threshold) {
              if (!bestTarget || total > bestTarget.count) {
                bestTarget = { x: c * CELL_W + CELL_W / 2, y: r * CELL_H + CELL_H / 2, count: total };
              }
            }
          }
        }

        if (bestTarget) {
          s.enemyMana -= 50;

          s.spells.push({
            x: bestTarget.x,
            y: bestTarget.y,
            type: 'fireball',
            life: 0.5,
            maxLife: 0.5,
            radius: CELL_W * 1.3,
          });

          const targetCol = Math.floor(bestTarget.x / CELL_W);
          const targetRow = Math.floor(bestTarget.y / CELL_H);

          // Damage player units in 2x2
          s.plants.forEach(p => {
            if (Math.abs(p.col - targetCol) <= 1 && Math.abs(p.row - targetRow) <= 1) {
              applyDamage(p, s.stage === 3 ? 180 : 130, '#ef4444', p.y);
            }
          });
          s.playerMonsters.forEach(m => {
            if (Math.abs(m.col - targetCol) <= 1 && Math.abs(m.row - targetRow) <= 1) {
              applyDamage(m, s.stage === 3 ? 180 : 130, '#ef4444', m.y);
            }
          });
          s.barriers.forEach(b => {
            if (Math.abs(b.col - targetCol) <= 1 && Math.abs(b.row - targetRow) <= 1) {
              applyDamage(b, 120, '#cbd5e1', b.y);
            }
          });

          addFloatingText(bestTarget.x, bestTarget.y, '💥 Meteoro da IA!', '#f87171');
          sound.playFireball();
        }
      }
    }

    // Update Plants
    s.plants.forEach(p => {
      p.actionTimer += dt;
      p.shotAge = (p.shotAge ?? Infinity) + dt;
      p.hitAge = (p.hitAge ?? Infinity) + dt;
      if (p.type === 'sunplant') {
        const interval = Math.max(1500, 4200 - p.stars * 600);
        if (p.actionTimer >= interval) {
          s.sun += 25;
          setSun(s.sun);
          addFloatingText(p.x + p.w / 2, p.y, '+25 ☀️', '#fde047');
          p.actionTimer = 0;
        }
      } else if (p.type === 'sniper') {
        if (p.actionTimer >= SNIPER_INTERVAL) {
          // Elfo: Ataca continuamente na pista para derrubar o portão inimigo!
          if (s.bases.enemy.hp > 0) {
            // O tiro sai da boca do sprite
            const muzzle = getElfoMuzzle(plantSpriteSize(p), {
              customScale: PLANT_ELFO_SCALE,
              damaged: p.hp < p.maxHp * 0.5,
            });
            s.projectiles.push({
              x: p.x + p.w / 2 + muzzle.x,
              y: p.y + p.h / 2 + muzzle.y,
              row: p.row,
              team: 'player',
              source: 'sniper',
              damage: p.baseDmg,
              speed: 550,
              r: 8,
              active: true,
              dir: 1,
            });
            sound.playShoot();
            p.actionTimer = 0;
            p.shotAge = 0;
          }
        }
      } else if (p.type === 'coconut') {
        // Alvo: a tropa inimiga mais próxima na mesma pista, na frente ou atrás; sem nenhuma, a base inimiga.
        // O coco passa por cima do muro do meio, então as pedras nunca são alvo.
        const px = p.x + p.w / 2;
        let target: LobInstance['target'] = s.bases.enemy;
        let best = Infinity;
        for (const m of s.enemyMonsters) {
          if (m.row === p.row && m.hp > 0 && Math.abs(m.x - px) < best) {
            best = Math.abs(m.x - px);
            target = m;
          }
        }
        // Vira para o lado do alvo, mas não no meio de uma preparação ou arremesso
        const side = lobAimPoint(target, p.row).x < px ? -1 : 1;
        const busy = windupFor(p.actionTimer, COCONUT_INTERVAL) > 0 || (p.shotAge ?? Infinity) < 600;
        if (!busy) p.facing = side;
        const facing = p.facing ?? 1;
        if (p.actionTimer >= COCONUT_INTERVAL && s.bases.enemy.hp > 0) {
          const launch = getCoconutLaunch(plantSpriteSize(p), {
            customScale: PLANT_COCONUT_SCALE,
            damaged: p.hp < p.maxHp * 0.5,
            sinceAttack: 0,
          });
          const x0 = px + launch.x * facing;
          const y0 = p.y + p.h / 2 + launch.y;
          const aim = lobAimPoint(target, p.row);
          s.lobs.push({
            x0, y0, x: x0, y: y0, tx: aim.x, ty: aim.y, row: p.row,
            target,
            damage: p.baseDmg,
            age: 0,
            dur: Math.max(700, Math.abs(aim.x - x0) / 0.5),
            active: true,
          });
          sound.playShoot();
          p.actionTimer = 0;
          p.shotAge = 0;
        }
      }
    });

    // Update Monsters Movement & Combat
    const allMonsters = [...s.playerMonsters, ...s.enemyMonsters];
    allMonsters.forEach(m => {
      m.col = Math.floor(m.x / CELL_W);
      m.shotAge = (m.shotAge ?? Infinity) + dt;
      m.hitAge = (m.hitAge ?? Infinity) + dt;
      let isBlocked = false;
      let combatTarget: { hp: number; x?: number; y?: number; w?: number; h?: number; r?: number } | null = null;

      const opponents = m.team === 'player' ? s.enemyMonsters : s.playerMonsters;

      // 1. Collide with opponent monster in same row
      for (const opp of opponents) {
        if (opp.row === m.row) {
          const dist = Math.abs(opp.x - m.x);
          if (dist < (m.r + opp.r + 4)) {
            if ((m.dir === 1 && opp.x > m.x) || (m.dir === -1 && opp.x < m.x)) {
              isBlocked = true;
              combatTarget = opp;
              break;
            }
          }
        }
      }

      // 2. Collide with stone barriers
      if (!isBlocked) {
        for (const bar of s.barriers) {
          if (bar.row === m.row) {
            const barCenterX = bar.x + bar.w / 2;
            const dist = Math.abs(barCenterX - m.x);
            if (dist < (m.r + bar.w / 2)) {
              if ((m.dir === 1 && barCenterX > m.x) || (m.dir === -1 && barCenterX < m.x)) {
                isBlocked = true;
                combatTarget = bar;
                break;
              }
            }
          }
        }
      }

      // 3. Enemy attacks player plants in lane
      if (!isBlocked && m.team === 'enemy') {
        for (const plant of s.plants) {
          if (plant.row === m.row) {
            const plantCenterX = plant.x + plant.w / 2;
            if (Math.abs(plantCenterX - m.x) < (m.r + plant.w / 2) && m.x > plantCenterX) {
              isBlocked = true;
              combatTarget = plant;
              break;
            }
          }
        }
      }

      // 4. Attack Bases
      if (!isBlocked) {
        if (m.team === 'player' && m.x + m.r >= s.bases.enemy.x) {
          isBlocked = true;
          combatTarget = s.bases.enemy;
        } else if (m.team === 'enemy' && m.x - m.r <= s.bases.player.x + s.bases.player.w) {
          isBlocked = true;
          combatTarget = s.bases.player;
        }
      }

      // 5. Inimigos à distância param e atiram quando há alvo no alcance
      const isRanged = m.team === 'enemy' && RANGED_TYPES.has(m.type);
      if (isRanged) {
        let nearest = Infinity;
        for (const opp of s.playerMonsters) {
          if (opp.row === m.row && opp.x < m.x) nearest = Math.min(nearest, m.x - opp.x);
        }
        for (const plant of s.plants) {
          if (plant.row === m.row && plant.x + plant.w / 2 < m.x) nearest = Math.min(nearest, m.x - (plant.x + plant.w));
        }
        for (const bar of s.barriers) {
          if (bar.row === m.row && bar.x + bar.w / 2 < m.x) nearest = Math.min(nearest, m.x - (bar.x + bar.w));
        }
        nearest = Math.min(nearest, m.x - (s.bases.player.x + s.bases.player.w));

        if (nearest <= ENEMY_RANGE) {
          m.attackTimer += dt;
          m.isMoving = false;
          if (m.attackTimer >= m.attackInterval) {
            const muzzle = getElfoMuzzle(monsterSpriteSize(m), { damaged: m.hp < m.maxHp * 0.5 });
            s.projectiles.push({
              // Inimigos são desenhados espelhados
              x: m.x - muzzle.x,
              y: m.y + muzzle.y,
              row: m.row,
              team: 'enemy',
              source: m.type as UnitType,
              damage: m.damage,
              speed: 550,
              r: 6,
              active: true,
              dir: -1,
            });
            sound.playShoot();
            m.attackTimer = 0;
            m.shotAge = 0;
          }
          return;
        }
      }

      // Execute attack or advance
      m.isMoving = !(isBlocked && combatTarget);
      if (isBlocked && combatTarget) {
        m.attackTimer += dt;
        if (m.attackTimer >= m.attackInterval) {
          applyDamage(combatTarget, m.damage, m.team === 'player' ? '#fde047' : '#ef4444', m.y);
          m.attackTimer = 0;
          m.shotAge = 0;
        }
      } else {
        m.x += (m.speed * dt / 1000) * m.dir;
      }
    });

    // Update Projectiles
    s.projectiles.forEach(p => {
      const startX = p.x;
      p.x += (p.speed * dt / 1000) * p.dir;
      // Varredura entre a posição anterior e a atual evita que projéteis rápidos atravessem alvos
      const minX = Math.min(startX, p.x) - p.r;
      const maxX = Math.max(startX, p.x) + p.r;
      const overlaps = (left: number, right: number) => maxX >= left && minX <= right;

      let hitTarget: { hp: number; x?: number; y?: number; w?: number; h?: number; r?: number } | null = null;

      const opponents = p.team === 'player' ? s.enemyMonsters : s.playerMonsters;
      for (const opp of opponents) {
        if (opp.row === p.row && overlaps(opp.x - opp.r, opp.x + opp.r)) {
          hitTarget = opp;
          break;
        }
      }

      if (!hitTarget && p.team === 'enemy') {
        for (const plant of s.plants) {
          if (plant.row === p.row && overlaps(plant.x, plant.x + plant.w)) {
            hitTarget = plant;
            break;
          }
        }
      }

      if (!hitTarget) {
        for (const bar of s.barriers) {
          if (bar.row === p.row && overlaps(bar.x, bar.x + bar.w)) {
            hitTarget = bar;
            break;
          }
        }
      }

      if (!hitTarget) {
        if (p.team === 'player' && p.x >= s.bases.enemy.x) {
          hitTarget = s.bases.enemy;
        } else if (p.team === 'enemy' && p.x <= s.bases.player.x + s.bases.player.w) {
          hitTarget = s.bases.player;
        }
      }

      if (hitTarget) {
        applyDamage(hitTarget, p.damage, p.team === 'player' ? '#fde047' : '#ef4444', p.y);
        p.active = false;
      }
    });

    // Update Coconut lobs: arco por cima do muro, sem colidir com nada no caminho
    s.lobs.forEach(l => {
      l.age += dt;
      if (l.target.hp > 0) {
        const aim = lobAimPoint(l.target, l.row);
        l.tx = aim.x;
        l.ty = aim.y;
      }
      const u = Math.min(1, l.age / l.dur);
      l.x = l.x0 + (l.tx - l.x0) * u;
      l.y = l.y0 + (l.ty - l.y0) * u - (COCONUT_ARC + Math.max(0, l.y0 - l.ty)) * 4 * u * (1 - u);
      if (u >= 1) {
        l.active = false;
        if (l.target.hp > 0) applyDamage(l.target, l.damage, '#fde047', l.ty);
        s.spells.push({ type: 'coconut', x: l.tx, y: l.ty, radius: 26, life: 0.35, maxLife: 0.35 });
      }
    });

    // Update Spell visual effects
    s.spells.forEach(spell => {
      spell.life -= dt / 1000;
    });

    // Update Floating texts
    s.floatingTexts.forEach(ft => {
      ft.y += (ft.velocity * dt) / 1000;
      ft.life -= dt / 1000;
    });

    // Clean up dead units
    for (let i = s.plants.length - 1; i >= 0; i--) {
      if (s.plants[i].hp <= 0) s.plants.splice(i, 1);
    }
    for (let i = s.playerMonsters.length - 1; i >= 0; i--) {
      if (s.playerMonsters[i].hp <= 0) s.playerMonsters.splice(i, 1);
    }
    for (let i = s.enemyMonsters.length - 1; i >= 0; i--) {
      if (s.enemyMonsters[i].hp <= 0) {
        statsKillsRef.current++;
        s.enemyMonsters.splice(i, 1);
      }
    }
    for (let i = s.barriers.length - 1; i >= 0; i--) {
      if (s.barriers[i].hp <= 0) s.barriers.splice(i, 1);
    }
    for (let i = s.projectiles.length - 1; i >= 0; i--) {
      if (!s.projectiles[i].active || s.projectiles[i].x < 0 || s.projectiles[i].x > CANVAS_WIDTH) {
        s.projectiles.splice(i, 1);
      }
    }
    for (let i = s.lobs.length - 1; i >= 0; i--) {
      if (!s.lobs[i].active) s.lobs.splice(i, 1);
    }
    for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
      if (s.floatingTexts[i].life <= 0) s.floatingTexts.splice(i, 1);
    }
    for (let i = s.spells.length - 1; i >= 0; i--) {
      if (s.spells[i].life <= 0) s.spells.splice(i, 1);
    }

    // Check Victory / Defeat conditions
    if (s.bases.player.hp <= 0 && !s.isOver) {
      s.isOver = true;
      setGameOverResult('defeat');
      const dropRes = recordBattleResult(false, statsKillsRef.current, s.wave, s.stage);
      setLastBattleDrop(dropRes);
      sound.playDefeat();
    } else if (s.bases.enemy.hp <= 0 && !s.isOver) {
      s.isOver = true;
      setGameOverResult('victory');
      const dropRes = recordBattleResult(true, statsKillsRef.current, s.wave, s.stage);
      setLastBattleDrop(dropRes);
      sound.playVictory();
    }
  };

  // Render Canvas
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = gameStateRef.current;

    // Cenário fixo (grama, horizonte e as duas árvores) em tela cheia
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CANVAS_WIDTH, VIEW_HEIGHT);
    const scene = getSceneLayer(s.stage);
    if (scene) ctx.drawImage(scene, 0, 0);
    renderSceneGlow(ctx, Date.now());

    // Daqui em diante tudo é desenhado nas coordenadas da grade
    ctx.translate(0, GRID_TOP);

    // Zona onde o jogador pode posicionar (colunas 1 a 5), só aparece com algo selecionado
    if (selectedActionRef.current?.kind === 'unit' || draggedUnitRef.current) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(CELL_W, 0, CELL_W * 5, CANVAS_HEIGHT);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      for (let r = 1; r < ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(CELL_W, r * CELL_H);
        ctx.lineTo(CELL_W * 6, r * CELL_H);
        ctx.stroke();
      }
      for (let c = 2; c <= 5; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL_W, 0);
        ctx.lineTo(c * CELL_W, CANVAS_HEIGHT);
        ctx.stroke();
      }
    }

    // ------------------------------------------------------------------------
    // PRÉVIA TÁTICA DA MAGIA / TROPAS (SPELL GRID AREA PREVIEW)
    // ------------------------------------------------------------------------
    const currentAction = selectedActionRef.current;
    const activeSpellId = (currentAction?.kind === 'spell' ? currentAction.id : draggedSpellRef.current);
    const activeUnit = (currentAction?.kind === 'unit' ? currentAction.unit : draggedUnitRef.current);

    if (s.hoverCol >= 0 && s.hoverRow >= 0 && !s.isOver) {
      if (activeSpellId === 'thunder') {
        ctx.save();
        const colX = s.hoverCol * CELL_W;
        ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
        ctx.fillRect(colX + 2, 2, CELL_W - 4, CANVAS_HEIGHT - 4);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(colX + 2, 2, CELL_W - 4, CANVAS_HEIGHT - 4);

        s.enemyMonsters.forEach(m => {
          if (m.col === s.hoverCol) {
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r + 6, 0, Math.PI * 2);
            ctx.stroke();
          }
        });

        const bannerText = '⚡ RAIO (Coluna inteira: 90 Dano) · Solte ou Clique Aqui';
        ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
        const bannerW = ctx.measureText(bannerText).width + 20;
        const bannerX = Math.max(8, Math.min(CANVAS_WIDTH - bannerW - 8, colX + CELL_W / 2 - bannerW / 2));
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.roundRect(bannerX, 8, bannerW, 22, 6);
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bannerText, bannerX + bannerW / 2, 19);
        ctx.restore();
      } else if (activeSpellId) {
        const isHeal = activeSpellId === 'heal';
        const spellColor = isHeal ? '#22c55e' : '#ef4444';
        const spellFill = isHeal ? 'rgba(34, 197, 94, 0.32)' : 'rgba(239, 68, 68, 0.36)';
        const spellBorder = isHeal ? '#4ade80' : '#f87171';

        // Área 3x3 centrada em (hoverCol, hoverRow)
        const minC = Math.max(0, s.hoverCol - 1);
        const maxC = Math.min(COLS - 1, s.hoverCol + 1);
        const minR = Math.max(0, s.hoverRow - 1);
        const maxR = Math.min(ROWS - 1, s.hoverRow + 1);

        ctx.save();

        // 1. Desenha cada quadrado individual da grade com brilho e borda
        for (let c = minC; c <= maxC; c++) {
          for (let r = minR; r <= maxR; r++) {
            const sqX = c * CELL_W;
            const sqY = r * CELL_H;
            const isCenter = c === s.hoverCol && r === s.hoverRow;

            // Preenchimento do quadrado
            ctx.fillStyle = isCenter ? (isHeal ? 'rgba(34, 197, 94, 0.45)' : 'rgba(239, 68, 68, 0.48)') : spellFill;
            ctx.fillRect(sqX + 2, sqY + 2, CELL_W - 4, CELL_H - 4);

            // Borda do quadrado
            ctx.strokeStyle = spellBorder;
            ctx.lineWidth = isCenter ? 2.5 : 1.5;
            ctx.strokeRect(sqX + 2, sqY + 2, CELL_W - 4, CELL_H - 4);

            // Cantoneiras táticas (grid crosshairs)
            const tick = 8;
            ctx.strokeStyle = spellColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sqX + 3, sqY + 3 + tick); ctx.lineTo(sqX + 3, sqY + 3); ctx.lineTo(sqX + 3 + tick, sqY + 3);
            ctx.moveTo(sqX + CELL_W - 3 - tick, sqY + 3); ctx.lineTo(sqX + CELL_W - 3, sqY + 3); ctx.lineTo(sqX + CELL_W - 3, sqY + 3 + tick);
            ctx.moveTo(sqX + 3, sqY + CELL_H - 3 - tick); ctx.lineTo(sqX + 3, sqY + CELL_H - 3); ctx.lineTo(sqX + 3 + tick, sqY + CELL_H - 3);
            ctx.moveTo(sqX + CELL_W - 3 - tick, sqY + CELL_H - 3); ctx.lineTo(sqX + CELL_W - 3, sqY + CELL_H - 3); ctx.lineTo(sqX + CELL_W - 3, sqY + CELL_H - 3 - tick);
            ctx.stroke();
          }
        }

        // 2. Destaca visualmente os alvos dentro dos quadrados
        if (isHeal) {
          s.plants.forEach(p => {
            if (p.col >= minC && p.col <= maxC && p.row >= minR && p.row <= maxR) {
              ctx.strokeStyle = '#4ade80';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2 + 5, 0, Math.PI * 2);
              ctx.stroke();
            }
          });
          s.playerMonsters.forEach(m => {
            if (m.col >= minC && m.col <= maxC && m.row >= minR && m.row <= maxR) {
              ctx.strokeStyle = '#4ade80';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(m.x, m.y, m.r + 6, 0, Math.PI * 2);
              ctx.stroke();
            }
          });
        } else {
          s.enemyMonsters.forEach(m => {
            if (m.col >= minC && m.col <= maxC && m.row >= minR && m.row <= maxR) {
              ctx.strokeStyle = '#f87171';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(m.x, m.y, m.r + 6, 0, Math.PI * 2);
              ctx.stroke();
            }
          });
          s.barriers.forEach(b => {
            if (b.col >= minC && b.col <= maxC && b.row >= minR && b.row <= maxR) {
              ctx.strokeStyle = '#f87171';
              ctx.lineWidth = 2.5;
              ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
            }
          });
        }

        // 3. Retículo central
        const centerX = s.hoverCol * CELL_W + CELL_W / 2;
        const centerY = s.hoverRow * CELL_H + CELL_H / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
        ctx.fillStyle = isHeal ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
        ctx.fill();
        ctx.strokeStyle = spellColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = '22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isHeal ? '💖' : '🔥', centerX, centerY);

        // 4. Banner informativo acima dos quadrados
        const bannerText = isHeal 
          ? '💖 CURA (Área 3x3: +150 HP) · Solte ou Clique Aqui' 
          : '🔥 METEORO (Área 3x3: 140 Dano) · Solte ou Clique Aqui';

        ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
        const textMetrics = ctx.measureText(bannerText);
        const bannerW = textMetrics.width + 20;
        const bannerH = 22;
        const bannerX = Math.max(8, Math.min(CANVAS_WIDTH - bannerW - 8, centerX - bannerW / 2));
        const bannerY = Math.max(8, minR * CELL_H - bannerH - 6);

        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 6);
        ctx.fill();
        ctx.strokeStyle = spellColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bannerText, bannerX + bannerW / 2, bannerY + bannerH / 2);

        ctx.restore();
      } else if (activeUnit) {
        const isValid = s.hoverCol >= 1 && s.hoverCol <= 5;
        ctx.fillStyle = isValid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
        ctx.fillRect(s.hoverCol * CELL_W, s.hoverRow * CELL_H, CELL_W, CELL_H);
        ctx.strokeStyle = isValid ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(s.hoverCol * CELL_W, s.hoverRow * CELL_H, CELL_W, CELL_H);
      }
    }

    // Draw Stone Barriers
    s.barriers.forEach(b => renderStonePillar(ctx, b));

    // Draw Plants with 2D Illustrated Animated Sprites
    s.plants.forEach(p => {
      // Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + p.h - 4, p.w / 2.3, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Render Animated Sprite
      renderUnitSprite(
        ctx,
        p.type,
        'player',
        p.x + p.w / 2,
        p.y + p.h / 2,
        plantSpriteSize(p),
        {
          stars: p.stars,
          time: Date.now(),
          isAttacking: p.actionTimer > 800,
          scaleX: p.type === 'coconut' ? (p.facing ?? 1) : 1,
          ...(p.type === 'sniper' ? {
            customScale: PLANT_ELFO_SCALE,
            attackWindup: windupFor(p.actionTimer, SNIPER_INTERVAL),
            sinceAttack: p.shotAge,
            damaged: p.hp < p.maxHp * 0.5,
          } : {}),
          ...(p.type === 'peanut' ? {
            customScale: PLANT_PEANUT_SCALE,
            sinceHit: p.hitAge,
            damaged: p.hp < p.maxHp * 0.5,
          } : {}),
          ...(p.type === 'coconut' ? {
            customScale: PLANT_COCONUT_SCALE,
            attackWindup: windupFor(p.actionTimer, COCONUT_INTERVAL),
            sinceAttack: p.shotAge,
            sinceHit: p.hitAge,
            damaged: p.hp < p.maxHp * 0.5,
          } : {}),
        }
      );

      // Star indicator
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText('★'.repeat(p.stars), p.x + p.w / 2, p.y - 4);
      ctx.shadowBlur = 0;

      if (p.hp < p.maxHp) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(p.x + 4, p.y - 12, p.w - 8, 5);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(p.x + 4, p.y - 12, (p.w - 8) * Math.max(0, p.hp / p.maxHp), 5);
      }
    });

    // Draw Monsters with 2D Illustrated Animated Sprites
    const drawMonster = (m: MonsterInstance) => {
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.beginPath();
      ctx.ellipse(m.x, m.y + m.r - 2, m.r * 1.1, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Render Animated Sprite
      renderUnitSprite(
        ctx,
        m.type,
        m.team,
        m.x,
        m.y,
        monsterSpriteSize(m),
        {
          stars: m.stars,
          time: Date.now(),
          isAttacking: m.attackTimer > (m.attackInterval * 0.65),
          scaleX: m.team === 'enemy' ? -1 : 1,
          attackWindup: windupFor(m.attackTimer, m.attackInterval),
          sinceAttack: m.shotAge,
          damaged: m.hp < m.maxHp * 0.5,
          isMoving: m.isMoving,
          sinceHit: m.hitAge,
        }
      );

      // Star rating indicator (both player and enemy!)
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = m.team === 'player' ? '#fde047' : (m.stars === 5 ? '#fbbf24' : '#f87171');
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText('★'.repeat(m.stars), m.x, m.y - m.r - 8);
      ctx.shadowBlur = 0;

      // HP Bar
      if (m.hp < m.maxHp) {
        const barW = m.r * 1.8;
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(m.x - barW / 2, m.y - m.r - 6, barW, 4);
        ctx.fillStyle = m.team === 'player' ? '#38bdf8' : '#f87171';
        ctx.fillRect(m.x - barW / 2, m.y - m.r - 6, barW * Math.max(0, m.hp / m.maxHp), 4);
      }
    };

    s.playerMonsters.forEach(drawMonster);
    s.enemyMonsters.forEach(drawMonster);

    // Draw Projectiles
    s.projectiles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      // Semente disparada pelo Elfo: dourada para o jogador, vermelha para o inimigo
      const isPlayerShot = p.team === 'player';
      const seed = ctx.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.1, p.x, p.y, p.r);
      seed.addColorStop(0, isPlayerShot ? '#fef9c3' : '#ffe4e6');
      seed.addColorStop(0.45, isPlayerShot ? '#facc15' : '#fb7185');
      seed.addColorStop(1, isPlayerShot ? '#a16207' : '#9f1239');
      ctx.fillStyle = seed;
      ctx.shadowColor = isPlayerShot ? '#fde047' : '#fb7185';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Cocos em voo (sombra no chão + coco girando)
    s.lobs.forEach(l => {
      const u = Math.min(1, l.age / l.dur);
      const groundY = l.y0 + (l.ty - l.y0) * u + 18;
      ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.15 * u})`;
      ctx.beginPath();
      ctx.ellipse(l.x, groundY, 6 + 6 * u, 3 + 2 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      drawCoconutPod(ctx, l.x, l.y, 26, l.age * 0.012);
    });

    // Draw Spells
    s.spells.forEach(spell => {
      const progress = 1 - (spell.life / spell.maxLife);
      ctx.save();
      ctx.globalAlpha = Math.max(0, spell.life / spell.maxLife);

      if (spell.type === 'heal') {
        ctx.beginPath();
        ctx.arc(spell.x, spell.y, progress * spell.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.35)';
        ctx.fill();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 4;
        ctx.stroke();
      } else if (spell.type === 'fireball') {
        ctx.beginPath();
        ctx.arc(spell.x, spell.y, progress * spell.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(spell.x, spell.y, (progress * spell.radius) / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(253, 224, 71, 0.8)';
        ctx.fill();
      } else if (spell.type === 'coconut') {
        // Impacto do coco: anel verde e lascas
        ctx.strokeStyle = '#a3e635';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(spell.x, spell.y, 6 + progress * spell.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#4d7c0f';
        for (let j = 0; j < 6; j++) {
          const ang = (j / 6) * Math.PI * 2 + 0.4;
          const rr = 6 + progress * spell.radius * 1.2;
          ctx.fillRect(spell.x + Math.cos(ang) * rr - 2, spell.y + Math.sin(ang) * rr * 0.6 - 2, 4, 4);
        }
      } else if (spell.type === 'thunder') {
        // Relâmpago em zigue-zague de cima a baixo da coluna
        ctx.strokeStyle = '#fde047';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 4;
        ctx.beginPath();
        const segments = 10;
        for (let i = 0; i <= segments; i++) {
          const yy = (CANVAS_HEIGHT / segments) * i;
          const xx = spell.x + (i % 2 === 0 ? -1 : 1) * spell.radius * 0.45 * Math.random();
          if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
        ctx.fillStyle = 'rgba(250, 204, 21, 0.18)';
        ctx.fillRect(spell.x - spell.radius, 0, spell.radius * 2, CANVAS_HEIGHT);
      }
      ctx.restore();
    });

    // Draw Floating Texts
    s.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.font = 'bold 18px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  };

  updateGameRef.current = updateGame;
  renderGameRef.current = renderGame;

  const currentStageConfig = STAGE_CONFIGS[selectedStage];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4">
      {/* Stage Selector Banner */}
      <div className="bg-slate-900/95 border border-slate-800 p-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Modo de Farming por Fase:
          </span>
        </div>

        {/* 3 Stage Selector Buttons */}
        <div className="flex items-center gap-2">
          {([1, 2, 3] as StageId[]).map((stId) => {
            const conf = STAGE_CONFIGS[stId];
            const isActive = selectedStage === stId;

            return (
              <button
                key={stId}
                onClick={() => switchStage(stId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  isActive
                    ? stId === 3 
                      ? 'bg-rose-900/80 text-rose-200 border-rose-500 shadow-lg shadow-rose-950/60' 
                      : stId === 2
                      ? 'bg-amber-900/80 text-amber-200 border-amber-500 shadow-lg shadow-amber-950/60'
                      : 'bg-emerald-900/80 text-emerald-200 border-emerald-500 shadow-lg shadow-emerald-950/60'
                    : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>Fase {stId}</span>
                <span className="text-[10px] opacity-80 hidden sm:inline">({conf.badge})</span>
              </button>
            );
          })}
        </div>

        {/* Current Stage Farming Drop info */}
        <div className="text-xs text-amber-300 font-mono bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
          🎁 Recompensa: <strong className="text-white">{currentStageConfig.dropRateText}</strong>
        </div>
      </div>

      {/* Campo de batalha (a moldura amarela faz parte do cenário pintado) com o HUD por cima */}
      <div className="shadow-2xl">
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden bg-emerald-900"
        style={{ aspectRatio: `${CANVAS_WIDTH} / ${VIEW_HEIGHT}` }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={VIEW_HEIGHT}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="absolute inset-0 w-full h-full block cursor-crosshair"
        />

        {/* HUD desenhado nas mesmas coordenadas do canvas (1120 x 646) e escalado junto */}
        <div
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: CANVAS_WIDTH, height: VIEW_HEIGHT, transform: `scale(${hudScale})`, transformOrigin: '0 0', fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          {/* Todas as posições abaixo seguem a imagem do cenário (1120 x 681) */}
          {/* Vida das bases dentro das esferas vermelhas */}
          <OrbOverlay hp={hud.playerHp} max={hud.playerMax} cx={59} cy={60} r={39} label="Sua base" />
          <OrbOverlay hp={hud.enemyHp} max={hud.enemyMax} cx={1065} cy={60} r={39} label="Base inimiga" />

          {/* Sol e Carne nas pílulas brancas */}
          {[{ v: sun, y: 37, tip: 'Sol: compra plantas' }, { v: meat, y: 72, tip: 'Carne: compra monstros' }].map(r => (
            <div key={r.y} title={r.tip} className="absolute flex items-center justify-end pointer-events-auto"
              style={{ left: 214, top: r.y - 14, width: 61, height: 28 }}>
              <span style={{ fontSize: 21, color: '#1f1f1f', fontFamily: '"Arial Black", Arial, sans-serif', letterSpacing: -0.5 }}>{Math.floor(r.v)}</span>
            </div>
          ))}

          {/* Caixinhas das tropas (as 3 últimas com cadeado já fazem parte do cenário) */}
          {SLOT_LEFT.slice(0, 7).map((left, idx) => {
            const unit = idx < 6 ? inventory.find(u => u.id === activeDeck[idx]) : undefined;
            if (!unit) return null;
            const uDef = UNIT_DEFINITIONS[unit.type];
            const isSelected = selectedAction?.kind === 'unit' && selectedAction.id === unit.id;
            const hasAfford = uDef.res === 'sun' ? sun >= uDef.cost : meat >= uDef.cost;
            const cd = hud.cooldowns[`u:${unit.type}`] ?? 0;
            return (
              <div
                key={unit.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('kind', 'unit');
                  e.dataTransfer.setData('data', JSON.stringify(unit));
                  draggedUnitRef.current = unit;
                }}
                onDragEnd={() => {
                  draggedUnitRef.current = null;
                }}
                onClick={() => setSelectedAction(isSelected ? null : { kind: 'unit', id: unit.id, unit })}
                title={`${uDef.name} ${'★'.repeat(unit.stars)} · ${uDef.cost} ${uDef.res === 'sun' ? 'Sol' : 'Carne'} · recarga ${(UNIT_COOLDOWNS[unit.type] ?? 5000) / 1000}s`}
                className="absolute cursor-pointer overflow-hidden pointer-events-auto"
                style={{
                  left: left + 2,
                  top: 23,
                  width: 60,
                  height: 63,
                  outline: isSelected ? '2px solid #ffe14a' : undefined,
                  boxShadow: isSelected ? '0 0 10px 3px rgba(255,225,74,0.85)' : undefined,
                  filter: hasAfford ? undefined : 'grayscale(0.9) brightness(0.6)',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: 6 }}>
                  <UnitSpriteCanvas type={unit.type} stars={unit.stars} size={60} />
                </div>
                <div className="absolute left-0.5 bottom-0 flex items-center gap-[2px]" style={{ height: 18 }}>
                  {uDef.res === 'sun'
                    ? <span className="inline-block rounded-full" style={{ width: 13, height: 13, background: 'radial-gradient(circle at 35% 35%,#fff6a0,#f2c200 55%,#b98a00)', border: '1px solid #8a6500' }} />
                    : <span style={{ fontSize: 13, lineHeight: 1 }}>🍗</span>}
                  <span style={{ fontSize: 15, color: '#fff', fontFamily: 'Arial, sans-serif', fontWeight: 700, WebkitTextStroke: '2px #000', paintOrder: 'stroke fill' }}>{uDef.cost}</span>
                </div>
                <CardCooldown remaining={cd} total={UNIT_COOLDOWNS[unit.type] ?? 5000} />
              </div>
            );
          })}

          {/* Botões do canto esquerdo: menu, pausa e velocidade */}
          {[
            { y: 535, title: 'Menu principal', onClick: onBackToMenu, active: false },
            { y: 566, title: isPaused ? 'Continuar' : 'Pausar', onClick: () => setIsPaused(prev => !prev), active: isPaused },
            { y: 599, title: 'Velocidade 2x', onClick: () => setGameSpeed(2), active: gameSpeed === 2 },
            { y: 632, title: 'Velocidade normal', onClick: () => setGameSpeed(1), active: false },
          ].map(btn => (
            <button key={btn.y} onClick={btn.onClick} title={btn.title} aria-label={btn.title}
              className="absolute pointer-events-auto rounded-[3px] hover:bg-white/20"
              style={{ left: 20, top: btn.y, width: 24, height: 24, boxShadow: btn.active ? '0 0 0 2px #ffe14a, 0 0 6px 2px rgba(255,225,74,0.8)' : undefined }} />
          ))}

          {/* Número do frasco de mana */}
          <div className="absolute flex items-center justify-center rounded-full pointer-events-auto" title={`Mana: ${Math.floor(mana)} / 100`}
            style={{ left: 424 - 13, top: 636 - 10, width: 26, height: 20, background: 'radial-gradient(circle,#1f2a3a,#0b111b)', border: '1px solid rgba(255,255,255,0.7)' }}>
            <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>{Math.floor(mana)}</span>
          </div>

          {/* Magias nos círculos verdes */}
          {[SPELL_DEFINITIONS.heal, SPELL_DEFINITIONS.fireball, SPELL_DEFINITIONS.thunder].map((sp, idx) => {
            const cx = SPELL_CX[idx];
            const isSelected = selectedAction?.kind === 'spell' && selectedAction.id === sp.id;
            const canCast = mana >= sp.cost;
            const cd = hud.cooldowns[`s:${sp.id}`] ?? 0;
            const label = sp.id === 'heal' ? 'Cura 3x3' : sp.id === 'fireball' ? 'Meteoro 3x3' : 'Raio Coluna';
            return (
              <div
                key={sp.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('kind', 'spell');
                  e.dataTransfer.setData('data', sp.id);
                  draggedSpellRef.current = sp.id;
                }}
                onDragEnd={() => {
                  draggedSpellRef.current = null;
                }}
                onClick={() => setSelectedAction(isSelected ? null : { kind: 'spell', id: sp.id })}
                title={`${label} · ${sp.cost} de mana · recarga ${(SPELL_COOLDOWNS[sp.id] ?? 6000) / 1000}s`}
                aria-label={label}
                className="absolute rounded-full cursor-pointer flex items-center justify-center pointer-events-auto"
                style={{
                  left: cx - 19,
                  top: 632 - 19,
                  width: 38,
                  height: 38,
                  boxShadow: isSelected ? '0 0 0 2px #ffe14a, 0 0 10px 3px rgba(255,225,74,0.85)' : undefined,
                  filter: canCast ? undefined : 'grayscale(0.9) brightness(0.7)',
                }}
              >
                <SpellIcon id={sp.id} size={30} />
                <OrbCooldown remaining={cd} total={SPELL_COOLDOWNS[sp.id] ?? 6000} />
              </div>
            );
          })}

          {/* Setinhas de velocidade ao lado dos círculos */}
          <button className="absolute pointer-events-auto" style={{ left: 715, top: 612, width: 19, height: 20 }} onClick={() => setGameSpeed(2)} title="Velocidade 2x" aria-label="Alternar velocidade" />
          <button className="absolute pointer-events-auto" style={{ left: 715, top: 634, width: 19, height: 20 }} onClick={() => setGameSpeed(1)} title="Velocidade normal" aria-label="Velocidade normal" />

          {/* Barra vermelha: a parte que falta até a próxima onda fica escura */}
          <div className="absolute pointer-events-auto" title={`Onda ${currentWave}: tempo até a próxima`}
            style={{ left: 411 + 318 * Math.min(1, hud.waveProgress), top: 659, width: 318 * (1 - Math.min(1, hud.waveProgress)), height: 6, background: 'rgba(40,0,0,0.75)' }} />
        </div>

        {/* Game Over Overlay */}
        {gameOverResult && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30">
            <div className="text-center max-w-lg flex flex-col items-center gap-4">
              {gameOverResult === 'victory' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/50 shadow-lg shadow-emerald-500/30">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="font-cinzel text-3xl font-extrabold text-emerald-400 tracking-wider">
                      VITÓRIA NA FASE {selectedStage}!
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      {currentStageConfig.name}: O portão inimigo caiu perante sua estratégia!
                    </p>
                  </div>

                  {/* Drop Farming Outcome Card */}
                  {lastBattleDrop && (
                    <div className={`w-full p-4 rounded-xl border flex flex-col items-center gap-2 ${
                      lastBattleDrop.dropped
                        ? 'bg-slate-900 border-emerald-500/60 shadow-xl shadow-emerald-950/50'
                        : 'bg-slate-900 border-amber-500/40'
                    }`}>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                        {lastBattleDrop.dropped ? (
                          <span className="text-emerald-400 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            Drop de Farming Conquistado com Sucesso!
                          </span>
                        ) : (
                          <span className="text-amber-400">
                            Sem Drop Desta Vez (50% de Chance)
                          </span>
                        )}
                      </div>

                      {lastBattleDrop.dropped ? (
                        <div className="flex flex-wrap items-center justify-center gap-3 my-1">
                          {lastBattleDrop.stones.B > 0 && (
                            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-blue-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-blue-900/50">
                              <div className="w-3 h-3 rounded-full bg-blue-500" />
                              <span>+{lastBattleDrop.stones.B} Pedra Azul</span>
                            </div>
                          )}
                          {lastBattleDrop.stones.G > 0 && (
                            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-emerald-900/50">
                              <div className="w-3 h-3 rounded-full bg-emerald-500" />
                              <span>+{lastBattleDrop.stones.G} Pedra Verde</span>
                            </div>
                          )}
                          {lastBattleDrop.stones.R > 0 && (
                            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-rose-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-rose-900/50">
                              <div className="w-3 h-3 rounded-full bg-rose-500" />
                              <span>+{lastBattleDrop.stones.R} Pedra Vermelha</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 text-center">
                          A sorte não sorriu desta vez. Jogue novamente para farmar pedras para seus crafts!
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/50 shadow-lg shadow-rose-500/30">
                    <Skull className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="font-cinzel text-3xl font-extrabold text-rose-400 tracking-wider">
                      SUA MURALHA CAIU!
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      {currentStageConfig.aiLevel} sobrecarregou suas defesas.
                    </p>
                  </div>
                  <div className="w-full p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-400">
                    Dica: Forje tropas de maior raridade de estrelas ou use a Fase 1 para farmar pedras com mais facilidade antes de encarar desafios maiores!
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
                <button
                  onClick={() => resetGame()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Farmar Novamente (Fase {selectedStage})</span>
                </button>

                {gameOverResult === 'victory' && selectedStage < 3 && (
                  <button
                    onClick={() => switchStage((selectedStage + 1) as StageId)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                  >
                    <span>Avançar Fase {selectedStage + 1}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={onGoToCrafting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Ir para Forja</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      </div>
    </div>
  );
};
