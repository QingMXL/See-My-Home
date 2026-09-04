export interface AgentQuestion {
  id: string;
  question: string;
  impact: "low" | "medium" | "high";
  related_refs: string[];
}

export interface HomeModelSpace {
  id: string;
  label: string;
  architectural_type: string;
  actual_uses: string[];
}

export interface LocalizedCopy {
  "en-US": string;
  "zh-CN": string;
}

export interface LayoutAssessmentItem {
  id: string;
  category: "circulation" | "functional_gap" | "adjacency" | "privacy" | "daylight" | "storage" | "activity_conflict" | "underused_space";
  impact: "low" | "medium" | "high";
  title: LocalizedCopy;
  statement: LocalizedCopy;
  affects_refs: string[];
}

export interface HomeModelFinding {
  id: string;
  statement: string;
  impact?: "low" | "medium" | "high";
  confidence?: number;
}

export interface HomeModelOpportunity {
  id: string;
  statement: string;
  intervention_level?: string;
  reversibility?: string;
}

export interface BrowserHomeModel {
  schema_version: "2.0";
  home_id: string;
  model_revision: number;
  status: string;
  locale: "en-US" | "zh-CN";
  spaces: HomeModelSpace[];
  problems: HomeModelFinding[];
  opportunities: HomeModelOpportunity[];
  [key: string]: unknown;
}

export interface LayoutAgentResponse {
  schema_version: "1.0";
  request_id: string;
  home_id: string;
  operation: "intake" | "correct" | "diagnose" | "visualize";
  status: "completed" | "needs_confirmation" | "insufficient_input" | "failed";
  locale: "en-US" | "zh-CN";
  message: string;
  home_model: BrowserHomeModel | null;
  diagnosis: {
    based_on_model_revision: number;
    finding_refs: string[];
    opportunity_refs: string[];
    summary: string;
    assessment_items?: LayoutAssessmentItem[];
  } | null;
  visualization_brief: Record<string, unknown> | null;
  questions: AgentQuestion[];
  warnings: string[];
}

export interface LayoutGenerationResult {
  session_id: string;
  image_processing_status: "sample_geometry" | "sample_labels_only" | "analyzed";
  intake: LayoutAgentResponse;
  diagnosis: LayoutAgentResponse;
  visualization: LayoutAgentResponse | null;
  generated_image: {
    asset_id: string;
    url: string;
    mime_type: "image/png" | "image/jpeg" | "image/webp";
    size_bytes: number;
    provider_model: string;
    note: string | null;
  } | null;
  render_plan?: LayoutRenderPlan;
  request_context?: GenerateLayoutInput;
}

interface LayoutGenerationPending {
  status: "processing";
  job_token: string;
  poll_after_ms: number;
}

export type LayoutPlacementKind =
  | "sofa" | "tv" | "coffee_table" | "dining_table" | "bed" | "wardrobe"
  | "desk" | "bookshelf" | "counter" | "sink" | "cooktop" | "refrigerator"
  | "toilet" | "vanity" | "shower" | "bathtub" | "washer" | "storage"
  | "outdoor_seating";

export interface LayoutPlacement {
  id: string;
  space_ref: string;
  kind: LayoutPlacementKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation_deg: number;
}

export interface LayoutRenderPlan {
  schema_version: "1.0";
  geometry_revision: number;
  placement_revision: number;
  render_strategy: "source_locked_svg_overlay";
  placements: LayoutPlacement[];
  qa: {
    status: "passed" | "needs_review";
    issues: string[];
  };
}

export interface GenerateLayoutInput {
  home_id: string;
  locale: "en-US" | "zh-CN";
  user_message: string;
  rooms: {
    id: string;
    label: string;
    current_use: string;
    function_code: string;
    function_confirmed: boolean;
    target_use?: string | null;
    boundary_confirmed: boolean;
    source_geometry?: {
      kind: "polygon";
      coordinates: number[][];
    };
  }[];
  excluded_regions: {
    id: string;
    label: string;
    reason: "lightwell" | "double_height" | "void" | "shaft" | "outside_envelope" | "user_excluded" | "other";
    source_geometry: {
      kind: "polygon";
      coordinates: number[][];
    };
  }[];
  lifestyle_tags: string[];
  special_considerations?: string;
  source_kind: "sample_plan" | "uploaded_analyzed";
  file_name?: string;
  asset_id?: string;
  analysis?: Pick<LayoutImageAnalysisResult, "boundaries" | "openings" | "questions" | "warnings">;
}

export interface UploadedLayoutAsset {
  project_id: string;
  asset_id: string;
  file_name: string;
  mime_type: "image/jpeg" | "image/png" | "application/pdf";
  size_bytes: number;
  sha256: string;
  storage: "application_backend" | "vercel_blob";
  image_processing_status: "uploaded";
  source_url?: string;
}

export interface AnalyzedLayoutRoom {
  id: string;
  label: string;
  suggested_function: string;
  suggested_function_code: string;
  confidence: number;
  polygon: number[][];
  centroid: [number, number];
  label_anchor: [number, number];
  boundary_confidence: number;
  planning_status: "included" | "excluded" | "uncertain";
  exclusion_reason: "lightwell" | "double_height" | "void" | "shaft" | "outside_envelope" | "other" | null;
}

export interface AnalyzedLayoutBoundary {
  id: string;
  kind: "exterior" | "wall" | "partition" | "unknown";
  path: number[][];
  separates_space_ids: string[];
  confidence: number;
}

