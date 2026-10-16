/**
 * Cenário da batalha: imagem pintada (grama, horizonte, árvore verde do
 * jogador, árvore vermelha inimiga e moldura amarela) desenhada atrás da grade.
 */
import { SCENE_ART } from './sceneArt';

export const SCENE_WIDTH = 1120;
export const SCENE_GRID_TOP = 122; // espaço da barra de cima (tropas)
export const SCENE_GRID_HEIGHT = 480; // 6 pistas de 80px
export const SCENE_GRID_BOTTOM = 79; // espaço da barra de baixo (magias)
export const SCENE_HEIGHT = SCENE_GRID_TOP + SCENE_GRID_HEIGHT + SCENE_GRID_BOTTOM;

let sceneImage: HTMLImageElement | null = null;
const sceneCache = new Map<number, HTMLCanvasElement>();

/** Camada do cenário para a fase (fase 2 entardecer, fase 3 noite). Null enquanto a imagem carrega. */
export function getSceneLayer(stage: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const cached = sceneCache.get(stage);
  if (cached) return cached;
  if (!sceneImage) {
    sceneImage = new Image();
    sceneImage.src = SCENE_ART;
  }
  if (!sceneImage.complete || !sceneImage.naturalWidth) return null;

  const canvas = document.createElement('canvas');
  canvas.width = SCENE_WIDTH;
  canvas.height = SCENE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(sceneImage, 0, 0, SCENE_WIDTH, SCENE_HEIGHT);
  if (stage === 2) {
    ctx.fillStyle = 'rgba(190, 110, 20, 0.14)';
    ctx.fillRect(8, 108, SCENE_WIDTH - 16, SCENE_HEIGHT - 116);
  } else if (stage === 3) {
    ctx.fillStyle = 'rgba(16, 20, 70, 0.42)';
    ctx.fillRect(8, 108, SCENE_WIDTH - 16, SCENE_HEIGHT - 116);
  }
  sceneCache.set(stage, canvas);
  return canvas;
}

/** Mantido para compatibilidade: o cenário atual não tem brilho animado. */
export function renderSceneGlow(_ctx: CanvasRenderingContext2D, _time: number) {}

/** Pilar de pedra com musgo; ganha rachaduras conforme perde vida. */
export function renderStonePillar(
  ctx: CanvasRenderingContext2D,
  b: { x: number; y: number; w: number; h: number; hp: number; maxHp: number; col: number; row: number },
) {
  const { x, y, w, h } = b;
  const cx = x + w / 2;
  const pct = Math.max(0, b.hp / b.maxHp);

  // Sombra no chão
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, y + h - 2, w * 0.55, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Corpo da pedra (levemente irregular)
  const body = new Path2D();
  body.moveTo(x + 6, y + h - 4);
  body.lineTo(x + 2, y + 14);
  body.quadraticCurveTo(x + 4, y + 2, x + 16, y + 1);
  body.lineTo(x + w - 14, y);
  body.quadraticCurveTo(x + w - 2, y + 3, x + w - 3, y + 16);
  body.lineTo(x + w - 6, y + h - 4);
  body.closePath();
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#c9c4b8');
  g.addColorStop(0.5, '#9a958a');
  g.addColorStop(1, '#6d685f');
  ctx.fillStyle = g;
  ctx.fill(body);
  ctx.strokeStyle = '#3d3a33';
  ctx.lineWidth = 2.5;
  ctx.stroke(body);

  // Faixa de tijolos
  ctx.strokeStyle = 'rgba(60, 55, 45, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + h * 0.42);
  ctx.lineTo(x + w - 4, y + h * 0.4);
  ctx.moveTo(x + w * 0.45, y + 2);
  ctx.lineTo(x + w * 0.47, y + h * 0.41);
  ctx.moveTo(x + w * 0.3, y + h * 0.42);
  ctx.lineTo(x + w * 0.28, y + h - 4);
  ctx.moveTo(x + w * 0.72, y + h * 0.4);
  ctx.lineTo(x + w * 0.74, y + h - 4);
  ctx.stroke();

  // Musgo no topo
  ctx.fillStyle = '#4f8a2a';
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 12);
  ctx.quadraticCurveTo(x + 8, y - 2, x + 22, y + 2);
  ctx.quadraticCurveTo(x + w * 0.5, y - 3, x + w - 16, y + 1);
  ctx.quadraticCurveTo(x + w - 2, y + 2, x + w - 4, y + 12);
  ctx.quadraticCurveTo(x + w * 0.7, y + 9, x + w * 0.6, y + 15);
  ctx.quadraticCurveTo(x + w * 0.4, y + 8, x + w * 0.25, y + 14);
  ctx.quadraticCurveTo(x + 12, y + 8, x + 4, y + 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(160, 220, 90, 0.6)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.35, y + 4, 8, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rachaduras conforme o dano
  if (pct < 0.75) {
    ctx.strokeStyle = '#2b2924';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 4, y + 16);
    ctx.lineTo(cx - 3, y + h * 0.45);
    ctx.lineTo(cx + 6, y + h * 0.62);
    if (pct < 0.45) {
      ctx.moveTo(x + 8, y + h * 0.6);
      ctx.lineTo(x + w * 0.35, y + h * 0.7);
      ctx.lineTo(x + w * 0.3, y + h - 8);
      ctx.moveTo(x + w - 8, y + h * 0.25);
      ctx.lineTo(x + w * 0.65, y + h * 0.35);
    }
    ctx.stroke();
  }

  if (b.hp < b.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x, y - 10, w, 5);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x, y - 10, w * pct, 5);
  }
}
