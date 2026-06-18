import { SeededRandom, DifficultyLevel } from '@/utils/prng';
import { CANVAS_WIDTH, CANVAS_HEIGHT, RUNE_SYMBOLS } from '@/utils/constants';
import type { Rune } from '@/types/game';

export interface RunePuzzleData {
  runes: Rune[];
  correctSequence: number[];
  hints: RuneHint[];
  stateSpaceSize: number;
  optimalSteps: number;
  clue: string;
}

export interface RuneHint {
  type: 'position' | 'adjacent' | 'first' | 'last' | 'not_after';
  description: string;
  runeIds: number[];
  position?: number;
}

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

const DIFFICULTY_CONFIG = {
  easy: {
    runeCount: 5,
    sequenceLength: 3,
    hintCount: 2,
  },
  normal: {
    runeCount: 7,
    sequenceLength: 4,
    hintCount: 2,
  },
  hard: {
    runeCount: 10,
    sequenceLength: 5,
    hintCount: 2,
  },
};

export const generateRunePuzzle = (
  rng: SeededRandom,
  difficulty: DifficultyLevel,
): RunePuzzleData => {
  const config = DIFFICULTY_CONFIG[difficulty];
  const runeCount = config.runeCount;
  const sequenceLength = config.sequenceLength;
  const hintCount = config.hintCount;

  const runes = generateRunes(rng, runeCount);
  const correctSequence = generateSequence(rng, runeCount, sequenceLength);

  const stateSpaceSize = calculateStateSpace(runeCount, sequenceLength);

  const hints = generateHints(rng, runes, correctSequence, hintCount);

  const clue = deriveClue(correctSequence, rng);

  return {
    runes,
    correctSequence,
    hints,
    stateSpaceSize,
    optimalSteps: sequenceLength,
    clue,
  };
};

const generateRunes = (rng: SeededRandom, count: number): Rune[] => {
  const runes: Rune[] = [];
  const symbolPool = rng.shuffle([...RUNE_SYMBOLS]).slice(0, count);

  const radius = 220;
  const centerX = CX;
  const centerY = CY;

  const angleStep = (Math.PI * 2) / count;
  const startAngle = -Math.PI / 2;

  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    const jitter = rng.nextInt(-10, 10);
    const r = radius + jitter;
    runes.push({
      id: i,
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r,
      symbol: symbolPool[i],
      isLit: false,
    });
  }

  return runes;
};

const generateSequence = (rng: SeededRandom, runeCount: number, length: number): number[] => {
  const available = Array.from({ length: runeCount }, (_, i) => i);
  const shuffled = rng.shuffle(available);
  return shuffled.slice(0, length);
};

const calculateStateSpace = (runeCount: number, sequenceLength: number): number => {
  let result = 1;
  for (let i = 0; i < sequenceLength; i++) {
    result *= runeCount - i;
  }
  return Math.min(result, 1000000);
};

const generateHints = (
  rng: SeededRandom,
  runes: Rune[],
  correctSequence: number[],
  count: number,
): RuneHint[] => {
  const hints: RuneHint[] = [];
  const availableTypes = getAvailableHintTypes(correctSequence.length);
  
  const shuffledTypes = rng.shuffle([...availableTypes]);
  const selectedTypes = shuffledTypes.slice(0, count);

  for (const type of selectedTypes) {
    const hint = createHint(rng, runes, correctSequence, type);
    if (hint) {
      hints.push(hint);
    }
  }

  return hints;
};

const getAvailableHintTypes = (sequenceLength: number): string[] => {
  const types: string[] = [];
  if (sequenceLength >= 1) {
    types.push('first');
    types.push('last');
  }
  if (sequenceLength >= 2) {
    types.push('adjacent');
  }
  if (sequenceLength >= 3) {
    types.push('position');
  }
  return types;
};

const createHint = (
  rng: SeededRandom,
  runes: Rune[],
  sequence: number[],
  type: string,
): RuneHint | null => {
  switch (type) {
    case 'first':
      return createFirstHint(runes, sequence);
    case 'last':
      return createLastHint(runes, sequence);
    case 'position':
      return createPositionHint(rng, runes, sequence);
    case 'adjacent':
      return createAdjacentHint(rng, runes, sequence);
    default:
      return null;
  }
};

const createFirstHint = (runes: Rune[], sequence: number[]): RuneHint => {
  const runeId = sequence[0];
  const rune = runes.find((r) => r.id === runeId)!;
  return {
    type: 'first',
    description: `第一个点亮的符文是「${rune.symbol}」`,
    runeIds: [runeId],
  };
};

const createLastHint = (runes: Rune[], sequence: number[]): RuneHint => {
  const runeId = sequence[sequence.length - 1];
  const rune = runes.find((r) => r.id === runeId)!;
  return {
    type: 'last',
    description: `最后一个点亮的符文是「${rune.symbol}」`,
    runeIds: [runeId],
  };
};

const createPositionHint = (
  rng: SeededRandom,
  runes: Rune[],
  sequence: number[],
): RuneHint => {
  const pos = rng.nextInt(1, sequence.length - 2);
  const runeId = sequence[pos];
  const rune = runes.find((r) => r.id === runeId)!;
  return {
    type: 'position',
    description: `第${pos + 1}个点亮的符文是「${rune.symbol}」`,
    runeIds: [runeId],
    position: pos,
  };
};

const createAdjacentHint = (
  rng: SeededRandom,
  runes: Rune[],
  sequence: number[],
): RuneHint => {
  const idx = rng.nextInt(0, sequence.length - 2);
  const r1 = runes.find((r) => r.id === sequence[idx])!;
  const r2 = runes.find((r) => r.id === sequence[idx + 1])!;
  return {
    type: 'adjacent',
    description: `「${r1.symbol}」之后紧跟「${r2.symbol}」`,
    runeIds: [sequence[idx], sequence[idx + 1]],
  };
};

const deriveClue = (sequence: number[], rng: SeededRandom): string => {
  const sum = sequence.reduce((a, b) => a + b, 0);
  const digit = (sum % 9) + 1;
  return String(digit);
};
