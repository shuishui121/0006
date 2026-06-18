import * as PIXI from 'pixi.js';
import { COLORS } from '@/utils/constants';
import type { PlacedGear } from '@/types/game';

export const createGear = (
  radius: number,
  teeth: number,
  x: number = 0,
  y: number = 0,
): PIXI.Container => {
  const container = new PIXI.Container();
  container.x = x;
  container.y = y;

  const innerRadius = radius * 0.6;
  const toothHeight = radius * 0.15;
  const toothWidth = (Math.PI * 2 * radius) / teeth * 0.4;

  const graphics = new PIXI.Graphics();

  graphics.beginFill(COLORS.BRONZE);
  graphics.lineStyle(2, COLORS.GOLD_DARK);

  for (let i = 0; i < teeth; i++) {
    const angle = (i / teeth) * Math.PI * 2;
    const nextAngle = ((i + 1) / teeth) * Math.PI * 2;
    const midAngle = (angle + nextAngle) / 2;

    const innerX1 = Math.cos(angle) * innerRadius;
    const innerY1 = Math.sin(angle) * innerRadius;
    const innerX2 = Math.cos(nextAngle) * innerRadius;
    const innerY2 = Math.sin(nextAngle) * innerRadius;

    const toothInX1 = Math.cos(angle - toothWidth / radius / 2) * (radius - toothHeight);
    const toothInY1 = Math.sin(angle - toothWidth / radius / 2) * (radius - toothHeight);
    const toothOutX1 = Math.cos(angle) * radius;
    const toothOutY1 = Math.sin(angle) * radius;
    const toothOutX2 = Math.cos(angle + toothWidth / radius / 2) * radius;
    const toothOutY2 = Math.sin(angle + toothWidth / radius / 2) * radius;
    const toothInX2 = Math.cos(angle + toothWidth / radius / 2) * (radius - toothHeight);
    const toothInY2 = Math.sin(angle + toothWidth / radius / 2) * (radius - toothHeight);

    graphics.moveTo(innerX1, innerY1);
    graphics.lineTo(toothInX1, toothInY1);
    graphics.lineTo(toothOutX1, toothOutY1);
    graphics.lineTo(toothOutX2, toothOutY2);
    graphics.lineTo(toothInX2, toothInY2);
    graphics.lineTo(innerX2, innerY2);
    graphics.arc(0, 0, innerRadius, nextAngle, angle, true);
  }

  graphics.closePath();
  graphics.endFill();

  const center = new PIXI.Graphics();
  center.beginFill(COLORS.GOLD_DARK);
  center.drawCircle(0, 0, radius * 0.2);
  center.endFill();
  center.beginFill(COLORS.GOLD_LIGHT);
  center.drawCircle(0, 0, radius * 0.12);
  center.endFill();

  for (let i = 0; i < 6; i++) {
    const holeAngle = (i / 6) * Math.PI * 2;
    const holeX = Math.cos(holeAngle) * innerRadius * 0.6;
    const holeY = Math.sin(holeAngle) * innerRadius * 0.6;
    const hole = new PIXI.Graphics();
    hole.beginFill(COLORS.BACKGROUND);
    hole.drawCircle(holeX, holeY, radius * 0.12);
    hole.endFill();
    container.addChild(hole);
  }

  container.addChild(graphics, center);
  container.hitArea = new PIXI.Circle(0, 0, radius);

  return container;
};

export const createPowerSource = (x: number, y: number, radius: number = 50): PIXI.Container => {
  const container = new PIXI.Container();
  container.x = x;
  container.y = y;

  const outer = new PIXI.Graphics();
  outer.beginFill(COLORS.GOLD_DARK);
  outer.lineStyle(3, COLORS.GOLD_LIGHT);
  outer.drawCircle(0, 0, radius);
  outer.endFill();

  const inner = new PIXI.Graphics();
  inner.beginFill(COLORS.GOLD);
  inner.drawCircle(0, 0, radius * 0.7);
  inner.endFill();

  const center = new PIXI.Graphics();
  center.beginFill(COLORS.GOLD_LIGHT);
  center.drawCircle(0, 0, radius * 0.3);
  center.endFill();

  const symbol = new PIXI.Text('⚙', {
    fontSize: radius * 0.8,
    fill: COLORS.GOLD_LIGHT,
    align: 'center',
  });
  symbol.anchor.set(0.5);

  container.addChild(outer, inner, center, symbol);
  return container;
};

