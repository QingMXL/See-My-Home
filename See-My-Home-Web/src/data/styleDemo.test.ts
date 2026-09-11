import { describe, expect, test } from "vitest";
import { createDemoStyleResult, DEMO_STYLE_ASSET, isDemoStyleAsset } from "./styleDemo";
import { STYLE_TEMPLATES } from "./styleTemplates";

describe("Home Style example", () => {
  test("maps every preset to its own prepared result", () => {
    for (const template of STYLE_TEMPLATES) {
      const result = createDemoStyleResult(template, {
        project_id: DEMO_STYLE_ASSET.project_id,
        asset_id: DEMO_STYLE_ASSET.asset_id,
        locale: "en-US",
        room_type: "living_room",
        style_id: template.styleId,
        style_profile: template.styleProfile,
        renovation_scope: "finishes_and_furnishing",
      });

      expect(result.generated_image.url).toBe(template.demoResultUrl);
      expect(result.generated_image.provider_model).toBe("Pre-rendered demo");
      expect(result.request_id).toContain(template.id);
      expect(result.style_id).toBe(template.styleId);
    }
  });

  test("recognizes only the bundled example asset", () => {
    expect(isDemoStyleAsset(DEMO_STYLE_ASSET)).toBe(true);
    expect(isDemoStyleAsset(null)).toBe(false);
  });
});
