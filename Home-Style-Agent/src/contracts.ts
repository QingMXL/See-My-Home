export type SupportedLocale = 'en-US' | 'zh-CN';
export type StyleRoomType =
  | 'living_room'
  | 'primary_bedroom'
  | 'kitchen'
  | 'dining_room'
  | 'bathroom'
  | 'home_office'
  | 'other';
export type ModernEastProfile = 'quiet-poise' | 'urban-elegance' | 'sculptural-luxe' | 'warm-residence';
export type RenovationScope = 'soft_furnishing_only' | 'finishes_and_furnishing' | 'limited_hard_finish';

export interface StyleTurnRequest {
  contract_version: 'home-style-v1';
  request_id: string;
  home_id: string;
  source_asset_ref: string;
  room_type: StyleRoomType;
  style_id: 'modern_east';
  style_profile?: ModernEastProfile;
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
  style_id: 'modern_east';
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
