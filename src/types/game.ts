export interface Point {
  x: number;
  y: number;
}

export interface PlacedGear {
  id: string;
  x: number;
  y: number;
  radius: number;
  teeth: number;
  rotation: number;
}

export interface GearSlot {
  id: string;
  x: number;
  y: number;
  allowedRadii: number[];
}

export interface Rune {
  id: number;
  x: number;
  y: number;
  symbol: string;
  isLit: boolean;
}

export interface MirrorData {
  id: string;
  x: number;
  y: number;
  angle: number;
  length: number;
}

export interface StoneData {
  id: string;
  weight: number;
  x: number;
  y: number;
  placedSide: 'left' | 'right' | null;
}

export interface GameState {
  currentRoom: number;
  tokens: number;
  startTime: number | null;
  elapsedTime: number;
  isPaused: boolean;
  isDarkened: boolean;
  darkenedTime: number;
  clues: string[];
  completedRooms: boolean[];
  showHint: boolean;
  currentHint: string | null;
  transitioning: boolean;
}

export interface GearState {
  powerSource: Point;
  powerTarget: Point;
  slots: GearSlot[];
  placedGears: PlacedGear[];
  availableGears: { radius: number; teeth: number }[];
  powerConnected: boolean;
  selectedSlot: string | null;
}

export interface RuneState {
  runes: Rune[];
  correctSequence: number[];
  currentSequence: number[];
  showSequence: boolean;
}

export interface MirrorState {
  mirrors: MirrorData[];
  laserSource: Point;
  laserAngle: number;
  target: Point;
  targetRadius: number;
  laserPath: Point[];
  targetHit: boolean;
}

export interface BalanceState {
  availableStones: StoneData[];
  leftArmSlots: { x: number; y: number; filled: boolean }[];
  rightArmSlots: { x: number; y: number; filled: boolean }[];
  leftTotal: number;
  rightTotal: number;
  targetWeight: number;
  isBalanced: boolean;
  selectedStone: string | null;
}

export interface LockState {
  input: string;
  correctCode: string;
  digits: string[];
  clues: string[];
}

export type RoomType = 'gear' | 'rune' | 'mirror' | 'balance' | 'lock';

export const ROOM_NAMES: Record<RoomType, string> = {
  gear: '齿轮室',
  rune: '符文室',
  mirror: '镜像室',
  balance: '权衡室',
  lock: '玄机室',
};

export interface PuzzleConfig {
  type: RoomType;
  name: string;
  clue: string;
  data: any;
}
