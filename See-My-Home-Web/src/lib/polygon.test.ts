import { describe, expect, test } from "vitest";
import {
  insertPolygonVertex,
  isSimplePolygon,
  isUsablePolygon,
  movePolygonVertex,
  polygonLabelAnchor,
  removePolygonVertex,
} from "./polygon";

const rectangle = [[0.1, 0.1], [0.8, 0.1], [0.8, 0.8], [0.1, 0.8]];

describe("polygon editing", () => {
  test("inserts a midpoint so a rectangular room can become concave", () => {
    const inserted = insertPolygonVertex(rectangle, 1);
    expect(inserted).toHaveLength(5);
    expect(inserted?.[2]).toEqual([0.8, 0.45]);
  });

  test("removes a selected vertex but never goes below three points", () => {
    const inserted = insertPolygonVertex(rectangle, 1)!;
    expect(removePolygonVertex(inserted, 2)).toHaveLength(4);
    expect(removePolygonVertex(rectangle.slice(0, 3), 1)).toBeNull();
  });

  test("rejects a move that creates a self-intersection", () => {
    expect(movePolygonVertex(rectangle, 1, [0.2, 0.9])).toBeNull();
    expect(isSimplePolygon([[0.1, 0.1], [0.8, 0.8], [0.8, 0.1], [0.1, 0.8]])).toBe(false);
  });

  test("keeps the label anchor inside a concave room", () => {
    const concave = [[0.1, 0.1], [0.9, 0.1], [0.9, 0.35], [0.4, 0.35], [0.4, 0.9], [0.1, 0.9]];
    const anchor = polygonLabelAnchor(concave);
    expect(isUsablePolygon(concave)).toBe(true);
    expect(anchor[0]).toBeGreaterThanOrEqual(0.1);
    expect(anchor[1]).toBeGreaterThanOrEqual(0.1);
    expect(anchor[0] > 0.4 && anchor[1] > 0.35).toBe(false);
  });
});
