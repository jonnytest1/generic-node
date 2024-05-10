import { Vector2 } from './vector';

export function pointIsInPoly(p: Vector2, polygon: Array<Vector2>) {
  let isInside = false;
  let minX = polygon[0].x, maxX = polygon[0].x;
  let minY = polygon[0].y, maxY = polygon[0].y;
  for (let n = 1; n < polygon.length; n++) {
    const q = polygon[n];
    minX = Math.min(q.x, minX);
    maxX = Math.max(q.x, maxX);
    minY = Math.min(q.y, minY);
    maxY = Math.max(q.y, maxY);
  }

  if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
    return false;
  }

  let i = 0, j = polygon.length - 1;
  for (; i < polygon.length; j = i++) {
    if ((polygon[i].y > p.y) != (polygon[j].y > p.y) &&
      p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x) {
      isInside = !isInside;
    }
  }

  return isInside;
}