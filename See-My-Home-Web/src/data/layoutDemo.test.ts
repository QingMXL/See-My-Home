import { describe, expect, test } from "vitest";
import {
  createDemoLayoutResult,
  createDemoRooms,
  DEMO_LAYOUT_RESULT_URL,
  DEMO_LAYOUT_SESSION_ID,
} from "./layoutDemo";
import type { GenerateLayoutInput } from "../lib/homeLayoutApi";

function requestContext(): GenerateLayoutInput {
  const rooms = createDemoRooms();
  return {
    home_id: "demo-home",
    locale: "en-US",
    user_message: "Run the bundled demo.",
    rooms: rooms.map((room) => ({
      id: room.id,
      label: room.label,
      current_use: room.label,
      function_code: room.functionCode ?? "other",
      function_confirmed: true,
      boundary_confirmed: true,
      source_geometry: { kind: "polygon", coordinates: room.polygon ?? [] },
    })),
    excluded_regions: [],
    lifestyle_tags: [],
    source_kind: "sample_plan",
  };
}

describe("Home Layout demo", () => {
  test("provides editable polygons calibrated to the bundled source plan", () => {
    const rooms = createDemoRooms();
    expect(rooms).toHaveLength(7);
    expect(rooms.every((room) => room.polygon?.length === 4)).toBe(true);
    expect(rooms.find((room) => room.id === "balcony")?.functionCode).toBe("balcony");
  });

  test("uses the bundled final image without an Agent request", () => {
    const rooms = createDemoRooms();
    const result = createDemoLayoutResult({
      rooms,
      locale: "en-US",
      requestContext: requestContext(),
      resultImageAvailable: true,
    });
    expect(result.session_id).toBe(DEMO_LAYOUT_SESSION_ID);
    expect(result.generated_image?.url).toBe(DEMO_LAYOUT_RESULT_URL);
    expect(result.generated_image?.provider_model).toBe("Pre-rendered demo");
  });

  test("reports no generated image while the bundled result asset is absent", () => {
    const result = createDemoLayoutResult({
      rooms: createDemoRooms(),
      locale: "zh-CN",
      requestContext: requestContext(),
      resultImageAvailable: false,
    });
    expect(result.generated_image).toBeNull();
    expect(result.diagnosis.diagnosis?.assessment_items).toHaveLength(3);
  });
});
