import { useEffect, useRef, useCallback } from 'react';
import { PixiGame } from '@/engine/PixiGame';
import { useGameStore } from '@/store/useGameStore';
import { CANVAS_WIDTH, CANVAS_HEIGHT, RUNE_SYMBOLS, ROOM_ORDER, COLORS } from '@/utils/constants';
import { checkGearConnection, checkRuneSequence, calculateLaserPath, checkLaserHitsTarget, checkBalance } from '@/engine/systems/PuzzleSystem';
import { createGear, createPowerSource, createPowerTarget, createSlot, createGearSelector } from '@/engine/entities/Gear';
import { createRune, createRuneBoard, createSequenceDisplay } from '@/engine/entities/Rune';
import { createMirror, createLaserEmitter, createTarget, createLaserPath, createWall } from '@/engine/entities/Mirror';
import { createBalance, createStone, createWeightDisplay } from '@/engine/entities/Balance';
import * as PIXI from 'pixi.js';
import type { PlacedGear, MirrorData, StoneData } from '@/types/game';
import { distance } from '@/utils/geometry';
import { PUZZLE_CONFIGS } from '@/data/puzzles';

interface GameCanvasProps {
  width: number;
  height: number;
}

export function GameCanvas({ width, height }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PixiGame | null>(null);
  const placedGearsRef = useRef<Map<string, { sprite: PIXI.Container; data: PlacedGear }>>(new Map());
  const lockInputRef = useRef<string>('');
  const renderedRef = useRef(false);
  const selectedGearIndexRef = useRef<number | null>(null);

  const {
    currentRoom,
    gearState, setGearState,
    runeState, setRuneState,
    mirrorState, setMirrorState,
    balanceState, setBalanceState,
    lockState, setLockState,
    isDarkened, completedRooms,
    completeRoom, triggerDarken, setTransitioning,
  } = useGameStore();

  const renderRoom = useCallback(() => {
    if (!gameRef.current) return;
    const game = gameRef.current;
    game.clearChildren();
    placedGearsRef.current.clear();

    const state = useGameStore.getState();
    const roomType = ROOM_ORDER[state.currentRoom];

    switch (roomType) {
      case 'gear':
        renderGearRoom(game);
        break;
      case 'rune':
        renderRuneRoom(game);
        break;
      case 'mirror':
        renderMirrorRoom(game);
        break;
      case 'balance':
        renderBalanceRoom(game);
        break;
      case 'lock':
        renderLockRoom(game);
        break;
    }
  }, []);

  const renderGearRoom = (game: PixiGame) => {
    const state = useGameStore.getState();
    const gState = state.gearState;
    const stage = game.getStage();

    const powerSource = createPowerSource(gState.powerSource.x, gState.powerSource.y);
    stage.addChild(powerSource);

    const powerTarget = createPowerTarget(gState.powerTarget.x, gState.powerTarget.y, 50, gState.powerConnected);
    stage.addChild(powerTarget);

    gState.slots.forEach((slot) => {
      const placedGear = gState.placedGears.find((g) => g.id === slot.id);
      const slotSprite = createSlot(slot.x, slot.y, slot.allowedRadii, gState.selectedSlot === slot.id);
      slotSprite.eventMode = 'static';
      slotSprite.cursor = 'pointer';
      slotSprite.on('pointerdown', () => handleSlotClick(slot.id));
      stage.addChild(slotSprite);

      if (placedGear) {
        const gearSprite = createGear(placedGear.radius, placedGear.teeth, slot.x, slot.y);
        gearSprite.eventMode = 'static';
        gearSprite.cursor = 'pointer';
        gearSprite.on('pointerdown', (e: any) => {
          if (e.stopPropagation) e.stopPropagation();
          handleRemoveGear(slot.id);
        });
        placedGearsRef.current.set(slot.id, { sprite: gearSprite, data: placedGear });
        stage.addChild(gearSprite);
      }
    });

    const gearSelector = createGearSelector(gState.availableGears, selectedGearIndexRef.current, handleGearSelect);
    stage.addChild(gearSelector);

    if (selectedGearIndexRef.current !== null && gState.availableGears[selectedGearIndexRef.current]) {
      const hint = new PIXI.Text(
        `已选中齿轮：${gState.availableGears[selectedGearIndexRef.current].radius}，点击上方虚线圆圈槽位放置`,
        { fontSize: 16, fill: COLORS.GOLD_LIGHT, align: 'center' }
      );
      hint.anchor.set(0.5);
      hint.x = CANVAS_WIDTH / 2;
      hint.y = 620;
      stage.addChild(hint);
    } else {
      const instruction = new PIXI.Text(
        '① 点击下方齿轮选中 → ② 点击上方虚线圆圈槽位放置 → ③ 点击检查连接',
        { fontSize: 16, fill: '#d4c4a8', align: 'center' }
      );
      instruction.anchor.set(0.5);
      instruction.x = CANVAS_WIDTH / 2;
      instruction.y = 620;
      stage.addChild(instruction);
    }

    const checkBtn = createButton('检查连接', CANVAS_WIDTH - 150, 680, checkGearPuzzle);
    stage.addChild(checkBtn);

    const resetBtn = createButton('重置', CANVAS_WIDTH - 280, 680, resetGearPuzzle);
    stage.addChild(resetBtn);
  };

  const handleGearSelect = (index: number) => {
    selectedGearIndexRef.current = selectedGearIndexRef.current === index ? null : index;
    renderRoom();
  };

  const handleSlotClick = (slotId: string) => {
    if (selectedGearIndexRef.current === null) return;

    const state = useGameStore.getState();
    const gState = state.gearState;

    const slot = gState.slots.find((s) => s.id === slotId);
    const gear = gState.availableGears[selectedGearIndexRef.current];

    if (!slot || !gear) return;
    if (!slot.allowedRadii.includes(gear.radius)) return;
    if (gState.placedGears.find((g) => g.id === slotId)) return;

    const newGear: PlacedGear = {
      id: slotId,
      x: slot.x,
      y: slot.y,
      radius: gear.radius,
      teeth: gear.teeth,
      rotation: 0,
    };

    const newPlacedGears = [...gState.placedGears, newGear];
    const newAvailableGears = gState.availableGears.filter((_, i) => i !== selectedGearIndexRef.current);

    setGearState({
      placedGears: newPlacedGears,
      availableGears: newAvailableGears,
    });

    selectedGearIndexRef.current = null;
    setTimeout(() => renderRoom(), 0);
  };

  const handleRemoveGear = (slotId: string) => {
    const state = useGameStore.getState();
    const gState = state.gearState;
    const placedGear = gState.placedGears.find((g) => g.id === slotId);
    if (!placedGear) return;

    const newPlacedGears = gState.placedGears.filter((g) => g.id !== slotId);
    const newAvailableGears = [...gState.availableGears, { radius: placedGear.radius, teeth: placedGear.teeth }];

    setGearState({
      placedGears: newPlacedGears,
      availableGears: newAvailableGears,
    });
    setTimeout(() => renderRoom(), 0);
  };

  const checkGearPuzzle = () => {
    const state = useGameStore.getState();
    const gState = state.gearState;
    const connected = checkGearConnection(
      gState.powerSource,
      gState.powerTarget,
      gState.placedGears,
    );

    setGearState({ powerConnected: connected });

    if (connected) {
      handleRoomComplete();
    } else {
      triggerDarken();
    }
    setTimeout(() => renderRoom(), 0);
  };

  const resetGearPuzzle = () => {
    const config = PUZZLE_CONFIGS[0].data;
    setGearState({
      placedGears: [],
      availableGears: [...config.availableGears],
      powerConnected: false,
      selectedSlot: null,
      selectedGearIndex: null,
    });
    selectedGearIndexRef.current = null;
    setTimeout(() => renderRoom(), 0);
  };

  const renderRuneRoom = (game: PixiGame) => {
    const state = useGameStore.getState();
    const rState = state.runeState;
    const stage = game.getStage();

    const board = createRuneBoard();
    stage.addChild(board);

    rState.runes.forEach((rune) => {
      const runeSprite = createRune(rune, handleRuneClick);
      stage.addChild(runeSprite);
    });

    const sequenceDisplay = createSequenceDisplay(
      rState.currentSequence,
      rState.correctSequence.length,
      RUNE_SYMBOLS,
    );
    stage.addChild(sequenceDisplay);

    const instruction = new PIXI.Text('按天干地支顺序：甲→乙→丙→丁→戊→己→庚→辛→壬→癸→子→丑', {
      fontSize: 16,
      fill: '#d4c4a8',
      align: 'center',
    });
    instruction.anchor.set(0.5);
    instruction.x = CANVAS_WIDTH / 2;
    instruction.y = 40;
    stage.addChild(instruction);

    const resetBtn = createButton('重置', CANVAS_WIDTH - 120, 680, resetRunePuzzle);
    stage.addChild(resetBtn);
  };

  const handleRuneClick = (runeId: number) => {
    const state = useGameStore.getState();
    const rState = state.runeState;

    if (rState.runes[runeId].isLit) return;

    const expectedId = rState.correctSequence[rState.currentSequence.length];

    if (runeId === expectedId) {
      const newRunes = rState.runes.map((r) =>
        r.id === runeId ? { ...r, isLit: true } : r,
      );
      const newSequence = [...rState.currentSequence, runeId];

      setRuneState({
        runes: newRunes,
        currentSequence: newSequence,
      });

      const nextState = { ...rState, currentSequence: newSequence, runes: newRunes };
      if (checkRuneSequence(nextState)) {
        handleRoomComplete();
      }
    } else {
      triggerDarken();
      resetRunePuzzle();
      return;
    }
    setTimeout(() => renderRoom(), 0);
  };

  const resetRunePuzzle = () => {
    const config = PUZZLE_CONFIGS[1].data;
    setRuneState({
      runes: config.runes.map((r: any) => ({ ...r, isLit: false })),
      currentSequence: [],
    });
    setTimeout(() => renderRoom(), 0);
  };

  const renderMirrorRoom = (game: PixiGame) => {
    const state = useGameStore.getState();
    const mState = state.mirrorState;
    const stage = game.getStage();

    const wall1 = createWall(450, 150, 30, 200);
    const wall2 = createWall(750, 350, 30, 200);
    stage.addChild(wall1, wall2);

    const emitter = createLaserEmitter(mState.laserSource.x, mState.laserSource.y, mState.laserAngle);
    stage.addChild(emitter);

    const targetSprite = createTarget(mState.target.x, mState.target.y, mState.targetRadius, mState.targetHit);
    stage.addChild(targetSprite);

    mState.mirrors.forEach((mirror) => {
      const mirrorSprite = createMirror(mirror, handleMirrorClick);
      stage.addChild(mirrorSprite);
    });

    const laserPath = calculateLaserPath(
      mState.laserSource,
      mState.laserAngle,
      mState.mirrors,
      { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    );
    const laserGraphics = createLaserPath(laserPath);
    stage.addChild(laserGraphics);

    const hitTarget = checkLaserHitsTarget(laserPath, mState.target, mState.targetRadius);
    setMirrorState({ laserPath, targetHit: hitTarget });

    if (hitTarget && !completedRooms[2]) {
      setTimeout(() => handleRoomComplete(), 600);
    }

    const instruction = new PIXI.Text('点击镜子旋转45度（每次点击旋转），让激光绕过墙壁击中目标', {
      fontSize: 16,
      fill: '#d4c4a8',
      align: 'center',
    });
    instruction.anchor.set(0.5);
    instruction.x = CANVAS_WIDTH / 2;
    instruction.y = 40;
    stage.addChild(instruction);

    const resetBtn = createButton('重置', CANVAS_WIDTH - 120, 680, resetMirrorPuzzle);
    stage.addChild(resetBtn);
  };

  const handleMirrorClick = (mirrorId: string) => {
    const state = useGameStore.getState();
    const mState = state.mirrorState;
    const newMirrors = mState.mirrors.map((m) =>
      m.id === mirrorId ? { ...m, angle: m.angle + Math.PI / 4 } : m,
    );
    setMirrorState({ mirrors: newMirrors });
    setTimeout(() => renderRoom(), 0);
  };

  const resetMirrorPuzzle = () => {
    const config = PUZZLE_CONFIGS[2].data;
    setMirrorState({
      mirrors: config.mirrors.map((m: any) => ({ ...m })),
      targetHit: false,
    });
    setTimeout(() => renderRoom(), 0);
  };

  const renderBalanceRoom = (game: PixiGame) => {
    const state = useGameStore.getState();
    const bState = state.balanceState;
    const stage = game.getStage();

    const tiltAngle = bState.leftTotal === bState.rightTotal
      ? 0
      : Math.max(-0.2, Math.min(0.2, (bState.leftTotal - bState.rightTotal) * 0.008));

    const balance = createBalance(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50, tiltAngle);
    stage.addChild(balance);

    const weightDisplay = createWeightDisplay(bState.leftTotal, bState.rightTotal, bState.targetWeight);
    stage.addChild(weightDisplay);

    const stonesContainer = new PIXI.Container();
    bState.availableStones.forEach((stone) => {
      if (stone.placedSide === null) {
        const stoneSprite = createStone(stone, handleStoneSelect, bState.selectedStone === stone.id);
        stonesContainer.addChild(stoneSprite);
      }
    });
    stage.addChild(stonesContainer);

    const leftSlotBtns = bState.leftArmSlots.map((slot, idx) => {
      const btn = createSlotButton(slot.x, slot.y, () => handlePlaceStone('left', idx));
      return btn;
    });
    const rightSlotBtns = bState.rightArmSlots.map((slot, idx) => {
      const btn = createSlotButton(slot.x, slot.y, () => handlePlaceStone('right', idx));
      return btn;
    });
    leftSlotBtns.forEach((b) => stage.addChild(b));
    rightSlotBtns.forEach((b) => stage.addChild(b));

    const placedStonesLeft = bState.availableStones.filter((s) => s.placedSide === 'left');
    const placedStonesRight = bState.availableStones.filter((s) => s.placedSide === 'right');

    placedStonesLeft.forEach((stone, idx) => {
      const slot = bState.leftArmSlots[idx];
      if (slot) {
        const displayStone = { ...stone, x: slot.x, y: slot.y - 20 };
        const stoneSprite = createStone(displayStone, () => handleRemoveStone(stone.id), false);
        stoneSprite.scale.set(0.7);
        stage.addChild(stoneSprite);
      }
    });

    placedStonesRight.forEach((stone, idx) => {
      const slot = bState.rightArmSlots[idx];
      if (slot) {
        const displayStone = { ...stone, x: slot.x, y: slot.y - 20 };
        const stoneSprite = createStone(displayStone, () => handleRemoveStone(stone.id), false);
        stoneSprite.scale.set(0.7);
        stage.addChild(stoneSprite);
      }
    });

    const instructionText = bState.selectedStone
      ? `已选石块重量：${bState.availableStones.find(s=>s.id===bState.selectedStone)?.weight || 0}，点击天平 ± 圆圈放置`
      : '① 点击下方石块选中 → ② 点击天平两侧圆圈放置 → ③ 左右均需等于目标重量';
    const instruction = new PIXI.Text(instructionText, {
      fontSize: 16,
      fill: bState.selectedStone ? COLORS.GOLD_LIGHT : '#d4c4a8',
      align: 'center',
    });
    instruction.anchor.set(0.5);
    instruction.x = CANVAS_WIDTH / 2;
    instruction.y = 30;
    stage.addChild(instruction);

    const checkBtn = createButton('检查平衡', CANVAS_WIDTH - 150, 680, checkBalancePuzzle);
    stage.addChild(checkBtn);

    const resetBtn = createButton('重置', CANVAS_WIDTH - 280, 680, resetBalancePuzzle);
    stage.addChild(resetBtn);
  };

  const handleStoneSelect = (stoneId: string) => {
    const state = useGameStore.getState();
    const newSelected = state.balanceState.selectedStone === stoneId ? null : stoneId;
    setBalanceState({ selectedStone: newSelected });
    setTimeout(() => renderRoom(), 0);
  };

  const handlePlaceStone = (side: 'left' | 'right', slotIndex: number) => {
    const state = useGameStore.getState();
    const bState = state.balanceState;

    if (!bState.selectedStone) return;
    const slots = side === 'left' ? bState.leftArmSlots : bState.rightArmSlots;
    if (slots[slotIndex]?.filled) return;

    const stone = bState.availableStones.find((s) => s.id === bState.selectedStone);
    if (!stone) return;

    const newStones = bState.availableStones.map((s) =>
      s.id === stone.id ? { ...s, placedSide: side } : s,
    );

    const newSlots = slots.map((s, i) =>
      i === slotIndex ? { ...s, filled: true } : s,
    );

    const placedLeft = newStones.filter((s) => s.placedSide === 'left');
    const placedRight = newStones.filter((s) => s.placedSide === 'right');
    const leftTotal = placedLeft.reduce((sum, s) => sum + s.weight, 0);
    const rightTotal = placedRight.reduce((sum, s) => sum + s.weight, 0);

    if (side === 'left') {
      setBalanceState({
        availableStones: newStones,
        leftArmSlots: newSlots,
        selectedStone: null,
        leftTotal,
        rightTotal,
      });
    } else {
      setBalanceState({
        availableStones: newStones,
        rightArmSlots: newSlots,
        selectedStone: null,
        leftTotal,
        rightTotal,
      });
    }
    setTimeout(() => renderRoom(), 0);
  };

  const handleRemoveStone = (stoneId: string) => {
    const state = useGameStore.getState();
    const bState = state.balanceState;
    const stone = bState.availableStones.find((s) => s.id === stoneId);
    if (!stone || !stone.placedSide) return;

    const newStones = bState.availableStones.map((s) =>
      s.id === stoneId ? { ...s, placedSide: null } : s,
    );

    const slots = stone.placedSide === 'left' ? bState.leftArmSlots : bState.rightArmSlots;
    const placedStones = newStones.filter((s) => s.placedSide === stone.placedSide);

    const newSlots = slots.map((s, i) =>
      i < placedStones.length ? { ...s, filled: true } : { ...s, filled: false },
    );

    const placedLeft = newStones.filter((s) => s.placedSide === 'left');
    const placedRight = newStones.filter((s) => s.placedSide === 'right');
    const leftTotal = placedLeft.reduce((sum, s) => sum + s.weight, 0);
    const rightTotal = placedRight.reduce((sum, s) => sum + s.weight, 0);

    if (stone.placedSide === 'left') {
      setBalanceState({
        availableStones: newStones,
        leftArmSlots: newSlots,
        leftTotal,
        rightTotal,
      });
    } else {
      setBalanceState({
        availableStones: newStones,
        rightArmSlots: newSlots,
        leftTotal,
        rightTotal,
      });
    }
    setTimeout(() => renderRoom(), 0);
  };

  const checkBalancePuzzle = () => {
    const state = useGameStore.getState();
    const bState = state.balanceState;
    const isBalanced = checkBalance(bState);
    setBalanceState({ isBalanced });

    if (isBalanced) {
      handleRoomComplete();
    } else {
      triggerDarken();
    }
  };

  const resetBalancePuzzle = () => {
    const config = PUZZLE_CONFIGS[3].data;
    setBalanceState({
      availableStones: config.availableStones.map((s: any) => ({ ...s })),
      leftArmSlots: config.leftArmSlots.map((s: any) => ({ ...s })),
      rightArmSlots: config.rightArmSlots.map((s: any) => ({ ...s })),
      leftTotal: 0,
      rightTotal: 0,
      isBalanced: false,
      selectedStone: null,
    });
    setTimeout(() => renderRoom(), 0);
  };

  const renderLockRoom = (game: PixiGame) => {
    const state = useGameStore.getState();
    const lState = state.lockState;
    const stage = game.getStage();

    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;

    const lockBg = new PIXI.Graphics();
    lockBg.beginFill('#4a3728');
    lockBg.lineStyle(4, '#8b7355');
    lockBg.drawRoundedRect(cx - 250, cy - 220, 500, 440, 15);
    lockBg.endFill();
    stage.addChild(lockBg);

    const title = new PIXI.Text('玄机锁', {
      fontSize: 32,
      fill: '#e8c07d',
      align: 'center',
    });
    title.anchor.set(0.5);
    title.x = cx;
    title.y = cy - 175;
    stage.addChild(title);

    const clueLabel = new PIXI.Text('收集的线索（每关对应一位数字）：', {
      fontSize: 16,
      fill: '#d4c4a8',
    });
    clueLabel.x = cx - 200;
    clueLabel.y = cy - 120;
    stage.addChild(clueLabel);

    if (lState.clues.length === 0) {
      const emptyHint = new PIXI.Text('（暂无线索，请先通关前四个房间）', {
        fontSize: 14,
        fill: '#8b7355',
        align: 'center',
      });
      emptyHint.anchor.set(0.5);
      emptyHint.x = cx;
      emptyHint.y = cy - 50;
      stage.addChild(emptyHint);
    } else {
      lState.clues.forEach((clue, i) => {
        const clueBox = new PIXI.Graphics();
        clueBox.beginFill('#2d4a3e');
        clueBox.lineStyle(2, '#8b7355');
        clueBox.drawRoundedRect(cx - 200 + i * 110, cy - 90, 90, 70, 5);
        clueBox.endFill();

        const clueText = new PIXI.Text(clue, {
          fontSize: 36,
          fill: '#e8c07d',
          align: 'center',
          fontWeight: 'bold',
        });
        clueText.anchor.set(0.5);
        clueText.x = cx - 200 + i * 110 + 45;
        clueText.y = cy - 90 + 35;

        stage.addChild(clueBox, clueText);
      });
    }

    const inputLabel = new PIXI.Text('输入四位密码：', {
      fontSize: 16,
      fill: '#d4c4a8',
    });
    inputLabel.x = cx - 200;
    inputLabel.y = cy + 20;
    stage.addChild(inputLabel);

    for (let i = 0; i < 4; i++) {
      const digitBox = new PIXI.Graphics();
      digitBox.beginFill('#1a1410');
      digitBox.lineStyle(2, '#cd7f32');
      digitBox.drawRoundedRect(cx - 200 + i * 110, cy + 50, 90, 70, 5);
      digitBox.endFill();

      const digit = lState.input[i] || '';
      const digitText = new PIXI.Text(digit, {
        fontSize: 48,
        fill: digit ? '#e8c07d' : '#666',
        align: 'center',
        fontWeight: 'bold',
      });
      digitText.anchor.set(0.5);
      digitText.x = cx - 200 + i * 110 + 45;
      digitText.y = cy + 50 + 35;

      stage.addChild(digitBox, digitText);
    }

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const digit = row * 3 + col + 1;
        const btn = createKeypadButton(
          cx - 170 + col * 95,
          cy + 160 + row * 60,
          digit.toString(),
          () => handleLockInput(digit.toString()),
        );
        stage.addChild(btn);
      }
    }

    const zeroBtn = createKeypadButton(cx - 170, cy + 160 + 180, '0', () => handleLockInput('0'));
    const clearBtn = createKeypadButton(cx - 170 + 95, cy + 160 + 180, '清除', () => handleLockClear());
    const submitBtn = createKeypadButton(cx - 170 + 190, cy + 160 + 150, '确认', () => handleLockSubmit());
    submitBtn.height = 90;

    stage.addChild(zeroBtn, clearBtn, submitBtn);

    const instruction = new PIXI.Text('根据前四关收集的线索，按顺序输入四个数字', {
      fontSize: 15,
      fill: '#d4c4a8',
      align: 'center',
    });
    instruction.anchor.set(0.5);
    instruction.x = cx;
    instruction.y = 30;
    stage.addChild(instruction);
  };

  const handleLockInput = (digit: string) => {
    const state = useGameStore.getState();
    const lState = state.lockState;
    if (lState.input.length >= 4) return;
    const newInput = lState.input + digit;
    setLockState({ input: newInput });
    lockInputRef.current = newInput;
    setTimeout(() => renderRoom(), 0);
  };

  const handleLockClear = () => {
    setLockState({ input: '' });
    lockInputRef.current = '';
    setTimeout(() => renderRoom(), 0);
  };

  const handleLockSubmit = () => {
    const state = useGameStore.getState();
    const lState = state.lockState;
    if (lState.input.length !== 4) return;

    if (lState.input === lState.correctCode) {
      handleRoomComplete();
    } else {
      triggerDarken();
      setLockState({ input: '' });
      lockInputRef.current = '';
      setTimeout(() => renderRoom(), 0);
    }
  };

  const handleRoomComplete = () => {
    const state = useGameStore.getState();
    const roomIdx = state.currentRoom;
    if (state.completedRooms[roomIdx]) return;

    const clue = PUZZLE_CONFIGS[roomIdx].clue;
    completeRoom(roomIdx, clue);
    setTransitioning(true);
  };

  const createButton = (text: string, x: number, y: number, onClick: () => void): PIXI.Container => {
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;

    const bg = new PIXI.Graphics();
    bg.beginFill('#8b7355');
    bg.lineStyle(2, '#cd7f32');
    bg.drawRoundedRect(-60, -20, 120, 40, 5);
    bg.endFill();

    const label = new PIXI.Text(text, {
      fontSize: 16,
      fill: '#f4e8d0',
      align: 'center',
      fontWeight: 'bold',
    });
    label.anchor.set(0.5);

    container.addChild(bg, label);
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.hitArea = new PIXI.Rectangle(-60, -20, 120, 40);

    container.on('pointerover', () => {
      bg.clear();
      bg.beginFill('#a08060');
      bg.lineStyle(2, '#e8c07d');
      bg.drawRoundedRect(-60, -20, 120, 40, 5);
      bg.endFill();
    });
    container.on('pointerout', () => {
      bg.clear();
      bg.beginFill('#8b7355');
      bg.lineStyle(2, '#cd7f32');
      bg.drawRoundedRect(-60, -20, 120, 40, 5);
      bg.endFill();
    });
    container.on('pointerdown', onClick);

    return container;
  };

  const createSlotButton = (x: number, y: number, onClick: () => void): PIXI.Container => {
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;

    const bg = new PIXI.Graphics();
    bg.beginFill('#8b7355', 0.25);
    bg.lineStyle(2, '#e8c07d', 0.8);
    bg.drawCircle(0, 0, 26);
    bg.endFill();

    const label = new PIXI.Text('+', {
      fontSize: 26,
      fill: '#e8c07d',
      align: 'center',
      fontWeight: 'bold',
    });
    label.anchor.set(0.5);

    container.addChild(bg, label);
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.hitArea = new PIXI.Circle(0, 0, 28);

    container.on('pointerdown', onClick);

    return container;
  };

  const createKeypadButton = (x: number, y: number, text: string, onClick: () => void): PIXI.Container => {
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;

    const bg = new PIXI.Graphics();
    bg.beginFill('#2a1f18');
    bg.lineStyle(2, '#8b7355');
    bg.drawRoundedRect(-40, -20, 80, 40, 5);
    bg.endFill();

    const label = new PIXI.Text(text, {
      fontSize: text.length > 1 ? 16 : 20,
      fill: '#e8c07d',
      align: 'center',
      fontWeight: 'bold',
    });
    label.anchor.set(0.5);

    container.addChild(bg, label);
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.hitArea = new PIXI.Rectangle(-40, -20, 80, 40);

    container.on('pointerover', () => {
      bg.clear();
      bg.beginFill('#3d2f22');
      bg.lineStyle(2, '#e8c07d');
      bg.drawRoundedRect(-40, -20, 80, 40, 5);
      bg.endFill();
    });
    container.on('pointerout', () => {
      bg.clear();
      bg.beginFill('#2a1f18');
      bg.lineStyle(2, '#8b7355');
      bg.drawRoundedRect(-40, -20, 80, 40, 5);
      bg.endFill();
    });
    container.on('pointerdown', onClick);

    return container;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const game = new PixiGame(containerRef.current);
    gameRef.current = game;
    game.resize(width, height);

    game.setOnUpdate(() => {
      const state = useGameStore.getState();
      if (state.gearState.powerConnected) {
        placedGearsRef.current.forEach(({ sprite, data }) => {
          const direction = data.id === 'slot1' || data.id === 'slot3' || data.id === 'slot5' ? 1 : -1;
          sprite.rotation += 0.02 * direction;
        });
      }
    });

    setTimeout(() => renderRoom(), 50);

    return () => {
      try {
        game.destroy();
      } catch (e) {
        console.warn('Game destroy warning:', e);
      }
    };
  }, []);

  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.resize(width, height);
    }
  }, [width, height]);

  useEffect(() => {
    const timer = setTimeout(() => {
      renderRoom();
    }, 50);
    return () => clearTimeout(timer);
  }, [currentRoom, renderRoom]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!useGameStore.getState().isDarkened) {
        renderRoom();
      }
    }, 30);
    return () => clearTimeout(timer);
  }, [isDarkened, gearState, runeState, mirrorState, balanceState, lockState, renderRoom]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
