import { afterEach, describe, expect, test, vi } from "vitest";
import { generateLayout, type GenerateLayoutInput } from "./homeLayoutApi";

const input: GenerateLayoutInput = {
  home_id: "home_test_001",
  locale: "en-US",
  user_message: "Generate the layout.",
  rooms: [],
  excluded_regions: [],
  lifestyle_tags: [],
  source_kind: "sample_plan",
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Home Layout generation API", () => {
  test("polls a durable generation job until the final result is ready", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    const finalResult = {
      session_id: "session_async_001",
      image_processing_status: "sample_geometry",
      generated_image: null,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: "processing",
        job_token: "signed-job-token",
        poll_after_ms: 500,
      }), { status: 202, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(finalResult), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = generateLayout(input);
    await vi.advanceTimersByTimeAsync(500);
    const result = await resultPromise;

    expect(result).toEqual(finalResult);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      home_id: "home_test_001",
      job_token: "signed-job-token",
    });
  });

  test("turns a non-JSON platform error page into a readable request error", async () => {
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      "An error occurred with your deployment",
      { status: 504, headers: { "content-type": "text/plain" } },
    )));

    await expect(generateLayout(input)).rejects.toThrow(
      "Layout Agent request failed (504): An error occurred with your deployment",
    );
  });
});
