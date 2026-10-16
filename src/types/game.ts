export type ResourceType = 'sun' | 'meat';
export type UnitCategory = 'plant' | 'monster';
export type ElementStone = 'B' | 'G' | 'R';
export type ElementType = 'Luz' | 'Floresta' | 'Arcano' | 'Fogo' | 'Gelo' | 'Terra' | 'Trovão' | 'Sombra';

// Tropas ativas. As chaves internas foram mantidas para não quebrar saves antigos:
// 'melee' = Monstro, 'sniper' = Planta (atiradora).
export type UnitType = 
  | 'sunplant' 
  | 'melee' 
  | 'sniper'
  | 'peanut'
  | 'coconut';

export interface UnitDefinition {
  type: UnitType;
  name: string;
  title: string;
  category: UnitCategory;
  element: ElementType;
  res: ResourceType;
  cost: number;
  baseHp: number;
  dmg: number;
  speed: number;
  emoji: string;
  desc: string;
  lore: string;
  tacticalRole: string;
  attackInterval: number; // in ms
  color: string;
}

export interface PlayerUnit {
  id: string;
  type: UnitType;
  stars: number; // 1 to 5
  timestamp: number;
}

export interface CraftHistoryEntry {
  id: string;
  success: boolean;
  type?: UnitType;
  stars?: number;
  hp?: number;
  dmg?: number;
  timestamp: number;
  recipeCode: string;
}

export type ScreenType = 'menu' | 'crafting' | 'deck' | 'game' | 'guide' | 'portfolio';

export type StageId = 1 | 2 | 3;

export interface BattleDropResult {
  won: boolean;
  stage: StageId;
  dropped: boolean;
  totalDropped: number;
  stones: { B: number; G: number; R: number };
}

export interface StageConfig {
  id: StageId;
  name: string;
  subtitle: string;
  badge: string;
  aiLevel: string;
  aiDesc: string;
  starLevel: string;
  dropRateText: string;
  enemyGateHp: number;
  color: string;
}

export const STAGE_CONFIGS: Record<StageId, StageConfig> = {
  1: {
    id: 1,
    name: 'Fase 1 - Fácil',
    subtitle: 'Planície dos Recrutas',
    badge: 'Iniciante',
    aiLevel: 'IA Iniciante',
    aiDesc: 'Usa apenas tropas básicas de 1 estrela. Não conjura magias.',
    starLevel: '★ (1 Estrela)',
    dropRateText: '50% de chance de dropar 1 pedra',
    enemyGateHp: 1200,
    color: 'emerald',
  },
  2: {
    id: 2,
    name: 'Fase 2 - Intermediário',
    subtitle: 'Garganta dos Veteranos',
    badge: 'Tático',
    aiLevel: 'IA Estrategista',
    aiDesc: 'Tropas reforçadas de 2★ a 4★. Conjura magias de Cura e Dano em momentos oportunos.',
    starLevel: '★★ ~ ★★★★ (2 a 4 Estrelas)',
    dropRateText: '50% de chance de dropar 2 pedras',
    enemyGateHp: 1800,
    color: 'amber',
  },
  3: {
    id: 3,
    name: 'Fase 3 - Avançado (Pesadelo)',
    subtitle: 'Fortaleza dos Titãs',
    badge: 'Expert / Pesadelo',
    aiLevel: 'IA Mestre / Expert',
    aiDesc: 'IA implacável: todas as tropas inimigas são 5 estrelas lendárias! Conjura magias constantes.',
    starLevel: '★★★★★ (Todas 5 Estrelas)',
    dropRateText: '100% de chance de dropar 100 pedras',
    enemyGateHp: 2600,
    color: 'rose',
  },
};

export const STAR_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 1.25,
  3: 1.5,
  4: 1.8,
  5: 2.2,
};

