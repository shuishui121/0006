import { SeededRandom, DifficultyLevel } from '@/utils/prng';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/utils/constants';
import { distance, lineIntersection, mirrorLine, reflectAngle, normalizeAngle } from '@/utils/geometry';
import type { MirrorData, Point } from '@/types/game';

export interface MirrorPuzzleData {
  laserSource: Point;
  laserAngle: number;
  target: Point;
  targetRadius: number;
  mirrors: MirrorData[];
  solutionAngles: Record<string, number>;
  stateSpaceSize: number;
  optimalSteps: number;
  clue: string;
}

const MIRROR_ANGLES = [
  0,
  Math.PI / 4,
  Math.PI / 2,
  (3 * Math.PI) / 4,
  Math.PI,
  (5 * Math.PI) / 4,
  (3 * Math.PI) / 2,
  (7 * Math.PI) / 4,
];

const DIFFICULTY_PARAMS = {
  easy: {
    totalMirrors: { min: 2, max: 2 },
    bounceCount: { min: 2, max: 2 },
    targetRadius: 50,
  },
  normal: {
    totalMirrors: { min: 3, max: 3 },
    bounceCount: { min: 3, max: 3 },
    targetRadius: 40,
  },
  hard: {
    totalMirrors: { min: 5, max: 6 },
    bounceCount: { min: 4, max: 5 },
    targetRadius: 30,
  },
};

