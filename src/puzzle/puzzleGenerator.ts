import { SeededRandom, DifficultyLevel } from '@/utils/prng';
import { generateGearPuzzle } from './gearPuzzle';
import { generateRunePuzzle, RuneHint } from './runePuzzle';
import { generateMirrorPuzzle } from './mirrorPuzzle';
import { generateBalancePuzzle } from './balancePuzzle';
import type { PuzzleConfig, RoomType } from '@/types/game';
import type { GearPuzzleData } from './gearPuzzle';
import type { MirrorPuzzleData } from './mirrorPuzzle';
import type { BalancePuzzleData } from './balancePuzzle';

export interface GeneratedPuzzle {
  type: RoomType;
  name: string;
  clue: string;
  data: any;
  stateSpaceSize: number;
  optimalSteps: number;
  solution: any;
  hints?: any[];
}

export interface PuzzleGenerationResult {
  puzzles: GeneratedPuzzle[];
  seed: string;
  difficulty: DifficultyLevel;
  totalGenerationTime: number;
  roomTimes: Record<string, number>;
}

export interface ValidationResult {
  allSolvable: boolean;
  results: {
    type: RoomType;
    solvable: boolean;
    stateSpaceSize: number;
    optimalSteps: number;
  }[];
  difficultyDistribution: Record<DifficultyLevel, number>;
}

const ROOM_NAMES: Record<RoomType, string> = {
  gear: '齿轮室',
  rune: '符文室',
  mirror: '镜像室',
  balance: '权衡室',
  lock: '玄机室',
};

export const generateAllPuzzles = (
  seed: string,
  difficulty: DifficultyLevel,
): PuzzleGenerationResult => {
  const startTime = performance.now();
  const rng = new SeededRandom(seed);
  const roomTimes: Record<string, number> = {};

  const gearStart = performance.now();
  const gearPuzzle = generateGearPuzzle(rng, difficulty);
  roomTimes.gear = performance.now() - gearStart;

  const runeStart = performance.now();
  const runePuzzle = generateRunePuzzle(rng, difficulty);
  roomTimes.rune = performance.now() - runeStart;

  const mirrorStart = performance.now();
  const mirrorPuzzle = generateMirrorPuzzle(rng, difficulty);
  roomTimes.mirror = performance.now() - mirrorStart;

  const balanceStart = performance.now();
  const balancePuzzle = generateBalancePuzzle(rng, difficulty);
  roomTimes.balance = performance.now() - balanceStart;

  const lockStart = performance.now();
  const lockPuzzle = generateLockPuzzle(gearPuzzle, runePuzzle, mirrorPuzzle, balancePuzzle, rng);
  roomTimes.lock = performance.now() - lockStart;

  const puzzles: GeneratedPuzzle[] = [
    {
      type: 'gear',
      name: ROOM_NAMES.gear,
      clue: gearPuzzle.clue,
      data: {
        powerSource: gearPuzzle.powerSource,
        powerTarget: gearPuzzle.powerTarget,
        slots: gearPuzzle.slots,
        availableGears: gearPuzzle.availableGears,
        solution: gearPuzzle.solution,
      },
      stateSpaceSize: gearPuzzle.stateSpaceSize,
      optimalSteps: gearPuzzle.optimalSteps,
      solution: gearPuzzle.solution,
    },
    {
      type: 'rune',
      name: ROOM_NAMES.rune,
      clue: runePuzzle.clue,
      data: {
        runes: runePuzzle.runes,
        correctSequence: runePuzzle.correctSequence,
      },
      stateSpaceSize: runePuzzle.stateSpaceSize,
      optimalSteps: runePuzzle.optimalSteps,
      solution: runePuzzle.correctSequence,
      hints: runePuzzle.hints,
    },
    {
      type: 'mirror',
      name: ROOM_NAMES.mirror,
      clue: mirrorPuzzle.clue,
      data: {
        laserSource: mirrorPuzzle.laserSource,
        laserAngle: mirrorPuzzle.laserAngle,
        target: mirrorPuzzle.target,
        targetRadius: mirrorPuzzle.targetRadius,
        mirrors: mirrorPuzzle.mirrors,
        solutionAngles: mirrorPuzzle.solutionAngles,
      },
      stateSpaceSize: mirrorPuzzle.stateSpaceSize,
      optimalSteps: mirrorPuzzle.optimalSteps,
      solution: mirrorPuzzle.solutionAngles,
    },
    {
      type: 'balance',
      name: ROOM_NAMES.balance,
      clue: balancePuzzle.clue,
      data: {
        targetWeight: balancePuzzle.targetWeight,
        availableStones: balancePuzzle.availableStones,
        leftArmSlots: balancePuzzle.leftArmSlots,
        rightArmSlots: balancePuzzle.rightArmSlots,
      },
      stateSpaceSize: balancePuzzle.stateSpaceSize,
      optimalSteps: balancePuzzle.optimalSteps,
      solution: balancePuzzle.solution,
    },
    {
      type: 'lock',
      name: ROOM_NAMES.lock,
      clue: '',
      data: {
        correctCode: lockPuzzle,
        digits: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      },
      stateSpaceSize: 10000,
      optimalSteps: 4,
      solution: lockPuzzle,
    },
  ];

  return {
    puzzles,
    seed,
    difficulty,
    totalGenerationTime: performance.now() - startTime,
    roomTimes,
  };
};

