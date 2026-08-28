import { describe, expect, test, vi } from "vitest";
import {
  buildLayoutResult,
  buildRefinementReplyKey,
  LAYOUT_GENERATION_STEPS,
  runGeneration,
} from "./agents";
import { MESSAGES } from "../i18n/translations";

describe("buildLayoutResult", () => {
  test("returns a note for every recognized room", () => {
    // Arrange
    const rooms = ["Primary Bedroom", "Kitchen", "Living Room", "Bathroom"];

    // Act
    const result = buildLayoutResult(rooms, []);

    // Assert
    expect(result.notes.map((n) => n.room)).toEqual(["Primary Bedroom", "Kitchen", "Living Room", "Bathroom"]);
  });

  test("tailors notes to lifestyle tags", () => {
    const result = buildLayoutResult(["Kitchen", "Primary Bedroom"], ["Kitchen Island", "King Bed"]);

    expect(result.notes.find((n) => n.room === "Kitchen")?.noteKey).toBe("note.kitchenIsland");
    expect(result.notes.find((n) => n.room === "Primary Bedroom")?.noteKey).toBe("note.primaryKing");
  });

  test("every note key resolves to a translated message in both languages", () => {
    const result = buildLayoutResult(
      ["Primary Bedroom", "Kids' Room", "Kitchen", "Living Room", "Bathroom"],
      ["Work From Home", "Entertaining", "Walk-in Shower"],
    );

    for (const note of result.notes) {
      expect(MESSAGES[note.noteKey].en).toBeTruthy();
      expect(MESSAGES[note.noteKey].zh).toBeTruthy();
    }
  });

  test("returns empty notes when no rooms match", () => {
    const result = buildLayoutResult(["Garage"], []);
    expect(result.notes).toEqual([]);
  });

  test("caps key decisions at four tags", () => {
    const tags = ["Kids", "Pets", "Fitness", "Reading", "Gaming"];
    const result = buildLayoutResult([], tags);
    expect(result.keyDecisions).toHaveLength(4);
  });
});

describe("buildRefinementReplyKey", () => {
  test("responds to warmth requests in English", () => {
    expect(buildRefinementReplyKey("Make it warmer please")).toBe("reply.warmer");
  });

  test("responds to floor requests in Chinese", () => {
    expect(buildRefinementReplyKey("保留地板")).toBe("reply.floor");
  });

  test("falls back to a generic acknowledgement", () => {
    expect(buildRefinementReplyKey("something else entirely")).toBe("reply.generic");
  });
});

describe("runGeneration", () => {
  test("invokes every step in order, then resolves", async () => {
    // Arrange
    vi.useFakeTimers();
    const seen: number[] = [];

    // Act
    const promise = runGeneration(LAYOUT_GENERATION_STEPS, (i) => seen.push(i));
    await vi.runAllTimersAsync();
    await promise;

    // Assert
    expect(seen).toEqual([0, 1, 2, 3, 4]);
    vi.useRealTimers();
  });

  test("rejects with AbortError when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(runGeneration(LAYOUT_GENERATION_STEPS, () => {}, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  test("step labels resolve to messages in both languages", () => {
    for (const step of LAYOUT_GENERATION_STEPS) {
      expect(MESSAGES[step.labelKey].en).toBeTruthy();
      expect(MESSAGES[step.labelKey].zh).toBeTruthy();
    }
  });
});
