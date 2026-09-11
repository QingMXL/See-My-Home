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

  test("covers all style room types", () => {
    for (const type of STYLE_ROOM_TYPES) {
      expect(TAG_ZH[type], type).toBeTruthy();
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
      expect(template.tagline).toBeTruthy();
      expect(template.taglineZh).toBeTruthy();
      expect(template.storyZh.direction, template.id).toBeTruthy();
      expect(template.storyZh.material, template.id).toBeTruthy();
      expect(template.storyZh.light, template.id).toBeTruthy();
      expect(template.storyZh.furniture, template.id).toBeTruthy();
      expect(template.storyZh.mood, template.id).toBeTruthy();
    }
  });

  test("provides three visual presets while keeping live runtime bindings explicit", () => {
    expect(STYLE_TEMPLATES.map((template) => template.name)).toEqual([
      "Modern East",
      "California Modern",
      "Maximal Luxe",
    ]);
    expect(STYLE_TEMPLATES.map((template) => template.nameZh)).toEqual([
      "摩登东方",
      "加州现代",
      "极繁奢华",
    ]);
    expect(STYLE_TEMPLATES.filter((template) => template.styleId).map((template) => template.styleId)).toEqual([
      "modern_east",
    ]);
    expect(new Set(STYLE_TEMPLATES.map((template) => template.previewUrl)).size).toBe(3);
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
