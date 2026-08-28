import { describe, expect, test } from "vitest";
import { mix } from "./RoomScene";

describe("mix", () => {
  test("returns the first color at amount 0", () => {
    expect(mix("#112233", "#ffffff", 0)).toBe("#112233");
  });

  test("returns the second color at amount 1", () => {
    expect(mix("#112233", "#ffffff", 1)).toBe("#ffffff");
  });

  test("blends midway between two colors", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  test("expands 3-digit hex shorthand", () => {
    expect(mix("#fff", "#000", 0)).toBe("#ffffff");
  });

  test("clamps out-of-range amounts", () => {
    expect(mix("#112233", "#ffffff", 2)).toBe("#ffffff");
    expect(mix("#112233", "#ffffff", -1)).toBe("#112233");
  });
});
