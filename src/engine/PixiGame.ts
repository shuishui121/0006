import * as PIXI from 'pixi.js';
import { COLORS, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/utils/constants';

export class PixiGame {
  private app: PIXI.Application;
  private container: HTMLDivElement;
  private animationFrame: number | null = null;
  private onUpdate: ((delta: number) => void) | null = null;

  constructor(container: HTMLDivElement) {
    this.container = container;

    this.app = new PIXI.Application({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: COLORS.BACKGROUND,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.container.appendChild(this.app.view as HTMLCanvasElement);

    this.setup();
  }

  private setup(): void {
    this.app.stage.sortableChildren = true;

    const background = this.createBackground();
    this.app.stage.addChild(background);

    this.app.ticker.add(this.handleTick.bind(this));
  }

  private createBackground(): PIXI.Container {
    const container = new PIXI.Container();

    const gradient = new PIXI.Graphics();
    gradient.beginFill(COLORS.BACKGROUND);
    gradient.drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gradient.endFill();

    const texture = this.createNoiseTexture();
    const noise = new PIXI.Sprite(texture);
    noise.alpha = 0.08;
    noise.width = CANVAS_WIDTH;
    noise.height = CANVAS_HEIGHT;

    const vignette = this.createVignette();

    const border = new PIXI.Graphics();
    border.lineStyle(4, COLORS.GOLD_DARK, 0.5);
    border.drawRoundedRect(10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20, 8);

    container.addChild(gradient, noise, vignette, border);
    return container;
  }

  private createNoiseTexture(): PIXI.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const imageData = ctx.createImageData(256, 256);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 255;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    return PIXI.Texture.from(canvas);
  }

  private createVignette(): PIXI.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH * 0.2,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH * 0.7,
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    return PIXI.Sprite.from(canvas);
  }

  private handleTick(): void {
    const delta = this.app.ticker.deltaTime / 60;
    if (this.onUpdate) {
      this.onUpdate(delta);
    }
  }

  public setOnUpdate(callback: (delta: number) => void): void {
    this.onUpdate = callback;
  }

  public getStage(): PIXI.Container {
    return this.app.stage;
  }

  public getApp(): PIXI.Application {
    return this.app;
  }

  public addChild(child: PIXI.Container): void {
    this.app.stage.addChild(child);
  }

  public removeChild(child: PIXI.Container): void {
    this.app.stage.removeChild(child);
  }

  public clearChildren(): void {
    while (this.app.stage.children.length > 1) {
      const child = this.app.stage.children[this.app.stage.children.length - 1];
      this.app.stage.removeChild(child);
    }
  }

  public resize(width: number, height: number): void {
    const scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);
    this.app.view.style.width = `${CANVAS_WIDTH * scale}px`;
    this.app.view.style.height = `${CANVAS_HEIGHT * scale}px`;
  }

  public destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.app.ticker.remove(this.handleTick.bind(this));
    this.app.destroy(true);
    if (this.container && this.app.view.parentNode) {
      this.container.removeChild(this.app.view as HTMLCanvasElement);
    }
  }

  public toLocalPoint(clientX: number, clientY: number): PIXI.Point {
    const rect = this.app.view.getBoundingClientRect() as DOMRect;
    const x = (clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    return new PIXI.Point(x, y);
  }
}
