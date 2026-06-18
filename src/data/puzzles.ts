import type { PuzzleConfig } from '@/types/game';
import { CANVAS_WIDTH, CANVAS_HEIGHT, RUNE_SYMBOLS } from '@/utils/constants';

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

export const PUZZLE_CONFIGS: PuzzleConfig[] = [
  {
    type: 'gear',
    name: '齿轮室',
    clue: '3',
    data: {
      powerSource: { x: 140, y: CY },
      powerTarget: { x: 820, y: CY },
      slots: [
        { id: 'slot1', x: 260, y: CY, allowedRadii: [70, 85] },
        { id: 'slot2', x: 385, y: CY, allowedRadii: [55, 70] },
        { id: 'slot3', x: 510, y: CY, allowedRadii: [70, 85] },
        { id: 'slot4', x: 635, y: CY, allowedRadii: [40, 55] },
        { id: 'slot5', x: 730, y: CY, allowedRadii: [40, 55] },
      ],
      availableGears: [
        { radius: 40, teeth: 12 },
        { radius: 40, teeth: 12 },
        { radius: 55, teeth: 16 },
        { radius: 55, teeth: 16 },
        { radius: 70, teeth: 20 },
        { radius: 70, teeth: 20 },
        { radius: 85, teeth: 24 },
      ],
      solution: {
        slot1: 70,
        slot2: 55,
        slot3: 70,
        slot4: 55,
        slot5: 40,
      },
    },
  },
  {
    type: 'rune',
    name: '符文室',
    clue: '7',
    data: {
      runes: RUNE_SYMBOLS.map((symbol, i) => {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const radius = 220;
        return {
          id: i,
          x: CX + Math.cos(angle) * radius,
          y: CY + Math.sin(angle) * radius,
          symbol,
          isLit: false,
        };
      }),
      correctSequence: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    },
  },
  {
    type: 'mirror',
    name: '镜像室',
    clue: '2',
    data: {
      laserSource: { x: 100, y: CY - 100 },
      laserAngle: 0,
      target: { x: CANVAS_WIDTH - 150, y: CY + 150 },
      targetRadius: 40,
      mirrors: [
        { id: 'm1', x: 350, y: CY - 100, angle: Math.PI / 4, length: 80 },
        { id: 'm2', x: 350, y: CY + 80, angle: -Math.PI / 4, length: 80 },
        { id: 'm3', x: 600, y: CY + 80, angle: Math.PI / 4, length: 80 },
        { id: 'm4', x: 600, y: CY - 50, angle: -Math.PI / 4, length: 80 },
        { id: 'm5', x: 850, y: CY - 50, angle: Math.PI / 4, length: 80 },
      ],
      solutionAngles: {
        m1: Math.PI / 4,
        m2: -Math.PI / 4,
        m3: Math.PI / 4,
        m4: Math.PI / 2,
        m5: -Math.PI / 4,
      },
    },
  },
  {
    type: 'balance',
    name: '权衡室',
    clue: '9',
    data: {
      targetWeight: 25,
      availableStones: [
        { id: 's1', weight: 3, x: 150, y: 650, placedSide: null },
        { id: 's2', weight: 5, x: 220, y: 650, placedSide: null },
        { id: 's3', weight: 7, x: 290, y: 650, placedSide: null },
        { id: 's4', weight: 8, x: 360, y: 650, placedSide: null },
        { id: 's5', weight: 9, x: 430, y: 650, placedSide: null },
        { id: 's6', weight: 11, x: 500, y: 650, placedSide: null },
        { id: 's7', weight: 13, x: 570, y: 650, placedSide: null },
        { id: 's8', weight: 15, x: 640, y: 650, placedSide: null },
      ],
      leftArmSlots: [
        { x: CX - 180, y: CY - 30, filled: false },
        { x: CX - 120, y: CY - 30, filled: false },
        { x: CX - 60, y: CY - 30, filled: false },
      ],
      rightArmSlots: [
        { x: CX + 60, y: CY - 30, filled: false },
        { x: CX + 120, y: CY - 30, filled: false },
        { x: CX + 180, y: CY - 30, filled: false },
      ],
    },
  },
  {
    type: 'lock',
    name: '玄机室',
    clue: '',
    data: {
      correctCode: '3729',
      digits: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    },
  },
];

export const getPuzzleByType = (type: string): PuzzleConfig | undefined => {
  return PUZZLE_CONFIGS.find((p) => p.type === type);
};

export const getPuzzleByIndex = (index: number): PuzzleConfig | undefined => {
  return PUZZLE_CONFIGS[index];
};
