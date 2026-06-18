import { SeededRandom, DifficultyLevel } from '@/utils/prng';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/utils/constants';
import type { StoneData } from '@/types/game';

export interface BalancePuzzleData {
  targetWeight: number;
  availableStones: StoneData[];
  leftArmSlots: { x: number; y: number; filled: boolean }[];
  rightArmSlots: { x: number; y: number; filled: boolean }[];
  solution: { left: number[]; right: number[] };
  stateSpaceSize: number;
  optimalSteps: number;
  clue: string;
}

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

const DIFFICULTY_PARAMS = {
  easy: {
    stoneCount: { min: 6, max: 6 },
    slotCount: 3,
    weightRange: { min: 2, max: 12 },
  },
  normal: {
    stoneCount: { min: 7, max: 8 },
    slotCount: 3,
    weightRange: { min: 2, max: 15 },
  },
  hard: {
    stoneCount: { min: 9, max: 11 },
    slotCount: 3,
    weightRange: { min: 3, max: 20 },
  },
};

export const generateBalancePuzzle = (
  rng: SeededRandom,
  difficulty: DifficultyLevel,
): BalancePuzzleData => {
  const params = DIFFICULTY_PARAMS[difficulty];
  const slotCount = params.slotCount;
  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    attempts++;

    const stoneCount = rng.nextInt(params.stoneCount.min, params.stoneCount.max);
    const decoyCount = stoneCount - 2 * slotCount;

    if (decoyCount < 0) continue;

    const stateSpaceSize = calculateStateSpace(stoneCount, slotCount);
    if (!isDifficultyMatch(stateSpaceSize, difficulty)) continue;

    const weights: number[] = [];
    const usedWeights = new Set<number>();

    const leftIndices: number[] = [];
    const rightIndices: number[] = [];

    for (let i = 0; i < slotCount; i++) {
      let w = 0;
      let tries = 0;
      do {
        w = rng.nextInt(params.weightRange.min, params.weightRange.max);
        tries++;
      } while (usedWeights.has(w) && tries < 30);
      usedWeights.add(w);
      weights.push(w);
      leftIndices.push(i);
    }

    const targetWeight = weights.slice(0, slotCount).reduce((a, b) => a + b, 0);

    for (let i = 0; i < slotCount; i++) {
      let w = 0;
      let tries = 0;
      do {
        w = rng.nextInt(params.weightRange.min, params.weightRange.max);
        tries++;
      } while (usedWeights.has(w) && tries < 30);
      usedWeights.add(w);
      weights.push(w);
      rightIndices.push(slotCount + i);
    }

    let currentRightSum = weights.slice(slotCount, slotCount * 2).reduce((a, b) => a + b, 0);
    const diff = targetWeight - currentRightSum;
    if (diff !== 0) {
      const adjustIdx = slotCount + rng.nextInt(0, slotCount - 1);
      let newWeight = weights[adjustIdx] + diff;
      let tries = 0;
      while (usedWeights.has(newWeight) && tries < 20) {
        newWeight += rng.nextInt(-2, 2);
        tries++;
      }
      if (newWeight < params.weightRange.min || newWeight > params.weightRange.max) {
        continue;
      }
      weights[adjustIdx] = newWeight;
      usedWeights.add(newWeight);
    }

    const actualRightSum = weights.slice(slotCount, slotCount * 2).reduce((a, b) => a + b, 0);
    if (actualRightSum !== targetWeight) continue;

    for (let i = 0; i < decoyCount; i++) {
      let w = 0;
      let tries = 0;
      do {
        w = rng.nextInt(params.weightRange.min, params.weightRange.max);
        tries++;
      } while (usedWeights.has(w) && tries < 30);
      usedWeights.add(w);
      weights.push(w);
    }

    const stones: StoneData[] = weights.map((w, i) => ({
      id: `s${i + 1}`,
      weight: w,
      x: 0,
      y: 0,
      placedSide: null,
    }));

    const stoneIndices = stones.map((_, i) => i);
    const shuffledIndices = rng.shuffle(stoneIndices);

    const shuffledStones: StoneData[] = shuffledIndices.map((idx) => stones[idx]);

    const indexMap = new Map<number, number>();
    shuffledIndices.forEach((oldIdx, newIdx) => {
      indexMap.set(oldIdx, newIdx);
    });

    const solutionLeft = leftIndices.map((idx) => indexMap.get(idx)!);
    const solutionRight = rightIndices.map((idx) => indexMap.get(idx)!);

    const leftSlots = generateSlots('left', slotCount);
    const rightSlots = generateSlots('right', slotCount);

    const stonePositions = generateStonePositions(rng, shuffledStones);
    shuffledStones.forEach((stone, i) => {
      stone.x = stonePositions[i].x;
      stone.y = stonePositions[i].y;
    });

    const clue = deriveClue(targetWeight, rng);

    return {
      targetWeight,
      availableStones: shuffledStones,
      leftArmSlots: leftSlots,
      rightArmSlots: rightSlots,
      solution: { left: solutionLeft, right: solutionRight },
      stateSpaceSize,
      optimalSteps: slotCount * 2,
      clue,
    };
  }

  throw new Error('Failed to generate balance puzzle after max attempts');
};

const generateStonePositions = (rng: SeededRandom, stones: StoneData[]): { x: number; y: number }[] => {
  const positions: { x: number; y: number }[] = [];
  const startX = 150;
  const y = 650;
  const spacing = 70;

  for (let i = 0; i < stones.length; i++) {
    const x = startX + i * spacing;
    positions.push({ x, y });
  }

  return positions;
};

const generateSlots = (side: 'left' | 'right', count: number): { x: number; y: number; filled: boolean }[] => {
  const slots: { x: number; y: number; filled: boolean }[] = [];
  const baseOffset = side === 'left' ? -1 : 1;
  const startDist = 60;
  const spacing = 60;

  for (let i = 0; i < count; i++) {
    const dist = startDist + i * spacing;
    slots.push({
      x: CX + baseOffset * dist,
      y: CY - 30,
      filled: false,
    });
  }

  return slots;
};

const calculateStateSpace = (stoneCount: number, slotCount: number): number => {
  const leftOptions = combination(stoneCount, slotCount);
  const rightOptions = combination(stoneCount - slotCount, slotCount);
  return Math.min(leftOptions * rightOptions, 1000000);
};

const combination = (n: number, k: number): number => {
  if (k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result = (result * (n - k + i)) / i;
  }
  return Math.floor(result);
};

const isDifficultyMatch = (stateSpace: number, difficulty: DifficultyLevel): boolean => {
  switch (difficulty) {
    case 'easy':
      return stateSpace <= 100;
    case 'normal':
      return stateSpace > 100 && stateSpace <= 1000;
    case 'hard':
      return stateSpace > 1000;
  }
};

const deriveClue = (targetWeight: number, rng: SeededRandom): string => {
  const digit = (targetWeight % 9) + 1;
  return String(digit);
};
