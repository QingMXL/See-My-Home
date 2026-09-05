import { describe, expect, test } from "vitest";
import { formatMessage, MESSAGES, TAG_ZH } from "./translations";
import { LIFESTYLE_TAG_GROUPS, ROOM_TAG_LIBRARY, STYLE_ROOM_TYPES, roomFunctionFrom } from "../data/rooms";
import { STYLE_TEMPLATES } from "../data/styleTemplates";

describe("MESSAGES", () => {
  test("every key has non-empty English and Chinese text", () => {
    for (const [key, entry] of Object.entries(MESSAGES)) {
      expect(entry.en, `${key}.en`).toBeTruthy();
      expect(entry.zh, `${key}.zh`).toBeTruthy();
    }
  });

  test("uses compact labels for the two room-confirmation substeps", () => {
    expect(MESSAGES["confirm.boundaryStepTitle"].zh).toBe("边界与功能");
    expect(MESSAGES["confirm.specialStepTitle"].zh).toBe("特别要求");
  });
});

describe("TAG_ZH coverage", () => {
  test("covers all room tags", () => {
    for (const tag of ROOM_TAG_LIBRARY) {
      expect(TAG_ZH[tag], tag).toBeTruthy();
    }
  });

  test("covers all lifestyle tags and group names", () => {
    for (const group of LIFESTYLE_TAG_GROUPS) {
      expect(TAG_ZH[group.group], group.group).toBeTruthy();
      for (const tag of group.tags) {
        expect(TAG_ZH[tag], tag).toBeTruthy();
      }
    }
  });

  test("covers all style room types and template tags", () => {
    for (const type of STYLE_ROOM_TYPES) {
      expect(TAG_ZH[type], type).toBeTruthy();
    }
    for (const template of STYLE_TEMPLATES) {
      for (const tag of template.tags) {
        expect(TAG_ZH[tag], `${template.id}:${tag}`).toBeTruthy();
      }
    }
  });
});

describe("room function normalization", () => {
  test("keeps balcony as a canonical room function in English and Chinese", () => {
    expect(roomFunctionFrom("Balcony")).toBe("balcony");
    expect(roomFunctionFrom("阳台")).toBe("balcony");
  });
});

describe("styleTemplates zh stories", () => {
  test("every template has a complete Chinese story", () => {
    for (const template of STYLE_TEMPLATES) {
      expect(template.storyZh.direction, template.id).toBeTruthy();
      expect(template.storyZh.material, template.id).toBeTruthy();
      expect(template.storyZh.light, template.id).toBeTruthy();
      expect(template.storyZh.furniture, template.id).toBeTruthy();
      expect(template.storyZh.mood, template.id).toBeTruthy();
    }
  });
});

describe("formatMessage", () => {
  test("substitutes named params", () => {
    expect(formatMessage("We found {n} rooms in {place}", { n: 7, place: "your plan" })).toBe(
      "We found 7 rooms in your plan",
    );
  });

  test("leaves unknown placeholders untouched", () => {
    expect(formatMessage("Hello {name}", {})).toBe("Hello {name}");
  });

  test("returns the template unchanged without params", () => {
    expect(formatMessage("Plain text")).toBe("Plain text");
  });
});
