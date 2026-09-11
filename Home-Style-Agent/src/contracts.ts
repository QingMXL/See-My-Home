export type SupportedLocale = 'en-US' | 'zh-CN';
export type StyleRoomType =
  | 'living_room'
  | 'primary_bedroom'
  | 'kitchen'
  | 'dining_room'
  | 'bathroom'
  | 'home_office'
  | 'other';
export type PresetStyleId = 'modern_east' | 'california_modern' | 'maximal_luxe';
export type StyleId = PresetStyleId | 'custom_reference';
export type StyleProfile =
  | 'quiet-poise'
  | 'urban-elegance'
  | 'sculptural-luxe'
  | 'warm-residence'
  | 'sunlit-casual'
  | 'ranch-modern'
  | 'coastal-modern'
  | 'desert-warm'
  | 'edited-glamour'
  | 'eighties-socialite'
  | 'regency-modern'
  | 'collector-color'
  | 'reference-led';

export const STYLE_PROFILES = {
  modern_east: ['quiet-poise', 'urban-elegance', 'sculptural-luxe', 'warm-residence'],
  california_modern: ['sunlit-casual', 'ranch-modern', 'coastal-modern', 'desert-warm'],
  maximal_luxe: ['edited-glamour', 'eighties-socialite', 'regency-modern', 'collector-color'],
  custom_reference: ['reference-led'],
} as const satisfies Record<StyleId, readonly StyleProfile[]>;

export const DEFAULT_STYLE_PROFILES = {
  modern_east: 'quiet-poise',
  california_modern: 'sunlit-casual',
  maximal_luxe: 'edited-glamour',
  custom_reference: 'reference-led',
} as const satisfies Record<StyleId, StyleProfile>;

export function isStyleId(value: unknown): value is StyleId {
  return typeof value === 'string' && value in STYLE_PROFILES;
}

export function isStyleProfile(styleId: StyleId, value: unknown): value is StyleProfile {
  return typeof value === 'string' && (STYLE_PROFILES[styleId] as readonly string[]).includes(value);
}
export type RenovationScope = 'soft_furnishing_only' | 'finishes_and_furnishing' | 'limited_hard_finish';

export interface SourceRaster {
  width_px: number;
  height_px: number;
  aspect_ratio: string;
  orientation: 'landscape' | 'portrait' | 'square';
  designer_size: string;
  designer_request_size: string;
  designer_request_aspect_ratio: string;
}

export interface StyleTurnRequest {
  contract_version: 'home-style-v1';
  request_id: string;
  home_id: string;
  source_asset_ref: string;
  source_raster: SourceRaster;
  style_reference_asset_ref?: string;
  room_type: StyleRoomType;
  style_id: StyleId;
  style_profile?: StyleProfile;
  renovation_scope: RenovationScope;
  user_preferences?: string[];
  known_immutable_elements?: string[];
}

export interface StyleQa {
  structure_preserved: boolean;
  camera_preserved: boolean;
  style_passed: boolean;
  publishable: boolean;
}

export interface StyleAgentResponse {
  contract_version: 'home-style-v1';
  request_id: string;
  status: 'completed' | 'failed';
  style_id: StyleId;
  knowledge_version: string;
  artifact_id?: string;
  style_summary?: string;
  warnings?: string[];
  qa: StyleQa;
}

export interface ConversationHandle {
  agentId: string;
  sessionId: string;
  cursor?: string;
}

export interface AgentToolTrace {
  phase: 'start' | 'end' | 'blocked';
  toolName?: string;
  toolCallId?: string;
  isError?: boolean;
  resultPreview?: string;
}

export interface AgentArtifact {
  artifactId: string;
  fileName: string | null;
  contentType: string | null;
  size: number | null;
  status: string | null;
  runId: string | null;
}

export interface StyleTurnResult {
  response: StyleAgentResponse;
  rawText: string;
  runOutcome: 'succeeded' | 'failed' | 'aborted';
  toolCalls: AgentToolTrace[];
  artifacts: AgentArtifact[];
  cursor?: string;
  runId?: string;
}
