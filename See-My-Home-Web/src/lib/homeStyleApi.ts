export type StyleRoomCode =
  | "living_room"
  | "primary_bedroom"
  | "kitchen"
  | "dining_room"
  | "bathroom"
  | "home_office"
  | "other";

export interface UploadedStyleAsset {
  project_id: string;
  asset_id: string;
  file_name: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  size_bytes: number;
  sha256: string;
  storage: "application_backend";
  image_processing_status: "uploaded";
}

export interface StyleAgentResponse {
  contract_version: "home-style-v1";
  request_id: string;
  status: "completed" | "failed";
  style_id: "modern_east";
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
  style_id: "modern_east";
  style_profile: "quiet-poise" | "urban-elegance" | "sculptural-luxe" | "warm-residence";
  knowledge_version: string;
  response: StyleAgentResponse;
  generated_image: {
    asset_id: string;
    url: string;
    mime_type: "image/png" | "image/jpeg" | "image/webp";
    size_bytes: number;
    provider_model: string;
  };
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
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

export async function uploadStylePhoto(file: File, locale: "en-US" | "zh-CN"): Promise<UploadedStyleAsset> {
  const response = await fetchWithTimeout("/api/home-style/upload", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-Upload-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  }, 60_000, locale === "zh-CN" ? "房间照片上传超时，请重试。" : "The room photo upload timed out. Please try again.");
  return readResponse<UploadedStyleAsset>(response);
}

export async function generateStyle(input: {
  project_id: string;
  asset_id: string;
  locale: "en-US" | "zh-CN";
  room_type: StyleRoomCode;
  style_id: "modern_east";
  style_profile?: StyleGenerationResult["style_profile"];
  renovation_scope?: "soft_furnishing_only" | "finishes_and_furnishing" | "limited_hard_finish";
  preferences?: string[];
}): Promise<StyleGenerationResult> {
  const response = await fetchWithTimeout("/api/home-style/events/agent.generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }, 720_000, input.locale === "zh-CN" ? "Home Style Agent 处理超时，请重试。" : "The Home Style Agent timed out. Please try again.");
  return readResponse<StyleGenerationResult>(response);
}

export async function refineStyle(projectId: string, locale: "en-US" | "zh-CN", refinement: string): Promise<StyleGenerationResult> {
  const response = await fetchWithTimeout("/api/home-style/events/agent.refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: projectId, locale, refinement }),
  }, 720_000, locale === "zh-CN" ? "Home Style Agent 调整超时，请重试。" : "The Home Style Agent refinement timed out. Please try again.");
  return readResponse<StyleGenerationResult>(response);
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
