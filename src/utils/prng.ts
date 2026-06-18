export type DifficultyLevel = 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  level: DifficultyLevel;
  label: string;
  description: string;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  easy: {
    level: 'easy',
    label: '简单',
    description: '状态空间不超过100种可能',
  },
  normal: {
    level: 'normal',
    label: '普通',
    description: '状态空间在100到1000之间',
  },
  hard: {
    level: 'hard',
    label: '困难',
    description: '状态空间超过1000，最优解不超过15步',
  },
};

export class SeededRandom {
  private seed: number;
  private state: number;

  constructor(seed: string | number) {
    this.seed = this.hashSeed(seed);
    this.state = this.seed;
  }

  private hashSeed(seed: string | number): number {
    if (typeof seed === 'number') {
      return seed >>> 0;
    }

    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  nextBoolean(): boolean {
    return this.next() < 0.5;
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  pickN<T>(array: T[], n: number): T[] {
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, n);
  }

  reset(): void {
    this.state = this.seed;
  }

  getSeed(): number {
    return this.seed;
  }

  clone(): SeededRandom {
    const clone = new SeededRandom(this.seed);
    clone.state = this.state;
    return clone;
  }
}

export const generateRandomSeed = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let seed = '';
  for (let i = 0; i < 8; i++) {
    seed += chars[Math.floor(Math.random() * chars.length)];
  }
  return seed;
};
