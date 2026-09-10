import { afterEach, describe, expect, test, vi } from "vitest";
import { generateStyle, type StyleGenerateInput } from "./homeStyleApi";

const input: StyleGenerateInput = {
  project_id: "style_test_001",
  asset_id: "https://example.com/source.png",
  locale: "en-US",
  room_type: "primary_bedroom",
  style_id: "modern_east",
  style_profile: "quiet-poise",
  renovation_scope: "finishes_and_furnishing",
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Home Style generation API", () => {
  test("polls a durable ZooWork job until the Designer result is ready", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    const finalResult = {
      session_id: "session_style_001",
      request_id: "request_style_001",
      generated_image: { url: "https://example.com/modern-east.png" },
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: "processing",
        job_token: "signed-style-job",
        poll_after_ms: 500,
      }), { status: 202, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(finalResult), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = generateStyle(input);
    await vi.advanceTimersByTimeAsync(500);
    const result = await resultPromise;

    expect(result).toEqual(finalResult);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      project_id: "style_test_001",
      style_id: "modern_east",
      job_token: "signed-style-job",
    });
  });

  test("surfaces a readable platform error when the response is not JSON", async () => {
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      "The upstream connection was reset",
      { status: 504, headers: { "content-type": "text/plain" } },
    )));

    await expect(generateStyle(input)).rejects.toThrow(
      "Home Style Agent request failed (504): The upstream connection was reset",
    );
  });
});
