export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 768;

export const COLORS = {
  BACKGROUND: '#1a1410',
  BACKGROUND_LIGHT: '#2a1f18',
  GOLD: '#cd7f32',
  GOLD_LIGHT: '#e8c07d',
  GOLD_DARK: '#8b6914',
  BRONZE: '#8b7355',
  BRONZE_LIGHT: '#a08060',
  COPPER: '#b87333',
  DARK_GREEN: '#2d4a3e',
  DARK_RED: '#5c2b2b',
  WOOD: '#4a3728',
  WOOD_LIGHT: '#6b4f3a',
  PAPER: '#d4c4a8',
  INK: '#1a1410',
  LASER: '#ff4444',
  LASER_GLOW: '#ff6666',
  HIGHLIGHT: '#e8c07d',
  SUCCESS: '#4a7c59',
  ERROR: '#8b3a3a',
} as const;

export const INITIAL_TOKENS = 3;
export const DARKEN_PUNISHMENT_TIME = 3;

export const ROOM_ORDER = ['gear', 'rune', 'mirror', 'balance', 'lock'] as const;

export const TIME_BONUS_THRESHOLDS = [
  { time: 60, bonus: 5 },
  { time: 120, bonus: 3 },
  { time: 180, bonus: 2 },
  { time: 300, bonus: 1 },
] as const;

export const GEAR_RADII = [40, 55, 70, 85] as const;
export const GEAR_TEETH_PER_RADIUS: Record<number, number> = {
  40: 12,
  55: 16,
  70: 20,
  85: 24,
};

export const RUNE_SYMBOLS = [
  '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '子', '丑',
];

export const BALANCE_TARGET_WEIGHT = 25;