export interface AnalyzedLayoutOpening {
  id: string;
  kind: "door" | "window" | "open_passage" | "unknown";
  position: [number, number];
  connects_space_ids: string[];
  confidence: number;
}

export interface LayoutImageAnalysisResult {
  project_id: string;
  session_id: string;
  event: "project.create";
  asset_id: string;
  image_processing_status: "analyzed_by_agent";
  provider_model: string;
  summary: string;
  rooms: AnalyzedLayoutRoom[];
  excluded_regions: AnalyzedLayoutRoom[];
  boundaries: AnalyzedLayoutBoundary[];
  openings: AnalyzedLayoutOpening[];
  questions: AgentQuestion[];
  extracted_text: string[];
  warnings: string[];
}

async function readResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let data: T & { error?: string };
  try {
    data = JSON.parse(raw) as T & { error?: string };
  } catch {
    const detail = raw.trim().replace(/\s+/g, " ").slice(0, 240);
    throw new Error(
      response.ok
        ? "The Home Layout Agent returned an invalid server response."
        : `Layout Agent request failed (${response.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  if (!response.ok) throw new Error(data.error ?? `Layout Agent request failed (${response.status})`);
  return data;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(timeoutMessage);
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function generateLayout(input: GenerateLayoutInput): Promise<LayoutGenerationResult> {
  return runLayoutGeneration(
    "/api/home-layout/events/agent.generate",
    input,
    input.locale === "zh-CN"
      ? "Home Layout Agent 处理超时，请重试。"
      : "The Home Layout Agent timed out. Please try again.",
  );
}

export async function refineLayout(
  baseInput: GenerateLayoutInput,
  locale: "en-US" | "zh-CN",
  userMessage: string,
): Promise<LayoutGenerationResult> {
  return runLayoutGeneration(
    "/api/home-layout/events/agent.refine",
    { base_input: baseInput, locale, user_message: userMessage },
    locale === "zh-CN"
      ? "Home Layout Agent 重新生成超时，请重试。"
      : "The Home Layout Agent refinement timed out. Please try again.",
  );
}

async function runLayoutGeneration(
  endpoint: string,
  input: object,
  timeoutMessage: string,
): Promise<LayoutGenerationResult> {
  const deadline = Date.now() + 720_000;
  let jobToken: string | undefined;
  while (Date.now() < deadline) {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, ...(jobToken ? { job_token: jobToken } : {}) }),
      },
      60_000,
      timeoutMessage,
    );
    const result = await readResponse<LayoutGenerationResult | LayoutGenerationPending>(response);
    if (result && "status" in result && result.status === "processing") {
      if (typeof result.job_token !== "string" || !result.job_token) {
        throw new Error("The Home Layout Agent returned an invalid processing ticket.");
      }
      jobToken = result.job_token;
      const delayMs = Math.min(10_000, Math.max(500, result.poll_after_ms || 3_000));
      await new Promise((resolveDelay) => window.setTimeout(resolveDelay, delayMs));
      continue;
    }
    return result as LayoutGenerationResult;
  }
  throw new Error(timeoutMessage);
}

export async function uploadLayoutFile(
  file: File,
  locale: "en-US" | "zh-CN",
): Promise<UploadedLayoutAsset> {
  if (!import.meta.env.DEV) {
    const projectId = `home_${crypto.randomUUID()}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "floor-plan";
    const blob = await upload(`uploads/layout/${projectId}/${safeName}`, file, {
      access: "private",
      handleUploadUrl: "/api/home-layout/upload",
      clientPayload: JSON.stringify({ project_id: projectId }),
      contentType: file.type || "application/octet-stream",
      multipart: file.size > 4 * 1024 * 1024,
    });
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    const sha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return {
      project_id: projectId,
      asset_id: blob.url,
      source_url: blob.url,
      file_name: file.name,
      mime_type: file.type as UploadedLayoutAsset["mime_type"],
      size_bytes: file.size,
      sha256,
      storage: "vercel_blob",
      image_processing_status: "uploaded",
    };
  }
  const response = await fetchWithTimeout(
    "/api/home-layout/upload",
    {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-Upload-File-Name": encodeURIComponent(file.name),
      },
      body: file,
    },
    60_000,
    locale === "zh-CN" ? "图片上传超时，请重试。" : "The image upload timed out. Please try again.",
  );
  return readResponse<UploadedLayoutAsset>(response);
}

export async function createLayoutProject(
  projectId: string,
  assetId: string,
  locale: "en-US" | "zh-CN",
  projectBrief?: string,
): Promise<LayoutImageAnalysisResult> {
  const response = await fetchWithTimeout(
    "/api/home-layout/events/project.create",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, asset_id: assetId, locale, project_brief: projectBrief }),
    },
    600_000,
    locale === "zh-CN"
      ? "图片分析超时，请重试。"
      : "Floor-plan analysis timed out. Please try again.",
  );
  return readResponse<LayoutImageAnalysisResult>(response);
}

export async function resetLayoutAgent(homeId: string): Promise<void> {
  const response = await fetchWithTimeout(
    "/api/home-layout/reset",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ home_id: homeId }),
    },
    15_000,
    "The Home Layout Agent reset timed out.",
  );
  await readResponse<{ reset: true }>(response);
}
import { upload } from "@vercel/blob/client";
