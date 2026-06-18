import { SeededRandom, DifficultyLevel } from '@/utils/prng';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GEAR_RADII, GEAR_TEETH_PER_RADIUS } from '@/utils/constants';
import { distance } from '@/utils/geometry';
import type { GearSlot, PlacedGear, Point } from '@/types/game';

export interface GearPuzzleData {
  powerSource: Point;
  powerTarget: Point;
  slots: GearSlot[];
  availableGears: { radius: number; teeth: number }[];
  solution: Record<string, number>;
  stateSpaceSize: number;
  optimalSteps: number;
  clue: string;
}

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;
const SOURCE_TARGET_RADIUS = 50;
const SOURCE_X = 140;
const TARGET_X = 820;
const TOTAL_RADIUS_SUM = (TARGET_X - SOURCE_X - SOURCE_TARGET_RADIUS * 2) / 2;

const DIFFICULTY_CONFIG = {
  easy: {
    optionsPerSlot: 2,
    extraGears: 2,
  },
  normal: {
    optionsPerSlot: 3,
    extraGears: 3,
  },
  hard: {
    optionsPerSlot: 4,
    extraGears: 4,
  },
};

export const generateGearPuzzle = (
  rng: SeededRandom,
  difficulty: DifficultyLevel,
): GearPuzzleData => {
  const config = DIFFICULTY_CONFIG[difficulty];
  const gearCount = 5;
  const optionsPerSlot = config.optionsPerSlot;
  const extraGearCount = config.extraGears;

  const solutionRadii = generateValidSolution(rng, gearCount);
  
  const slots = createSlotsFromSolution(solutionRadii);
  
  for (let i = 0; i < slots.length; i++) {
    slots[i].allowedRadii = generateSlotOptions(rng, solutionRadii[i], optionsPerSlot);
  }

  const availableGears = generateAvailableGears(rng, solutionRadii, extraGearCount);

  const stateSpaceSize = Math.pow(optionsPerSlot, gearCount);

  const solverResult = solveGearPuzzle(slots, availableGears);
  if (!solverResult.solvable) {
    throw new Error('Generated puzzle has no solution');
  }

  const clue = deriveClue(solverResult.solution!, rng);

  const shuffledSlots = rng.shuffle([...slots]);

  return {
    powerSource: { x: SOURCE_X, y: CY },
    powerTarget: { x: TARGET_X, y: CY },
    slots: shuffledSlots,
    availableGears,
    solution: solverResult.solution!,
    stateSpaceSize,
    optimalSteps: solverResult.steps,
    clue,
  };
};

const generateValidSolution = (rng: SeededRandom, count: number): number[] => {
  const solutions = findAllSolutions(count);
  if (solutions.length === 0) {
    throw new Error(`No valid solution found for ${count} gears`);
  }
  const selected = rng.pick(solutions);
  return rng.shuffle(selected);
};

const findAllSolutions = (count: number): number[][] => {
  const results: number[][] = [];
  
  const findCombos = (remaining: number, current: number[], startIndex: number) => {
    if (current.length === count) {
      if (remaining === 0) {
        results.push([...current]);
      }
      return;
    }
    
    for (let i = startIndex; i < GEAR_RADII.length; i++) {
      const radius = GEAR_RADII[i];
      if (radius <= remaining) {
        current.push(radius);
        findCombos(remaining - radius, current, i);
        current.pop();
      }
    }
  };
  
  findCombos(TOTAL_RADIUS_SUM, [], 0);
  
  const allPermutations: number[][] = [];
  const seen = new Set<string>();
  
  for (const combo of results) {
    const perms = permutations(combo);
    for (const perm of perms) {
      const key = perm.join(',');
      if (!seen.has(key)) {
        seen.add(key);
        allPermutations.push(perm);
      }
    }
  }
  
  return allPermutations;
};

const permutations = <T>(arr: T[]): T[][] => {
  const results: T[][] = [];
  
  const permute = (remaining: T[], current: T[]) => {
    if (remaining.length === 0) {
      results.push([...current]);
      return;
    }
    
    const used = new Set<T>();
    for (let i = 0; i < remaining.length; i++) {
      if (used.has(remaining[i])) continue;
      used.add(remaining[i]);
      
      const next = [...remaining];
      next.splice(i, 1);
      current.push(remaining[i]);
      permute(next, current);
      current.pop();
    }
  };
  
  permute(arr, []);
  return results;
};

const createSlotsFromSolution = (solutionRadii: number[]): GearSlot[] => {
  const slots: GearSlot[] = [];
  let currentX = SOURCE_X + SOURCE_TARGET_RADIUS;

  for (let i = 0; i < solutionRadii.length; i++) {
    const r = solutionRadii[i];
    const centerX = currentX + r;

    slots.push({
      id: `slot${i + 1}`,
      x: centerX,
      y: CY,
      allowedRadii: [],
    });

    currentX = centerX + r;
  }

  return slots;
};

