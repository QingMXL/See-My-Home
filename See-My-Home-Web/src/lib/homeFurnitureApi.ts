import { upload } from "@vercel/blob/client";

export type FurnitureSourceKind = "sketch" | "inspiration";
export type FurnitureTableType =
  | "dining_table"
  | "coffee_table"
  | "console_table"
  | "side_table"
  | "desk"
  | "bedside_table"
  | "nesting_tables"
  | "bar_table"
  | "other_table";
export type FurnitureTopShape = "rectangular" | "round" | "oval" | "square" | "freeform";
export type FurnitureControlKey =
  | "dimensions_mm"
  | "primary_material"
  | "secondary_material"
  | "top_shape"
  | "edge_profile"
  | "base_style"
  | "finish"
  | "storage"
  | "component_notes";

export interface FurnitureDimensions {
  width: number;
  depth: number;
  height: number;
}

export interface UploadedFurnitureAsset {
  project_id: string;
  asset_id: string;
  source_kind: FurnitureSourceKind;
  file_name: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  size_bytes: number;
  sha256?: string;
  storage: "application_backend" | "vercel_blob";
  image_processing_status: "uploaded";
  source_url?: string;
}

export interface FurnitureDesignSpec {
  dimensions_mm: FurnitureDimensions;
  top: {
    shape: FurnitureTopShape;
    edge_profile: string;
    thickness_mm: number;
  };
  base: {
    style: string;
    support_count: number;
    inset_mm?: number;
  };
  materials: { part: string; material: string; finish: string }[];
  components: {
    id: string;
    name: string;
    role: "top" | "support" | "apron" | "stretcher" | "shelf" | "drawer" | "hardware" | "other";
    quantity: number;
    dimensions_mm?: Partial<FurnitureDimensions>;
  }[];
  drawing_notes: string[];
}

export interface FurnitureAgentResponse {
  contract_version: "home-furniture-v1";
  request_id: string;
  status: "completed" | "needs_confirmation" | "failed";
  table_type: FurnitureTableType;
  artifact_id?: string;
  design_summary: string;
  design_spec: FurnitureDesignSpec;
  questions: string[];
  warnings: string[];
  qa: {
    sketch_geometry_preserved: boolean;
    inspiration_language_applied: boolean;
    dimensions_consistent: boolean;
    function_plausible: boolean;
    publishable: boolean;
  };
}

export interface FurnitureGenerateInput {
  project_id: string;
  sketch_asset_id?: string;
  inspiration_asset_id?: string;
  locale: "en-US" | "zh-CN";
  table_type: FurnitureTableType;
  description: string;
  locked_controls: FurnitureControlKey[];
  dimensions_mm: FurnitureDimensions;
  primary_material: string;
  secondary_material: string;
  top_shape: FurnitureTopShape;
  edge_profile: string;
  base_style: string;
  finish: string;
  storage: string;
  component_notes?: string;
  source_priority?: { sketch: number; inspiration: number };
}

interface FurnitureGenerationPending {
  status: "processing";
  job_token: string;
  poll_after_ms: number;
  progress?: FurnitureGenerationProgress;
}

export type FurnitureGenerationProgress = "analyzing" | "interpreting" | "rendering" | "publishing";

export interface FurnitureGenerationResult {
  session_id: string;
  request_id: string;
  project_id: string;
  table_type: FurnitureTableType;
  source_priority: { sketch: number; inspiration: number };
  response: FurnitureAgentResponse;
  generated_image: {
    asset_id: string;
    url: string;
    mime_type: "image/png" | "image/jpeg" | "image/webp";
    size_bytes: number;
    provider_model: string;
  };
  request_context?: FurnitureGenerateInput;
}

