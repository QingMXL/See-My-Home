import type { StyleTemplate } from "./styleTemplates";
import type { StyleGenerateInput, StyleGenerationResult, UploadedStyleAsset } from "../lib/homeStyleApi";

export const DEMO_STYLE_PROJECT_ID = "demo_home_style";
export const DEMO_STYLE_ASSET_ID = "demo-style-source-room";
export const DEMO_STYLE_FILE_NAME = "Style Example";
export const DEMO_STYLE_SOURCE_URL = "/demo/home-style/source-room.png";

export const DEMO_STYLE_ASSET: UploadedStyleAsset = {
  project_id: DEMO_STYLE_PROJECT_ID,
  asset_id: DEMO_STYLE_ASSET_ID,
  file_name: DEMO_STYLE_FILE_NAME,
  mime_type: "image/png",
  size_bytes: 0,
  sha256: "bundled-demo",
  storage: "application_backend",
  image_processing_status: "uploaded",
  source_url: DEMO_STYLE_SOURCE_URL,
};

export function isDemoStyleAsset(asset: UploadedStyleAsset | null | undefined): boolean {
  return asset?.asset_id === DEMO_STYLE_ASSET_ID;
}

export function createDemoStyleResult(template: StyleTemplate, input: StyleGenerateInput): StyleGenerationResult {
  const requestId = `demo-style-${template.id}`;
  return {
    session_id: "demo-style-session",
    request_id: requestId,
    project_id: DEMO_STYLE_PROJECT_ID,
    style_id: "modern_east",
    style_profile: template.styleProfile,
    knowledge_version: `pre-rendered-${template.id}`,
    response: {
      contract_version: "home-style-v1",
      request_id: requestId,
      status: "completed",
      style_id: "modern_east",
      knowledge_version: `pre-rendered-${template.id}`,
      artifact_id: `demo-style-${template.id}`,
      style_summary: template.story.direction,
      warnings: [],
      qa: { structure_preserved: true, camera_preserved: true, style_passed: true, publishable: true },
    },
    generated_image: {
      asset_id: `demo-style-result-${template.id}`,
      url: template.demoResultUrl,
      mime_type: "image/png",
      size_bytes: 0,
      provider_model: "Pre-rendered demo",
    },
    request_context: input,
  };
}
