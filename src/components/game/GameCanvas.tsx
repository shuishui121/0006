import { useEffect, useRef, useCallback } from 'react';
import { PixiGame } from '@/engine/PixiGame';
import { useGameStore } from '@/store/useGameStore';
import { CANVAS_WIDTH, CANVAS_HEIGHT, RUNE_SYMBOLS, ROOM_ORDER } from '@/utils/constants';
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
  const selectedGearIndexRef = useRef<number | null>(null);
  const placedGearsRef = useRef<Map<string, { sprite: PIXI.Container; data: PlacedGear }>>(new Map());
  const lockInputRef = useRef<string>('');

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

    const roomType = ROOM_ORDER[currentRoom];

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
  }, [currentRoom, gearState, runeState, mirrorState, balanceState, lockState]);

  const renderGearRoom = (game: PixiGame) => {
    const stage = game.getStage();

    const powerSource = createPowerSource(gearState.powerSource.x, gearState.powerSource.y);
    stage.addChild(powerSource);

    const powerTarget = createPowerTarget(gearState.powerTarget.x, gearState.powerTarget.y, 50, gearState.powerConnected);
    stage.addChild(powerTarget);

    gearState.slots.forEach((slot) => {
      const placedGear = gearState.placedGears.find((g) => g.id === slot.id);
      const slotSprite = createSlot(slot.x, slot.y, slot.allowedRadii, gearState.selectedSlot === slot.id);
      slotSprite.eventMode = 'static';
      slotSprite.cursor = 'pointer';
      slotSprite.on('pointerdown', () => handleSlotClick(slot.id));
      stage.addChild(slotSprite);

      if (placedGear) {
        const gearSprite = createGear(placedGear.radius, placedGear.teeth, slot.x, slot.y);
        gearSprite.eventMode = 'static';
        gearSprite.cursor = 'pointer';
        gearSprite.on('pointerdown', () => handleRemoveGear(slot.id));
        placedGearsRef.current.set(slot.id, { sprite: gearSprite, data: placedGear });
        stage.addChild(gearSprite);
      }
    });

    const gearSelector = createGearSelector(gearState.availableGears, handleGearSelect);
    stage.addChild(gearSelector);

    const instruction = new PIXI.Text('选择齿轮后点击槽位放置，点击已放置的齿轮可移除', {
      fontSize: 16,
      fill: '#d4c4a8',
      align: 'center',
    });
    instruction.anchor.set(0.5);
    instruction.x = CANVAS_WIDTH / 2;
    instruction.y = 620;
    stage.addChild(instruction);

    const checkBtn = createButton('检查连接', CANVAS_WIDTH - 150, 680, checkGearPuzzle);
    stage.addChild(checkBtn);

    const resetBtn = createButton('重置', CANVAS_WIDTH - 280, 680, resetGearPuzzle);
    stage.addChild(resetBtn);
  };

  const handleGearSelect = (index: number) => {
    selectedGearIndexRef.current = index;
  };

  const handleSlotClick = (slotId: string) => {
    if (selectedGearIndexRef.current === null) return;

    const slot = gearState.slots.find((s) => s.id === slotId);
    const gear = gearState.availableGears[selectedGearIndexRef.current];

    if (!slot || !gear) return;
    if (!slot.allowedRadii.includes(gear.radius)) return;
    if (gearState.placedGears.find((g) => g.id === slotId)) return;

    const newGear: PlacedGear = {
      id: slotId,
      x: slot.x,
      y: slot.y,
      radius: gear.radius,
      teeth: gear.teeth,
      rotation: 0,
    };

    const newPlacedGears = [...gearState.placedGears, newGear];
    const newAvailableGears = gearState.availableGears.filter((_, i) => i !== selectedGearIndexRef.current);

    setGearState({
      placedGears: newPlacedGears,
      availableGears: newAvailableGears,
    });

    selectedGearIndexRef.current = null;
    renderRoom();
  };

  const handleRemoveGear = (slotId: string) => {
    const placedGear = gearState.placedGears.find((g) => g.id === slotId);
    if (!placedGear) return;

    const newPlacedGears = gearState.placedGears.filter((g) => g.id !== slotId);
    const newAvailableGears = [...gearState.availableGears, { radius: placedGear.radius, teeth: placedGear.teeth }];

    setGearState({
      placedGears: newPlacedGears,
      availableGears: newAvailableGears,
    });
    placedGearsRef.current.delete(slotId);
    renderRoom();
  };

  const checkGearPuzzle = () => {
    const connected = checkGearConnection(
      gearState.powerSource,
      gearState.powerTarget,
      gearState.placedGears,
    );

    setGearState({ powerConnected: connected });

    if (connected) {
      setGearState({ powerConnected: true });
      handleRoomComplete();
    } else {
      triggerDarken();
    }
    renderRoom();
  };

  const resetGearPuzzle = () => {
    const config = PUZZLE_CONFIGS[0].data;
    setGearState({
      placedGears: [],
      availableGears: [...config.availableGears],
      powerConnected: false,
      selectedSlot: null,
    });
    placedGearsRef.current.clear();
    renderRoom();
  };

  const renderRuneRoom = (game: PixiGame) => {
    const stage = game.getStage();

    const board = createRuneBoard();
    stage.addChild(board);

    runeState.runes.forEach((rune) => {
      const runeSprite = createRune(rune, handleRuneClick);
      stage.addChild(runeSprite);
    });

    const sequenceDisplay = createSequenceDisplay(
      runeState.currentSequence,
      runeState.correctSequence.length,
      RUNE_SYMBOLS,
    );
    stage.addChild(sequenceDisplay);

    const instruction = new PIXI.Text('按照正确顺序点击符文点亮它们', {
      fontSize: 16,
      fill: '#d4c4a8',
      align: 'center',
    });
    instruction.anchor.set(0.5);
    instruction.x = CANVAS_WIDTH / 2;
    instruction.y = 60;
    stage.addChild(instruction);

    const resetBtn = createButton('重置', CANVAS_WIDTH - 120, 680, resetRunePuzzle);
    stage.addChild(resetBtn);
  };

  const handleRuneClick = (runeId: number) => {
    if (runeState.runes[runeId].isLit) return;

    const expectedId = runeState.correctSequence[runeState.currentSequence.length];

    if (runeId === expectedId) {
      const newRunes = runeState.runes.map((r) =>
        r.id === runeId ? { ...r, isLit: true } : r,
      );
      const newSequence = [...runeState.currentSequence, runeId];

      setRuneState({
        runes: newRunes,
        currentSequence: newSequence,
      });

      if (checkRuneSequence({ ...runeState, currentSequence: newSequence, runes: newRunes })) {
        handleRoomComplete();
      }
    } else {
      triggerDarken();
      resetRunePuzzle();
    }
    renderRoom();
  };

  const resetRunePuzzle = () => {
    const config = PUZZLE_CONFIGS[1].data;
    setRuneState({
      runes: config.runes.map((r: any) => ({ ...r, isLit: false })),
      currentSequence: [],
    });
    renderRoom();
  };

  const renderMirrorRoom = (game: PixiGame) => {
    const stage = game.getStage();

    const wall1 = createWall(450, 150, 30, 200);
    const wall2 = createWall(750, 350, 30, 200);
    stage.addChild(wall1, wall2);

    const emitter = createLaserEmitter(mirrorState.laserSource.x, mirrorState.laserSource.y, mirrorState.laserAngle);
    stage.addChild(emitter);

    const targetSprite = createTarget(mirrorState.target.x, mirrorState.target.y, mirrorState.targetRadius, mirrorState.targetHit);
    stage.addChild(targetSprite);

    mirrorState.mirrors.forEach((mirror) => {
      const mirrorSprite = createMirror(mirror, handleMirrorClick);
      stage.addChild(mirrorSprite);
    });

    const laserPath = calculateLaserPath(
      mirrorState.laserSource,
      mirrorState.laserAngle,
      mirrorState.mirrors,
      { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    );
    const laserGraphics = createLaserPath(laserPath);
    stage.addChild(laserGraphics);

    const hitTarget = checkLaserHitsTarget(laserPath, mirrorState.target, mirrorState.targetRadius);
    setMirrorState({ laserPath, targetHit: hitTarget });

    if (hitTarget) {
      setTimeout(() => handleRoomComplete(), 500);
    }

    const instruction = new PIXI.Text('点击镜子旋转45度，让激光击中目标', {
      fontSize: 16,
      fill: '#d4c4a8',
      align: 'center',
    });
    instruction.anchor.set(0.5);
    instruction.x = CANVAS_WIDTH / 2;
    instruction.y = 60;
    stage.addChild(instruction);

    const resetBtn = createButton('重置', CANVAS_WIDTH - 120, 680, resetMirrorPuzzle);
    stage.addChild(resetBtn);
  };

  const handleMirrorClick = (mirrorId: string) => {
    const newMirrors = mirrorState.mirrors.map((m) =>
      m.id === mirrorId ? { ...m, angle: m.angle + Math.PI / 4 } : m,
    );
    setMirrorState({ mirrors: newMirrors });
    renderRoom();
  };

  const resetMirrorPuzzle = () => {
    const config = PUZZLE_CONFIGS[2].data;
    setMirrorState({
      mirrors: config.mirrors.map((m: any) => ({ ...m })),
      targetHit: false,
    });
    renderRoom();
  };

  const renderBalanceRoom = (game: PixiGame) => {
    const stage = game.getStage();

    const tiltAngle = balanceState.leftTotal === balanceState.rightTotal
      ? 0
      : (balanceState.leftTotal - balanceState.rightTotal) * 0.005;

    const balance = createBalance(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50, tiltAngle);
    stage.addChild(balance);

    const weightDisplay = createWeightDisplay(balanceState.leftTotal, balanceState.rightTotal, balanceState.targetWeight);
    stage.addChild(weightDisplay);

    const stonesContainer = new PIXI.Container();
    balanceState.availableStones.forEach((stone) => {
      if (stone.placedSide === null) {
        const stoneSprite = createStone(stone, handleStoneSelect, balanceState.selectedStone === stone.id);
        stonesContainer.addChild(stoneSprite);
      }
    });
    stage.addChild(stonesContainer);

    const leftSlotBtns = balanceState.leftArmSlots.map((slot, idx) => {
      const btn = createSlotButton(slot.x, slot.y, () => handlePlaceStone('left', idx));
      return btn;
    });
    const rightSlotBtns = balanceState.rightArmSlots.map((slot, idx) => {
      const btn = createSlotButton(slot.x, slot.y, () => handlePlaceStone('right', idx));
      return btn;
    });
    leftSlotBtns.forEach((b) => stage.addChild(b));
    rightSlotBtns.forEach((b) => stage.addChild(b));

    const placedStonesLeft = balanceState.availableStones.filter((s) => s.placedSide === 'left');
    const placedStonesRight = balanceState.availableStones.filter((s) => s.placedSide === 'right');

    placedStonesLeft.forEach((stone, idx) => {
      const slot = balanceState.leftArmSlots[idx];
      if (slot) {
        const displayStone = { ...stone, x: slot.x, y: slot.y - 20 };
        const stoneSprite = createStone(displayStone, () => handleRemoveStone(stone.id), false);
        stoneSprite.scale.set(0.7);
        stage.addChild(stoneSprite);
      }
    });

    placedStonesRight.forEach((stone, idx) => {
      const slot = balanceState.rightArmSlots[idx];
      if (slot) {
        const displayStone = { ...stone, x: slot.x, y: slot.y - 20 };
        const stoneSprite = createStone(displayStone, () => handleRemoveStone(stone.id), false);
        stoneSprite.scale.set(0.7);
        stage.addChild(stoneSprite);
      }
    });

    const instruction = new PIXI.Text('选择石块后点击天平托盘放置，左右都需要等于目标重量', {
      fontSize: 16,
      fill: '#d4c4a8',
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
    setBalanceState({ selectedStone: stoneId });
    renderRoom();
  };

  const handlePlaceStone = (side: 'left' | 'right', slotIndex: number) => {
    if (!balanceState.selectedStone) return;

    const slots = side === 'left' ? balanceState.leftArmSlots : balanceState.rightArmSlots;
    if (slots[slotIndex]?.filled) return;

    const stone = balanceState.availableStones.find((s) => s.id === balanceState.selectedStone);
    if (!stone) return;

    const newStones = balanceState.availableStones.map((s) =>
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
    renderRoom();
  };

  const handleRemoveStone = (stoneId: string) => {
    const stone = balanceState.availableStones.find((s) => s.id === stoneId);
    if (!stone || !stone.placedSide) return;

    const newStones = balanceState.availableStones.map((s) =>
      s.id === stoneId ? { ...s, placedSide: null } : s,
    );

    const slots = stone.placedSide === 'left' ? balanceState.leftArmSlots : balanceState.rightArmSlots;
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
    renderRoom();
  };

  const checkBalancePuzzle = () => {
    const isBalanced = checkBalance(balanceState);
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
    renderRoom();
  };

  const renderLockRoom = (game: PixiGame) => {
    const stage = game.getStage();

    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;

    const lockBg = new PIXI.Graphics();
    lockBg.beginFill('#4a3728');
    lockBg.lineStyle(4, '#8b7355');
    lockBg.drawRoundedRect(cx - 250, cy - 200, 500, 400, 15);
    lockBg.endFill();
    stage.addChild(lockBg);

    const title = new PIXI.Text('玄机锁', {
      fontSize: 32,
      fill: '#e8c07d',
      align: 'center',
    });
    title.anchor.set(0.5);
    title.x = cx;
    title.y = cy - 150;
    stage.addChild(title);

    const clueLabel = new PIXI.Text('收集的线索：', {
      fontSize: 18,
      fill: '#d4c4a8',
    });
    clueLabel.x = cx - 200;
    clueLabel.y = cy - 80;
    stage.addChild(clueLabel);

    lockState.clues.forEach((clue, i) => {
      const clueBox = new PIXI.Graphics();
      clueBox.beginFill('#2d4a3e');
      clueBox.lineStyle(2, '#8b7355');
      clueBox.drawRoundedRect(cx - 200 + i * 110, cy - 40, 90, 70, 5);
      clueBox.endFill();

      const clueText = new PIXI.Text(clue, {
        fontSize: 36,
        fill: '#e8c07d',
        align: 'center',
      });
      clueText.anchor.set(0.5);
      clueText.x = cx - 200 + i * 110 + 45;
      clueText.y = cy - 40 + 35;

      stage.addChild(clueBox, clueText);
    });

    const inputLabel = new PIXI.Text('输入密码：', {
      fontSize: 18,
      fill: '#d4c4a8',
    });
    inputLabel.x = cx - 200;
    inputLabel.y = cy + 50;
    stage.addChild(inputLabel);

    for (let i = 0; i < 4; i++) {
      const digitBox = new PIXI.Graphics();
      digitBox.beginFill('#1a1410');
      digitBox.lineStyle(2, '#cd7f32');
      digitBox.drawRoundedRect(cx - 200 + i * 110, cy + 80, 90, 70, 5);
      digitBox.endFill();

      const digit = lockState.input[i] || '';
      const digitText = new PIXI.Text(digit, {
        fontSize: 48,
        fill: digit ? '#e8c07d' : '#666',
        align: 'center',
      });
      digitText.anchor.set(0.5);
      digitText.x = cx - 200 + i * 110 + 45;
      digitText.y = cy + 80 + 35;

      stage.addChild(digitBox, digitText);
    }

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const digit = row * 3 + col + 1;
        const btn = createKeypadButton(
          cx - 150 + col * 100,
          cy + 170 + row * 55,
          digit.toString(),
          () => handleLockInput(digit.toString()),
        );
        stage.addChild(btn);
      }
    }

    const zeroBtn = createKeypadButton(cx - 50, cy + 170 + 165, '0', () => handleLockInput('0'));
    const clearBtn = createKeypadButton(cx + 50, cy + 170 + 165, '清除', () => handleLockClear());
    const submitBtn = createKeypadButton(cx + 150, cy + 170, '确认', () => handleLockSubmit());
    submitBtn.height = 105;

    stage.addChild(zeroBtn, clearBtn, submitBtn);

    const instruction = new PIXI.Text('根据前四关收集的线索输入四位数密码', {
      fontSize: 16,
      fill: '#d4c4a8',
      align: 'center',
    });
    instruction.anchor.set(0.5);
    instruction.x = cx;
    instruction.y = 30;
    stage.addChild(instruction);
  };

  const handleLockInput = (digit: string) => {
    if (lockState.input.length >= 4) return;
    const newInput = lockState.input + digit;
    setLockState({ input: newInput });
    lockInputRef.current = newInput;
    renderRoom();
  };

  const handleLockClear = () => {
    setLockState({ input: '' });
    lockInputRef.current = '';
    renderRoom();
  };

  const handleLockSubmit = () => {
    if (lockState.input.length !== 4) return;

    if (lockState.input === lockState.correctCode) {
      handleRoomComplete();
    } else {
      triggerDarken();
      setLockState({ input: '' });
      lockInputRef.current = '';
      renderRoom();
    }
  };

  const handleRoomComplete = () => {
    if (completedRooms[currentRoom]) return;

    const clue = PUZZLE_CONFIGS[currentRoom].clue;
    completeRoom(currentRoom, clue);

    setTransitioning(true);
    setTimeout(() => {
      setTransitioning(false);
      if (currentRoom < 4) {
        useGameStore.getState().setCurrentRoom(currentRoom + 1);
      }
    }, 1500);
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
      fill: '#d4c4a8',
      align: 'center',
    });
    label.anchor.set(0.5);

    container.addChild(bg, label);
    container.eventMode = 'static';
    container.cursor = 'pointer';

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
    bg.beginFill('#8b7355', 0.3);
    bg.lineStyle(2, '#cd7f32', 0.6);
    bg.drawCircle(0, 0, 25);
    bg.endFill();

    const label = new PIXI.Text('+', {
      fontSize: 24,
      fill: '#e8c07d',
      align: 'center',
    });
    label.anchor.set(0.5);

    container.addChild(bg, label);
    container.eventMode = 'static';
    container.cursor = 'pointer';

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
      fontSize: 20,
      fill: '#e8c07d',
      align: 'center',
    });
    label.anchor.set(0.5);

    container.addChild(bg, label);
    container.eventMode = 'static';
    container.cursor = 'pointer';

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

    game.setOnUpdate((delta) => {
      placedGearsRef.current.forEach(({ sprite, data }) => {
        if (gearState.powerConnected) {
          const direction = data.id === 'slot1' || data.id === 'slot3' || data.id === 'slot5' ? 1 : -1;
          sprite.rotation += 0.02 * direction;
        }
      });
    });

    renderRoom();

    return () => {
      game.destroy();
    };
  }, []);

  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.resize(width, height);
    }
  }, [width, height]);

  useEffect(() => {
    renderRoom();
  }, [currentRoom]);

  useEffect(() => {
    if (gameRef.current && !isDarkened) {
      renderRoom();
    }
  }, [isDarkened, gearState, runeState, mirrorState, balanceState, lockState]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
