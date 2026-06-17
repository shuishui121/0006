import { create } from 'zustand';
import type { GameState, GearState, RuneState, MirrorState, BalanceState, LockState } from '@/types/game';
import { INITIAL_TOKENS, DARKEN_PUNISHMENT_TIME, ROOM_ORDER } from '@/utils/constants';
import { PUZZLE_CONFIGS } from '@/data/puzzles';

interface GameStore extends GameState {
  gearState: GearState;
  runeState: RuneState;
  mirrorState: MirrorState;
  balanceState: BalanceState;
  lockState: LockState;
  hintLevels: number[];
  setCurrentRoom: (room: number) => void;
  startGame: () => void;
  updateElapsedTime: () => void;
  consumeToken: () => boolean;
  addTokens: (amount: number) => void;
  triggerDarken: () => void;
  updateDarkenTime: (delta: number) => void;
  completeRoom: (roomIndex: number, clue: string) => void;
  showHintModal: (hint: string) => void;
  hideHintModal: () => void;
  incrementHintLevel: (roomIndex: number) => number;
  setTransitioning: (value: boolean) => void;
  resetGame: () => void;
  setGearState: (state: Partial<GearState>) => void;
  setRuneState: (state: Partial<RuneState>) => void;
  setMirrorState: (state: Partial<MirrorState>) => void;
  setBalanceState: (state: Partial<BalanceState>) => void;
  setLockState: (state: Partial<LockState>) => void;
}

const getInitialGearState = (): GearState => {
  const config = PUZZLE_CONFIGS[0].data;
  return {
    powerSource: config.powerSource,
    powerTarget: config.powerTarget,
    slots: config.slots.map((s: any) => ({ ...s })),
    placedGears: [],
    availableGears: [...config.availableGears],
    powerConnected: false,
    selectedSlot: null,
  };
};

const getInitialRuneState = (): RuneState => {
  const config = PUZZLE_CONFIGS[1].data;
  return {
    runes: config.runes.map((r: any) => ({ ...r, isLit: false })),
    correctSequence: [...config.correctSequence],
    currentSequence: [],
    showSequence: false,
  };
};

const getInitialMirrorState = (): MirrorState => {
  const config = PUZZLE_CONFIGS[2].data;
  return {
    mirrors: config.mirrors.map((m: any) => ({ ...m })),
    laserSource: config.laserSource,
    laserAngle: config.laserAngle,
    target: config.target,
    targetRadius: config.targetRadius,
    laserPath: [],
    targetHit: false,
  };
};

const getInitialBalanceState = (): BalanceState => {
  const config = PUZZLE_CONFIGS[3].data;
  return {
    availableStones: config.availableStones.map((s: any) => ({ ...s })),
    leftArmSlots: config.leftArmSlots.map((s: any) => ({ ...s })),
    rightArmSlots: config.rightArmSlots.map((s: any) => ({ ...s })),
    leftTotal: 0,
    rightTotal: 0,
    targetWeight: config.targetWeight,
    isBalanced: false,
    selectedStone: null,
  };
};

const getInitialLockState = (): LockState => {
  const config = PUZZLE_CONFIGS[4].data;
  return {
    input: '',
    correctCode: config.correctCode,
    digits: config.digits,
    clues: [],
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  currentRoom: 0,
  tokens: INITIAL_TOKENS,
  startTime: null,
  elapsedTime: 0,
  isPaused: false,
  isDarkened: false,
  darkenedTime: 0,
  clues: [],
  completedRooms: [false, false, false, false, false],
  showHint: false,
  currentHint: null,
  transitioning: false,
  hintLevels: [0, 0, 0, 0, 0],

  gearState: getInitialGearState(),
  runeState: getInitialRuneState(),
  mirrorState: getInitialMirrorState(),
  balanceState: getInitialBalanceState(),
  lockState: getInitialLockState(),

  setCurrentRoom: (room: number) => set({ currentRoom: room }),

  startGame: () =>
    set({
      startTime: Date.now(),
      elapsedTime: 0,
      currentRoom: 0,
      tokens: INITIAL_TOKENS,
      completedRooms: [false, false, false, false, false],
      clues: [],
      hintLevels: [0, 0, 0, 0, 0],
      gearState: getInitialGearState(),
      runeState: getInitialRuneState(),
      mirrorState: getInitialMirrorState(),
      balanceState: getInitialBalanceState(),
      lockState: getInitialLockState(),
    }),

  updateElapsedTime: () => {
    const { startTime } = get();
    if (startTime) {
      set({ elapsedTime: Math.floor((Date.now() - startTime) / 1000) });
    }
  },

  consumeToken: () => {
    const { tokens } = get();
    if (tokens > 0) {
      set({ tokens: tokens - 1 });
      return true;
    }
    return false;
  },

  addTokens: (amount: number) => set((state) => ({ tokens: state.tokens + amount })),

  triggerDarken: () =>
    set({
      isDarkened: true,
      darkenedTime: DARKEN_PUNISHMENT_TIME,
    }),

  updateDarkenTime: (delta: number) => {
    const { darkenedTime } = get();
    const newTime = darkenedTime - delta;
    if (newTime <= 0) {
      set({ isDarkened: false, darkenedTime: 0 });
    } else {
      set({ darkenedTime: newTime });
    }
  },

  completeRoom: (roomIndex: number, clue: string) =>
    set((state) => ({
      completedRooms: state.completedRooms.map((c, i) => (i === roomIndex ? true : c)),
      clues: [...state.clues, clue],
      lockState: {
        ...state.lockState,
        clues: [...state.lockState.clues, clue],
      },
    })),

  showHintModal: (hint: string) => set({ showHint: true, currentHint: hint }),

  hideHintModal: () => set({ showHint: false, currentHint: null }),

  incrementHintLevel: (roomIndex: number) => {
    const { hintLevels } = get();
    const newLevels = [...hintLevels];
    newLevels[roomIndex] += 1;
    set({ hintLevels: newLevels });
    return newLevels[roomIndex];
  },

  setTransitioning: (value: boolean) => set({ transitioning: value }),

  resetGame: () =>
    set({
      currentRoom: 0,
      tokens: INITIAL_TOKENS,
      startTime: null,
      elapsedTime: 0,
      isPaused: false,
      isDarkened: false,
      darkenedTime: 0,
      clues: [],
      completedRooms: [false, false, false, false, false],
      showHint: false,
      currentHint: null,
      transitioning: false,
      hintLevels: [0, 0, 0, 0, 0],
      gearState: getInitialGearState(),
      runeState: getInitialRuneState(),
      mirrorState: getInitialMirrorState(),
      balanceState: getInitialBalanceState(),
      lockState: getInitialLockState(),
    }),

  setGearState: (state: Partial<GearState>) =>
    set((s) => ({ gearState: { ...s.gearState, ...state } })),

  setRuneState: (state: Partial<RuneState>) =>
    set((s) => ({ runeState: { ...s.runeState, ...state } })),

  setMirrorState: (state: Partial<MirrorState>) =>
    set((s) => ({ mirrorState: { ...s.mirrorState, ...state } })),

  setBalanceState: (state: Partial<BalanceState>) =>
    set((s) => ({ balanceState: { ...s.balanceState, ...state } })),

  setLockState: (state: Partial<LockState>) =>
    set((s) => ({ lockState: { ...s.lockState, ...state } })),
}));
