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
  sha256: string;
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
  dimensions_mm: FurnitureDimensions;
  primary_material: string;
  secondary_material: string;
  top_shape: FurnitureTopShape;
  edge_profile: string;
  base_style: string;
  finish: string;
  storage: string;
  component_notes?: string;
}

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

async function readResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let data: T & { error?: string };
  try {
    data = JSON.parse(raw) as T & { error?: string };
  } catch {
    throw new Error(`Home Furniture Agent returned an invalid response (${response.status})`);
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
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    const sha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return {
      project_id: projectId,
      asset_id: blob.url,
      source_url: blob.url,
      source_kind: sourceKind,
      file_name: file.name,
      mime_type: file.type as UploadedFurnitureAsset["mime_type"],
      size_bytes: file.size,
      sha256,
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

export async function generateFurniture(input: FurnitureGenerateInput): Promise<FurnitureGenerationResult> {
  const response = await fetchWithTimeout("/api/home-furniture/events/agent.generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }, 720_000, input.locale === "zh-CN" ? "Home Furniture Agent 处理超时，请重试。" : "The Home Furniture Agent timed out. Please try again.");
  return readResponse<FurnitureGenerationResult>(response);
}

export async function refineFurniture(
  baseInput: FurnitureGenerateInput,
  locale: "en-US" | "zh-CN",
  controls: Partial<FurnitureGenerateInput>,
  description: string,
): Promise<FurnitureGenerationResult> {
  const response = await fetchWithTimeout("/api/home-furniture/events/agent.refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base_input: baseInput, locale, controls, description }),
  }, 720_000, locale === "zh-CN" ? "Home Furniture Agent 调整超时，请重试。" : "The Home Furniture Agent refinement timed out. Please try again.");
  return readResponse<FurnitureGenerationResult>(response);
}
