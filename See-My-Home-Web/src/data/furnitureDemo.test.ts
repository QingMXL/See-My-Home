import { describe, expect, it } from "vitest";
import {
  createDemoFurnitureOrthographicResult,
  createDemoFurnitureResult,
  DEMO_FURNITURE_ORTHOGRAPHIC_URL,
  DEMO_FURNITURE_RENDER_URL,
  DEMO_FURNITURE_SKETCH_ASSET,
  isDemoFurnitureAsset,
} from "./furnitureDemo";
import type { FurnitureGenerateInput } from "../lib/homeFurnitureApi";

const input: FurnitureGenerateInput = {
  project_id: "demo",
  sketch_asset_id: DEMO_FURNITURE_SKETCH_ASSET.asset_id,
  locale: "zh-CN",
  table_type: "dining_table",
  description: "示例",
  locked_controls: [],
  dimensions_mm: { width: 1800, depth: 900, height: 750 },
  primary_material: "Ash",
  secondary_material: "Tempered Glass",
  top_shape: "freeform",
  edge_profile: "Soft Radius",
  base_style: "Twin Pedestal",
  finish: "Matte Black Stain",
  storage: "Open Shelf",
};

describe("Home Furniture demo", () => {
  it("uses the bundled render and the confirmed dimensions", () => {
    const result = createDemoFurnitureResult(input);
    expect(result.generated_image.url).toBe(DEMO_FURNITURE_RENDER_URL);
    expect(result.generated_image.provider_model).toBe("Pre-rendered demo");
    expect(result.response.design_spec.dimensions_mm).toEqual({ width: 1800, depth: 900, height: 750 });
    expect(result.source_priority).toEqual({ sketch: 1, inspiration: 0 });
  });

  it("reveals the bundled orthographic sheet as a separate third step", () => {
    const result = createDemoFurnitureResult(input);
    const orthographic = createDemoFurnitureOrthographicResult(result);
    expect(orthographic.orthographic_image.url).toBe(DEMO_FURNITURE_ORTHOGRAPHIC_URL);
    expect(orthographic.response).toBe(result.response);
  });

  it("identifies only the bundled sketch asset as the demo", () => {
    expect(isDemoFurnitureAsset(DEMO_FURNITURE_SKETCH_ASSET)).toBe(true);
    expect(isDemoFurnitureAsset({ ...DEMO_FURNITURE_SKETCH_ASSET, asset_id: "uploaded" })).toBe(false);
    expect(isDemoFurnitureAsset(null)).toBe(false);
  });
});
