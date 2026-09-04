import { create } from "zustand";
import { persist } from "zustand/middleware";
import { roomFunctionFrom, roomFunctionLabel, SAMPLE_DETECTED_ROOMS, type DetectedRoom, type RoomFunctionCode, type StyleRoomType } from "../data/rooms";
import { STYLE_TEMPLATES } from "../data/styleTemplates";
import type { LayoutGenerationResult, LayoutImageAnalysisResult, UploadedLayoutAsset } from "../lib/homeLayoutApi";
import type { StyleGenerationResult, UploadedStyleAsset } from "../lib/homeStyleApi";

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
  excludedRooms: DetectedRoom[];
  lifestyleTags: string[];
  specialConsiderations: string;
  phase: GenerationPhase;
  stepIndex: number;
  agentRun: LayoutGenerationResult | null;
  agentError: string | null;
  uploadedAsset: UploadedLayoutAsset | null;
  imageAnalysis: LayoutImageAnalysisResult | null;
}

interface StyleFlowState {
  photoUrl: string | null;
  photoName: string | null;
  roomType: StyleRoomType;
  templateId: string;
  phase: GenerationPhase;
  stepIndex: number;
  refinements: string[];
  uploadedAsset: UploadedStyleAsset | null;
  agentRun: StyleGenerationResult | null;
  renderHistory: StyleGenerationResult[];
  agentError: string | null;
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
  setLayoutRooms: (rooms: DetectedRoom[]) => void;
  setLayoutExcludedRooms: (rooms: DetectedRoom[]) => void;
  excludeLayoutRoom: (roomId: string) => void;
  restoreExcludedLayoutRoom: (roomId: string) => void;
  renameRoom: (roomId: string, label: string) => void;
  setRoomFunction: (roomId: string, functionCode: RoomFunctionCode, customLabel?: string) => void;
  toggleLifestyleTag: (tag: string) => void;
  setSpecialConsiderations: (value: string) => void;
  setLayoutPhase: (phase: GenerationPhase, stepIndex?: number) => void;
  setLayoutAgentRun: (run: LayoutGenerationResult) => void;
  setLayoutAgentError: (message: string | null) => void;
  setLayoutUploadedAsset: (asset: UploadedLayoutAsset | null) => void;
  setLayoutImageAnalysis: (analysis: LayoutImageAnalysisResult | null) => void;
  resetLayout: () => void;

  setStylePhoto: (name: string | null, url: string | null) => void;
  setStyleRoomType: (roomType: StyleRoomType) => void;
  setStyleTemplate: (templateId: string) => void;
  setStylePhase: (phase: GenerationPhase, stepIndex?: number) => void;
  addRefinement: (request: string) => void;
  setStyleUploadedAsset: (asset: UploadedStyleAsset | null) => void;
  setStyleAgentRun: (run: StyleGenerationResult, refinement?: string) => void;
  setStyleAgentError: (message: string | null) => void;

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
  excludedRooms: [],
  lifestyleTags: [],
  specialConsiderations: "",
  phase: "idle",
  stepIndex: 0,
  agentRun: null,
  agentError: null,
  uploadedAsset: null,
  imageAnalysis: null,
};

