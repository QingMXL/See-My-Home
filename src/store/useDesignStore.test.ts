import { beforeEach, describe, expect, test } from "vitest";
import { useDesignStore } from "./useDesignStore";

describe("useDesignStore", () => {
  beforeEach(() => {
    useDesignStore.getState().resetLayout();
    // Clear saved designs between tests.
    for (const d of useDesignStore.getState().saved) {
      useDesignStore.getState().deleteDesign(d.id);
    }
  });

  test("renameRoom replaces a room label immutably", () => {
    // Arrange
    const before = useDesignStore.getState().layout.rooms;

    // Act
    useDesignStore.getState().renameRoom("bedroom-2", "Home Office");

    // Assert
    const after = useDesignStore.getState().layout.rooms;
    expect(after.find((r) => r.id === "bedroom-2")?.label).toBe("Home Office");
    expect(before.find((r) => r.id === "bedroom-2")?.label).toBe("Bedroom 2");
    expect(after).not.toBe(before);
  });

  test("toggleLifestyleTag adds then removes a tag", () => {
    useDesignStore.getState().toggleLifestyleTag("Pets");
    expect(useDesignStore.getState().layout.lifestyleTags).toContain("Pets");

    useDesignStore.getState().toggleLifestyleTag("Pets");
    expect(useDesignStore.getState().layout.lifestyleTags).not.toContain("Pets");
  });

  test("saveDesign prepends designs with unique ids", () => {
    useDesignStore.getState().saveDesign({ project: "My Home", title: "A", kind: "Layout", detail: "" });
    useDesignStore.getState().saveDesign({ project: "My Home", title: "B", kind: "Style", detail: "" });

    const saved = useDesignStore.getState().saved;
    expect(saved.map((d) => d.title)).toEqual(["B", "A"]);
    expect(new Set(saved.map((d) => d.id)).size).toBe(2);
  });

  test("deleteDesign removes only the targeted design", () => {
    useDesignStore.getState().saveDesign({ project: "My Home", title: "Keep", kind: "Layout", detail: "" });
    useDesignStore.getState().saveDesign({ project: "My Home", title: "Drop", kind: "Style", detail: "" });
    const drop = useDesignStore.getState().saved.find((d) => d.title === "Drop")!;

    useDesignStore.getState().deleteDesign(drop.id);

    expect(useDesignStore.getState().saved.map((d) => d.title)).toEqual(["Keep"]);
  });

  test("setFurnitureOption clears prior confirmation", () => {
    useDesignStore.getState().confirmFurniture();
    expect(useDesignStore.getState().furniture.confirmed).toBe(true);

    useDesignStore.getState().setFurnitureOption("material", "White Oak");

    expect(useDesignStore.getState().furniture.material).toBe("White Oak");
    expect(useDesignStore.getState().furniture.confirmed).toBe(false);
  });
});