export const generateMirrorPuzzle = (
  rng: SeededRandom,
  difficulty: DifficultyLevel,
): MirrorPuzzleData => {
  const params = DIFFICULTY_PARAMS[difficulty];
  let attempts = 0;
  const maxAttempts = 200;

  while (attempts < maxAttempts) {
    attempts++;

    const bounceCount = rng.nextInt(params.bounceCount.min, params.bounceCount.max);
    const totalMirrorCount = rng.nextInt(params.totalMirrors.min, params.totalMirrors.max);
    const decoyCount = totalMirrorCount - bounceCount;

    if (decoyCount < 0) continue;

    const laserSource = generateLaserSource(rng);

    const pathResult = buildSolutionPath(rng, laserSource, bounceCount);
    if (!pathResult) continue;

    const { path, mirrorAngles, target } = pathResult;

    const solutionMirrors: MirrorData[] = [];
    for (let i = 0; i < bounceCount; i++) {
      solutionMirrors.push({
        id: `m${i + 1}`,
        x: path[i + 1].x,
        y: path[i + 1].y,
        angle: mirrorAngles[i],
        length: 80,
      });
    }

    const decoyMirrors = generateDecoyMirrors(rng, decoyCount, solutionMirrors, laserSource, target);

    const allMirrors = [...solutionMirrors, ...decoyMirrors];
    const shuffledMirrors = rng.shuffle(allMirrors);

    const solutionAngles: Record<string, number> = {};
    for (const m of shuffledMirrors) {
      solutionAngles[m.id] = m.angle;
    }

    const initialMirrors = shuffledMirrors.map((m) => ({
      ...m,
      angle: rng.pick(MIRROR_ANGLES.filter((a) => Math.abs(a - m.angle) > 0.1)),
    }));

    const stateSpaceSize = Math.pow(MIRROR_ANGLES.length, initialMirrors.length);

    if (!isDifficultyMatch(stateSpaceSize, difficulty)) continue;

    const clue = deriveClue(solutionAngles, rng);

    const testMirrors = initialMirrors.map((m) => ({
      ...m,
      angle: solutionAngles[m.id],
    }));
    const testPath = calculateLaserPath(
      laserSource,
      pathResult.initialAngle,
      testMirrors,
      { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      bounceCount + 2,
    );

    if (!checkLaserHitsTarget(testPath, target, params.targetRadius)) continue;

    return {
      laserSource,
      laserAngle: pathResult.initialAngle,
      target,
      targetRadius: params.targetRadius,
      mirrors: initialMirrors,
      solutionAngles,
      stateSpaceSize,
      optimalSteps: bounceCount,
      clue,
    };
  }

  throw new Error('Failed to generate mirror puzzle after max attempts');
};

const generateLaserSource = (rng: SeededRandom): Point => {
  const side = rng.nextInt(0, 3);
  switch (side) {
    case 0:
      return { x: rng.nextInt(80, 150), y: rng.nextInt(150, CANVAS_HEIGHT - 150) };
    case 1:
      return { x: rng.nextInt(150, CANVAS_WIDTH - 150), y: rng.nextInt(80, 150) };
    case 2:
      return { x: rng.nextInt(150, CANVAS_WIDTH - 150), y: rng.nextInt(CANVAS_HEIGHT - 150, CANVAS_HEIGHT - 80) };
    default:
      return { x: 100, y: CANVAS_HEIGHT / 2 };
  }
};

interface PathResult {
  path: Point[];
  mirrorAngles: number[];
  initialAngle: number;
  target: Point;
}

const buildSolutionPath = (
  rng: SeededRandom,
  source: Point,
  bounceCount: number,
): PathResult | null => {
  const path: Point[] = [source];
  const mirrorAngles: number[] = [];
  const margin = 80;

  const initialAngle = rng.nextFloat(-Math.PI / 3, Math.PI / 3);
  let currentAngle = normalizeAngle(initialAngle);
  let currentPos = { ...source };

  for (let i = 0; i < bounceCount; i++) {
    const minDist = i === 0 ? 150 : 100;
    const maxDist = 300;
    const dist = rng.nextInt(minDist, maxDist);

    const nextX = currentPos.x + Math.cos(currentAngle) * dist;
    const nextY = currentPos.y + Math.sin(currentAngle) * dist;

    if (nextX < margin || nextX > CANVAS_WIDTH - margin || 
        nextY < margin || nextY > CANVAS_HEIGHT - margin) {
      return null;
    }

    const mirrorPos = { x: nextX, y: nextY };
    path.push(mirrorPos);

    const normalAngle = currentAngle + Math.PI / 2 + rng.nextFloat(-Math.PI / 6, Math.PI / 6);
    
    let closestMirrorAngle = MIRROR_ANGLES[0];
    let minDiff = Infinity;
    for (const a of MIRROR_ANGLES) {
      const mirrorNormal = a + Math.PI / 2;
      let diff = Math.abs(normalizeAngle(mirrorNormal - normalAngle));
      if (diff < minDiff) {
        minDiff = diff;
        closestMirrorAngle = a;
      }
    }

    if (minDiff > Math.PI / 4) {
      return null;
    }

    mirrorAngles.push(closestMirrorAngle);

    const actualNormal = closestMirrorAngle + Math.PI / 2;
    currentAngle = reflectAngle(currentAngle, actualNormal);
    currentPos = mirrorPos;
  }

  const targetDist = rng.nextInt(100, 250);
  const targetX = currentPos.x + Math.cos(currentAngle) * targetDist;
  const targetY = currentPos.y + Math.sin(currentAngle) * targetDist;

  if (targetX < margin || targetX > CANVAS_WIDTH - margin || 
      targetY < margin || targetY > CANVAS_HEIGHT - margin) {
    return null;
  }

  const target = { x: targetX, y: targetY };
  path.push(target);

  return {
    path,
    mirrorAngles,
    initialAngle,
    target,
  };
};

const generateDecoyMirrors = (
  rng: SeededRandom,
  count: number,
  existingMirrors: MirrorData[],
  source: Point,
  target: Point,
): MirrorData[] => {
  const mirrors: MirrorData[] = [];
  const margin = 80;

  for (let i = 0; i < count; i++) {
    let x = 0,
      y = 0;
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 100) {
      attempts++;
      x = rng.nextInt(margin + 30, CANVAS_WIDTH - margin - 30);
      y = rng.nextInt(margin + 30, CANVAS_HEIGHT - margin - 30);

      valid = true;
      for (const mirror of existingMirrors) {
        if (distance({ x, y }, mirror) < 100) {
          valid = false;
          break;
        }
      }
      for (const mirror of mirrors) {
        if (distance({ x, y }, mirror) < 100) {
          valid = false;
          break;
        }
      }
      if (distance({ x, y }, source) < 60) valid = false;
      if (distance({ x, y }, target) < 60) valid = false;
    }

    if (!valid) continue;

    mirrors.push({
      id: `decoy${i + 1}`,
      x,
      y,
      angle: rng.pick(MIRROR_ANGLES),
      length: 80,
    });
  }

  return mirrors;
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

const calculateLaserPath = (
  source: Point,
  initialAngle: number,
  mirrors: MirrorData[],
  bounds: { width: number; height: number },
  maxBounces: number = 10,
): Point[] => {
  const path: Point[] = [{ ...source }];
  let currentPos = { ...source };
  let currentAngle = normalizeAngle(initialAngle);
  const maxDistance = Math.sqrt(bounds.width ** 2 + bounds.height ** 2) * 2;

  for (let bounce = 0; bounce <= maxBounces; bounce++) {
    const rayEnd = {
      x: currentPos.x + Math.cos(currentAngle) * maxDistance,
      y: currentPos.y + Math.sin(currentAngle) * maxDistance,
    };

    let closestHit: { point: Point; mirror: MirrorData; t: number } | null = null;

    for (const mirror of mirrors) {
      const [mStart, mEnd] = mirrorLine({ x: mirror.x, y: mirror.y }, mirror.angle, mirror.length);
      const intersection = lineIntersection(currentPos, rayEnd, mStart, mEnd);

      if (intersection) {
        const distToHit = distance(currentPos, intersection);
        if (distToHit > 1) {
          if (!closestHit || distToHit < closestHit.t) {
            closestHit = { point: intersection, mirror, t: distToHit };
          }
        }
      }
    }

    if (closestHit) {
      path.push({ ...closestHit.point });
      const normalAngle = normalizeAngle(closestHit.mirror.angle + Math.PI / 2);
      currentAngle = reflectAngle(currentAngle, normalAngle);
      currentPos = { ...closestHit.point };
    } else {
      const boundaryHit = findBoundaryIntersection(currentPos, currentAngle, bounds);
      if (boundaryHit) {
        path.push(boundaryHit);
      }
      break;
    }
  }

  return path;
};

const findBoundaryIntersection = (
  start: Point,
  angle: number,
  bounds: { width: number; height: number },
): Point | null => {
  const end = {
    x: start.x + Math.cos(angle) * 2000,
    y: start.y + Math.sin(angle) * 2000,
  };

  const boundaries = [
    [
      { x: 0, y: 0 },
      { x: bounds.width, y: 0 },
    ],
    [
      { x: bounds.width, y: 0 },
      { x: bounds.width, y: bounds.height },
    ],
    [
      { x: bounds.width, y: bounds.height },
      { x: 0, y: bounds.height },
    ],
    [
      { x: 0, y: bounds.height },
      { x: 0, y: 0 },
    ],
  ];

  let closest: Point | null = null;
  let closestDist = Infinity;

  for (const [bStart, bEnd] of boundaries) {
    const hit = lineIntersection(start, end, bStart, bEnd);
    if (hit) {
      const dist = distance(start, hit);
      if (dist > 1 && dist < closestDist) {
        closestDist = dist;
        closest = hit;
      }
    }
  }

  return closest;
};

const checkLaserHitsTarget = (
  path: Point[],
  target: Point,
  targetRadius: number,
): boolean => {
  for (let i = 0; i < path.length - 1; i++) {
    const segmentStart = path[i];
    const segmentEnd = path[i + 1];

    const dist = pointToSegmentDistance(target, segmentStart, segmentEnd);
    if (dist < targetRadius) {
      return true;
    }
  }
  return false;
};

const pointToSegmentDistance = (point: Point, segStart: Point, segEnd: Point): number => {
  const A = point.x - segStart.x;
  const B = point.y - segStart.y;
  const C = segEnd.x - segStart.x;
  const D = segEnd.y - segStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = lenSq !== 0 ? dot / lenSq : -1;

  let xx, yy;

  if (param < 0) {
    xx = segStart.x;
    yy = segStart.y;
  } else if (param > 1) {
    xx = segEnd.x;
    yy = segEnd.y;
  } else {
    xx = segStart.x + param * C;
    yy = segStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

const deriveClue = (solution: Record<string, number>, rng: SeededRandom): string => {
  const angles = Object.values(solution);
  let sum = 0;
  for (const angle of angles) {
    sum += Math.round((angle * 180) / Math.PI);
  }
  const digit = (Math.abs(sum) % 9) + 1;
  return String(digit);
};
