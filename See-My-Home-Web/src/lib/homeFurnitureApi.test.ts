import { afterEach, describe, expect, test, vi } from "vitest";
import { generateFurniture, type FurnitureGenerateInput } from "./homeFurnitureApi";

const input: FurnitureGenerateInput = {
  project_id: "furniture_test_001",
  locale: "zh-CN",
  table_type: "dining_table",
  description: "一张简洁的实木餐桌。",
  dimensions_mm: { width: 1800, depth: 900, height: 750 },
  primary_material: "White Oak",
  secondary_material: "Blackened Steel",
  top_shape: "rectangular",
  edge_profile: "Soft Radius",
  base_style: "Four Tapered Legs",
  finish: "Matte Clear Oil",
  storage: "No Storage",
  source_priority: { sketch: 0.65, inspiration: 0.35 },
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Home Furniture generation API", () => {
  test("polls a durable ZooWork job until the render is ready", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    const finalResult = {
      session_id: "session_furniture_001",
      request_id: "request_furniture_001",
      generated_image: { url: "https://example.com/table.png" },
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: "processing",
        job_token: "signed-furniture-job",
        poll_after_ms: 500,
      }), { status: 202, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(finalResult), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = generateFurniture(input);
    await vi.advanceTimersByTimeAsync(500);
    const result = await resultPromise;

    expect(result).toEqual(finalResult);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      project_id: "furniture_test_001",
      source_priority: { sketch: 0.65, inspiration: 0.35 },
      job_token: "signed-furniture-job",
    });
  });

  test("surfaces the platform body when a non-JSON request fails", async () => {
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      "Task timed out after 300 seconds",
      { status: 504, headers: { "content-type": "text/plain" } },
    )));

    await expect(generateFurniture(input)).rejects.toThrow(
      "Home Furniture Agent request failed (504): Task timed out after 300 seconds",
    );
  });
});
