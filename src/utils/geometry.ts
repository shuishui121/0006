import type { Point } from '@/types/game';

export const distance = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const angle = (from: Point, to: Point): number => {
  return Math.atan2(to.y - from.y, to.x - from.x);
};

export const pointOnLine = (start: Point, end: Point, t: number): Point => {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
};

export const lineIntersection = (
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point,
): Point | null => {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (Math.abs(denom) < 0.0001) return null;

  const ua =
    ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub =
    ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y),
    };
  }
  return null;
};

export const reflectAngle = (incomingAngle: number, normalAngle: number): number => {
  return 2 * normalAngle - incomingAngle;
};

export const lineSegmentFromAngle = (
  start: Point,
  angle: number,
  length: number,
): [Point, Point] => {
  const end = {
    x: start.x + Math.cos(angle) * length,
    y: start.y + Math.sin(angle) * length,
  };
  return [start, end];
};

export const mirrorLine = (
  center: Point,
  angle: number,
  length: number,
): [Point, Point] => {
  const half = length / 2;
  const dx = Math.cos(angle) * half;
  const dy = Math.sin(angle) * half;
  return [
    { x: center.x - dx, y: center.y - dy },
    { x: center.x + dx, y: center.y + dy },
  ];
};

export const pointNearPoint = (
  p1: Point,
  p2: Point,
  threshold: number,
): boolean => {
  return distance(p1, p2) < threshold;
};

export const normalizeAngle = (angle: number): number => {
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return angle;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};
