import * as PIXI from 'pixi.js';
import { COLORS } from '@/utils/constants';
import type { StoneData } from '@/types/game';

export const createBalance = (
  cx: number,
  cy: number,
  tiltAngle: number = 0,
): PIXI.Container => {
  const container = new PIXI.Container();
  container.x = cx;
  container.y = cy;

  const base = new PIXI.Graphics();
  base.beginFill(COLORS.WOOD);
  base.lineStyle(3, COLORS.GOLD_DARK);
  base.moveTo(-80, 150);
  base.lineTo(80, 150);
  base.lineTo(50, 50);
  base.lineTo(-50, 50);
  base.closePath();
  base.endFill();

  const pillar = new PIXI.Graphics();
  pillar.beginFill(COLORS.WOOD_LIGHT);
  pillar.lineStyle(2, COLORS.GOLD_DARK);
  pillar.drawRoundedRect(-15, -20, 30, 80, 3);
  pillar.endFill();

  const pivot = new PIXI.Graphics();
  pivot.beginFill(COLORS.GOLD);
  pivot.lineStyle(2, COLORS.GOLD_LIGHT);
  pivot.drawCircle(0, -20, 15);
  pivot.endFill();

  const armContainer = new PIXI.Container();
  armContainer.rotation = tiltAngle;
  armContainer.pivot.set(0, -20);

  const arm = new PIXI.Graphics();
  arm.beginFill(COLORS.BRONZE);
  arm.lineStyle(3, COLORS.GOLD_DARK);
  arm.drawRoundedRect(-250, -25, 500, 15, 5);
  arm.endFill();

  const leftChain1 = createChain(-180, -20, 80);
  const leftChain2 = createChain(-120, -20, 80);
  const leftChain3 = createChain(-60, -20, 80);

  const rightChain1 = createChain(60, -20, 80);
  const rightChain2 = createChain(120, -20, 80);
  const rightChain3 = createChain(180, -20, 80);

  const leftPlate = createPlate(-180, 60, 30);
  const leftPlate2 = createPlate(-120, 60, 30);
  const leftPlate3 = createPlate(-60, 60, 30);

  const rightPlate = createPlate(60, 60, 30);
  const rightPlate2 = createPlate(120, 60, 30);
  const rightPlate3 = createPlate(180, 60, 30);

  armContainer.addChild(
    arm,
    leftChain1, leftChain2, leftChain3,
    rightChain1, rightChain2, rightChain3,
    leftPlate, leftPlate2, leftPlate3,
    rightPlate, rightPlate2, rightPlate3
  );

  container.addChild(base, pillar, pivot, armContainer);

  return container;
};

const createChain = (x: number, y: number, length: number): PIXI.Graphics => {
  const graphics = new PIXI.Graphics();
  graphics.lineStyle(3, COLORS.GOLD_DARK);
  for (let i = 0; i < length; i += 12) {
    graphics.moveTo(x, y + i);
    graphics.lineTo(x, y + i + 8);
  }
  return graphics;
};

const createPlate = (x: number, y: number, radius: number): PIXI.Graphics => {
  const graphics = new PIXI.Graphics();
  graphics.beginFill(COLORS.BRONZE);
  graphics.lineStyle(2, COLORS.GOLD_DARK);
  graphics.arc(x, y, radius, 0, Math.PI, false);
  graphics.lineTo(x - radius, y);
  graphics.closePath();
  graphics.endFill();

  graphics.beginFill(COLORS.BRONZE_LIGHT);
  graphics.drawEllipse(x, y, radius, 8);
  graphics.endFill();

  return graphics;
};

export const createStone = (
  stone: StoneData,
  onClick: (id: string) => void,
  isSelected: boolean,
): PIXI.Container => {
  const container = new PIXI.Container();
  container.x = stone.x;
  container.y = stone.y;

  const size = 25 + stone.weight * 1.5;

  if (isSelected) {
    const glow = new PIXI.Graphics();
    glow.beginFill(COLORS.GOLD_LIGHT, 0.4);
    glow.drawRoundedRect(-size / 2 - 5, -size / 2 - 5, size + 10, size + 10, 8);
    glow.endFill();
    container.addChild(glow);
  }

  const body = new PIXI.Graphics();
  body.beginFill(COLORS.WOOD);
  body.lineStyle(2, isSelected ? COLORS.GOLD_LIGHT : COLORS.GOLD_DARK);
  body.drawRoundedRect(-size / 2, -size / 2, size, size, 6);
  body.endFill();

  const texture = new PIXI.Graphics();
  texture.lineStyle(1, COLORS.BRONZE, 0.3);
  for (let i = 0; i < 3; i++) {
    const yOffset = -size / 2 + (i + 1) * size / 4;
    texture.moveTo(-size / 2 + 5, yOffset);
    texture.lineTo(size / 2 - 5, yOffset);
  }

  const weightLabel = new PIXI.Text(`${stone.weight}`, {
    fontSize: size * 0.4,
    fill: COLORS.GOLD_LIGHT,
    fontWeight: 'bold',
    align: 'center',
  });
  weightLabel.anchor.set(0.5);

  container.addChild(body, texture, weightLabel);

  if (stone.placedSide === null) {
    container.eventMode = 'static';
    container.cursor = 'pointer';

    container.on('pointerover', () => {
      container.scale.set(1.1);
    });
    container.on('pointerout', () => {
      container.scale.set(1);
    });
    container.on('pointerdown', () => {
      onClick(stone.id);
    });
  }

  return container;
};

export const createWeightDisplay = (
  leftTotal: number,
  rightTotal: number,
  target: number,
): PIXI.Container => {
  const container = new PIXI.Container();
  container.x = 512;
  container.y = 100;

  const bg = new PIXI.Graphics();
  bg.beginFill(COLORS.WOOD, 0.9);
  bg.lineStyle(2, COLORS.BRONZE);
  bg.drawRoundedRect(-200, -30, 400, 60, 8);
  bg.endFill();

  const leftLabel = new PIXI.Text(`左侧: ${leftTotal}`, {
    fontSize: 18,
    fill: leftTotal === target ? COLORS.SUCCESS : COLORS.PAPER,
  });
  leftLabel.anchor.set(0.5);
  leftLabel.x = -100;

  const targetLabel = new PIXI.Text(`目标: ${target}`, {
    fontSize: 14,
    fill: COLORS.GOLD_LIGHT,
  });
  targetLabel.anchor.set(0.5);
  targetLabel.y = -20;

  const rightLabel = new PIXI.Text(`右侧: ${rightTotal}`, {
    fontSize: 18,
    fill: rightTotal === target ? COLORS.SUCCESS : COLORS.PAPER,
  });
  rightLabel.anchor.set(0.5);
  rightLabel.x = 100;

  const status = leftTotal === target && rightTotal === target
    ? '✓ 平衡'
    : leftTotal === rightTotal
      ? `重量相等，但不是${target}`
      : '不平衡';

  const statusLabel = new PIXI.Text(status, {
    fontSize: 16,
    fill: leftTotal === target && rightTotal === target ? COLORS.SUCCESS : COLORS.GOLD_LIGHT,
    align: 'center',
  });
  statusLabel.anchor.set(0.5);
  statusLabel.y = 25;

  container.addChild(bg, leftLabel, targetLabel, rightLabel, statusLabel);
  return container;
};
