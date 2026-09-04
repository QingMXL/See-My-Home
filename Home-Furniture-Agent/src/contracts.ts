export type SupportedLocale = 'en-US' | 'zh-CN';

export type TableType =
  | 'dining_table'
  | 'coffee_table'
  | 'console_table'
  | 'side_table'
  | 'desk'
  | 'bedside_table'
  | 'nesting_tables'
  | 'bar_table'
  | 'other_table';

export type TopShape = 'rectangular' | 'round' | 'oval' | 'square' | 'freeform';

export interface FurnitureDimensions {
  width: number;
  depth: number;
  height: number;
}

export interface FurnitureDesignControls {
  dimensions_mm: FurnitureDimensions;
  primary_material: string;
  secondary_material: string;
  top_shape: TopShape;
  edge_profile: string;
  base_style: string;
  finish: string;
  storage: string;
  component_notes?: string;
}

export interface FurnitureTurnRequest {
  contract_version: 'home-furniture-v1';
  request_id: string;
  project_id: string;
  locale: SupportedLocale;
  table_type: TableType;
  sketch_asset_ref?: string;
  inspiration_asset_ref?: string;
  description?: string;
  source_priority: {
    sketch: number;
    inspiration: number;
  };
  design_controls: FurnitureDesignControls;
}

export interface FurnitureMaterialSpec {
  part: string;
  material: string;
  finish: string;
}

export interface FurnitureComponentSpec {
  id: string;
  name: string;
  role: 'top' | 'support' | 'apron' | 'stretcher' | 'shelf' | 'drawer' | 'hardware' | 'other';
  quantity: number;
  dimensions_mm?: Partial<FurnitureDimensions>;
}

export interface FurnitureDesignSpec {
  dimensions_mm: FurnitureDimensions;
  top: {
    shape: TopShape;
    edge_profile: string;
    thickness_mm: number;
  };
  base: {
    style: string;
    support_count: number;
    inset_mm?: number;
  };
  materials: FurnitureMaterialSpec[];
  components: FurnitureComponentSpec[];
  drawing_notes: string[];
}

export interface FurnitureAgentResponse {
  contract_version: 'home-furniture-v1';
  request_id: string;
  status: 'completed' | 'needs_confirmation' | 'failed';
  table_type: TableType;
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

export interface FurnitureTurnResult {
  response: FurnitureAgentResponse;
  rawText: string;
  runOutcome: 'succeeded' | 'failed' | 'aborted';
  toolCalls: AgentToolTrace[];
  artifacts: AgentArtifact[];
  cursor?: string;
  runId?: string;
}