export interface FurnitureOrthographicResult {
  session_id: string;
  request_id: string;
  project_id: string;
  response: FurnitureAgentResponse;
  orthographic_image: {
    asset_id: string;
    url: string;
    mime_type: "image/png" | "image/jpeg" | "image/webp";
    size_bytes: number;
    provider_model: string;
  };
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
        ? "The Home Furniture Agent returned an invalid server response."
        : `Home Furniture Agent request failed (${response.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  if (!response.ok) throw new Error(data.error ?? `Home Furniture Agent request failed (${response.status})`);
  return data;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number, message: string) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  catch (error) {
    if (controller.signal.aborted) throw new Error(message);
    throw error;
  } finally { window.clearTimeout(timer); }
}

export async function uploadFurnitureImage(
  file: File,
  sourceKind: FurnitureSourceKind,
  locale: "en-US" | "zh-CN",
  existingProjectId?: string,
): Promise<UploadedFurnitureAsset> {
  const projectId = existingProjectId || `furniture_${crypto.randomUUID()}`;
  if (!import.meta.env.DEV) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || sourceKind;
    const blob = await upload(`uploads/furniture/${projectId}/${sourceKind}/${safeName}`, file, {
      access: "private",
      handleUploadUrl: "/api/home-furniture/upload",
      clientPayload: JSON.stringify({ project_id: projectId, source_kind: sourceKind }),
      contentType: file.type || "application/octet-stream",
      multipart: file.size > 4 * 1024 * 1024,
    });
    return {
      project_id: projectId,
      asset_id: blob.url,
      source_url: blob.url,
      source_kind: sourceKind,
      file_name: file.name,
      mime_type: file.type as UploadedFurnitureAsset["mime_type"],
      size_bytes: file.size,
      storage: "vercel_blob",
      image_processing_status: "uploaded",
    };
  }

  const response = await fetchWithTimeout("/api/home-furniture/upload", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-Upload-File-Name": encodeURIComponent(file.name),
      "X-Upload-Source-Kind": sourceKind,
      "X-Upload-Project-Id": projectId,
    },
    body: file,
  }, 60_000, locale === "zh-CN" ? "家具参考图上传超时，请重试。" : "Furniture image upload timed out. Please try again.");
  return readResponse<UploadedFurnitureAsset>(response);
}

export async function deleteFurnitureImage(asset: UploadedFurnitureAsset): Promise<void> {
  const response = await fetchWithTimeout("/api/home-furniture/upload", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: asset.project_id, asset_id: asset.asset_id }),
  }, 30_000, "The furniture image could not be removed. Please try again.");
  await readResponse<{ deleted: true }>(response);
}

export async function generateFurniture(
  input: FurnitureGenerateInput,
  onProgress?: (progress: FurnitureGenerationProgress) => void,
): Promise<FurnitureGenerationResult> {
  return runFurnitureGeneration(
    "/api/home-furniture/events/agent.generate",
    input,
    input.locale === "zh-CN" ? "Home Furniture Agent 处理超时，请重试。" : "The Home Furniture Agent timed out. Please try again.",
    onProgress,
  );
}

export async function refineFurniture(
  baseInput: FurnitureGenerateInput,
  locale: "en-US" | "zh-CN",
  controls: Partial<FurnitureGenerateInput>,
  description: string,
  onProgress?: (progress: FurnitureGenerationProgress) => void,
): Promise<FurnitureGenerationResult> {
  return runFurnitureGeneration(
    "/api/home-furniture/events/agent.refine",
    { base_input: baseInput, locale, controls, description },
    locale === "zh-CN" ? "Home Furniture Agent 调整超时，请重试。" : "The Home Furniture Agent refinement timed out. Please try again.",
    onProgress,
  );
}

export async function generateFurnitureOrthographic(input: {
  project_id: string;
  locale: "en-US" | "zh-CN";
  render_asset_id: string;
  render_image_url: string;
  design_response: FurnitureAgentResponse;
}): Promise<FurnitureOrthographicResult> {
  return runFurnitureGeneration<FurnitureOrthographicResult>(
    "/api/home-furniture/events/agent.orthographic",
    input,
    input.locale === "zh-CN" ? "概念三视图生成超时，请重试。" : "The concept views timed out. Please try again.",
  );
}

async function runFurnitureGeneration<TResult extends object = FurnitureGenerationResult>(
  endpoint: string,
  input: object,
  timeoutMessage: string,
  onProgress?: (progress: FurnitureGenerationProgress) => void,
): Promise<TResult> {
  const deadline = Date.now() + 900_000;
  let jobToken: string | undefined;
  while (Date.now() < deadline) {
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, ...(jobToken ? { job_token: jobToken } : {}) }),
    }, import.meta.env.DEV ? 900_000 : 60_000, timeoutMessage);
    const result = await readResponse<TResult | FurnitureGenerationPending>(response);
    if (result && "status" in result && result.status === "processing") {
      if (typeof result.job_token !== "string" || !result.job_token) {
        throw new Error("The Home Furniture Agent returned an invalid processing ticket.");
      }
      jobToken = result.job_token;
      onProgress?.(result.progress ?? "analyzing");
      const delayMs = Math.min(10_000, Math.max(500, result.poll_after_ms || 3_000));
      await new Promise((resolveDelay) => window.setTimeout(resolveDelay, delayMs));
      continue;
    }
    return result as TResult;
  }
  throw new Error(timeoutMessage);
}