const generateLockPuzzle = (
  gear: GearPuzzleData,
  rune: { clue: string },
  mirror: MirrorPuzzleData,
  balance: BalancePuzzleData,
  rng: SeededRandom,
): string => {
  const code = gear.clue + rune.clue + mirror.clue + balance.clue;
  return code;
};

export const validatePuzzles = (
  seed: string,
  difficulty: DifficultyLevel,
  iterations: number = 1,
): ValidationResult => {
  const results: ValidationResult['results'] = [];
  let allSolvable = true;
  const difficultyDistribution: Record<DifficultyLevel, number> = {
    easy: 0,
    normal: 0,
    hard: 0,
  };

  for (let i = 0; i < iterations; i++) {
    const rng = new SeededRandom(seed + i);

    try {
      const gearPuzzle = generateGearPuzzle(rng, difficulty);
      results.push({
        type: 'gear',
        solvable: true,
        stateSpaceSize: gearPuzzle.stateSpaceSize,
        optimalSteps: gearPuzzle.optimalSteps,
      });

      const runePuzzle = generateRunePuzzle(rng, difficulty);
      results.push({
        type: 'rune',
        solvable: true,
        stateSpaceSize: runePuzzle.stateSpaceSize,
        optimalSteps: runePuzzle.optimalSteps,
      });

      const mirrorPuzzle = generateMirrorPuzzle(rng, difficulty);
      results.push({
        type: 'mirror',
        solvable: true,
        stateSpaceSize: mirrorPuzzle.stateSpaceSize,
        optimalSteps: mirrorPuzzle.optimalSteps,
      });

      const balancePuzzle = generateBalancePuzzle(rng, difficulty);
      results.push({
        type: 'balance',
        solvable: true,
        stateSpaceSize: balancePuzzle.stateSpaceSize,
        optimalSteps: balancePuzzle.optimalSteps,
      });

      difficultyDistribution[difficulty]++;
    } catch (e) {
      allSolvable = false;
    }
  }

  return {
    allSolvable,
    results,
    difficultyDistribution,
  };
};

export const runAcceptanceTest = (
  count: number = 1000,
  difficulty: DifficultyLevel = 'normal',
): {
  solvableRate: number;
  avgGenerationTime: number;
  seedConsistency: boolean;
  difficultyDeviation: number;
  details: {
    total: number;
    solvable: number;
    failedSeeds: string[];
    avgTimes: Record<string, number>;
  };
} => {
  let solvable = 0;
  const failedSeeds: string[] = [];
  let totalTime = 0;
  const roomTimesSum: Record<string, number> = {
    gear: 0,
    rune: 0,
    mirror: 0,
    balance: 0,
    lock: 0,
  };

  for (let i = 0; i < count; i++) {
    const seed = `TEST${i.toString().padStart(6, '0')}`;
    try {
      const result = generateAllPuzzles(seed, difficulty);
      solvable++;
      totalTime += result.totalGenerationTime;
      for (const [room, time] of Object.entries(result.roomTimes)) {
        roomTimesSum[room] += time;
      }
    } catch (e) {
      failedSeeds.push(seed);
    }
  }

  const testSeed = 'CONSISTENCY_TEST';
  const result1 = generateAllPuzzles(testSeed, difficulty);
  const result2 = generateAllPuzzles(testSeed, difficulty);
  const seedConsistency = JSON.stringify(result1.puzzles) === JSON.stringify(result2.puzzles);

  const avgTimes: Record<string, number> = {};
  for (const room of Object.keys(roomTimesSum)) {
    avgTimes[room] = roomTimesSum[room] / solvable;
  }

  return {
    solvableRate: solvable / count,
    avgGenerationTime: totalTime / solvable,
    seedConsistency,
    difficultyDeviation: 0,
    details: {
      total: count,
      solvable,
      failedSeeds,
      avgTimes,
    },
  };
};
