import type { HomeAgentResponse, HomeModel, HomeTurnRequest, RoomMapResponse } from '../src/contracts.js';

export function validRoomMapResponse(): RoomMapResponse {
  return {
    schema_version: '1.0', request_id: 'req_demo_001', home_id: 'home_demo_001',
    status: 'needs_confirmation', locale: 'en-US',
    summary: 'Two spatial regions were found.', coordinate_space: 'image_normalized_0_1',
    spaces: [{
      id: 'space_living_001', label: 'Living Room', suggested_function: 'Living Room',
      suggested_function_code: 'living_room',
      planning_status: 'included', exclusion_reason: null,
      polygon: [[0.05, 0.05], [0.55, 0.05], [0.55, 0.8], [0.05, 0.8]],
      centroid: [0.3, 0.425], label_anchor: [0.3, 0.425], confidence: 0.92, boundary_confidence: 0.86,
    }],
    boundaries: [{
      id: 'boundary_wall_001', kind: 'wall', path: [[0.55, 0.05], [0.55, 0.8]],
      separates_space_ids: ['space_living_001'], confidence: 0.86,
    }],
    openings: [{
      id: 'opening_door_001', kind: 'door', position: [0.55, 0.65],
      connects_space_ids: ['space_living_001'], confidence: 0.8,
    }],
    questions: [], warnings: [],
  };
}

export function validRequest(): HomeTurnRequest {
  return {
    schema_version: '1.0',
    request_id: 'req_demo_001',
    home_id: 'home_demo_001',
    operation: 'intake',
    locale: 'en-US',
    user_message: 'The dining room is where I work most days.',
    evidence: [
      {
        source_id: 'src_user_001',
        kind: 'user_statement',
        label: 'Current user statement',
        facts: [
          {
            id: 'claim_work_use_001',
            subject_ref: 'space_dining_001',
            predicate: 'actual_use',
            value: 'primary_work_area',
            epistemic_state: 'user_confirmed',
            confidence: 1,
          },
        ],
      },
    ],
  };
}

export function validHomeModel(): HomeModel {
  return {
    schema_version: '2.0',
    home_id: 'home_demo_001',
    model_revision: 1,
    status: 'draft',
    locale: 'en-US',
    measurement_policy: {
      system: 'metric',
      linear_storage: 'mm',
      area_storage: 'm2',
      us_listing_area_display: 'sq_ft_secondary',
    },
    coordinate_system: {
      type: 'local_plan_2d',
      unit: 'mm',
      origin: 'floor_envelope_bottom_left',
      x_axis: 'right',
      y_axis: 'up',
      north_angle_deg: null,
    },
    scale: {
      status: 'unknown',
      millimeters_per_source_unit: null,
      source_ref: null,
    },
    sources: [
      {
        id: 'src_user_001',
        kind: 'user_statement',
        label: 'Current user statement',
        asset_ref: null,
        provider_model: null,
        received_at: '2026-08-28T00:00:00.000Z',
      },
    ],
    floors: [
      {
        id: 'floor_main_001',
        label: 'Main floor',
        level_index: 0,
        state: 'user_confirmed',
        confidence: 1,
        source_refs: ['src_user_001'],
      },
    ],
    spaces: [],
    room_programs: [],
    boundaries: [],
    openings: [],
    objects: [],
    relationships: [],
    living_patterns: [],
    constraints: [],
    problems: [],
    opportunities: [],
    open_questions: [],
    change_log: [
      {
        revision: 1,
        timestamp: '2026-08-28T00:00:00.000Z',
        summary: 'Created the initial Home Model.',
        changed_ids: ['floor_main_001'],
        source_refs: ['src_user_001'],
      },
    ],
  };
}

export function validResponse(): HomeAgentResponse {
  return {
    schema_version: '1.0',
    request_id: 'req_demo_001',
    home_id: 'home_demo_001',
    operation: 'intake',
    status: 'completed',
    locale: 'en-US',
    message: 'I recorded the dining room as your primary work area.',
    home_model: validHomeModel(),
    diagnosis: null,
    visualization_brief: null,
    questions: [],
    warnings: [],
  };
}
