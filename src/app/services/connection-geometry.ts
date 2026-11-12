import type { Point2D } from '../models/archimate.models';

const CORNER_RADIUS = 16;
const HOP_RADIUS = 8;

/** Clips the ray from a shape center towards `targetCenter` at the shape's bounding box. */
export function getShapeEdgePoint(
  center: Point2D,
  width: number,
  height: number,
  targetCenter: Point2D,
): Point2D {
  const dx = targetCenter.x - center.x;
  const dy = targetCenter.y - center.y;

  if (dx === 0 && dy === 0) return { x: center.x, y: center.y };

  const tX = width / 2 / Math.abs(dx);
  const tY = height / 2 / Math.abs(dy);

  let t = Math.min(tX, tY);
  if (t > 1) t = 1;

  return { x: center.x + dx * t, y: center.y + dy * t };
}

export function getIntersection(a: Point2D, b: Point2D, c: Point2D, d: Point2D): (Point2D & { t: number }) | null {
  const bottom = (d.y - c.y) * (b.x - a.x) - (d.x - c.x) * (b.y - a.y);
  if (bottom === 0) return null;

  const tTop = (d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x);
  const uTop = (c.y - a.y) * (a.x - b.x) - (c.x - a.x) * (a.y - b.y);
  const t = tTop / bottom;
  const u = uTop / bottom;

  if (t > 0 && t < 1 && u > 0 && u < 1) {
    return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), t };
  }
  return null;
}

export function getPointOnLine(p1: Point2D, p2: Point2D, distance: number): Point2D {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return p1;
  const ratio = distance / length;
  return { x: p1.x + dx * ratio, y: p1.y + dy * ratio };
}

export function getPerpendicularOffset(p1: Point2D, p2: Point2D, point: Point2D, offset: number): Point2D {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return point;
  const nx = -dy / length;
  const ny = dx / length;
  return { x: point.x + nx * offset, y: point.y + ny * offset };
}

/**
 * Builds an SVG path for an orthogonal connection, rounding corners and drawing
 * semicircular hops where this route crosses routes that were laid out before it.
 */
export function generatePathString(points: Point2D[] | undefined, earlierRoutes: (Point2D[] | undefined)[]): string {
  if (!points || points.length < 2) return 'M 0 0 L 0 0';

  let path = '';

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const segLength = Math.hypot(p2.x - p1.x, p2.y - p1.y);

    const intersections: (Point2D & { t: number })[] = [];
    for (const otherPoints of earlierRoutes) {
      if (!otherPoints) continue;
      for (let k = 0; k < otherPoints.length - 1; k++) {
        const intersect = getIntersection(p1, p2, otherPoints[k], otherPoints[k + 1]);
        if (intersect) intersections.push(intersect);
      }
    }
    intersections.sort((a, b) => a.t - b.t);

    const isFirst = i === 0;
    const isLast = i === points.length - 2;

    let currPoint = isFirst ? p1 : getPointOnLine(p1, p2, Math.min(CORNER_RADIUS, segLength / 2));

    if (isFirst) path += `M ${currPoint.x} ${currPoint.y} `;

    for (const int of intersections) {
      if (segLength < HOP_RADIUS * 4) continue;
      const distFromP1 = int.t * segLength;
      if (distFromP1 < CORNER_RADIUS + HOP_RADIUS || distFromP1 > segLength - CORNER_RADIUS - HOP_RADIUS) {
        continue;
      }

      const hopStart = getPointOnLine(p1, p2, distFromP1 - HOP_RADIUS);
      const hopEnd = getPointOnLine(p1, p2, distFromP1 + HOP_RADIUS);

      path += `L ${hopStart.x} ${hopStart.y} `;
      const perp = getPerpendicularOffset(p1, p2, int, HOP_RADIUS * 1.5);
      path += `Q ${perp.x} ${perp.y} ${hopEnd.x} ${hopEnd.y} `;
      currPoint = hopEnd;
    }

    if (isLast) {
      path += `L ${p2.x} ${p2.y} `;
    } else {
      const effectiveCornerRadius = Math.min(CORNER_RADIUS, segLength / 2);
      const cornerStart = getPointOnLine(p2, p1, effectiveCornerRadius);
      const nextPoint = points[i + 2];
      const nextSegLength = Math.hypot(nextPoint.x - p2.x, nextPoint.y - p2.y);
      const nextEffectiveCornerRadius = Math.min(CORNER_RADIUS, nextSegLength / 2);
      const cornerEnd = getPointOnLine(p2, nextPoint, nextEffectiveCornerRadius);

      path += `L ${cornerStart.x} ${cornerStart.y} `;
      path += `Q ${p2.x} ${p2.y} ${cornerEnd.x} ${cornerEnd.y} `;
    }
  }

  return path || 'M 0 0 L 0 0';
}