export const createPowerTarget = (x: number, y: number, radius: number = 50, connected: boolean = false): PIXI.Container => {
  const container = new PIXI.Container();
  container.x = x;
  container.y = y;

  const color = connected ? COLORS.SUCCESS : COLORS.DARK_RED;
  const lightColor = connected ? '#6ba37c' : '#a04040';

  const outer = new PIXI.Graphics();
  outer.beginFill(COLORS.BRONZE);
  outer.lineStyle(3, color);
  outer.drawCircle(0, 0, radius);
  outer.endFill();

  const inner = new PIXI.Graphics();
  inner.beginFill(color);
  inner.drawCircle(0, 0, radius * 0.6);
  inner.endFill();

  const center = new PIXI.Graphics();
  center.beginFill(lightColor);
  center.drawCircle(0, 0, radius * 0.25);
  center.endFill();

  if (connected) {
    const glow = new PIXI.Graphics();
    glow.beginFill(COLORS.GOLD_LIGHT, 0.3);
    glow.drawCircle(0, 0, radius * 1.5);
    glow.endFill();
    container.addChild(glow);
  }

  const symbol = new PIXI.Text('出口', {
    fontSize: radius * 0.4,
    fill: COLORS.PAPER,
    align: 'center',
  });
  symbol.anchor.set(0.5);
  symbol.y = radius + 20;

  container.addChild(outer, inner, center, symbol);
  return container;
};

export const createSlot = (
  x: number,
  y: number,
  allowedRadii: number[],
  selected: boolean = false,
): PIXI.Container => {
  const container = new PIXI.Container();
  container.x = x;
  container.y = y;

  const maxRadius = Math.max(...allowedRadii);
  const hitRadius = maxRadius + 15;

  const outer = new PIXI.Graphics();
  outer.lineStyle(2, selected ? COLORS.GOLD_LIGHT : COLORS.BRONZE, selected ? 0.8 : 0.4);
  outer.drawCircle(0, 0, maxRadius + 5);

  const inner = new PIXI.Graphics();
  inner.lineStyle(1, COLORS.BRONZE, 0.3);
  for (const radius of allowedRadii) {
    inner.drawCircle(0, 0, radius);
  }

  const crosshair = new PIXI.Graphics();
  crosshair.lineStyle(1, COLORS.BRONZE, 0.3);
  crosshair.moveTo(-maxRadius - 8, 0);
  crosshair.lineTo(maxRadius + 8, 0);
  crosshair.moveTo(0, -maxRadius - 8);
  crosshair.lineTo(0, maxRadius + 8);

  const hitArea = new PIXI.Graphics();
  hitArea.beginFill(0xffffff, 0);
  hitArea.drawCircle(0, 0, hitRadius);
  hitArea.endFill();

  container.addChild(outer, inner, crosshair, hitArea);
  container.hitArea = new PIXI.Circle(0, 0, hitRadius);
  return container;
};

export const createGearSelector = (
  availableGears: { radius: number; teeth: number }[],
  selectedIndex: number | null,
  onSelect: (index: number) => void,
): PIXI.Container => {
  const container = new PIXI.Container();
  container.x = 50;
  container.y = 680;

  const label = new PIXI.Text('可用齿轮：(点击选中后，再点击上方槽位放置)', {
    fontSize: 16,
    fill: COLORS.PAPER,
  });
  label.y = -30;
  container.addChild(label);

  let xOffset = 0;
  availableGears.forEach((gear, index) => {
    const wrapper = new PIXI.Container();
    wrapper.x = xOffset;
    wrapper.y = 0;

    const actualRadius = gear.radius * 0.5;
    const gearSprite = createGear(actualRadius, gear.teeth);
    wrapper.addChild(gearSprite);

    if (selectedIndex === index) {
      const glow = new PIXI.Graphics();
      glow.beginFill(COLORS.GOLD_LIGHT, 0.25);
      glow.drawCircle(0, 0, actualRadius + 18);
      glow.endFill();

      const highlight = new PIXI.Graphics();
      highlight.lineStyle(4, COLORS.GOLD_LIGHT, 1);
      highlight.drawCircle(0, 0, actualRadius + 12);
      highlight.endFill();
      wrapper.addChildAt(glow, 0);
      wrapper.addChildAt(highlight, 1);
    }

    wrapper.eventMode = 'static';
    wrapper.cursor = 'pointer';
    wrapper.hitArea = new PIXI.Circle(0, 0, actualRadius + 10);

    wrapper.on('pointerover', () => {
      wrapper.scale.set(1.1);
    });
    wrapper.on('pointerout', () => {
      wrapper.scale.set(1);
    });
    wrapper.on('pointerdown', () => onSelect(index));

    const sizeLabel = new PIXI.Text(`${gear.radius}`, {
      fontSize: 12,
      fill: COLORS.PAPER,
      align: 'center',
    });
    sizeLabel.anchor.set(0.5);
    sizeLabel.x = xOffset;
    sizeLabel.y = actualRadius + 18;

    container.addChild(wrapper, sizeLabel);
    xOffset += gear.radius * 0.5 * 2 + 25;
  });

  return container;
};

export const animateGears = (
  gears: { sprite: PIXI.Container; data: PlacedGear }[],
  sourceRotation: number,
) => {
  gears.forEach(({ sprite, data }) => {
    const direction = data.id.includes('even') ? 1 : -1;
    sprite.rotation += 0.02 * direction;
  });
};