const initialStyle: StyleFlowState = {
  photoUrl: null,
  photoName: null,
  roomType: "Living Room",
  templateId: STYLE_TEMPLATES[0]?.id ?? "modern-east",
  phase: "idle",
  stepIndex: 0,
  refinements: [],
  uploadedAsset: null,
  agentRun: null,
  renderHistory: [],
  agentError: null,
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
    set(() => ({
      layout: { ...initialLayout, fileName: name, fileUrl: url },
    })),
  setLayoutRooms: (rooms) =>
    set((s) => ({
      layout: { ...s.layout, rooms },
    })),
  setLayoutExcludedRooms: (excludedRooms) =>
    set((s) => ({
      layout: { ...s.layout, excludedRooms },
    })),
  excludeLayoutRoom: (roomId) =>
    set((s) => {
      const room = s.layout.rooms.find((candidate) => candidate.id === roomId);
      if (!room) return s;
      const excludedRoom: DetectedRoom = {
        ...room,
        planningStatus: "excluded",
        exclusionReason: "user_excluded",
        excludedBy: "user",
      };
      return {
        layout: {
          ...s.layout,
          rooms: s.layout.rooms.filter((candidate) => candidate.id !== roomId),
          excludedRooms: [
            ...(s.layout.excludedRooms ?? []).filter((candidate) => candidate.id !== roomId),
            excludedRoom,
          ],
        },
      };
    }),
  restoreExcludedLayoutRoom: (roomId) =>
    set((s) => {
      const room = (s.layout.excludedRooms ?? []).find((candidate) => candidate.id === roomId);
      if (!room) return s;
      const restoredRoom: DetectedRoom = {
        ...room,
        planningStatus: "included",
        exclusionReason: null,
        excludedBy: undefined,
      };
      return {
        layout: {
          ...s.layout,
          rooms: [...s.layout.rooms, restoredRoom],
          excludedRooms: (s.layout.excludedRooms ?? []).filter((candidate) => candidate.id !== roomId),
        },
      };
    }),
  renameRoom: (roomId, label) =>
    set((s) => ({
      layout: {
        ...s.layout,
        rooms: s.layout.rooms.map((r) => {
          if (r.id !== roomId) return r;
          const functionCode = roomFunctionFrom(label);
          const canonicalLabel = roomFunctionLabel(functionCode);
          return { ...r, label: canonicalLabel, currentUse: canonicalLabel, functionCode, functionStatus: "confirmed" };
        }),
      },
    })),
  setRoomFunction: (roomId, functionCode, customLabel) =>
    set((s) => ({
      layout: {
        ...s.layout,
        rooms: s.layout.rooms.map((room) => {
          if (room.id !== roomId) return room;
          const label = functionCode === "other"
            ? customLabel?.trim() || "Other"
            : roomFunctionLabel(functionCode);
          return {
            ...room,
            label,
            currentUse: label,
            functionCode,
            functionStatus: functionCode === "other" && !customLabel?.trim() ? "inferred" : "confirmed",
          };
        }),
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
  setSpecialConsiderations: (specialConsiderations) =>
    set((s) => ({
      layout: { ...s.layout, specialConsiderations },
    })),
  setLayoutPhase: (phase, stepIndex) =>
    set((s) => ({ layout: { ...s.layout, phase, stepIndex: stepIndex ?? s.layout.stepIndex } })),
  setLayoutAgentRun: (agentRun) =>
    set((s) => ({ layout: { ...s.layout, agentRun, agentError: null } })),
  setLayoutAgentError: (agentError) =>
    set((s) => ({ layout: { ...s.layout, agentError } })),
  setLayoutUploadedAsset: (uploadedAsset) =>
    set((s) => ({ layout: { ...s.layout, uploadedAsset } })),
  setLayoutImageAnalysis: (imageAnalysis) =>
    set((s) => ({ layout: { ...s.layout, imageAnalysis } })),
  resetLayout: () => set(() => ({ layout: initialLayout })),

  setStylePhoto: (name, url) =>
    set((s) => ({
      style: {
        ...initialStyle,
        roomType: s.style.roomType,
        templateId: s.style.templateId,
        photoName: name,
        photoUrl: url,
      },
    })),
  setStyleRoomType: (roomType) => set((s) => ({ style: { ...s.style, roomType } })),
  setStyleTemplate: (templateId) => set((s) => ({ style: { ...s.style, templateId } })),
  setStylePhase: (phase, stepIndex) =>
    set((s) => ({ style: { ...s.style, phase, stepIndex: stepIndex ?? s.style.stepIndex } })),
  addRefinement: (request) =>
    set((s) => ({ style: { ...s.style, refinements: [...s.style.refinements, request] } })),
  setStyleUploadedAsset: (uploadedAsset) =>
    set((s) => ({ style: { ...s.style, uploadedAsset } })),
  setStyleAgentRun: (agentRun, refinement) =>
    set((s) => ({
      style: {
        ...s.style,
        agentRun,
        renderHistory: [...(s.style.renderHistory ?? []), agentRun],
        refinements: refinement ? [...(s.style.refinements ?? []), refinement] : (s.style.refinements ?? []),
        agentError: null,
      },
    })),
  setStyleAgentError: (agentError) =>
    set((s) => ({ style: { ...s.style, agentError } })),

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
      // Keep completed Agent results addressable across a page refresh. Blob URLs,
      // in-flight upload adapters, and transient Agent errors are session-only.
      partialize: (s) => ({
        saved: s.saved,
        layout: {
          ...initialLayout,
          fileName: s.layout.fileName,
          rooms: s.layout.rooms,
          excludedRooms: s.layout.excludedRooms ?? [],
          lifestyleTags: s.layout.lifestyleTags,
          specialConsiderations: s.layout.specialConsiderations,
          phase: s.layout.phase === "done" ? "done" : "idle",
          agentRun: s.layout.agentRun,
          agentError: null,
        },
        style: {
          ...initialStyle,
          photoName: s.style.photoName,
          roomType: s.style.roomType,
          templateId: s.style.templateId,
          phase: s.style.phase === "done" ? "done" : "idle",
          agentRun: s.style.agentRun,
          renderHistory: s.style.renderHistory,
          refinements: s.style.refinements,
          agentError: null,
        },
      }),
    },
  ),
);
