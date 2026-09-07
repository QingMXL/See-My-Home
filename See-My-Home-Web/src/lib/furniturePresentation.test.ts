import { describe, expect, test } from "vitest";
import {
  localizeComponentLine,
  localizeFinishLine,
  localizeFurnitureNarrative,
  localizeFurnitureTerm,
  localizeMaterialLine,
} from "./furniturePresentation";

describe("furniture presentation localization", () => {
  const materials = [
    { part: "Top panel", material: "Solid walnut", finish: "Matte hand-rubbed oil" },
    { part: "Knobs", material: "Blackened steel", finish: "Matte blackened" },
  ];

  test("renders Agent material specifications entirely in Chinese", () => {
    expect(localizeMaterialLine(materials, "zh")).toBe("桌面板: 实心胡桃木 · 圆形拉手: 发黑钢");
    expect(localizeFinishLine(materials, "zh")).toBe("哑光手擦油 · 哑光发黑处理");
  });

  test("falls back to a Chinese role instead of leaking an unknown English component", () => {
    expect(localizeComponentLine([{
      id: "leg",
      name: "Uncatalogued sculpted leg",
      role: "support",
      quantity: 4,
    }], "zh")).toBe("支撑件 × 4");
  });

  test("keeps English values on the English page", () => {
    expect(localizeFurnitureTerm("Solid walnut", "en")).toBe("Solid walnut");
    expect(localizeMaterialLine(materials, "en")).toContain("Top panel: Solid walnut");
  });

  test("does not show a narrative written for the other locale", () => {
    expect(localizeFurnitureNarrative("A walnut console table.", "zh", {
      en: "Confirmed furniture concept.",
      zh: "已确认的家具概念方案。",
    })).toBe("已确认的家具概念方案。");
  });
});
