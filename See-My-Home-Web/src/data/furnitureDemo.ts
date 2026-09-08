import type {
  FurnitureAgentResponse,
  FurnitureGenerateInput,
  FurnitureGenerationResult,
  FurnitureOrthographicResult,
  UploadedFurnitureAsset,
} from "../lib/homeFurnitureApi";

export const DEMO_FURNITURE_PROJECT_ID = "demo_home_furniture";
export const DEMO_FURNITURE_SKETCH_ASSET_ID = "demo-furniture-sketch";
export const DEMO_FURNITURE_FILE_NAME = "Furniture Example";
export const DEMO_FURNITURE_SKETCH_URL = "/demo/home-furniture/source-sketch.png";
export const DEMO_FURNITURE_RENDER_URL = "/demo/home-furniture/concept-render.png";
export const DEMO_FURNITURE_ORTHOGRAPHIC_URL = "/demo/home-furniture/orthographic-views.png";

export const DEMO_FURNITURE_DESCRIPTION = {
  en: "A 1800 × 900 × 750 mm dining table based closely on the sketch. Use a softly asymmetric freeform top in black-stained ash, two sculpted curved slab supports, and one transparent glass lower shelf.",
  zh: "一张 1800 × 900 × 750 mm 的餐桌，造型紧密遵循草图。采用柔和不对称的自由曲面桌面、黑色染色白蜡木、两片弧形板式支撑，并保留一层透明玻璃下层板。",
} as const;

export const DEMO_FURNITURE_SKETCH_ASSET: UploadedFurnitureAsset = {
  project_id: DEMO_FURNITURE_PROJECT_ID,
  asset_id: DEMO_FURNITURE_SKETCH_ASSET_ID,
  source_kind: "sketch",
  file_name: DEMO_FURNITURE_FILE_NAME,
  mime_type: "image/png",
  size_bytes: 0,
  sha256: "bundled-demo",
  storage: "application_backend",
  image_processing_status: "uploaded",
  source_url: DEMO_FURNITURE_SKETCH_URL,
};

export function isDemoFurnitureAsset(asset: UploadedFurnitureAsset | null | undefined): boolean {
  return asset?.asset_id === DEMO_FURNITURE_SKETCH_ASSET_ID;
}

function createDemoResponse(locale: FurnitureGenerateInput["locale"]): FurnitureAgentResponse {
  return {
    contract_version: "home-furniture-v1",
    request_id: "demo-furniture-request",
    status: "completed",
    table_type: "dining_table",
    artifact_id: "demo-furniture-artifact",
    design_summary: locale === "zh-CN"
      ? "一张由手绘草图发展而来的自由曲面餐桌：黑色白蜡木桌面由两片内收弧形板腿支撑，下方悬置透明玻璃层板，保留草图轻盈而有雕塑感的轮廓。"
      : "A freeform dining table developed from the sketch, with a black ash top supported by two inward-curving slab legs and a suspended clear-glass shelf that preserves the light, sculptural silhouette.",
    design_spec: {
      dimensions_mm: { width: 1800, depth: 900, height: 750 },
      top: { shape: "freeform", edge_profile: "Soft Radius", thickness_mm: 40 },
      base: { style: "Twin Pedestal", support_count: 2, inset_mm: 140 },
      materials: [
        { part: "Table top", material: "Ash", finish: "Matte Black Stain" },
        { part: "Table legs", material: "Ash", finish: "Matte Black Stain" },
        { part: "Shelf", material: "Tempered glass", finish: "Clear" },
      ],
      components: [
        { id: "demo-top", name: "Freeform ash top", role: "top", quantity: 1, dimensions_mm: { width: 1800, depth: 900, height: 40 } },
        { id: "demo-supports", name: "Sculpted slab leg", role: "support", quantity: 2 },
        { id: "demo-shelf", name: "Freeform glass shelf", role: "shelf", quantity: 1 },
      ],
      drawing_notes: [
        "Overall dimensions: 1800 × 900 × 750 mm.",
        "The top view is a true orthographic projection without perspective.",
        "Concept only; verify glass support, joinery, tolerances, and structural performance before fabrication.",
      ],
    },
    questions: [],
    warnings: [],
    qa: {
      sketch_geometry_preserved: true,
      inspiration_language_applied: false,
      dimensions_consistent: true,
      function_plausible: true,
      publishable: true,
    },
  };
}

export function createDemoFurnitureResult(input: FurnitureGenerateInput): FurnitureGenerationResult {
  const response = createDemoResponse(input.locale);
  return {
    session_id: "demo-furniture-session",
    request_id: response.request_id,
    project_id: DEMO_FURNITURE_PROJECT_ID,
    table_type: "dining_table",
    source_priority: { sketch: 1, inspiration: 0 },
    response,
    generated_image: {
      asset_id: "demo-furniture-render",
      url: DEMO_FURNITURE_RENDER_URL,
      mime_type: "image/png",
      size_bytes: 0,
      provider_model: "Pre-rendered demo",
    },
    request_context: {
      ...input,
      project_id: DEMO_FURNITURE_PROJECT_ID,
      sketch_asset_id: DEMO_FURNITURE_SKETCH_ASSET_ID,
      inspiration_asset_id: undefined,
      source_priority: { sketch: 1, inspiration: 0 },
    },
  };
}

export function createDemoFurnitureOrthographicResult(
  result: FurnitureGenerationResult,
): FurnitureOrthographicResult {
  return {
    session_id: "demo-furniture-orthographic-session",
    request_id: "demo-furniture-orthographic-request",
    project_id: DEMO_FURNITURE_PROJECT_ID,
    response: result.response,
    orthographic_image: {
      asset_id: "demo-furniture-orthographic",
      url: DEMO_FURNITURE_ORTHOGRAPHIC_URL,
      mime_type: "image/png",
      size_bytes: 0,
      provider_model: "Pre-rendered demo",
    },
  };
}
