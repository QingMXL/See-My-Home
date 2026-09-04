export type NormalizedPoint = [number, number];

const EPSILON = 1e-7;

export function clampNormalizedPoint(point: NormalizedPoint): NormalizedPoint {
  return [
    Math.min(1, Math.max(0, point[0])),
    Math.min(1, Math.max(0, point[1])),
  ];
}

export function polygonArea(points: number[][]): number {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length] ?? point;
    return sum + (point[0] * next[1] - next[0] * point[1]);
  }, 0) / 2);
}

function orientation(a: number[], b: number[], c: number[]): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function onSegment(a: number[], b: number[], point: number[]): boolean {
  return Math.abs(orientation(a, b, point)) <= EPSILON
    && point[0] >= Math.min(a[0], b[0]) - EPSILON
    && point[0] <= Math.max(a[0], b[0]) + EPSILON
    && point[1] >= Math.min(a[1], b[1]) - EPSILON
    && point[1] <= Math.max(a[1], b[1]) + EPSILON;
}

function segmentsIntersect(a: number[], b: number[], c: number[], d: number[]): boolean {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);

  if (((abC > EPSILON && abD < -EPSILON) || (abC < -EPSILON && abD > EPSILON))
    && ((cdA > EPSILON && cdB < -EPSILON) || (cdA < -EPSILON && cdB > EPSILON))) return true;

  return (Math.abs(abC) <= EPSILON && onSegment(a, b, c))
    || (Math.abs(abD) <= EPSILON && onSegment(a, b, d))
    || (Math.abs(cdA) <= EPSILON && onSegment(c, d, a))
    || (Math.abs(cdB) <= EPSILON && onSegment(c, d, b));
}

export function isSimplePolygon(points: number[][]): boolean {
  if (points.length < 3) return false;
  for (let edge = 0; edge < points.length; edge += 1) {
    const nextEdge = (edge + 1) % points.length;
    for (let other = edge + 1; other < points.length; other += 1) {
      const nextOther = (other + 1) % points.length;
      if (edge === other || nextEdge === other || nextOther === edge) continue;
      if (edge === 0 && nextOther === 0) continue;
      if (segmentsIntersect(points[edge], points[nextEdge], points[other], points[nextOther])) return false;
    }
  }
  return true;
}

export function isUsablePolygon(points: number[][] | undefined): points is number[][] {
  return Boolean(points && points.length >= 3 && points.every(
    ([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1,
  ) && polygonArea(points ?? []) > 0.0002 && isSimplePolygon(points ?? []));
}

function pointInPolygon(point: NormalizedPoint, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    if (((yi > point[1]) !== (yj > point[1]))
      && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi || EPSILON) + xi) inside = !inside;
  }
  return inside;
}

function distanceToSegment(point: NormalizedPoint, start: number[], end: number[]): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared <= EPSILON
    ? 0
    : Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

export function polygonLabelAnchor(points: number[][]): NormalizedPoint {
  let twiceArea = 0;
  let centerX = 0;
  let centerY = 0;
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const next = points[(index + 1) % points.length];
    const cross = point[0] * next[1] - next[0] * point[1];
    twiceArea += cross;
    centerX += (point[0] + next[0]) * cross;
    centerY += (point[1] + next[1]) * cross;
  }
  if (Math.abs(twiceArea) > EPSILON) {
    const centroid: NormalizedPoint = [centerX / (3 * twiceArea), centerY / (3 * twiceArea)];
    if (pointInPolygon(centroid, points)) return centroid;
  }

  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  let best: NormalizedPoint = [points[0][0], points[0][1]];
  let bestDistance = -1;
  for (let row = 1; row < 12; row += 1) {
    for (let column = 1; column < 12; column += 1) {
      const candidate: NormalizedPoint = [
        left + ((right - left) * column) / 12,
        top + ((bottom - top) * row) / 12,
      ];
      if (!pointInPolygon(candidate, points)) continue;
      const distance = Math.min(...points.map((point, index) => (
        distanceToSegment(candidate, point, points[(index + 1) % points.length])
      )));
      if (distance > bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
  }
  return best;
}

export function movePolygonVertex(
  polygon: number[][],
  vertexIndex: number,
  rawPoint: NormalizedPoint,
): number[][] | null {
  if (!polygon[vertexIndex]) return null;
  const next = polygon.map((point, index) => index === vertexIndex ? clampNormalizedPoint(rawPoint) : [...point]);
  return isUsablePolygon(next) ? next : null;
}

export function insertPolygonVertex(polygon: number[][], edgeIndex: number): number[][] | null {
  const start = polygon[edgeIndex];
  const end = polygon[(edgeIndex + 1) % polygon.length];
  if (!start || !end) return null;
  const midpoint: NormalizedPoint = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
  const next = polygon.map((point) => [...point]);
  next.splice(edgeIndex + 1, 0, midpoint);
  return isUsablePolygon(next) ? next : null;
}

export function removePolygonVertex(polygon: number[][], vertexIndex: number): number[][] | null {
  if (polygon.length <= 3 || !polygon[vertexIndex]) return null;
  const next = polygon.filter((_, index) => index !== vertexIndex).map((point) => [...point]);
  return isUsablePolygon(next) ? next : null;
}
