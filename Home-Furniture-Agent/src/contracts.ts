export type SupportedLocale = 'en-US' | 'zh-CN';

export type FurnitureItemType =
  | 'dining_table'
  | 'coffee_table'
  | 'console_table'
  | 'side_table'
  | 'desk'
  | 'bedside_table'
  | 'nesting_tables'
  | 'bar_table'
  | 'other_table'
  | 'dining_chair'
  | 'armchair'
  | 'lounge_chair'
  | 'office_chair'
  | 'stool'
  | 'bench'
  | 'other_chair'
  | 'sofa'
  | 'loveseat'
  | 'sectional_sofa'
  | 'chaise_lounge'
  | 'sofa_bed'
  | 'ottoman'
  | 'other_sofa'
  | 'table_lamp'
  | 'floor_lamp'
  | 'desk_lamp'
  | 'pendant_light'
  | 'chandelier'
  | 'wall_sconce'
  | 'other_lamp';

export const FURNITURE_ITEM_TYPES: FurnitureItemType[] = [
  'dining_table', 'coffee_table', 'console_table', 'side_table', 'desk', 'bedside_table', 'nesting_tables', 'bar_table', 'other_table',
  'dining_chair', 'armchair', 'lounge_chair', 'office_chair', 'stool', 'bench', 'other_chair',
  'sofa', 'loveseat', 'sectional_sofa', 'chaise_lounge', 'sofa_bed', 'ottoman', 'other_sofa',
  'table_lamp', 'floor_lamp', 'desk_lamp', 'pendant_light', 'chandelier', 'wall_sconce', 'other_lamp',
];

export type FurnitureCategory = 'table' | 'chair' | 'sofa' | 'lamp';

export function furnitureCategory(type: FurnitureItemType): FurnitureCategory {
  if (type.endsWith('_chair') || type === 'stool' || type === 'bench') return 'chair';
  if (type.includes('sofa') || type === 'loveseat' || type === 'chaise_lounge' || type === 'ottoman') return 'sofa';
  if (type.includes('lamp') || type === 'pendant_light' || type === 'chandelier' || type === 'wall_sconce') return 'lamp';
  return 'table';
}

/** @deprecated The wire key remains table_type for v1 compatibility; use FurnitureItemType. */
export type TableType = FurnitureItemType;

export type TopShape = 'rectangular' | 'round' | 'oval' | 'square' | 'freeform';
export type FurnitureOutputMode = 'concept_render' | 'orthographic_sheet';
export type OrthographicView = 'front' | 'side' | 'top';

export type FurnitureControlKey =
  | 'dimensions_mm'
  | 'primary_material'
  | 'secondary_material'
  | 'top_shape'
  | 'edge_profile'
  | 'base_style'
  | 'finish'
  | 'storage'
  | 'component_notes';

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
  output_mode: FurnitureOutputMode;
  request_id: string;
  project_id: string;
  locale: SupportedLocale;
  /** Historical v1 wire key; represents any supported furniture item type. */
  table_type: FurnitureItemType;
  sketch_asset_ref?: string;
  inspiration_asset_ref?: string;
  /** Required only when output_mode is orthographic_sheet. */
  render_asset_ref?: string;
  /** The confirmed specification must be echoed unchanged by an orthographic turn. */
  confirmed_design_spec?: FurnitureDesignSpec;
  /** Required only when output_mode is orthographic_sheet. Each turn renders one view. */
  orthographic_view?: OrthographicView;
  description?: string;
  source_priority: {
    sketch: number;
    inspiration: number;
  };
  /** Only these controls were explicitly selected by the user and are hard constraints. */
  locked_controls: FurnitureControlKey[];
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
  role:
    | 'top'
    | 'support'
    | 'apron'
    | 'stretcher'
    | 'shelf'
    | 'drawer'
    | 'hardware'
    | 'frame'
    | 'seat'
    | 'back'
    | 'arm'
    | 'cushion'
    | 'upholstery'
    | 'shade'
    | 'diffuser'
    | 'light_source'
    | 'mount'
    | 'other';
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
  /** Historical v1 wire key; represents any supported furniture item type. */
  table_type: FurnitureItemType;
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
    /** Required to be true before an orthographic geometry layer may be consumed. */
    orthographic_projection_correct?: boolean;
    /** Required to be true when only surfaces actually visible from the requested direction are drawn. */
    orthographic_visible_surfaces_correct?: boolean;
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
