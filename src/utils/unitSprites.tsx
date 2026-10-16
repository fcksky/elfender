/**
 * Unit Sprites & Castle Gate 2D Illustrated Rendering Engine
 * Provides rich, vibrant, high-definition procedural vector graphics
 * with fluid multi-frame animations (idle breathing, attack windup, hurt, auras)
 * and fortified medieval stone castle gates with animated torches and crests.
 */

import React, { useEffect, useRef } from 'react';
import { UnitType, UNIT_DEFINITIONS } from '../types/game';
import { ELFO_SPRITES } from './elfoSprites';
import { PEANUT_SPRITES } from './peanutSprites';
import { MONSTRO_SPRITES } from './monstroSprites';
import { COCONUT_SPRITES } from './coconutSprites';

export interface SpriteRenderOptions {
  stars?: number;
  time?: number;
  isAttacking?: boolean;
  attackProgress?: number; // 0 to 1
  isHurt?: boolean;
  scaleX?: number; // 1 for right-facing, -1 for left-facing
  customScale?: number;
  attackWindup?: number; // 0 a 1: preparação nos instantes antes do tiro
  sinceAttack?: number; // ms desde o último tiro (para o recuo)
  damaged?: boolean; // usa a arte ferida
  isMoving?: boolean; // unidade caminhando (inimigos)
  sinceHit?: number; // ms desde o último dano recebido
}

/**
 * Draws a multi-layer flickering flame for torches and fire effects
 */
