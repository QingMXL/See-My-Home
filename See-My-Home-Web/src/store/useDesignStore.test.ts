import { beforeEach, describe, expect, test } from "vitest";
import {
  createDemoFurnitureResult,
  DEMO_FURNITURE_SKETCH_ASSET,
} from "../data/furnitureDemo";
import type { FurnitureGenerateInput } from "../lib/homeFurnitureApi";
import { useDesignStore } from "./useDesignStore";

const demoInput: FurnitureGenerateInput = {
  project_id: "demo_home_furniture",
  sketch_asset_id: DEMO_FURNITURE_SKETCH_ASSET.asset_id,
  locale: "en-US",
  table_type: "dining_table",
  description: "Demo furniture",
  locked_controls: [],
  dimensions_mm: { width: 1800, depth: 900, height: 750 },
  primary_material: "Ash",
  secondary_material: "Tempered Glass",
  top_shape: "freeform",
  edge_profile: "Soft Radius",
  base_style: "Twin Pedestal",
  finish: "Matte Black Stain",
  storage: "Open Shelf",
};

describe("useDesignStore", () => {
  beforeEach(() => {
    useDesignStore.getState().resetLayout();
    useDesignStore.getState().resetFurniture();
    useDesignStore.getState().setLayoutRooms([{
      id: "test-room",
      label: "Guest Bedroom",
      x: 100,
      y: 100,
      functionCode: "guest_bedroom",
      functionStatus: "confirmed",
      boundaryStatus: "confirmed",
    }]);
    // Clear saved designs between tests.
    for (const d of useDesignStore.getState().saved) {
      useDesignStore.getState().deleteDesign(d.id);
    }
  });

  test("renameRoom replaces a room label immutably", () => {
    // Arrange
    const before = useDesignStore.getState().layout.rooms;

    // Act
    useDesignStore.getState().renameRoom("test-room", "Home Office");

    // Assert
    const after = useDesignStore.getState().layout.rooms;
    expect(after.find((r) => r.id === "test-room")?.label).toBe("Home Office");
    expect(before.find((r) => r.id === "test-room")?.label).toBe("Guest Bedroom");
    expect(after).not.toBe(before);
  });

  test("setRoomFunction supports Entry and a confirmed custom Other label", () => {
    useDesignStore.getState().setRoomFunction("test-room", "entry");
    expect(useDesignStore.getState().layout.rooms.find((room) => room.id === "test-room")).toMatchObject({
      label: "Entry",
      functionCode: "entry",
      functionStatus: "confirmed",
    });

    useDesignStore.getState().setRoomFunction("test-room", "other");
    expect(useDesignStore.getState().layout.rooms.find((room) => room.id === "test-room")?.functionStatus).toBe("inferred");

    useDesignStore.getState().setRoomFunction("test-room", "other", "Music Room");
    expect(useDesignStore.getState().layout.rooms.find((room) => room.id === "test-room")).toMatchObject({
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
    useDesignStore.getState().unlockFurnitureControl("primary_material");
    useDesignStore.getState().confirmFurniture();
    expect(useDesignStore.getState().furniture.confirmed).toBe(true);

    useDesignStore.getState().setFurnitureOption("material", "White Oak");

    expect(useDesignStore.getState().furniture.material).toBe("White Oak");
    expect(useDesignStore.getState().furniture.lockedControls).toContain("primary_material");
    expect(useDesignStore.getState().furniture.confirmed).toBe(false);

    useDesignStore.getState().unlockFurnitureControl("primary_material");
    expect(useDesignStore.getState().furniture.lockedControls).not.toContain("primary_material");
  });

  test("normalizes the adjustable sketch weight to safe five-point steps", () => {
    useDesignStore.getState().setFurnitureSketchWeight(63);
    expect(useDesignStore.getState().furniture.sketchWeight).toBe(65);

    useDesignStore.getState().setFurnitureSketchWeight(100);
    expect(useDesignStore.getState().furniture.sketchWeight).toBe(95);
  });

  test("removing a furniture image clears its source and invalidates generated outputs", () => {
    useDesignStore.getState().setFurnitureSource("sketch", "desk.png", "blob:desk-preview");
    useDesignStore.getState().setFurnitureUploadedAsset("sketch", {
      project_id: "furniture_test",
      asset_id: "asset_test",
      source_kind: "sketch",
      file_name: "desk.png",
      mime_type: "image/png",
      size_bytes: 128,
      sha256: "0".repeat(64),
      storage: "application_backend",
      image_processing_status: "uploaded",
    });
    useDesignStore.getState().confirmFurniture();

    useDesignStore.getState().removeFurnitureSource("sketch");

    expect(useDesignStore.getState().furniture).toMatchObject({
      sketchName: null,
      sketchUrl: null,
      sketchAsset: null,
      agentRun: null,
      orthographicRun: null,
      phase: "idle",
      confirmed: false,
    });
  });

  test("replacing a demo source immediately removes its pre-rendered result", () => {
    useDesignStore.getState().setFurnitureSource("sketch", "Furniture Example", "/demo/home-furniture/source-sketch.png");
    useDesignStore.getState().setFurnitureUploadedAsset("sketch", DEMO_FURNITURE_SKETCH_ASSET);
    useDesignStore.getState().setFurnitureAgentRun(createDemoFurnitureResult(demoInput));

    useDesignStore.getState().setFurnitureSource("sketch", "my-sketch.png", "blob:my-sketch");

    expect(useDesignStore.getState().furniture).toMatchObject({
      sketchName: "my-sketch.png",
      sketchUrl: "blob:my-sketch",
      sketchAsset: null,
      agentRun: null,
      orthographicRun: null,
      phase: "idle",
    });
  });

  test("resetting furniture removes all demo-specific inputs and controls", () => {
    useDesignStore.getState().setFurnitureSource("sketch", "Furniture Example", "/demo/home-furniture/source-sketch.png");
    useDesignStore.getState().setFurnitureUploadedAsset("sketch", DEMO_FURNITURE_SKETCH_ASSET);
    useDesignStore.getState().setFurniturePrompt("Demo-only prompt");
    useDesignStore.getState().setFurnitureOption("material", "Ash");
    useDesignStore.getState().setFurnitureAgentRun(createDemoFurnitureResult(demoInput));

    useDesignStore.getState().resetFurniture();

    expect(useDesignStore.getState().furniture).toMatchObject({
      projectId: null,
      sketchName: null,
      sketchAsset: null,
      prompt: "",
      material: "Walnut",
      lockedControls: [],
      agentRun: null,
    });
  });

  test("editing furniture text clears a prior drawing confirmation", () => {
    useDesignStore.getState().confirmFurniture();
    useDesignStore.getState().setFurnitureRefinementPrompt("Make the legs slimmer.");

    expect(useDesignStore.getState().furniture.refinementPrompt).toBe("Make the legs slimmer.");
    expect(useDesignStore.getState().furniture.confirmed).toBe(false);

    useDesignStore.getState().confirmFurniture();
    useDesignStore.getState().setFurniturePrompt("A lighter oak desk.");
    expect(useDesignStore.getState().furniture.confirmed).toBe(false);
  });

  test("starting a new orthographic attempt invalidates the previous confirmation", () => {
    useDesignStore.getState().confirmFurniture();
    useDesignStore.getState().setFurnitureOrthographicRun(null);

    expect(useDesignStore.getState().furniture.orthographicRun).toBeNull();
    expect(useDesignStore.getState().furniture.confirmed).toBe(false);
  });

  test("migrates old persisted furniture sources without ghost upload names", async () => {
    const migrate = useDesignStore.persist.getOptions().migrate;
    expect(migrate).toBeTypeOf("function");
    const migrated = await migrate?.({
      furniture: {
        ...useDesignStore.getState().furniture,
        sketchName: "old-sketch.png",
        inspirationName: "old-reference.png",
      },
    }, 1) as ReturnType<typeof useDesignStore.getState>;

    expect(migrated.furniture).toMatchObject({
      sketchName: null,
      sketchUrl: null,
      sketchAsset: null,
      inspirationName: null,
      inspirationUrl: null,
      inspirationAsset: null,
      prompt: "",
      refinementPrompt: "",
    });
  });

  test("does not persist furniture prompt drafts across a page reload", () => {
    useDesignStore.getState().setFurniturePrompt("Do not keep this draft.");
    useDesignStore.getState().setFurnitureRefinementPrompt("Nor this refinement.");

    const partialize = useDesignStore.persist.getOptions().partialize;
    const persisted = partialize?.(useDesignStore.getState()) as ReturnType<typeof useDesignStore.getState>;

    expect(persisted.furniture.prompt).toBe("");
    expect(persisted.furniture.refinementPrompt).toBe("");
  });

  test("does not persist a bundled demo as a custom furniture result", () => {
    useDesignStore.getState().setFurnitureUploadedAsset("sketch", DEMO_FURNITURE_SKETCH_ASSET);
    useDesignStore.getState().setFurnitureAgentRun(createDemoFurnitureResult(demoInput));

    const partialize = useDesignStore.persist.getOptions().partialize;
    const persisted = partialize?.(useDesignStore.getState()) as ReturnType<typeof useDesignStore.getState>;

    expect(persisted.furniture).toMatchObject({
      projectId: null,
      confirmed: false,
      phase: "idle",
      agentRun: null,
      orthographicRun: null,
    });
  });

  test("migrates a previously persisted bundled demo out of the custom workflow", async () => {
    const migrate = useDesignStore.persist.getOptions().migrate;
    const demoResult = createDemoFurnitureResult(demoInput);
    const migrated = await migrate?.({
      furniture: {
        ...useDesignStore.getState().furniture,
        projectId: demoResult.project_id,
        phase: "done",
        confirmed: true,
        agentRun: demoResult,
      },
    }, 3) as ReturnType<typeof useDesignStore.getState>;

    expect(migrated.furniture).toMatchObject({
      projectId: null,
      phase: "idle",
      confirmed: false,
      agentRun: null,
      orthographicRun: null,
    });
  });
});