export const UNIT_DEFINITIONS: Record<UnitType, UnitDefinition> = {
  sunplant: {
    type: 'sunplant',
    name: 'Planta de Sol',
    title: 'Sentinela da Luz Élfica',
    category: 'plant',
    element: 'Luz',
    res: 'sun',
    cost: 50,
    baseHp: 120,
    dmg: 0,
    speed: 0,
    emoji: '🌻',
    desc: 'Gera Sol periodicamente para plantar defesas.',
    lore: 'Nascida nos vales iluminados pelo primeiro raio solar da primavera élfica, a Planta de Sol converte a energia cósmica em luz tangível. É o alicerce econômico de qualquer comandante de defesa.',
    tacticalRole: 'Posicione na primeira ou segunda coluna logo no início da partida para acelerar a invocação de Plantas atiradoras.',
    attackInterval: 4000,
    color: '#eab308',
  },
  melee: {
    type: 'melee',
    name: 'Monstro',
    title: 'Predador das Matas Sombrias',
    category: 'monster',
    element: 'Floresta',
    res: 'meat',
    cost: 75,
    baseHp: 180,
    dmg: 26,
    speed: 36,
    emoji: '👹',
    desc: 'Monstro corpo-a-corpo veloz e agressivo.',
    lore: 'Criatura feroz que patrulha os limites do bosque encantado. Suas garras velozes despedaçam obstáculos e tropas inimigas em embates de curta distância.',
    tacticalRole: 'Combatente de investida rápida. Avança pela pista, quebra as barreiras centrais e ataca o portão inimigo.',
    attackInterval: 900,
    color: '#3b82f6',
  },
  sniper: {
    type: 'sniper',
    name: 'Planta',
    title: 'Atiradora da Clareira',
    category: 'plant',
    element: 'Arcano',
    res: 'sun',
    cost: 200,
    baseHp: 110,
    dmg: 110,
    speed: 0,
    emoji: '🏹',
    desc: 'Tiro de longo alcance devastador. Continua atirando mesmo sem monstros na frente para destruir o portão inimigo!',
    lore: 'Brotada nas clareiras ensolaradas, esta planta de olhar desconfiado dispara sementes duras como pedra, capazes de rachar armaduras pesadas e portões fortificados.',
    tacticalRole: 'Causador primário de dano pesado. Seu tiro derruba alvos resistentes e desgasta o portão inimigo à longa distância.',
    attackInterval: 2800,
    color: '#10b981',
  },
  peanut: {
    type: 'peanut',
    name: 'Peanut',
    title: 'Escudo Vivo da Clareira',
    category: 'plant',
    element: 'Terra',
    res: 'sun',
    cost: 50,
    // Triplo da vida da pilastra de pedra do meio (350 HP)
    baseHp: 1050,
    dmg: 0,
    speed: 0,
    emoji: '🥜',
    desc: 'Pilar resistente que segura as tropas inimigas que andam. Não se mexe e não ataca.',
    lore: 'Uma noz ancestral de casca duríssima e cara de poucos amigos. Não sai do lugar por nada: quem quiser passar vai ter que quebrar a casca primeiro.',
    tacticalRole: 'Coloque na frente das suas Plantas para segurar os Monstros inimigos enquanto eles atiram.',
    attackInterval: 0,
    color: '#a16207',
  },
  coconut: {
    type: 'coconut',
    name: 'Coconut',
    title: 'Catapulta da Clareira',
    category: 'plant',
    element: 'Floresta',
    res: 'sun',
    cost: 150,
    baseHp: 100,
    dmg: 60,
    speed: 0,
    emoji: '🥥',
    desc: 'Arremessa cocos por cima do muro do meio. Acerta a primeira tropa inimiga na pista ou, se não houver nenhuma, a base inimiga direto.',
    lore: 'Uma planta de pavio curto que aprendeu a usar o próprio caule como catapulta. Nenhuma muralha de pedra a impede de mandar um coco na cabeça do inimigo.',
    tacticalRole: 'Plante atrás das defesas: o coco passa por cima do muro central e castiga a base inimiga mesmo com as pedras de pé.',
    attackInterval: 3500,
    color: '#65a30d',
  },
};

export const RECIPES_MAP: Record<UnitType, ElementStone[]> = {
  melee: ['B', 'B', 'B'],
  sniper: ['G', 'G', 'G'],
  sunplant: ['R', 'R', 'R'],
  peanut: ['G', 'G', 'R'],
  coconut: ['G', 'R', 'R'],
};

export const SPELL_DEFINITIONS = {
  heal: {
    id: 'heal',
    name: 'Bênção Élfica',
    cost: 50,
    emoji: '💖',
    desc: 'Cura todas as unidades em 3x3 (+150 HP)',
    area: '3x3',
    color: '#22c55e',
  },
  fireball: {
    id: 'fireball',
    name: 'Meteoro Flamejante',
    cost: 50,
    emoji: '☄️',
    desc: 'Causa 140 de dano em área 3x3 a inimigos e barreiras',
    area: '3x3',
    color: '#ef4444',
  },
  thunder: {
    id: 'thunder',
    name: 'Raio de Tempestade',
    cost: 40,
    emoji: '⚡',
    desc: 'Eletrocuta uma coluna inteira causando 90 de dano',
    area: 'Coluna',
    color: '#eab308',
  },
};
