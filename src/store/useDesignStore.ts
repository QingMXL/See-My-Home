import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SAMPLE_DETECTED_ROOMS, type DetectedRoom, type StyleRoomType } from "../data/rooms";
import { STYLE_TEMPLATES } from "../data/styleTemplates";

export type GenerationPhase = "idle" | "generating" | "done" | "error";

export interface SavedDesign {
  id: string;
  project: string;
  title: string;
  kind: "Layout" | "Style" | "Furniture";
  detail: string;
  savedAt: number;
}

interface LayoutFlowState {
  fileName: string | null;
  /** Object URL of the user's upload; null means the bundled sample plan. */
  fileUrl: string | null;
  rooms: DetectedRoom[];
  lifestyleTags: string[];
  phase: GenerationPhase;
  stepIndex: number;
}

interface StyleFlowState {
  photoUrl: string | null;
  photoName: string | null;
  roomType: StyleRoomType;
  templateId: string;
  phase: GenerationPhase;
  stepIndex: number;
  refinements: string[];
}

interface FurnitureFlowState {
  prompt: string;
  material: string;
  size: string;
  legs: string;
  handles: string;
  shelves: string;
  phase: GenerationPhase;
  stepIndex: number;
  confirmed: boolean;
}

interface DesignStore {
  layout: LayoutFlowState;
  style: StyleFlowState;
  furniture: FurnitureFlowState;
  saved: SavedDesign[];

  setLayoutFile: (name: string | null, url: string | null) => void;
  renameRoom: (roomId: string, label: string) => void;
  toggleLifestyleTag: (tag: string) => void;
  setLayoutPhase: (phase: GenerationPhase, stepIndex?: number) => void;
  resetLayout: () => void;

  setStylePhoto: (name: string | null, url: string | null) => void;
  setStyleRoomType: (roomType: StyleRoomType) => void;
  setStyleTemplate: (templateId: string) => void;
  setStylePhase: (phase: GenerationPhase, stepIndex?: number) => void;
  addRefinement: (request: string) => void;

  setFurniturePrompt: (prompt: string) => void;
  setFurnitureOption: (key: "material" | "size" | "legs" | "handles" | "shelves", value: string) => void;
  setFurniturePhase: (phase: GenerationPhase, stepIndex?: number) => void;
  confirmFurniture: () => void;

  saveDesign: (design: Omit<SavedDesign, "id" | "savedAt">) => void;
  deleteDesign: (id: string) => void;
}

const initialLayout: LayoutFlowState = {
  fileName: null,
  fileUrl: null,
  rooms: SAMPLE_DETECTED_ROOMS,
  lifestyleTags: [],
  phase: "idle",
  stepIndex: 0,
};

const initialStyle: StyleFlowState = {
  photoUrl: null,
  photoName: null,
  roomType: "Living Room",
  templateId: STYLE_TEMPLATES[2].id,
  phase: "idle",
  stepIndex: 0,
  refinements: [],
};

const initialFurniture: FurnitureFlowState = {
  prompt: "A 96-inch walnut sideboard with a light stone top and an open shelf in the center.",
  material: "Walnut",
  size: '96" W × 20" D × 30" H',
  legs: "Metal Base",
  handles: "Push-to-Open",
  shelves: "Open Shelf in Center",
  phase: "idle",
  stepIndex: 0,
  confirmed: false,
};

let nextId = 1;
const makeId = () => `design-${nextId++}-${Date.now().toString(36)}`;

export const useDesignStore = create<DesignStore>()(
  persist(
    (set) => ({
  layout: initialLayout,
  style: initialStyle,
  furniture: initialFurniture,
  saved: [],

  setLayoutFile: (name, url) =>
    set((s) => ({ layout: { ...s.layout, fileName: name, fileUrl: url, phase: "idle" } })),
  renameRoom: (roomId, label) =>
    set((s) => ({
      layout: {
        ...s.layout,
        rooms: s.layout.rooms.map((r) => (r.id === roomId ? { ...r, label } : r)),
      },
    })),
  toggleLifestyleTag: (tag) =>
    set((s) => ({
      layout: {
        ...s.layout,
        lifestyleTags: s.layout.lifestyleTags.includes(tag)
          ? s.layout.lifestyleTags.filter((t) => t !== tag)
          : [...s.layout.lifestyleTags, tag],
      },
    })),
  setLayoutPhase: (phase, stepIndex) =>
    set((s) => ({ layout: { ...s.layout, phase, stepIndex: stepIndex ?? s.layout.stepIndex } })),
  resetLayout: () => set(() => ({ layout: initialLayout })),

  setStylePhoto: (name, url) =>
    set((s) => ({ style: { ...s.style, photoName: name, photoUrl: url, phase: "idle" } })),
  setStyleRoomType: (roomType) => set((s) => ({ style: { ...s.style, roomType } })),
  setStyleTemplate: (templateId) => set((s) => ({ style: { ...s.style, templateId } })),
  setStylePhase: (phase, stepIndex) =>
    set((s) => ({ style: { ...s.style, phase, stepIndex: stepIndex ?? s.style.stepIndex } })),
  addRefinement: (request) =>
    set((s) => ({ style: { ...s.style, refinements: [...s.style.refinements, request] } })),

  setFurniturePrompt: (prompt) => set((s) => ({ furniture: { ...s.furniture, prompt } })),
  setFurnitureOption: (key, value) =>
    set((s) => ({ furniture: { ...s.furniture, [key]: value, confirmed: false } })),
  setFurniturePhase: (phase, stepIndex) =>
    set((s) => ({ furniture: { ...s.furniture, phase, stepIndex: stepIndex ?? s.furniture.stepIndex } })),
  confirmFurniture: () => set((s) => ({ furniture: { ...s.furniture, confirmed: true } })),

  saveDesign: (design) =>
    set((s) => ({ saved: [{ ...design, id: makeId(), savedAt: Date.now() }, ...s.saved] })),
  deleteDesign: (id) => set((s) => ({ saved: s.saved.filter((d) => d.id !== id) })),
    }),
    {
      name: "see-my-home",
      // Only saved designs survive a reload; in-flight flow state stays in memory
      // (uploaded object URLs are invalid across sessions anyway).
      partialize: (s) => ({ saved: s.saved }),
    },
  ),
);
