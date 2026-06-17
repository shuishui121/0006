import type {
  PlacedGear,
  Point,
  MirrorData,
  BalanceState,
  RuneState,
} from '@/types/game';
import { distance, lineIntersection, mirrorLine, reflectAngle, normalizeAngle } from '@/utils/geometry';

export const checkGearConnection = (
  powerSource: Point,
  powerTarget: Point,
  placedGears: PlacedGear[],
  sourceRadius: number = 50,
  targetRadius: number = 50,
): boolean => {
  if (placedGears.length === 0) return false;

  const allNodes: (Point & { radius: number; id: string })[] = [
    { ...powerSource, radius: sourceRadius, id: 'source' },
    ...placedGears.map((g) => ({ x: g.x, y: g.y, radius: g.radius, id: g.id })),
    { ...powerTarget, radius: targetRadius, id: 'target' },
  ];

  const adjacencyMap: Map<string, string[]> = new Map();
  allNodes.forEach((node) => adjacencyMap.set(node.id, []));

  for (let i = 0; i < allNodes.length; i++) {
    for (let j = i + 1; j < allNodes.length; j++) {
      const n1 = allNodes[i];
      const n2 = allNodes[j];
      const dist = distance(n1, n2);
      const expectedDist = n1.radius + n2.radius;
      const tolerance = 5;

      if (Math.abs(dist - expectedDist) < tolerance) {
        adjacencyMap.get(n1.id)!.push(n2.id);
        adjacencyMap.get(n2.id)!.push(n1.id);
      }
    }
  }

  const visited = new Set<string>();
  const queue: string[] = ['source'];
  visited.add('source');

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === 'target') return true;

    const neighbors = adjacencyMap.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return false;
};

export const checkRuneSequence = (state: RuneState): boolean => {
  if (state.currentSequence.length !== state.correctSequence.length) return false;
  return state.currentSequence.every((id, idx) => id === state.correctSequence[idx]);
};

export const calculateLaserPath = (
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
      const [mStart, mEnd] = mirrorLine(mirror, mirror.angle, mirror.length);
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
      const boundaryHit = findBoundaryIntersection(
        currentPos,
        currentAngle,
        bounds,
      );
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
    [{ x: 0, y: 0 }, { x: bounds.width, y: 0 }],
    [{ x: bounds.width, y: 0 }, { x: bounds.width, y: bounds.height }],
    [{ x: bounds.width, y: bounds.height }, { x: 0, y: bounds.height }],
    [{ x: 0, y: bounds.height }, { x: 0, y: 0 }],
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

export const checkLaserHitsTarget = (
  path: Point[],
  target: Point,
  targetRadius: number,
): boolean => {
  for (let i = 0; i < path.length - 1; i++) {
    const segmentStart = path[i];
    const segmentEnd = path[i + 1];

    for (let t = 0; t <= 1; t += 0.01) {
      const px = segmentStart.x + (segmentEnd.x - segmentStart.x) * t;
      const py = segmentStart.y + (segmentEnd.y - segmentStart.y) * t;
      const dist = distance({ x: px, y: py }, target);
      if (dist < targetRadius) {
        return true;
      }
    }
  }
  return false;
};

export const checkBalance = (state: BalanceState): boolean => {
  const tolerance = state.targetWeight * 0.05;
  return Math.abs(state.leftTotal - state.targetWeight) < tolerance &&
         Math.abs(state.rightTotal - state.targetWeight) < tolerance;
};

export const calculateWeight = (
  stones: { weight: number }[],
  armLengths: number[],
): number => {
  return stones.reduce((sum, stone, idx) => {
    const arm = armLengths[idx] || 1;
    return sum + stone.weight * arm;
  }, 0);
};
