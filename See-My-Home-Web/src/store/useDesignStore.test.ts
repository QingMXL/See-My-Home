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
    expect(before.find((r) => r.id === "bedroom-2")?.label).toBe("Guest Bedroom");
    expect(after).not.toBe(before);
  });

  test("setRoomFunction supports Entry and a confirmed custom Other label", () => {
    useDesignStore.getState().setRoomFunction("bedroom-2", "entry");
    expect(useDesignStore.getState().layout.rooms.find((room) => room.id === "bedroom-2")).toMatchObject({
      label: "Entry",
      functionCode: "entry",
      functionStatus: "confirmed",
    });

    useDesignStore.getState().setRoomFunction("bedroom-2", "other");
    expect(useDesignStore.getState().layout.rooms.find((room) => room.id === "bedroom-2")?.functionStatus).toBe("inferred");

    useDesignStore.getState().setRoomFunction("bedroom-2", "other", "Music Room");
    expect(useDesignStore.getState().layout.rooms.find((room) => room.id === "bedroom-2")).toMatchObject({
      label: "Music Room",
      functionCode: "other",
      functionStatus: "confirmed",
    });
  });

  test("toggleLifestyleTag adds then removes a tag", () => {
    useDesignStore.getState().toggleLifestyleTag("Pets");
    expect(useDesignStore.getState().layout.lifestyleTags).toContain("Pets");

    useDesignStore.getState().toggleLifestyleTag("Pets");
    expect(useDesignStore.getState().layout.lifestyleTags).not.toContain("Pets");
  });

  test("stores free-form special considerations", () => {
    useDesignStore.getState().setSpecialConsiderations("Keep the existing sofa.");
    expect(useDesignStore.getState().layout.specialConsiderations).toBe("Keep the existing sofa.");
  });

  test("excludes a mistaken room from planning and can restore it", () => {
    const room = useDesignStore.getState().layout.rooms[0]!;

    useDesignStore.getState().excludeLayoutRoom(room.id);
    expect(useDesignStore.getState().layout.rooms.some((candidate) => candidate.id === room.id)).toBe(false);
    expect(useDesignStore.getState().layout.excludedRooms.find((candidate) => candidate.id === room.id)).toMatchObject({
      planningStatus: "excluded",
      exclusionReason: "user_excluded",
      excludedBy: "user",
    });

    useDesignStore.getState().restoreExcludedLayoutRoom(room.id);
    expect(useDesignStore.getState().layout.rooms.some((candidate) => candidate.id === room.id)).toBe(true);
    expect(useDesignStore.getState().layout.excludedRooms.some((candidate) => candidate.id === room.id)).toBe(false);
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

  test("normalizes the adjustable sketch weight to safe five-point steps", () => {
    useDesignStore.getState().setFurnitureSketchWeight(63);
    expect(useDesignStore.getState().furniture.sketchWeight).toBe(65);

    useDesignStore.getState().setFurnitureSketchWeight(100);
    expect(useDesignStore.getState().furniture.sketchWeight).toBe(95);
  });
});
