import { upload } from "@vercel/blob/client";

export type StyleRoomCode =
  | "living_room"
  | "primary_bedroom"
  | "kitchen"
  | "dining_room"
  | "bathroom"
  | "home_office"
  | "other";

export type StyleId = "modern_east" | "california_modern" | "maximal_luxe" | "custom_reference";
export type StyleProfile =
  | "quiet-poise" | "urban-elegance" | "sculptural-luxe" | "warm-residence"
  | "sunlit-casual" | "ranch-modern" | "coastal-modern" | "desert-warm"
  | "edited-glamour" | "eighties-socialite" | "regency-modern" | "collector-color"
  | "reference-led";

export interface UploadedStyleAsset {
  project_id: string;
  asset_id: string;
  file_name: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  size_bytes: number;
  sha256: string;
  storage: "application_backend" | "vercel_blob";
  image_processing_status: "uploaded";
  source_url?: string;
}

export interface StyleAgentResponse {
  contract_version: "home-style-v1";
  request_id: string;
  status: "completed" | "failed";
  style_id: StyleId;
  knowledge_version: string;
  artifact_id?: string;
  style_summary?: string;
  warnings?: string[];
  qa: {
    structure_preserved: boolean;
    camera_preserved: boolean;
    style_passed: boolean;
    publishable: boolean;
  };
}

export interface StyleGenerationResult {
  session_id: string;
  request_id: string;
  project_id: string;
  style_id: StyleId;
  style_profile: StyleProfile;
  knowledge_version: string;
  response: StyleAgentResponse;
  generated_image: {
    asset_id: string;
    url: string;
    mime_type: "image/png" | "image/jpeg" | "image/webp";
    size_bytes: number;
    provider_model: string;
  };
  request_context?: StyleGenerateInput;
}

export interface StyleGenerateInput {
  project_id: string;
  asset_id: string;
  reference_asset_id?: string;
  locale: "en-US" | "zh-CN";
  room_type: StyleRoomCode;
  style_id: StyleId;
  style_profile?: StyleGenerationResult["style_profile"];
  renovation_scope?: "soft_furnishing_only" | "finishes_and_furnishing" | "limited_hard_finish";
  preferences?: string[];
}

interface StyleGenerationPending {
  status: "processing";
  job_token: string;
  poll_after_ms: number;
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
        ? "The Home Style Agent returned an invalid server response."
        : `Home Style Agent request failed (${response.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  if (!response.ok) throw new Error(data.error ?? `Home Style Agent request failed (${response.status})`);
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

export async function uploadStylePhoto(
  file: File,
  locale: "en-US" | "zh-CN",
  existingProjectId?: string,
  sourceKind: "room" | "reference" = "room",
): Promise<UploadedStyleAsset> {
  if (!import.meta.env.DEV) {
    const projectId = existingProjectId ?? `style_${crypto.randomUUID()}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || `${sourceKind}-photo`;
    const blob = await upload(`uploads/style/${projectId}/${sourceKind}/${safeName}`, file, {
      access: "private",
      handleUploadUrl: "/api/home-style/upload",
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
      file_name: file.name,
      mime_type: file.type as UploadedStyleAsset["mime_type"],
      size_bytes: file.size,
      sha256,
      storage: "vercel_blob",
      image_processing_status: "uploaded",
    };
  }
  const response = await fetchWithTimeout("/api/home-style/upload", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-Upload-File-Name": encodeURIComponent(file.name),
      ...(existingProjectId ? { "X-Upload-Project-Id": existingProjectId } : {}),
      "X-Upload-Source-Kind": sourceKind,
    },
    body: file,
  }, 60_000, locale === "zh-CN"
    ? `${sourceKind === "reference" ? "风格参考图" : "房间照片"}上传超时，请重试。`
    : `The ${sourceKind === "reference" ? "style reference" : "room photo"} upload timed out. Please try again.`);
  return readResponse<UploadedStyleAsset>(response);
}

export async function generateStyle(input: StyleGenerateInput): Promise<StyleGenerationResult> {
  return runStyleGeneration(
    "/api/home-style/events/agent.generate",
    input,
    input.locale === "zh-CN" ? "Home Style Agent 处理超时，请重试。" : "The Home Style Agent timed out. Please try again.",
  );
}

export async function refineStyle(baseInput: StyleGenerateInput, locale: "en-US" | "zh-CN", refinement: string): Promise<StyleGenerationResult> {
  return runStyleGeneration(
    "/api/home-style/events/agent.refine",
    { base_input: baseInput, locale, refinement },
    locale === "zh-CN" ? "Home Style Agent 调整超时，请重试。" : "The Home Style Agent refinement timed out. Please try again.",
  );
}

async function runStyleGeneration(
  endpoint: string,
  input: object,
  timeoutMessage: string,
): Promise<StyleGenerationResult> {
  const deadline = Date.now() + 900_000;
  let jobToken: string | undefined;
  while (Date.now() < deadline) {
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, ...(jobToken ? { job_token: jobToken } : {}) }),
    }, import.meta.env.DEV ? 900_000 : 60_000, timeoutMessage);
    const result = await readResponse<StyleGenerationResult | StyleGenerationPending>(response);
    if (result && "status" in result && result.status === "processing") {
      if (typeof result.job_token !== "string" || !result.job_token) {
        throw new Error("The Home Style Agent returned an invalid processing ticket.");
      }
      jobToken = result.job_token;
      const delayMs = Math.min(10_000, Math.max(500, result.poll_after_ms || 3_000));
      await new Promise((resolveDelay) => window.setTimeout(resolveDelay, delayMs));
      continue;
    }
    return result as StyleGenerationResult;
  }
  throw new Error(timeoutMessage);
}

export function roomTypeToCode(room: string): StyleRoomCode {
  const values: Record<string, StyleRoomCode> = {
    "Living Room": "living_room",
    "Primary Bedroom": "primary_bedroom",
    Kitchen: "kitchen",
    "Dining Room": "dining_room",
    Bathroom: "bathroom",
    "Home Office": "home_office",
  };
  return values[room] ?? "other";
}
