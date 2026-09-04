export const SUPPORTED_LOCALES = ['en-US', 'zh-CN'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const HOME_OPERATIONS = ['intake', 'correct', 'diagnose', 'visualize'] as const;
export type HomeOperation = (typeof HOME_OPERATIONS)[number];

export interface EvidenceFact {
  id: string;
  subject_ref: string;
  predicate: string;
  value: unknown;
  epistemic_state: 'observed' | 'inferred' | 'user_confirmed';
  confidence: number;
}

export interface EvidenceGeometry {
  kind: 'point' | 'polyline' | 'polygon';
  entity_ref: string;
  coordinate_space: 'image_normalized_0_1';
  coordinates: number[][];
  confidence: number;
}

export interface EvidenceSource {
  source_id: string;
  kind:
    | 'floor_plan'
    | 'room_photo'
    | 'measurement'
    | 'user_statement'
    | 'vision_model_output';
  label: string;
  asset_ref?: string;
  provider_model?: string;
  extracted_text?: string[];
  facts: EvidenceFact[];
  geometry?: EvidenceGeometry[];
}

export interface HomeTurnRequest {
  schema_version: '1.0';
  request_id: string;
  home_id: string;
  operation: HomeOperation;
  locale: SupportedLocale;
  user_message: string;
  evidence: EvidenceSource[];
  visualization_request?: {
    mode: 'colorized_plan' | 'visual_home_model' | 'conceptual_perspective';
    selected_entity_refs: string[];
    style_direction?: string;
  };
}

export interface HomeModel {
  schema_version: '2.0';
  home_id: string;
  model_revision: number;
  status: 'draft' | 'needs_confirmation' | 'confirmed_enough' | 'scale_confirmed';
  locale: SupportedLocale;
  [key: string]: unknown;
}

export interface AgentQuestion {
  id: string;
  question: string;
  impact: 'low' | 'medium' | 'high';
  related_refs: string[];
}

export interface HomeAgentResponse {
  schema_version: '1.0';
  request_id: string;
  home_id: string;
  operation: HomeOperation;
  status: 'completed' | 'needs_confirmation' | 'insufficient_input' | 'failed';
  locale: SupportedLocale;
  message: string;
  home_model: HomeModel | null;
  diagnosis: Record<string, unknown> | null;
  visualization_brief: Record<string, unknown> | null;
  questions: AgentQuestion[];
  warnings: string[];
}

export interface ConversationHandle {
  agentId: string;
  sessionId: string;
  cursor?: string;
}

export interface StructuredTurnResult {
  response: HomeAgentResponse;
  rawText: string;
  cursor?: string;
  runOutcome: 'succeeded' | 'failed' | 'aborted';
  runId?: string;
  toolCalls: AgentToolTrace[];
  artifacts: AgentArtifact[];
}

export type UiAgentEventType = 'project.create' | 'room_map.confirm' | 'agent.generate' | 'agent.refine';

export interface UiAgentEvent {
  type: UiAgentEventType;
  project_id: string;
  mode?: 'layout' | 'style' | 'furniture';
}

export interface AgentToolTrace {
  phase: string;
  toolCallId?: string;
  toolName?: string;
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

export interface RoomMapSpace {
  id: string;
  label: string;
  suggested_function: string;
  suggested_function_code: RoomFunctionCode;
  polygon: number[][];
  centroid: [number, number];
  label_anchor: [number, number];
  confidence: number;
  boundary_confidence: number;
  planning_status: 'included' | 'excluded' | 'uncertain';
  exclusion_reason: 'lightwell' | 'double_height' | 'void' | 'shaft' | 'outside_envelope' | 'other' | null;
}

export const ROOM_FUNCTION_CODES = [
  'living_room', 'family_room', 'dining_room', 'kitchen', 'primary_bedroom',
  'guest_bedroom', 'kids_room', 'nursery', 'home_office', 'walk_in_closet',
  'bathroom', 'powder_room', 'laundry_room', 'pantry', 'mudroom', 'entry', 'den',
  'balcony', 'storage', 'garage', 'home_theater', 'fitness_room', 'game_room', 'other', 'unknown',
] as const;
export type RoomFunctionCode = (typeof ROOM_FUNCTION_CODES)[number];

export interface RoomMapBoundary {
  id: string;
  kind: 'exterior' | 'wall' | 'partition' | 'unknown';
  path: number[][];
  separates_space_ids: string[];
  confidence: number;
}

export interface RoomMapOpening {
  id: string;
  kind: 'door' | 'window' | 'open_passage' | 'unknown';
  position: [number, number];
  connects_space_ids: string[];
  confidence: number;
}

export interface RoomMapResponse {
  schema_version: '1.0';
  request_id: string;
  home_id: string;
  status: 'completed' | 'needs_confirmation' | 'insufficient_input' | 'failed';
  locale: SupportedLocale;
  summary: string;
  coordinate_space: 'image_normalized_0_1';
  spaces: RoomMapSpace[];
  boundaries: RoomMapBoundary[];
  openings: RoomMapOpening[];
  questions: AgentQuestion[];
  warnings: string[];
}

export interface RoomMapTurnResult {
  response: RoomMapResponse;
  rawText: string;
  cursor?: string;
  runOutcome: 'succeeded' | 'failed' | 'aborted';
  runId?: string;
  toolCalls: AgentToolTrace[];
}
