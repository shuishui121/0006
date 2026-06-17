import * as PIXI from 'pixi.js';
import { COLORS } from '@/utils/constants';
import type { Rune } from '@/types/game';

export const createRune = (
  rune: Rune,
  onClick: (id: number) => void,
): PIXI.Container => {
  const container = new PIXI.Container();
  container.x = rune.x;
  container.y = rune.y;

  const radius = 45;

  const outerGlow = new PIXI.Graphics();
  if (rune.isLit) {
    outerGlow.beginFill(COLORS.GOLD_LIGHT, 0.4);
    outerGlow.drawCircle(0, 0, radius + 15);
    outerGlow.endFill();
  }

  const outer = new PIXI.Graphics();
  outer.beginFill(rune.isLit ? COLORS.GOLD : COLORS.WOOD);
  outer.lineStyle(3, rune.isLit ? COLORS.GOLD_LIGHT : COLORS.BRONZE);
  outer.drawCircle(0, 0, radius);
  outer.endFill();

  const inner = new PIXI.Graphics();
  inner.beginFill(rune.isLit ? COLORS.GOLD_LIGHT : COLORS.WOOD_LIGHT);
  inner.drawCircle(0, 0, radius * 0.8);
  inner.endFill();

  const pattern = new PIXI.Graphics();
  pattern.lineStyle(2, rune.isLit ? COLORS.GOLD_DARK : COLORS.BRONZE, 0.5);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    pattern.moveTo(Math.cos(angle) * radius * 0.3, Math.sin(angle) * radius * 0.3);
    pattern.lineTo(Math.cos(angle) * radius * 0.7, Math.sin(angle) * radius * 0.7);
  }

  const symbol = new PIXI.Text(rune.symbol, {
    fontSize: radius * 0.8,
    fill: rune.isLit ? COLORS.INK : COLORS.PAPER,
    fontWeight: 'bold',
    align: 'center',
  });
  symbol.anchor.set(0.5);

  container.addChild(outerGlow, outer, inner, pattern, symbol);

  container.interactive = true;
  container.cursor = 'pointer';

  container.on('pointerover', () => {
    container.scale.set(1.1);
  });
  container.on('pointerout', () => {
    container.scale.set(1);
  });
  container.on('pointerdown', () => {
    onClick(rune.id);
  });

  return container;
};

export const createRuneBoard = (): PIXI.Container => {
  const container = new PIXI.Container();
  container.x = 512;
  container.y = 384;

  const outerRing = new PIXI.Graphics();
  outerRing.lineStyle(4, COLORS.GOLD_DARK, 0.6);
  outerRing.drawCircle(0, 0, 280);

  const innerRing = new PIXI.Graphics();
  innerRing.lineStyle(3, COLORS.BRONZE, 0.4);
  innerRing.drawCircle(0, 0, 160);

  const center = new PIXI.Graphics();
  center.beginFill(COLORS.WOOD);
  center.lineStyle(3, COLORS.GOLD_DARK);
  center.drawCircle(0, 0, 100);
  center.endFill();

  const centerPattern = new PIXI.Graphics();
  centerPattern.lineStyle(2, COLORS.GOLD_DARK, 0.6);
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    centerPattern.moveTo(0, 0);
    centerPattern.lineTo(Math.cos(angle) * 80, Math.sin(angle) * 80);
  }
  centerPattern.drawCircle(0, 0, 40);

  const title = new PIXI.Text('十二符文', {
    fontSize: 20,
    fill: COLORS.GOLD_LIGHT,
    align: 'center',
  });
  title.anchor.set(0.5);
  title.y = -120;

  container.addChild(outerRing, innerRing, center, centerPattern, title);
  return container;
};

export const createSequenceDisplay = (
  currentSequence: number[],
  correctLength: number,
  runeSymbols: string[],
): PIXI.Container => {
  const container = new PIXI.Container();
  container.x = 512;
  container.y = 700;

  const bg = new PIXI.Graphics();
  bg.beginFill(COLORS.WOOD, 0.8);
  bg.lineStyle(2, COLORS.BRONZE);
  bg.drawRoundedRect(-300, -30, 600, 50, 5);
  bg.endFill();

  container.addChild(bg);

  for (let i = 0; i < correctLength; i++) {
    const x = -270 + i * 46;
    const slot = new PIXI.Graphics();
    slot.lineStyle(2, i < currentSequence.length ? COLORS.GOLD_LIGHT : COLORS.BRONZE);
    slot.drawRoundedRect(x, -18, 40, 36, 4);

    if (i < currentSequence.length) {
      const symbol = new PIXI.Text(runeSymbols[currentSequence[i]], {
        fontSize: 22,
        fill: COLORS.GOLD_LIGHT,
        align: 'center',
      });
      symbol.anchor.set(0.5);
      symbol.x = x + 20;
      symbol.y = 0;
      container.addChild(slot, symbol);
    } else {
      container.addChild(slot);
    }
  }

  const label = new PIXI.Text(`已点亮: ${currentSequence.length}/${correctLength}`, {
    fontSize: 14,
    fill: COLORS.PAPER,
  });
  label.x = -300;
  label.y = 30;
  container.addChild(label);

  return container;
};