export function drawFlame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  time: number,
  flameHue: 'orange' | 'blue' | 'purple' = 'orange'
) {
  const flicker1 = Math.sin(time * 0.015 + x) * 0.2;
  const flicker2 = Math.cos(time * 0.022 + y) * 0.2;
  const flameH = size * (1.2 + flicker1);
  const flameW = size * (0.8 + flicker2);

  ctx.save();
  ctx.translate(x, y);

  // Outer ambient glow
  const gradGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 2.5);
  if (flameHue === 'orange') {
    gradGlow.addColorStop(0, 'rgba(251, 146, 60, 0.45)');
    gradGlow.addColorStop(1, 'rgba(251, 146, 60, 0)');
  } else if (flameHue === 'blue') {
    gradGlow.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    gradGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
  } else {
    gradGlow.addColorStop(0, 'rgba(192, 132, 252, 0.45)');
    gradGlow.addColorStop(1, 'rgba(192, 132, 252, 0)');
  }
  ctx.fillStyle = gradGlow;
  ctx.beginPath();
  ctx.arc(0, 0, size * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Outer flame
  ctx.beginPath();
  ctx.moveTo(-flameW * 0.5, 0);
  ctx.quadraticCurveTo(-flameW * 0.6, -flameH * 0.6, 0, -flameH);
  ctx.quadraticCurveTo(flameW * 0.6, -flameH * 0.6, flameW * 0.5, 0);
  ctx.closePath();
  ctx.fillStyle = flameHue === 'orange' ? '#ea580c' : (flameHue === 'blue' ? '#0284c7' : '#7e22ce');
  ctx.fill();

  // Mid flame
  ctx.beginPath();
  ctx.moveTo(-flameW * 0.35, 0);
  ctx.quadraticCurveTo(-flameW * 0.4, -flameH * 0.5, 0, -flameH * 0.85);
  ctx.quadraticCurveTo(flameW * 0.4, -flameH * 0.5, flameW * 0.35, 0);
  ctx.closePath();
  ctx.fillStyle = flameHue === 'orange' ? '#f59e0b' : (flameHue === 'blue' ? '#38bdf8' : '#c084fc');
  ctx.fill();

  // Inner core
  ctx.beginPath();
  ctx.moveTo(-flameW * 0.2, 0);
  ctx.quadraticCurveTo(-flameW * 0.2, -flameH * 0.35, 0, -flameH * 0.6);
  ctx.quadraticCurveTo(flameW * 0.2, -flameH * 0.35, flameW * 0.2, 0);
  ctx.closePath();
  ctx.fillStyle = '#fef08a';
  ctx.fill();

  // Floating sparks
  for (let i = 0; i < 3; i++) {
    const sparkOffset = ((time * 0.05 + i * 25) % 60) / 60;
    const sparkX = Math.sin(time * 0.01 + i) * 6;
    const sparkY = -flameH - sparkOffset * 18;
    const sparkAlpha = Math.max(0, 1 - sparkOffset);
    ctx.fillStyle = `rgba(254, 240, 138, ${sparkAlpha})`;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Renders the medieval castle fortress gate for bases
 */
export function renderCastleGate(
  ctx: CanvasRenderingContext2D,
  base: { x: number; w: number; hp: number; maxHp: number; emoji: string },
  isPlayer: boolean,
  time: number,
  stage: number
) {
  const x = base.x;
  const w = base.w;
  const h = 480; // CANVAS_HEIGHT
  const hpRatio = Math.max(0, base.hp / base.maxHp);
  const isDamaged = hpRatio < 0.5;
  const isCritical = hpRatio < 0.25;

  ctx.save();

  // 1. Base Wall Background - Chiseled Stone Blocks
  const stoneGrad = ctx.createLinearGradient(x, 0, x + w, 0);
  if (isPlayer) {
    stoneGrad.addColorStop(0, '#1e293b');
    stoneGrad.addColorStop(0.5, '#334155');
    stoneGrad.addColorStop(1, '#1e293b');
  } else {
    stoneGrad.addColorStop(0, '#3b1219');
    stoneGrad.addColorStop(0.5, '#581c24');
    stoneGrad.addColorStop(1, '#3b1219');
  }
  ctx.fillStyle = stoneGrad;
  ctx.fillRect(x, 0, w, h);

  // Stone Block Texture with 3D Bevels
  const blockH = 24;
  const numRows = Math.ceil(h / blockH);
  for (let r = 0; r < numRows; r++) {
    const y = r * blockH;
    const offset = (r % 2) * (w / 2);

    ctx.strokeStyle = isPlayer ? 'rgba(15, 23, 42, 0.85)' : 'rgba(24, 6, 10, 0.85)';
    ctx.lineWidth = 2;

    // Horizontal mortar line
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();

    // Top highlight of stone
    ctx.strokeStyle = isPlayer ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 180, 180, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 1);
    ctx.lineTo(x + w, y + 1);
    ctx.stroke();

    // Vertical mortar lines
    ctx.strokeStyle = isPlayer ? 'rgba(15, 23, 42, 0.85)' : 'rgba(24, 6, 10, 0.85)';
    ctx.lineWidth = 2;
    const splitX = x + ((w / 2 + offset) % w);
    ctx.beginPath();
    ctx.moveTo(splitX, y);
    ctx.lineTo(splitX, y + blockH);
    ctx.stroke();
  }

  // 2. Battlements / Crenellations at Top
  const crenelCount = 3;
  const crenelW = w / (crenelCount * 2 - 1);
  for (let c = 0; c < crenelCount; c++) {
    const cx = x + c * crenelW * 2;
    ctx.fillStyle = isPlayer ? '#475569' : '#6b212e';
    ctx.fillRect(cx, 0, crenelW, 14);
    ctx.strokeStyle = isPlayer ? '#0f172a' : '#1e0508';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, 0, crenelW, 14);
  }

  // 3. Central Great Arched Gateway (Portão)
  const archW = w * 0.76;
  const archH = 200;
  const archX = x + (w - archW) / 2;
  const archY = 140;

  // Deep recessed shadow inside the gateway
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(archX, archY + archH);
  ctx.lineTo(archX, archY + archW * 0.5);
  ctx.arc(archX + archW / 2, archY + archW * 0.5, archW / 2, Math.PI, 0, false);
  ctx.lineTo(archX + archW, archY + archH);
  ctx.closePath();
  ctx.fillStyle = '#05070c';
  ctx.fill();

  // Gate internal depth vignette
  const tunnelGrad = ctx.createRadialGradient(
    archX + archW / 2,
    archY + archH * 0.6,
    5,
    archX + archW / 2,
    archY + archH * 0.6,
    archW
  );
  tunnelGrad.addColorStop(0, isPlayer ? 'rgba(30, 58, 138, 0.3)' : 'rgba(127, 29, 29, 0.35)');
  tunnelGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
  ctx.fillStyle = tunnelGrad;
  ctx.fill();

  // Iron Portcullis (Grade Levadiça de Ferro)
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  // Vertical iron bars with spear tips
  const barSpacing = archW / 5;
  for (let b = 1; b < 5; b++) {
    const bx = archX + b * barSpacing;
    ctx.moveTo(bx, archY + 15);
    ctx.lineTo(bx, archY + archH);
  }
  // Horizontal reinforcing cross-beams
  for (let yb = archY + 40; yb < archY + archH; yb += 35) {
    ctx.moveTo(archX + 4, yb);
    ctx.lineTo(archX + archW - 4, yb);
  }
  ctx.stroke();

  // Highlights on iron bars
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let b = 1; b < 5; b++) {
    const bx = archX + b * barSpacing - 1;
    ctx.moveTo(bx, archY + 18);
    ctx.lineTo(bx, archY + archH);
  }
  ctx.stroke();

  // Heavy Stone Arch Voussoirs (Blocos em arco do portão)
  ctx.lineWidth = 5;
  ctx.strokeStyle = isPlayer ? '#64748b' : '#991b1b';
  ctx.beginPath();
  ctx.arc(archX + archW / 2, archY + archW * 0.5, archW / 2, Math.PI, 0, false);
  ctx.stroke();

  // Keystone at the top of the arch
  ctx.fillStyle = isPlayer ? '#94a3b8' : '#b91c1c';
  ctx.beginPath();
  ctx.moveTo(archX + archW / 2 - 8, archY - 8);
  ctx.lineTo(archX + archW / 2 + 8, archY - 8);
  ctx.lineTo(archX + archW / 2 + 6, archY + 12);
  ctx.lineTo(archX + archW / 2 - 6, archY + 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 4. Heraldic Royal Banner and Crest
  const bannerY = 40;
  const bannerW = w * 0.65;
  const bannerH = 75;
  const bannerX = x + (w - bannerW) / 2;

  // Banner Fabric
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(bannerX, bannerY);
  ctx.lineTo(bannerX + bannerW, bannerY);
  ctx.lineTo(bannerX + bannerW, bannerY + bannerH - 14);
  ctx.lineTo(bannerX + bannerW / 2, bannerY + bannerH);
  ctx.lineTo(bannerX, bannerY + bannerH - 14);
  ctx.closePath();

  const fabricGrad = ctx.createLinearGradient(bannerX, bannerY, bannerX, bannerY + bannerH);
  if (isPlayer) {
    fabricGrad.addColorStop(0, '#1d4ed8');
    fabricGrad.addColorStop(0.7, '#1e40af');
    fabricGrad.addColorStop(1, '#172554');
  } else {
    fabricGrad.addColorStop(0, '#b91c1c');
    fabricGrad.addColorStop(0.7, '#991b1b');
    fabricGrad.addColorStop(1, '#450a0a');
  }
  ctx.fillStyle = fabricGrad;
  ctx.fill();

  // Gold or Bone Border on Banner
  ctx.strokeStyle = isPlayer ? '#fbbf24' : '#f87171';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Banner Heraldic Insignia / Crest Symbol
  ctx.font = '28px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const crestBob = Math.sin(time * 0.003) * 2;
  ctx.fillText(
    isPlayer ? '🦁' : (stage === 3 ? '🐲' : '🧛‍♂️'),
    bannerX + bannerW / 2,
    bannerY + bannerH * 0.42 + crestBob
  );

  // Banner golden tassel
  ctx.fillStyle = isPlayer ? '#f59e0b' : '#ef4444';
  ctx.beginPath();
  ctx.arc(bannerX + bannerW / 2, bannerY + bannerH + 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 5. Animated Castle Torches with Cast Lighting
  // Left Torch
  const torch1X = x + 12;
  const torch1Y = archY + 50;
  // Right Torch
  const torch2X = x + w - 12;
  const torch2Y = archY + 50;

  [ { tx: torch1X, ty: torch1Y }, { tx: torch2X, ty: torch2Y } ].forEach(torch => {
    // Iron bracket on wall
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(torch.tx - 2, torch.ty, 4, 14);
    ctx.fillRect(torch.tx - 5, torch.ty - 2, 10, 4);

    // Multi-layer animated flame
    drawFlame(ctx, torch.tx, torch.ty - 4, 9, time, isPlayer ? 'orange' : (stage === 3 ? 'purple' : 'orange'));
  });

  // 6. Structural Damage Effects (Cracks & Smoke)
  if (isDamaged) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    // Crack 1
    ctx.moveTo(x + 10, 180);
    ctx.lineTo(x + 25, 205);
    ctx.lineTo(x + 20, 225);
    ctx.lineTo(x + 35, 250);
    // Crack 2
    ctx.moveTo(x + w - 15, 300);
    ctx.lineTo(x + w - 30, 320);
    ctx.lineTo(x + w - 24, 345);
    ctx.stroke();
  }

  if (isCritical) {
    // Billowing smoke plumes and sparks
    for (let s = 0; s < 4; s++) {
      const smokeProgress = ((time * 0.04 + s * 30) % 80) / 80;
      const smX = x + w * 0.3 + (s * 14);
      const smY = 280 - smokeProgress * 90;
      const smR = 8 + smokeProgress * 14;
      const alpha = Math.max(0, 0.6 * (1 - smokeProgress));
      ctx.fillStyle = `rgba(30, 41, 59, ${alpha})`;
      ctx.beginPath();
      ctx.arc(smX, smY, smR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 7. Fortress Health Gauge (Iron-Framed Bar at bottom)
  const barW = w - 14;
  const barH = 14;
  const barX = x + 7;
  const barY = h - 26;

  // Background frame
  ctx.fillStyle = '#05070c';
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
  ctx.strokeStyle = isPlayer ? '#3b82f6' : '#ef4444';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

  // Health fill gradient
  if (hpRatio > 0) {
    const hpGrad = ctx.createLinearGradient(barX, barY, barX + barW * hpRatio, barY);
    if (isPlayer) {
      hpGrad.addColorStop(0, '#2563eb');
      hpGrad.addColorStop(1, '#38bdf8');
    } else {
      hpGrad.addColorStop(0, '#991b1b');
      hpGrad.addColorStop(1, '#f87171');
    }
    ctx.fillStyle = hpGrad;
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
  }

  // Exact HP numbers
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(base.hp)}/${base.maxHp}`, barX + barW / 2, barY + barH / 2);

  ctx.restore();
}

/**
 * ---------------------------------------------------------------------------------
 * 2D ILLUSTRATED PROCEDURAL SPRITE RENDERERS
 * ---------------------------------------------------------------------------------
 */

// 1. SUNPLANT (Girasolar de Luz Solar)
function renderSunplantSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  time: number,
  opts: SpriteRenderOptions
) {
  const breathe = Math.sin(time * 0.004) * (size * 0.04);
  const headSpin = Math.sin(time * 0.002) * 0.08;
  const baseR = size * 0.38;

  ctx.save();
  ctx.translate(cx, cy + breathe);

  // Ground leaf base
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.ellipse(-size * 0.2, size * 0.35, size * 0.22, size * 0.1, -0.3, 0, Math.PI * 2);
  ctx.ellipse(size * 0.2, size * 0.35, size * 0.22, size * 0.1, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Stem
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = size * 0.14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, size * 0.35);
  ctx.quadraticCurveTo(size * 0.08, size * 0.1, 0, 0);
  ctx.stroke();

  // Rotating Petals (12 golden petals)
  ctx.save();
  ctx.rotate(headSpin);
  const petalCount = 12;
  for (let i = 0; i < petalCount; i++) {
    const angle = (i * Math.PI * 2) / petalCount;
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = i % 2 === 0 ? '#facc15' : '#f59e0b';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-baseR * 0.35, -baseR * 0.95, 0, -baseR * 1.3);
    ctx.quadraticCurveTo(baseR * 0.35, -baseR * 0.95, 0, 0);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // Center Disk with warm radiant gradient
  const centerGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, baseR);
  centerGrad.addColorStop(0, '#fef08a');
  centerGrad.addColorStop(0.6, '#eab308');
  centerGrad.addColorStop(1, '#854d0e');
  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.arc(0, 0, baseR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#713f12';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Expressive Friendly Eyes
  const eyeOffset = baseR * 0.35;
  const eyeY = -baseR * 0.1;
  const eyeR = baseR * 0.22;
  const blink = (time % 3200) < 180;

  if (blink) {
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-eyeOffset, eyeY, eyeR, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(eyeOffset, eyeY, eyeR, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else {
    // White eye background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-eyeOffset, eyeY, eyeR, eyeR * 1.2, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeOffset, eyeY, eyeR, eyeR * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dark pupils
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(-eyeOffset + 1, eyeY, eyeR * 0.65, 0, Math.PI * 2);
    ctx.arc(eyeOffset + 1, eyeY, eyeR * 0.65, 0, Math.PI * 2);
    ctx.fill();
    // Catchlight twinkle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-eyeOffset - 1, eyeY - 2, eyeR * 0.25, 0, Math.PI * 2);
    ctx.arc(eyeOffset - 1, eyeY - 2, eyeR * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cheerful Smile & Rosy Cheeks
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, eyeY + eyeR * 0.8, baseR * 0.32, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Rosy cheeks
  ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
  ctx.beginPath();
  ctx.arc(-eyeOffset - 3, eyeY + eyeR * 0.6, eyeR * 0.45, 0, Math.PI * 2);
  ctx.arc(eyeOffset + 3, eyeY + eyeR * 0.6, eyeR * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 2. MONSTRO (antigo Lobo de Combate)
function renderMeleeSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  time: number,
  opts: SpriteRenderOptions
) {
  const breathe = Math.sin(time * 0.007) * (size * 0.04);
  const lunge = opts.isAttacking ? size * 0.2 : 0;
  const bodyColor = opts.scaleX && opts.scaleX < 0 ? '#881337' : '#1e3a8a';
  const furHighlight = opts.scaleX && opts.scaleX < 0 ? '#f43f5e' : '#60a5fa';

  ctx.save();
  ctx.translate(cx + lunge, cy + breathe);

  // Swishing Wolf Tail
  const tailSwish = Math.sin(time * 0.01) * 0.3;
  ctx.save();
  ctx.translate(-size * 0.35, size * 0.05);
  ctx.rotate(tailSwish);
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-size * 0.35, -size * 0.25, -size * 0.25, size * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Paws
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(-size * 0.18, size * 0.35, size * 0.12, size * 0.08, 0, 0, Math.PI * 2);
  ctx.ellipse(size * 0.18, size * 0.35, size * 0.14, size * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  // Muscular Body / Torso
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.08, size * 0.36, size * 0.28, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Spiked Armor Collar / Pauldron
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(-size * 0.1, -size * 0.05);
  ctx.lineTo(size * 0.18, -size * 0.18);
  ctx.lineTo(size * 0.25, -size * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Wolf Head
  const headX = size * 0.18;
  const headY = -size * 0.15;
  ctx.save();
  ctx.translate(headX, headY);

  // Ears
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  // Left ear
  ctx.beginPath();
  ctx.moveTo(-size * 0.18, -size * 0.05);
  ctx.lineTo(-size * 0.22, -size * 0.35);
  ctx.lineTo(-size * 0.05, -size * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Right ear
  ctx.beginPath();
  ctx.moveTo(-size * 0.05, -size * 0.2);
  ctx.lineTo(0, -size * 0.4);
  ctx.lineTo(size * 0.12, -size * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Head Base
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.24, size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Snout & Fangs
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(size * 0.08, -size * 0.08);
  ctx.lineTo(size * 0.32, 0);
  ctx.lineTo(size * 0.1, size * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // White Sharp Fangs
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(size * 0.2, size * 0.04);
  ctx.lineTo(size * 0.23, size * 0.15);
  ctx.lineTo(size * 0.26, size * 0.04);
  ctx.closePath();
  ctx.fill();

  // Glowing Amber/Cyan Eye
  ctx.fillStyle = furHighlight;
  ctx.shadowColor = furHighlight;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.ellipse(size * 0.04, -size * 0.05, size * 0.08, size * 0.05, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Pupil slit
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(size * 0.03, -size * 0.08, 2, size * 0.07);

  ctx.restore(); // Head
  ctx.restore(); // Base
}

// 3. ELFO — planta atiradora desenhada a partir da arte de referência.
// A imagem é fatiada em faixas horizontais para que o caule possa curvar e a cabeça
// possa inflar e recuar sem quebrar o desenho.
type ElfoVariant = keyof typeof ELFO_SPRITES;

// Pontos de referência na imagem, em coordenadas normalizadas (0 a 1, origem no topo esquerdo)
const ELFO_ANCHORS: Record<ElfoVariant, { mouth: [number, number]; neck: number; headX: number; root: number }> = {
  saudavel: { mouth: [0.88, 0.425], neck: 0.52, headX: 0.53, root: 0.78 },
  ferida: { mouth: [0.89, 0.4], neck: 0.47, headX: 0.49, root: 0.75 },
};

// Altura do desenho em relação ao "size" pedido pelo renderizador
const ELFO_HEIGHT_FACTOR = 1.15;
const ELFO_WINDUP_MS = 260;
const ELFO_STRIPS = 48;

// Cache das imagens das artes de referência, carregadas a partir de data URIs
const artImages = new Map<string, HTMLImageElement>();

function getArtImage(src: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let img = artImages.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    artImages.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

const getElfoImage = (variant: ElfoVariant) => getArtImage(ELFO_SPRITES[variant].src);

// Carrega as imagens assim que o módulo é importado
for (const art of [ELFO_SPRITES.saudavel, ELFO_SPRITES.ferida, PEANUT_SPRITES.saudavel, PEANUT_SPRITES.ferida, MONSTRO_SPRITES.saudavel, MONSTRO_SPRITES.ferida, COCONUT_SPRITES.saudavel, COCONUT_SPRITES.ferida]) {
  getArtImage(art.src);
}

export const ELFO_ATTACK_WINDUP_MS = ELFO_WINDUP_MS;

interface ElfoPose {
  sway: number; // deslocamento horizontal no topo, em px
  headSx: number;
  headSy: number;
  hop: number; // salto vertical, em px
}

function computeElfoPose(drawW: number, time: number, opts: SpriteRenderOptions): ElfoPose {
  const t = time / 1000;
  const windup = Math.max(0, Math.min(1, opts.attackWindup ?? 0));
  const since = opts.sinceAttack ?? Infinity;

  // Parado: balanço suave do caule e respiração da cabeça
  let lean = 0.035 * Math.sin(t * 1.7) + 0.012 * Math.sin(t * 3.3 + 1.2);
  let headSx = 1 + 0.025 * Math.sin(t * 2.4);
  let headSy = 1 - 0.02 * Math.sin(t * 2.4);

  // Preparação: puxa a cabeça para trás e enche as bochechas
  if (windup > 0) {
    const e = windup * windup;
    lean -= 0.11 * e;
    headSx *= 1 + 0.16 * e;
    headSy *= 1 - 0.08 * e;
  }

  // Disparo: avança a cabeça e volta com efeito de mola
  if (since < 600) {
    const k = since / 600;
    const spring = Math.exp(-5 * k) * Math.cos(k * 11);
    lean += 0.08 * spring;
    headSx *= 1 - 0.07 * Math.exp(-7 * k);
    headSy *= 1 + 0.08 * Math.exp(-7 * k);
  }

  const hop = opts.isMoving ? -Math.abs(Math.sin(t * 7)) * drawW * 0.06 : 0;
  return { sway: lean * drawW, headSx, headSy, hop };
}

/** Posição da boca (de onde sai o tiro) relativa ao centro do sprite, sem espelhamento. */
export function getElfoMuzzle(size: number, opts: SpriteRenderOptions = {}): { x: number; y: number } {
  const variant: ElfoVariant = opts.damaged ? 'ferida' : 'saudavel';
  const meta = ELFO_SPRITES[variant];
  const a = ELFO_ANCHORS[variant];
  const drawH = size * ELFO_HEIGHT_FACTOR * (opts.customScale ?? 1);
  const drawW = drawH * (meta.width / meta.height);
  const pose = computeElfoPose(drawW, opts.time ?? Date.now(), opts);
  const left = -drawW / 2;
  const top = -drawH / 2;
  const hx = left + a.headX * drawW;
  const neckY = top + a.neck * drawH;
  const h = Math.max(0, Math.min(1, (a.root - a.mouth[1]) / a.root));
  const mx = hx + (left + a.mouth[0] * drawW - hx) * pose.headSx + pose.sway * h * h;
  const my = neckY + (top + a.mouth[1] * drawH - neckY) * pose.headSy + pose.hop;
  return { x: mx, y: my };
}

function renderElfoSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  time: number,
  opts: SpriteRenderOptions
) {
  const variant: ElfoVariant = opts.damaged ? 'ferida' : 'saudavel';
  const img = getElfoImage(variant);
  const meta = ELFO_SPRITES[variant];
  const a = ELFO_ANCHORS[variant];

  const drawH = size * ELFO_HEIGHT_FACTOR * (opts.customScale ?? 1);
  const drawW = drawH * (meta.width / meta.height);
  const left = cx - drawW / 2;
  const top = cy - drawH / 2;

  if (!img) {
    // Imagem ainda carregando: marcador simples para não deixar o espaço vazio
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.arc(cx, cy - drawH * 0.15, drawW * 0.3, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const pose = computeElfoPose(drawW, time, opts);
  const hx = left + a.headX * drawW;
  const neckY = top + a.neck * drawH;
  const t = time / 1000;
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  for (let i = 0; i < ELFO_STRIPS; i++) {
    const v0 = i / ELFO_STRIPS;
    const v1 = (i + 1) / ELFO_STRIPS;
    const vm = (v0 + v1) / 2;

    // Curvatura: zero na raiz, máxima no topo
    const h = Math.max(0, Math.min(1, (a.root - vm) / a.root));
    let dx = pose.sway * h * h;

    // Folhas da base tremulam de leve
    if (vm > a.root) {
      const f = (vm - a.root) / (1 - a.root);
      dx += drawW * 0.006 * Math.sin(t * 3.1 + vm * 9) * f;
    }

    let x = left;
    let w = drawW;
    let y0 = top + v0 * drawH;
    let y1 = top + v1 * drawH;

    // Cabeça escala em torno do pescoço
    if (vm < a.neck) {
      x = hx + (left - hx) * pose.headSx;
      w = drawW * pose.headSx;
      y0 = neckY + (y0 - neckY) * pose.headSy;
      y1 = neckY + (y1 - neckY) * pose.headSy;
    }

    const sy = v0 * srcH;
    const sh = (v1 - v0) * srcH;
    // +0.6px de sobreposição evita linhas finas entre as faixas
    ctx.drawImage(img, 0, sy, srcW, sh, x + dx, y0 + pose.hop, w, y1 - y0 + 0.6);
  }

  // Sopro na boca logo após o disparo
  const since = opts.sinceAttack ?? Infinity;
  if (since < 200) {
    const k = since / 200;
    const m = getElfoMuzzle(size, { ...opts, time });
    const mx = cx + m.x + drawW * 0.06;
    const my = cy + m.y;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = Math.max(1, drawW * 0.03);
    ctx.beginPath();
    ctx.arc(mx, my, drawW * (0.05 + 0.14 * k), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(254, 249, 195, 0.7)';
    for (let j = 0; j < 3; j++) {
      const ang = (j - 1) * 0.6;
      const r = drawW * (0.08 + 0.2 * k);
      ctx.beginPath();
      ctx.arc(mx + Math.cos(ang) * r, my + Math.sin(ang) * r, drawW * 0.025 * (1 - k), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// 4. PEANUT — escudo parado desenhado a partir da arte de referência
const PEANUT_HEIGHT_FACTOR = 1.05;
const PEANUT_HIT_MS = 320;

function renderPeanutSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  time: number,
  opts: SpriteRenderOptions
) {
  const art = opts.damaged ? PEANUT_SPRITES.ferida : PEANUT_SPRITES.saudavel;
  const img = getArtImage(art.src);
  const drawH = size * PEANUT_HEIGHT_FACTOR * (opts.customScale ?? 1);
  const drawW = drawH * (art.width / art.height);
  const bottom = cy + drawH / 2;

  if (!img) {
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(cx, cy, drawW / 2, drawH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const t = time / 1000;
  // Parado: respira devagar, apoiado no chão, e balança um pouquinho
  let sx = 1 + 0.018 * Math.sin(t * 1.9);
  let sy = 1 - 0.018 * Math.sin(t * 1.9);
  let rot = 0.02 * Math.sin(t * 1.1);
  let shake = 0;

  // Ao levar dano: amassa, treme e volta com efeito de mola
  const since = opts.sinceHit ?? Infinity;
  if (since < PEANUT_HIT_MS) {
    const k = since / PEANUT_HIT_MS;
    const spring = Math.exp(-4 * k) * Math.cos(k * 14);
    sx *= 1 + 0.1 * spring;
    sy *= 1 - 0.1 * spring;
    shake = Math.sin(since * 0.12) * drawW * 0.03 * (1 - k);
    rot += 0.05 * spring;
  }

  ctx.save();
  // Escala e rotação a partir da base, para o Peanut não "flutuar"
  ctx.translate(cx + shake, bottom);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);

  // Clarão rápido no impacto
  if (since < 120) {
    ctx.globalAlpha = 0.5 * (1 - since / 120);
    ctx.filter = 'brightness(2.4)';
    ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
  }
  ctx.restore();
}

// 6. COCONUT — catapulta parada: puxa o caule para trás e arremessa o coco
const COCONUT_HEIGHT_FACTOR = 1.05;
const COCONUT_STRIPS = 36;
const COCONUT_HIT_MS = 320;
const COCONUT_THROW_MS = 600;
// Frações da arte: raiz do caule (onde sai do corpo), centro do coco na ponta e
// a linha que separa o coco do caule (podX0 acima de podSplitV, podX1 abaixo)
const COCONUT_ANCHORS = {
  saudavel: { root: 0.52, pod: [0.81, 0.2] as [number, number], podSplitV: 0.27, podX0: 0.6, podX1: 0.64 },
  ferida: { root: 0.5, pod: [0.72, 0.17] as [number, number], podSplitV: 0.27, podX0: 0.48, podX1: 0.62 },
};
// Recorte do coco (em frações da arte inteira), usado como projétil
const COCONUT_POD_RECT = [0.66, 0.02, 0.34, 0.46];

interface CoconutPose {
  armX: number; // deslocamento horizontal da ponta do caule, em px
  armY: number; // queda da ponta do caule (puxado para baixo na preparação), em px
  bodySx: number;
  bodySy: number;
  pod: number; // tamanho do coco na ponta: 0 logo após o arremesso, 1 quando cresceu de novo
}

function computeCoconutPose(drawW: number, drawH: number, time: number, opts: SpriteRenderOptions): CoconutPose {
  const t = time / 1000;
  const windup = Math.max(0, Math.min(1, opts.attackWindup ?? 0));
  const since = opts.sinceAttack ?? Infinity;

  // Parado: o caule balança devagar e o corpo respira
  let arm = 0.035 * Math.sin(t * 1.6) + 0.01 * Math.sin(t * 3.1 + 0.7);
  let drop = 0;
  let bodySx = 1 + 0.018 * Math.sin(t * 2.1);
  let bodySy = 1 - 0.018 * Math.sin(t * 2.1);
  let pod = 1;

  // Preparação: puxa o coco ainda mais para trás e para baixo, o corpo se encolhe
  // (na arte o coco fica atrás da planta, do lado direito da imagem)
  if (windup > 0) {
    const e = windup * windup;
    arm += 0.3 * e;
    drop += 0.12 * e;
    bodySx *= 1 + 0.08 * e;
    bodySy *= 1 - 0.08 * e;
  }

  // Arremesso: o caule chicoteia para frente e volta com efeito de mola; um coco novo brota na ponta
  if (since < COCONUT_THROW_MS) {
    const k = since / COCONUT_THROW_MS;
    const spring = Math.exp(-5 * k) * Math.cos(k * 11);
    arm -= 0.45 * spring;
    drop -= 0.1 * spring;
    bodySx *= 1 - 0.06 * Math.exp(-7 * k);
    bodySy *= 1 + 0.07 * Math.exp(-7 * k);
  }
  if (since < 900) {
    const g = Math.max(0, (since - 250) / 650);
    pod = g <= 0 ? 0 : 1 + 2.2 * Math.pow(g - 1, 3) + 1.2 * Math.pow(g - 1, 2); // cresce e passa um pouquinho
  }
  return { armX: arm * drawW, armY: drop * drawH, bodySx, bodySy, pod };
}

const armBend = (h: number) => Math.pow(h, 1.5);

/** Centro do coco na ponta do caule, relativo ao centro do sprite (sem espelhamento). */
export function getCoconutLaunch(size: number, opts: SpriteRenderOptions = {}): { x: number; y: number } {
  const variant = opts.damaged ? 'ferida' : 'saudavel';
  const art = COCONUT_SPRITES[variant];
  const a = COCONUT_ANCHORS[variant];
  const drawH = size * COCONUT_HEIGHT_FACTOR * (opts.customScale ?? 1);
  const drawW = drawH * (art.width / art.height);
  const pose = computeCoconutPose(drawW, drawH, opts.time ?? Date.now(), opts);
  const [px, py] = a.pod;
  const h = armBend((a.root - py) / a.root);
  // A arte olha para a esquerda; o sprite é desenhado espelhado para olhar para a direita
  return {
    x: -(-drawW / 2 + px * drawW + pose.armX * h),
    y: -drawH / 2 + py * drawH + pose.armY * h,
  };
}

/** Desenha o coco solto (projétil), girando. */
export function drawCoconutPod(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) {
  const img = getArtImage(COCONUT_SPRITES.saudavel.src);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (!img) {
    ctx.fillStyle = '#65a30d';
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const [rx, ry, rw, rh] = COCONUT_POD_RECT;
    const sw = rw * img.naturalWidth;
    const sh = rh * img.naturalHeight;
    const k = size / Math.max(sw, sh);
    ctx.drawImage(img, rx * img.naturalWidth, ry * img.naturalHeight, sw, sh, -sw * k / 2, -sh * k / 2, sw * k, sh * k);
  }
  ctx.restore();
}

function renderCoconutSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  time: number,
  opts: SpriteRenderOptions
) {
  const variant = opts.damaged ? 'ferida' : 'saudavel';
  const art = COCONUT_SPRITES[variant];
  const a = COCONUT_ANCHORS[variant];
  const img = getArtImage(art.src);
  const drawH = size * COCONUT_HEIGHT_FACTOR * (opts.customScale ?? 1);
  const drawW = drawH * (art.width / art.height);
  const bottom = cy + drawH / 2;

  if (!img) {
    ctx.fillStyle = '#65a30d';
    ctx.beginPath();
    ctx.arc(cx - drawW * 0.1, cy + drawH * 0.15, drawW * 0.3, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const t = time / 1000;
  const pose = computeCoconutPose(drawW, drawH, time, opts);

  // Ao levar dano: amassa, treme e volta com efeito de mola
  let sx = 1;
  let sy = 1;
  let rot = 0.015 * Math.sin(t * 1.1);
  let shake = 0;
  const since = opts.sinceHit ?? Infinity;
  if (since < COCONUT_HIT_MS) {
    const k = since / COCONUT_HIT_MS;
    const spring = Math.exp(-4 * k) * Math.cos(k * 14);
    sx *= 1 + 0.1 * spring;
    sy *= 1 - 0.1 * spring;
    shake = Math.sin(since * 0.12) * drawW * 0.03 * (1 - k);
    rot += 0.05 * spring;
  }

  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const left = -drawW / 2;
  const top = -drawH;
  // O corpo respira a partir do chão; o caule acompanha o topo do corpo
  const rootY = top + a.root * drawH;
  const lift = rootY * pose.bodySy - rootY;
  const podCx = left + a.pod[0] * drawW;
  const podCy = top + a.pod[1] * drawH;
  const podH = armBend((a.root - a.pod[1]) / a.root);
  const podDx = pose.armX * podH;
  const podDy = lift + pose.armY * podH;

  const drawStrips = () => {
    for (let i = 0; i < COCONUT_STRIPS; i++) {
      const v0 = i / COCONUT_STRIPS;
      const v1 = (i + 1) / COCONUT_STRIPS;
      const vm = (v0 + v1) / 2;
      const sy0 = v0 * srcH;
      const sh = (v1 - v0) * srcH;
      if (vm >= a.root) {
        // Corpo e folhas da base
        const f = (vm - a.root) / (1 - a.root);
        const dx = drawW * 0.005 * Math.sin(t * 3.1 + vm * 9) * f * f;
        const y0 = (top + v0 * drawH) * pose.bodySy;
        const y1 = (top + v1 * drawH) * pose.bodySy;
        ctx.drawImage(img, 0, sy0, srcW, sh, left * pose.bodySx + dx, y0, drawW * pose.bodySx, y1 - y0 + 0.6);
        continue;
      }
      // Caule e coco: curva maior quanto mais perto da ponta
      const h = armBend((a.root - vm) / a.root);
      const dx = pose.armX * h;
      const dy = lift + pose.armY * h;
      const y0 = top + v0 * drawH;
      const y1 = top + v1 * drawH + 0.6;
      const split = vm < a.podSplitV ? a.podX0 : a.podX1;
      // Caule (à esquerda da linha do coco)
      ctx.drawImage(img, 0, sy0, split * srcW, sh, left + dx, y0 + dy, split * drawW, y1 - y0);
      // Coco (à direita): anda inteiro com a ponta do caule e é escalado em torno do centro enquanto brota de novo
      if (pose.pod > 0.01) {
        const g = pose.pod;
        const x = podCx + (left + split * drawW - podCx) * g;
        const yy0 = podCy + (y0 - podCy) * g;
        const yy1 = podCy + (y1 - podCy) * g;
        ctx.drawImage(img, split * srcW, sy0, (1 - split) * srcW, sh, x + podDx, yy0 + podDy, (1 - split) * drawW * g, yy1 - yy0);
      }
    }
  };

  ctx.save();
  ctx.translate(cx + shake, bottom);
  ctx.rotate(rot);
  // A arte olha para a esquerda (o coco fica atrás, à direita); espelha para olhar para a direita como as outras tropas
  ctx.scale(-sx, sy);
  drawStrips();
  // Clarão rápido no impacto
  if (since < 120) {
    ctx.globalAlpha = 0.5 * (1 - since / 120);
    ctx.filter = 'brightness(2.4)';
    drawStrips();
  }
  ctx.restore();
}

// 5. MONSTRO — anda, morde e apanha, desenhado a partir da arte de referência
const MONSTRO_HEIGHT_FACTOR = 1.05;
const MONSTRO_STRIPS = 40;
const MONSTRO_HIT_MS = 320;
const MONSTRO_BITE_MS = 450;
// Frações da altura da arte: quadril (onde começam as pernas) e pescoço (base da cabeça)
const MONSTRO_ANCHORS = { hip: 0.7, neck: 0.62, headX: 0.6 };

function renderMonstroSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  time: number,
  opts: SpriteRenderOptions
) {
  const art = opts.damaged ? MONSTRO_SPRITES.ferida : MONSTRO_SPRITES.saudavel;
  const img = getArtImage(art.src);
  const drawH = size * MONSTRO_HEIGHT_FACTOR * (opts.customScale ?? 1);
  const drawW = drawH * (art.width / art.height);
  const bottom = cy + size * 0.36; // pés na linha da sombra

  if (!img) {
    ctx.fillStyle = '#6b8f5a';
    ctx.beginPath();
    ctx.ellipse(cx, bottom - drawH / 2, drawW / 2, drawH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const a = MONSTRO_ANCHORS;
  const t = time / 1000;
  const moving = !!opts.isMoving;
  const windup = Math.max(0, Math.min(1, opts.attackWindup ?? 0));
  const since = opts.sinceAttack ?? Infinity;
  const sinceHit = opts.sinceHit ?? Infinity;

  // Parado: respira pelo peito; andando: passo com balanço, corpo inclinado para frente
  const step = t * 7.5;
  let lean = moving ? 0.05 + 0.015 * Math.sin(step * 2) : 0.012 * Math.sin(t * 1.6);
  let bob = moving ? -Math.abs(Math.sin(step)) * drawH * 0.045 : 0;
  let bodySy = 1 + (moving ? 0.015 * Math.sin(step * 2) : 0.022 * Math.sin(t * 2.2));
  let headSx = 1;
  let headSy = 1;
  let pushX = 0;
  const legSwing = moving ? Math.sin(step) : 0;

  // Preparação da mordida: joga o corpo para trás e abre a cabeça
  if (windup > 0) {
    const e = windup * windup;
    lean -= 0.14 * e;
    headSx *= 1 + 0.05 * e;
    headSy *= 1 + 0.07 * e;
    bodySy *= 1 - 0.03 * e;
  }
  // Mordida: avança, fecha a boca de uma vez e volta com efeito de mola
  if (since < MONSTRO_BITE_MS) {
    const k = since / MONSTRO_BITE_MS;
    const spring = Math.exp(-5 * k) * Math.cos(k * 10);
    lean += 0.16 * spring;
    pushX += drawW * 0.12 * Math.exp(-6 * k);
    headSx *= 1 + 0.08 * Math.exp(-8 * k);
    headSy *= 1 - 0.1 * Math.exp(-8 * k);
  }
  // Dano: treme e amassa
  let shake = 0;
  if (sinceHit < MONSTRO_HIT_MS) {
    const k = sinceHit / MONSTRO_HIT_MS;
    shake = Math.sin(sinceHit * 0.12) * drawW * 0.035 * (1 - k);
    bodySy *= 1 - 0.06 * Math.exp(-4 * k) * Math.cos(k * 14);
  }

  const left = cx - drawW / 2 + pushX + shake;
  const top = bottom - drawH;
  const hipY = top + a.hip * drawH;
  const neckV = a.neck;
  const hx = left + a.headX * drawW;
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  const drawStrips = () => {
    for (let i = 0; i < MONSTRO_STRIPS; i++) {
      const v0 = i / MONSTRO_STRIPS;
      const v1 = (i + 1) / MONSTRO_STRIPS;
      const vm = (v0 + v1) / 2;
      let x = left;
      let w = drawW;
      let y0: number;
      let y1: number;
      let dx = 0;
      if (vm < a.hip) {
        // Tronco e cabeça: inclinam a partir do quadril e respiram
        const h = (a.hip - vm) / a.hip;
        dx = lean * drawW * h;
        y0 = hipY - (a.hip - v0) * drawH * bodySy;
        y1 = hipY - (a.hip - v1) * drawH * bodySy;
        if (vm < neckV) {
          const neckY = hipY - (a.hip - neckV) * drawH * bodySy;
          x = hx + (left - hx) * headSx;
          w = drawW * headSx;
          y0 = neckY + (y0 - neckY) * headSy;
          y1 = neckY + (y1 - neckY) * headSy;
        }
        y0 += bob;
        y1 += bob;
      } else {
        // Pernas: balançam para frente e para trás, mais nos pés
        const f = (vm - a.hip) / (1 - a.hip);
        const legY = (v: number) => top + v * drawH + bob * (1 - (v - a.hip) / (1 - a.hip));
        dx = legSwing * drawW * 0.07 * f;
        y0 = legY(v0);
        y1 = legY(v1);
      }
      const sy = v0 * srcH;
      const sh = (v1 - v0) * srcH;
      ctx.drawImage(img, 0, sy, srcW, sh, x + dx, y0, w, y1 - y0 + 0.6);
    }
  };

  drawStrips();
  // Clarão rápido no impacto
  if (sinceHit < 120) {
    ctx.save();
    ctx.globalAlpha = 0.5 * (1 - sinceHit / 120);
    ctx.filter = 'brightness(2.4)';
    drawStrips();
    ctx.restore();
  }
}

/**
 * Universal Unit Sprite Dispatcher
 */
export function renderUnitSprite(
  ctx: CanvasRenderingContext2D,
  type: UnitType | string,
  team: 'player' | 'enemy',
  cx: number,
  cy: number,
  size: number,
  options: SpriteRenderOptions = {}
) {
  const time = options.time ?? Date.now();
  const stars = options.stars ?? 1;

  ctx.save();

  // Direction handling (enemies face left, players face right by default)
  const scaleX = options.scaleX ?? (team === 'enemy' ? -1 : 1);
  ctx.translate(cx, cy);
  ctx.scale(scaleX, 1);

  // 1. Star Rating Aura Halos under feet
  if (stars >= 4) {
    ctx.save();
    const auraR = size * 0.55;
    const auraSpin = time * 0.002;
    ctx.rotate(auraSpin);
    const auraGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, auraR);
    if (stars === 5) {
      auraGrad.addColorStop(0, 'rgba(250, 204, 21, 0.55)');
      auraGrad.addColorStop(0.7, 'rgba(234, 179, 8, 0.25)');
      auraGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');
    } else {
      auraGrad.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
      auraGrad.addColorStop(0.7, 'rgba(147, 51, 234, 0.2)');
      auraGrad.addColorStop(1, 'rgba(147, 51, 234, 0)');
    }
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, size * 0.2, auraR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. Hurt Flash Overlay
  if (options.isHurt) {
    ctx.filter = 'brightness(1.8) drop-shadow(0 0 6px rgba(239, 68, 68, 0.8))';
  }

  // 3. Render the specific unit sprite
  const normType = type as UnitType;
  switch (normType) {
    case 'sunplant':
      renderSunplantSprite(ctx, 0, 0, size, time, options);
      break;
    case 'sniper':
      renderElfoSprite(ctx, 0, 0, size, time, options);
      break;
    case 'peanut':
      renderPeanutSprite(ctx, 0, 0, size, time, options);
      break;
    case 'melee':
      renderMonstroSprite(ctx, 0, 0, size, time, options);
      break;
    case 'coconut':
      renderCoconutSprite(ctx, 0, 0, size, time, options);
      break;
    default:
      renderMeleeSprite(ctx, 0, 0, size, time, options);
      break;
  }

  ctx.restore();
}

/**
 * React Component for embedding live animated sprites in UI Cards,
 * Bestiary dossiers, and crafting previews.
 */
export const UnitSpriteCanvas: React.FC<{
  type: UnitType;
  stars?: number;
  size?: number;
  className?: string;
  animate?: boolean;
}> = ({ type, stars = 1, size = 64, className = '', animate = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      // O Monstro é desenhado com os pés na linha da sombra; nas caixinhas ele desce e encolhe um pouco para caber inteiro
      const isWalker = type === 'melee';
      renderUnitSprite(
        ctx,
        type,
        'player',
        size / 2,
        isWalker ? size * 0.58 : size / 2,
        size * (isWalker ? 0.78 : 0.85),
        {
          stars,
          time: Date.now(),
          scaleX: 1,
        }
      );
      if (animate) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [type, stars, size, animate]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

// Ícone estático da tropa para listas (grimório, guia, histórico).
// Tropas com arte própria mostram a imagem; as demais mostram o emoji.
const UNIT_ART: Partial<Record<UnitType, string>> = {
  sniper: ELFO_SPRITES.saudavel.src,
  peanut: PEANUT_SPRITES.saudavel.src,
  melee: MONSTRO_SPRITES.saudavel.src,
  coconut: COCONUT_SPRITES.saudavel.src,
};

export const UnitIcon: React.FC<{ type: UnitType; size: number; className?: string }> = ({ type, size, className = '' }) => {
  const def = UNIT_DEFINITIONS[type];
  const art = UNIT_ART[type];
  if (art) {
    return (
      <img
        src={art}
        alt={def.name}
        draggable={false}
        className={`inline-block object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span className={`inline-block text-center ${className}`} style={{ fontSize: size * 0.8, lineHeight: `${size}px`, width: size }}>
      {def.emoji}
    </span>
  );
};