const generateSlotOptions = (
  rng: SeededRandom,
  correctRadius: number,
  count: number,
): number[] => {
  const options = new Set<number>([correctRadius]);
  const otherRadii = GEAR_RADII.filter((r) => r !== correctRadius);
  const shuffled = rng.shuffle([...otherRadii]);

  const addCount = Math.min(count - 1, shuffled.length);
  for (let i = 0; i < addCount; i++) {
    options.add(shuffled[i]);
  }

  return Array.from(options).sort((a, b) => a - b);
};

const generateAvailableGears = (
  rng: SeededRandom,
  solutionRadii: number[],
  extraCount: number,
): { radius: number; teeth: number }[] => {
  const gears: { radius: number; teeth: number }[] = [];

  for (const radius of solutionRadii) {
    gears.push({ radius, teeth: GEAR_TEETH_PER_RADIUS[radius] });
  }

  for (let i = 0; i < extraCount; i++) {
    const radius = rng.pick([...GEAR_RADII]);
    gears.push({ radius, teeth: GEAR_TEETH_PER_RADIUS[radius] });
  }

  return rng.shuffle(gears);
};

interface SolverResult {
  solvable: boolean;
  solution: Record<string, number> | null;
  steps: number;
  explored: number;
}

export const solveGearPuzzle = (
  slots: GearSlot[],
  availableGears: { radius: number; teeth: number }[],
): SolverResult => {
  const sourceGear = { x: SOURCE_X, y: CY, radius: SOURCE_TARGET_RADIUS };
  const targetGear = { x: TARGET_X, y: CY, radius: SOURCE_TARGET_RADIUS };

  const gearCounts: Record<number, number> = {};
  for (const gear of availableGears) {
    gearCounts[gear.radius] = (gearCounts[gear.radius] || 0) + 1;
  }

  const sortedSlots = [...slots].sort((a, b) => a.x - b.x);

  let bestSolution: Record<string, number> | null = null;
  let bestSteps = Infinity;
  let explored = 0;

  const placeNext = (
    slotIndex: number,
    placed: Record<string, number>,
    remainingCounts: Record<number, number>,
    steps: number,
  ): boolean => {
    explored++;
    if (explored > 100000) return false;

    if (slotIndex >= sortedSlots.length) {
      const placedGears: PlacedGear[] = Object.entries(placed).map(([id, radius]) => ({
        id,
        x: sortedSlots.find((s) => s.id === id)!.x,
        y: sortedSlots.find((s) => s.id === id)!.y,
        radius,
        teeth: GEAR_TEETH_PER_RADIUS[radius],
        rotation: 0,
      }));

      if (checkAllConnected(placedGears, sourceGear, targetGear)) {
        if (steps < bestSteps) {
          bestSteps = steps;
          bestSolution = { ...placed };
        }
        return true;
      }
      return false;
    }

    const slot = sortedSlots[slotIndex];
    let found = false;

    for (const radius of slot.allowedRadii) {
      if ((remainingCounts[radius] || 0) <= 0) continue;

      const newCounts = { ...remainingCounts };
      newCounts[radius]--;

      const newPlaced = { ...placed, [slot.id]: radius };
      if (placeNext(slotIndex + 1, newPlaced, newCounts, steps + 1)) {
        found = true;
      }
    }

    if (placeNext(slotIndex + 1, placed, remainingCounts, steps)) {
      found = true;
    }

    return found;
  };

  placeNext(0, {}, gearCounts, 0);

  return {
    solvable: bestSolution !== null,
    solution: bestSolution,
    steps: bestSteps === Infinity ? -1 : bestSteps,
    explored,
  };
};

const checkAllConnected = (
  gears: PlacedGear[],
  source: Point & { radius: number },
  target: Point & { radius: number },
): boolean => {
  const allNodes = [
    { ...source, id: 'source' },
    ...gears.map((g) => ({ x: g.x, y: g.y, radius: g.radius, id: g.id })),
    { ...target, id: 'target' },
  ];

  const adjacency: Map<string, string[]> = new Map();
  allNodes.forEach((n) => adjacency.set(n.id, []));

  for (let i = 0; i < allNodes.length; i++) {
    for (let j = i + 1; j < allNodes.length; j++) {
      const dist = distance(allNodes[i], allNodes[j]);
      const expected = allNodes[i].radius + allNodes[j].radius;
      if (Math.abs(dist - expected) < 5) {
        adjacency.get(allNodes[i].id)!.push(allNodes[j].id);
        adjacency.get(allNodes[j].id)!.push(allNodes[i].id);
      }
    }
  }

  const visited = new Set<string>();
  const queue = ['source'];
  visited.add('source');

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === 'target') return true;
    for (const neighbor of adjacency.get(current) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return false;
};

const deriveClue = (solution: Record<string, number>, rng: SeededRandom): string => {
  const values = Object.values(solution);
  const sum = values.reduce((a, b) => a + b, 0);
  const digit = (sum % 9) + 1;
  return String(digit);
};
