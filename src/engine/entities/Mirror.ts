import * as PIXI from 'pixi.js';
import { COLORS } from '@/utils/constants';
import type { MirrorData, Point } from '@/types/game';

export const createMirror = (
  mirror: MirrorData,
  onClick: (id: string) => void,
): PIXI.Container => {
  const container = new PIXI.Container();
  container.x = mirror.x;
  container.y = mirror.y;
  container.rotation = mirror.angle;

  const halfLength = mirror.length / 2;

  const frame = new PIXI.Graphics();
  frame.beginFill(COLORS.BRONZE);
  frame.lineStyle(2, COLORS.GOLD_DARK);
  frame.drawRoundedRect(-halfLength - 4, -8, mirror.length + 8, 16, 3);
  frame.endFill();

  const glass = new PIXI.Graphics();
  const glassGradient = new PIXI.Graphics();
  glassGradient.beginFill(COLORS.PAPER, 0.9);
  glassGradient.drawRect(-halfLength, -4, mirror.length, 8);
  glassGradient.endFill();

  const highlight = new PIXI.Graphics();
  highlight.beginFill(0xffffff, 0.3);
  highlight.drawRect(-halfLength + 5, -3, mirror.length - 10, 2);
  highlight.endFill();

  const base = new PIXI.Graphics();
  base.beginFill(COLORS.WOOD);
  base.lineStyle(2, COLORS.GOLD_DARK);
  base.drawCircle(0, 0, 12);
  base.endFill();

  const indicator = new PIXI.Graphics();
  indicator.beginFill(COLORS.GOLD_LIGHT);
  indicator.drawCircle(0, 0, 5);
  indicator.endFill();

  container.addChild(frame, glassGradient, highlight, base, indicator);

  container.eventMode = 'static';
  container.cursor = 'pointer';

  container.on('pointerover', () => {
    frame.lineStyle(3, COLORS.GOLD_LIGHT);
  });
  container.on('pointerout', () => {
    frame.lineStyle(2, COLORS.GOLD_DARK);
  });
  container.on('pointerdown', () => {
    onClick(mirror.id);
  });

  return container;
};

export const createLaserEmitter = (
  x: number,
  y: number,
  angle: number,
): PIXI.Container => {
  const container = new PIXI.Container();
  container.x = x;
  container.y = y;
  container.rotation = angle;

  const body = new PIXI.Graphics();
  body.beginFill(COLORS.WOOD);
  body.lineStyle(3, COLORS.BRONZE);
  body.drawRoundedRect(-25, -20, 50, 40, 5);
  body.endFill();

  const emitter = new PIXI.Graphics();
  emitter.beginFill(COLORS.DARK_RED);
  emitter.drawCircle(20, 0, 12);
  emitter.endFill();

  const lens = new PIXI.Graphics();
  lens.beginFill(COLORS.LASER, 0.5);
  lens.drawCircle(20, 0, 6);
  lens.endFill();

  const label = new PIXI.Text('激光', {
    fontSize: 12,
    fill: COLORS.PAPER,
    align: 'center',
  });
  label.anchor.set(0.5);
  label.rotation = -angle;
  label.y = 30;

  container.addChild(body, emitter, lens, label);
  return container;
};

export const createTarget = (
  x: number,
  y: number,
  radius: number,
  hit: boolean,
): PIXI.Container => {
  const container = new PIXI.Container();
  container.x = x;
  container.y = y;

  if (hit) {
    const glow = new PIXI.Graphics();
    glow.beginFill(COLORS.SUCCESS, 0.3);
    glow.drawCircle(0, 0, radius + 20);
    glow.endFill();
    container.addChild(glow);
  }

  const outer = new PIXI.Graphics();
  outer.beginFill(hit ? COLORS.SUCCESS : COLORS.DARK_RED);
  outer.lineStyle(3, COLORS.BRONZE);
  outer.drawCircle(0, 0, radius);
  outer.endFill();

  const middle = new PIXI.Graphics();
  middle.beginFill(hit ? '#6ba37c' : COLORS.ERROR);
  middle.drawCircle(0, 0, radius * 0.65);
  middle.endFill();

  const inner = new PIXI.Graphics();
  inner.beginFill(hit ? COLORS.GOLD_LIGHT : COLORS.LASER);
  inner.drawCircle(0, 0, radius * 0.35);
  inner.endFill();

  const label = new PIXI.Text('目标', {
    fontSize: 14,
    fill: COLORS.PAPER,
    align: 'center',
  });
  label.anchor.set(0.5);
  label.y = radius + 20;

  container.addChild(outer, middle, inner, label);
  return container;
};

export const createLaserPath = (points: Point[]): PIXI.Graphics => {
  const graphics = new PIXI.Graphics();

  if (points.length < 2) return graphics;

  graphics.lineStyle(4, COLORS.LASER_GLOW, 0.5);
  graphics.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    graphics.lineTo(points[i].x, points[i].y);
  }

  graphics.lineStyle(2, COLORS.LASER);
  graphics.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    graphics.lineTo(points[i].x, points[i].y);
  }

  return graphics;
};

export const createWall = (
  x: number,
  y: number,
  width: number,
  height: number,
): PIXI.Graphics => {
  const graphics = new PIXI.Graphics();
  graphics.beginFill(COLORS.WOOD);
  graphics.lineStyle(3, COLORS.GOLD_DARK);
  graphics.drawRoundedRect(x, y, width, height, 3);
  graphics.endFill();

  graphics.lineStyle(1, COLORS.BRONZE, 0.3);
  for (let i = 0; i < height; i += 20) {
    graphics.moveTo(x, y + i);
    graphics.lineTo(x + width, y + i);
  }

  return graphics;
};
