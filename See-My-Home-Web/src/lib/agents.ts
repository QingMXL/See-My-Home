/**
 * Agent API layer.
 *
 * Each Template talks to an independent Agent through this module (PRD §2).
 * The MVP ships with simulated agents so every flow is fully clickable;
 * swap the internals for real HTTP calls without touching the UI.
 *
 * All user-facing text is returned as i18n message keys so results render
 * in the user's chosen language.
 */
import type { MsgKey } from "../i18n/translations";

export interface GenerationStep {
  /** i18n message key for the step label. */
  labelKey: MsgKey;
  /** Relative weight used to pace the simulated progress. */
  weight: number;
}

export const LAYOUT_GENERATION_STEPS: GenerationStep[] = [
  { labelKey: "gen.layout.planning", weight: 1.4 },
  { labelKey: "gen.layout.creating", weight: 1.4 },
];

/** A short but complete-looking generation sequence for the bundled demo. */
export const DEMO_LAYOUT_GENERATION_STEPS: GenerationStep[] = [
  { labelKey: "gen.layout.reading", weight: 0.4 },
  { labelKey: "gen.layout.confirming", weight: 0.4 },
  { labelKey: "gen.layout.planning", weight: 0.6 },
  { labelKey: "gen.layout.materials", weight: 0.6 },
  { labelKey: "gen.layout.creating", weight: 0.8 },
];

export const DEMO_LAYOUT_UPLOAD_DELAY_MS = 350;
export const DEMO_LAYOUT_DETECTION_DELAY_MS = 650;

export const STYLE_GENERATION_STEPS: GenerationStep[] = [
  { labelKey: "gen.style.reading", weight: 1 },
  { labelKey: "gen.style.direction", weight: 1 },
  { labelKey: "gen.style.composing", weight: 1.3 },
  { labelKey: "gen.style.rendering", weight: 1.7 },
];

export const FURNITURE_GENERATION_STEPS: GenerationStep[] = [
  { labelKey: "gen.furn.reading", weight: 1 },
  { labelKey: "gen.furn.interpreting", weight: 1.2 },
  { labelKey: "gen.furn.rendering", weight: 1.6 },
];

const STEP_BASE_MS = 900;

export function generationDurationMs(steps: GenerationStep[]) {
  return steps.reduce((total, step) => total + STEP_BASE_MS * step.weight, 0);
}

/**
 * Runs a simulated generation, invoking `onStep` as each stage begins.
 * Resolves when every stage has completed.
 */
export function runGeneration(
  steps: GenerationStep[],
  onStep: (stepIndex: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let index = 0;

    const advance = () => {
      if (signal?.aborted) {
        reject(new DOMException("Generation cancelled", "AbortError"));
        return;
      }
      if (index >= steps.length) {
        resolve();
        return;
      }
      onStep(index);
      const duration = STEP_BASE_MS * steps[index].weight;
      index += 1;
      window.setTimeout(advance, duration);
    };

    advance();
  });
}

export interface LayoutNote {
  /** Canonical English room label (translated for display via tTag). */
  room: string;
  /** i18n message key for the note body. */
  noteKey: MsgKey;
}

export interface LayoutResult {
  notes: LayoutNote[];
  keyDecisions: string[];
}

/** Notes tailored from the confirmed rooms + lifestyle tags. */
export function buildLayoutResult(roomLabels: string[], lifestyleTags: string[]): LayoutResult {
  const has = (label: string) => roomLabels.includes(label);
  const tagged = (tag: string) => lifestyleTags.includes(tag);

  const notes: LayoutNote[] = [];
  if (has("Primary Bedroom")) {
    notes.push({ room: "Primary Bedroom", noteKey: tagged("King Bed") ? "note.primaryKing" : "note.primaryQueen" });
  }
  if (has("Kids' Room") || has("Bedroom 2") || has("Guest Bedroom")) {
    notes.push({
      room: has("Kids' Room") ? "Kids' Room" : has("Guest Bedroom") ? "Guest Bedroom" : "Bedroom 2",
      noteKey: tagged("Work From Home") ? "note.flexWfh" : "note.flexDefault",
    });
  }
  if (has("Kitchen")) {
    notes.push({ room: "Kitchen", noteKey: tagged("Kitchen Island") ? "note.kitchenIsland" : "note.kitchenGalley" });
  }
  if (has("Living Room")) {
    notes.push({ room: "Living Room", noteKey: tagged("Entertaining") ? "note.livingEntertain" : "note.livingDefault" });
  }
  if (has("Bathroom")) {
    notes.push({ room: "Bathroom", noteKey: tagged("Walk-in Shower") ? "note.bathWalkin" : "note.bathTub" });
  }

  const keyDecisions = lifestyleTags.slice(0, 4);
  return { notes, keyDecisions };
}

/** Canned agent reply key for the style refinement loop. */
export function buildRefinementReplyKey(request: string): MsgKey {
  const lowered = request.toLowerCase();
  if (lowered.includes("warm") || lowered.includes("温暖") || lowered.includes("配色")) return "reply.warmer";
  if (lowered.includes("floor") || lowered.includes("地板")) return "reply.floor";
  if (lowered.includes("sofa") || lowered.includes("沙发")) return "reply.sofa";
  if (lowered.includes("simpl") || lowered.includes("简化") || lowered.includes("简单")) return "reply.simpler";
  return "reply.generic";
}
