import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assistantText,
  createZooworkClient,
  isRunFinished,
  runOutcome,
  toolCall,
  ZooworkError,
  type OutboundEvent,
  type ZooworkClient,
} from '@zoowork-ai/sdk';
import type {
  ConversationHandle,
  AgentArtifact,
  AgentToolTrace,
  HomeModel,
  HomeTurnRequest,
  RoomMapTurnResult,
  StructuredTurnResult,
  UiAgentEvent,
} from './contracts.js';
import {
  assertHomeModel,
  assertHomeTurnRequest,
  assertRoomMapResponse,
  ContractValidationError,
  extractJsonObject,
  parseAgentResponse,
} from './validation.js';
import { projectRoot } from './paths.js';

const RESPONSE_SCHEMA = JSON.parse(
  readFileSync(
    resolve(
      projectRoot,
      'skills',
      'home-model-maintainer',
      'references',
      'agent-response.schema.json',
    ),
    'utf8',
  ),
) as unknown;
const HOME_MODEL_SCHEMA = JSON.parse(
  readFileSync(
    resolve(
      projectRoot,
      'skills',
      'home-model-maintainer',
      'references',
      'home-model.schema.json',
    ),
    'utf8',
  ),
) as unknown;
const ROOM_MAP_SCHEMA = JSON.parse(
  readFileSync(
    resolve(
      projectRoot,
      'skills',
      'room-map-parser',
      'references',
      'room-map-response.schema.json',
    ),
    'utf8',
  ),
) as unknown;

function runtimeContracts(operation: HomeTurnRequest['operation']): Record<string, unknown> {
  return {
    agent_response_schema: RESPONSE_SCHEMA,
    ...(operation === 'intake' || operation === 'correct'
      ? { home_model_schema: HOME_MODEL_SCHEMA }
      : {}),
  };
}

function canonicalEntityId(value: unknown, prefix: string, index: number, used: Set<string>): string {
  const raw = typeof value === 'string' ? value : `${prefix}_${index + 1}`;
  let normalized = raw.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^[_-]+|[_-]+$/g, '');
  if (!/^[a-z]/.test(normalized)) normalized = `${prefix}_${normalized}`;
  if (normalized.length < 3) normalized = `${prefix}_${normalized || index + 1}`;
  normalized = normalized.slice(0, 120).replace(/[_-]+$/g, '');
  const base = normalized;
  let suffix = 2;
  while (used.has(normalized)) {
    normalized = `${base.slice(0, 115)}_${suffix}`;
    suffix += 1;
  }
  used.add(normalized);
  return normalized;
}

function canonicalRoomFunction(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim().toLowerCase().replace(/[_-]+/g, ' ') : '';
  const aliases: Record<string, string> = {
    'living room': 'living_room', 客厅: 'living_room', 'family room': 'family_room', 起居室: 'family_room',
    dining: 'dining_room', 'dining room': 'dining_room', 餐厅: 'dining_room', kitchen: 'kitchen', 厨房: 'kitchen',
    'primary bedroom': 'primary_bedroom', 'master bedroom': 'primary_bedroom', 主卧: 'primary_bedroom', 主卧室: 'primary_bedroom',
    'guest bedroom': 'guest_bedroom', 次卧: 'guest_bedroom', 客卧: 'guest_bedroom', bedroom: 'guest_bedroom', 卧室: 'guest_bedroom',
    "kids' room": 'kids_room', 'kids room': 'kids_room', 儿童房: 'kids_room', nursery: 'nursery', 婴儿房: 'nursery',
    'home office': 'home_office', office: 'home_office', 书房: 'home_office', 'walk in closet': 'walk_in_closet', 衣帽间: 'walk_in_closet',
    bathroom: 'bathroom', bath: 'bathroom', 卫生间: 'bathroom', 浴室: 'bathroom', 'powder room': 'powder_room', 客卫: 'powder_room',
    laundry: 'laundry_room', 'laundry room': 'laundry_room', 洗衣房: 'laundry_room', pantry: 'pantry', 食品储藏室: 'pantry',
    mudroom: 'mudroom', 入户间: 'mudroom', entry: 'entry', foyer: 'entry', 玄关: 'entry', balcony: 'balcony', 阳台: 'balcony', 露台: 'balcony', den: 'den', 多功能室: 'den', storage: 'storage', 储藏室: 'storage', garage: 'garage', 车库: 'garage',
    'home theater': 'home_theater', 影音室: 'home_theater', 'fitness room': 'fitness_room', gym: 'fitness_room', 健身房: 'fitness_room', 'game room': 'game_room', 游戏室: 'game_room', other: 'other', 其他: 'other',
  };
  return aliases[raw] ?? 'unknown';
}

const EXCLUDED_REGION_PATTERN = /(?:light\s*well|air\s*shaft|double[-\s]*height|void|shaft|outside\s+(?:the\s+)?(?:plan|envelope)|采光井|挑空|架空|管井|设备井)/i;

function canonicalPlanningStatus(item: Record<string, unknown>): 'included' | 'excluded' | 'uncertain' {
  if (item.planning_status === 'included' || item.planning_status === 'excluded' || item.planning_status === 'uncertain') {
    return item.planning_status;
  }
  const description = [item.label, item.suggested_function, item.suggested_function_code]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  return EXCLUDED_REGION_PATTERN.test(description) ? 'excluded' : 'included';
}

function canonicalExclusionReason(item: Record<string, unknown>, status: string): string | null {
  if (status !== 'excluded') return null;
  const allowed = new Set(['lightwell', 'double_height', 'void', 'shaft', 'outside_envelope', 'other']);
  if (typeof item.exclusion_reason === 'string' && allowed.has(item.exclusion_reason)) return item.exclusion_reason;
  const description = [item.label, item.suggested_function]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  if (/light\s*well|采光井/i.test(description)) return 'lightwell';
  if (/double[-\s]*height|挑空/i.test(description)) return 'double_height';
  if (/shaft|管井|设备井/i.test(description)) return 'shaft';
  if (/outside|envelope/i.test(description)) return 'outside_envelope';
  if (/void|架空/i.test(description)) return 'void';
  return 'other';
}

function canonicalizeRoomMapCandidate(candidate: Record<string, unknown>): Record<string, unknown> {
  const used = new Set<string>();
  const idMap = new Map<string, string>();
  const normalizeItems = (value: unknown, prefix: string): unknown => {
    if (!Array.isArray(value)) return value;
    return value.map((entry, index) => {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return entry;
      const item = entry as Record<string, unknown>;
      const normalized = canonicalEntityId(item.id, prefix, index, used);
      if (typeof item.id === 'string' && !idMap.has(item.id)) idMap.set(item.id, normalized);
      return { ...item, id: normalized };
    });
  };

  const spaces = normalizeItems(candidate.spaces, 'space');
  const usableSpaces = Array.isArray(spaces) ? spaces.filter((entry) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return true;
    const item = entry as Record<string, unknown>;
    const polygon = item.polygon;
    const isFullFrame = Array.isArray(polygon)
      && polygon.length === 4
      && JSON.stringify(polygon) === JSON.stringify([[0, 0], [1, 0], [1, 1], [0, 1]]);
    return !(item.confidence === 0 && item.boundary_confidence === 0 && isFullFrame);
  }) : spaces;
  const result: Record<string, unknown> = {
    ...candidate,
    spaces: Array.isArray(usableSpaces) ? usableSpaces.map((entry) => {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return entry;
      const item = entry as Record<string, unknown>;
      const planningStatus = canonicalPlanningStatus(item);
      return {
        ...item,
        suggested_function_code: planningStatus === 'excluded'
          ? 'unknown'
          : canonicalRoomFunction(item.suggested_function_code ?? item.suggested_function ?? item.label),
        planning_status: planningStatus,
        exclusion_reason: canonicalExclusionReason(item, planningStatus),
      };
    }) : spaces,
    boundaries: normalizeItems(candidate.boundaries, 'boundary'),
    openings: normalizeItems(candidate.openings, 'opening'),
    questions: normalizeItems(candidate.questions, 'question'),
  };
  const normalizeRef = (value: unknown): unknown => {
    if (typeof value !== 'string') return value;
    const mapped = idMap.get(value);
    if (mapped) return mapped;
    let normalized = value.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^[_-]+|[_-]+$/g, '');
    if (!/^[a-z]/.test(normalized)) normalized = `ref_${normalized}`;
    if (normalized.length < 3) normalized = `ref_${normalized || 'unknown'}`;
    return normalized.slice(0, 127).replace(/[_-]+$/g, '');
  };
  const rewriteRefs = (value: unknown, key: string): unknown => Array.isArray(value)
    ? value.map((entry) => {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return entry;
      const item = entry as Record<string, unknown>;
      return { ...item, [key]: Array.isArray(item[key]) ? item[key].map(normalizeRef) : item[key] };
    })
    : value;
  result.boundaries = rewriteRefs(result.boundaries, 'separates_space_ids');
  result.openings = rewriteRefs(result.openings, 'connects_space_ids');
  result.questions = rewriteRefs(result.questions, 'related_refs');
  return result;
}

export interface HomeLayoutRuntimeOptions {
  agentId: string;
  apiKey?: string;
  baseUrl?: string;
  maxOutputRepairAttempts?: number;
  maxStreamReconnects?: number;
  turnTimeoutMs?: number;
}

export class HomeLayoutTurnTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`ZooWork turn timed out after ${timeoutMs} ms`);
    this.name = 'HomeLayoutTurnTimeoutError';
  }
}

interface RawTurnResult {
  text: string;
  cursor?: string;
  outcome: 'succeeded' | 'failed' | 'aborted';
  runId?: string;
  toolCalls: AgentToolTrace[];
}

export class HomeLayoutRuntime {
  readonly agentId: string;
  readonly maxOutputRepairAttempts: number;
  readonly maxStreamReconnects: number;
  readonly turnTimeoutMs: number;
  private readonly client: ZooworkClient;

  constructor(
    client: ZooworkClient,
    agentId: string,
    maxOutputRepairAttempts = 1,
    maxStreamReconnects = 2,
    turnTimeoutMs = 150_000,
  ) {
    if (!agentId.trim()) throw new Error('agentId is required');
    this.client = client;
    this.agentId = agentId;
    this.maxOutputRepairAttempts = maxOutputRepairAttempts;
    this.maxStreamReconnects = maxStreamReconnects;
    this.turnTimeoutMs = turnTimeoutMs;
  }

  static fromEnvironment(options: HomeLayoutRuntimeOptions): HomeLayoutRuntime {
    const clientOptions: { apiKey?: string; baseUrl?: string } = {};
    if (options.apiKey !== undefined) clientOptions.apiKey = options.apiKey;
    if (options.baseUrl !== undefined) clientOptions.baseUrl = options.baseUrl;

    return new HomeLayoutRuntime(
      createZooworkClient(clientOptions),
      options.agentId,
      options.maxOutputRepairAttempts ?? 1,
      options.maxStreamReconnects ?? 2,
      options.turnTimeoutMs ?? 150_000,
    );
  }

  async ensureRunning(): Promise<void> {
    const agent = await this.client.getAgent(this.agentId);
    if (agent.status?.desired_state !== 'running') {
      await this.client.startAgent(this.agentId);
    }
    await this.client.waitUntilRunning(this.agentId);
  }

  async createConversation(homeId: string, conversationKey: string): Promise<ConversationHandle> {
    if (!homeId.trim() || !conversationKey.trim()) {
      throw new Error('homeId and conversationKey are required');
    }

    const session = await this.client.createSession(
      this.agentId,
      {
        metadata: {
          application: 'see-my-home',
          home_id: homeId,
          conversation_key: conversationKey,
        },
      },
      `home-layout-session:${conversationKey}`,
    );

    return {
      agentId: this.agentId,
      sessionId: session.session_id,
    };
  }

  async runStructuredTurn(
    conversation: ConversationHandle,
    request: HomeTurnRequest,
    currentHomeModel: HomeModel | null,
    uiEvent?: UiAgentEvent,
  ): Promise<StructuredTurnResult> {
    assertHomeTurnRequest(request);
    if (currentHomeModel !== null) {
      assertHomeModel(currentHomeModel);
      if (currentHomeModel.home_id !== request.home_id) {
        throw new ContractValidationError(
          'HomeTurnRequest',
          'current Home Model belongs to a different home_id',
        );
      }
    }

    if (conversation.agentId !== this.agentId) {
      throw new Error('conversation belongs to a different agent');
    }

    let rawTurn = await this.postAndRead(
      conversation.sessionId,
      this.buildTurnEvents(request, currentHomeModel, uiEvent),
      request.operation === 'visualize',
    );
    let cursor = rawTurn.cursor;

    if (rawTurn.outcome !== 'succeeded') {
      throw new Error(`ZooWork run ended with status ${rawTurn.outcome}`);
    }

    let lastError: ContractValidationError | undefined;
    for (let attempt = 0; attempt <= this.maxOutputRepairAttempts; attempt += 1) {
      try {
        const response = parseAgentResponse(rawTurn.text);
        this.assertResponseMatchesRequest(response, request);
        if (response.home_model !== null) assertHomeModel(response.home_model);

        const result: StructuredTurnResult = {
          response,
          rawText: rawTurn.text,
          runOutcome: rawTurn.outcome,
          toolCalls: rawTurn.toolCalls,
          artifacts:
            request.operation === 'visualize' && this.hasSuccessfulArtifactPublishTrace(rawTurn.toolCalls)
              ? await this.artifactsForRun(
                conversation.sessionId,
                rawTurn.runId,
                rawTurn.toolCalls,
                request.request_id,
              )
              : [],
        };
        if (cursor !== undefined) result.cursor = cursor;
        if (rawTurn.runId !== undefined) result.runId = rawTurn.runId;
        return result;
      } catch (error) {
        if (!(error instanceof ContractValidationError)) throw error;
        lastError = error;
        if (attempt === this.maxOutputRepairAttempts) break;

        rawTurn = await this.postAndRead(
          conversation.sessionId,
          this.buildRepairEvents(request, error, attempt + 1),
        );
        cursor = rawTurn.cursor;
        if (rawTurn.outcome !== 'succeeded') {
          throw new Error(`ZooWork repair run ended with status ${rawTurn.outcome}`);
        }
      }
    }

    throw lastError ?? new Error('Agent response validation failed');
  }

  async runRoomMapTurn(
    conversation: ConversationHandle,
    request: HomeTurnRequest,
    uiEvent: UiAgentEvent,
  ): Promise<RoomMapTurnResult> {
    assertHomeTurnRequest(request);
    if (request.operation !== 'intake') {
      throw new Error('Room Map parsing requires an intake request');
    }
    if (conversation.agentId !== this.agentId) {
      throw new Error('conversation belongs to a different agent');
    }

    const rawTurn = await this.postAndRead(
      conversation.sessionId,
      this.buildRoomMapEvents(request, uiEvent),
    );
    if (rawTurn.outcome !== 'succeeded') {
      throw new Error(`ZooWork Room Map run ended with status ${rawTurn.outcome}`);
    }

    const parsed = extractJsonObject(rawTurn.text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new ContractValidationError('RoomMapResponse', 'response must be an object');
    }
    const candidate = canonicalizeRoomMapCandidate(parsed as Record<string, unknown>);
    if (typeof candidate.summary === 'string') candidate.summary = candidate.summary.slice(0, 1200);
    if (Array.isArray(candidate.questions)) {
      candidate.questions = candidate.questions.slice(0, 3).map((question) => {
        if (typeof question !== 'object' || question === null || Array.isArray(question)) return question;
        const item = question as Record<string, unknown>;
        return { ...item, ...(typeof item.question === 'string' ? { question: item.question.slice(0, 500) } : {}) };
      });
    }
    if (Array.isArray(candidate.warnings)) {
      candidate.warnings = candidate.warnings.slice(0, 8).map((warning) => typeof warning === 'string' ? warning.slice(0, 300) : warning);
    }
    assertRoomMapResponse(candidate);
    const response = candidate;
    if (response.request_id !== request.request_id || response.home_id !== request.home_id) {
      throw new ContractValidationError('RoomMapResponse', 'request_id or home_id does not match request');
    }
    if (response.locale !== request.locale) {
      throw new ContractValidationError('RoomMapResponse', 'locale does not match request');
    }

    const result: RoomMapTurnResult = {
      response,
      rawText: rawTurn.text,
      runOutcome: rawTurn.outcome,
      toolCalls: rawTurn.toolCalls,
    };
    if (rawTurn.cursor !== undefined) result.cursor = rawTurn.cursor;
    if (rawTurn.runId !== undefined) result.runId = rawTurn.runId;
    return result;
  }

  private buildRoomMapEvents(
    request: HomeTurnRequest,
    uiEvent: UiAgentEvent,
  ): OutboundEvent[] {
    return [{
      type: 'user.message',
      content: JSON.stringify({
        runtime_contract: 'room-map-v1',
        ui_event: uiEvent,
        runtime_timestamp: new Date().toISOString(),
        contracts: { room_map_response_schema: ROOM_MAP_SCHEMA },
        output_requirement:
          'Use the room-map-parser skill. Inspect the uploaded asset_ref with the ZooWork image tool exactly once and never retry that tool. Return only one compact JSON object matching room_map_response_schema in the final assistant response. Keep summary under 240 characters. Segment every defensible enclosed or functionally distinct space into its own source-faithful polygon, retaining every visible concave corner; use four points only for an actually rectangular region. Never return the whole dwelling envelope as one room when interior walls, door openings, fixtures, furniture groups, or printed labels show multiple rooms. Before returning, compare the polygon count with the visible region count and correct under-segmentation within the same inspection. Keep adjacent polygons aligned with minimal gaps and no material overlaps. Identify boundary paths, openings, one canonical suggested_function_code, planning_status, and exclusion_reason for every region. Multiple real balconies are valid included spaces. Mark light wells, double-height openings, raised/open voids, service shafts, and outside-envelope regions excluded; do not mislabel them as balconies. Use uncertain when exclusion is not visually defensible. If the image fetch fails, return insufficient_input with an empty spaces array; never fabricate a full-frame placeholder. Do not call sessions_yield. Do not build a Home Model, diagnose, generate an image, access databases, use shell tools, or ask for another API key.',
        request,
      }),
      idempotency_key: `${request.request_id}:room-map`,
    }];
  }

  private buildTurnEvents(
    request: HomeTurnRequest,
    currentHomeModel: HomeModel | null,
    uiEvent?: UiAgentEvent,
  ): OutboundEvent[] {
    const runtimeEnvelope = {
      runtime_contract: 'home-layout-v2',
      ui_event: uiEvent ?? {
        type:
          request.operation === 'intake'
            ? 'project.create'
            : request.operation === 'correct'
              ? 'room_map.confirm'
              : 'agent.generate',
        project_id: request.home_id,
        ...(request.operation === 'visualize' ? { mode: 'layout' } : {}),
      },
      runtime_timestamp: new Date().toISOString(),
      authoritative_state: {
        current_home_model: currentHomeModel,
      },
      contracts: runtimeContracts(request.operation),
      output_requirement:
        request.operation === 'intake'
          ? 'Inspect every HTTPS asset_ref with the ZooWork platform visual capability. Then return one JSON object only that validates exactly against the embedded contracts. Do not call any provider API or request another key.'
          : request.operation === 'visualize'
            ? 'In this request, produce an evidence-backed diagnosis and visualization brief from the authoritative confirmed Home Model. Diagnosis.assessment_items must contain at most five concise bilingual design observations and may discuss only circulation, functional relationships, adjacency, privacy, daylight, storage demand, activity conflict, or underused space. Furniture, fixture, appliance, sanitary-equipment, typography, and render defects are generation-quality observations and must never appear as design assessment items. Build the image prompt from every room_program. Treat baseline_objects as first-draft defaults, apply conditional_objects only when visible geometry and user preferences support them, then apply explicit user_overrides or the current user request with highest priority. After those overrides, target every default_object_counts min_count and max_count exactly and inspect beds, toilets, sinks or vanities, shower or tub zones, kitchen sinks, cooktops, refrigerators, sofas, TVs or media walls, dining tables, and desks room by room. Preserve each confirmed room function and request a label-free result. Set visualization_brief.preferred_providers exactly to ["Banana Pro", "Image 2"]. Prefer Banana Pro for source-referenced geometry-preserving image-to-image work and Image 2 for clean-plan generation or pre-generation fallback. Use only model-selection fields that the current image tool schema actually exposes; otherwise omit model and provider so ZooWork applies its configured route. Call image_generate exactly once with action="generate", image when supported, prompt, quality="high", filename="<home_id>_<request_id>_layout.png", and aspectRatio="4:3". Do not call action="list", action="status", or launch a retry after generation starts. After the background task starts, call sessions_yield exactly once and end that run with one brief waiting sentence. ZooWork will automatically start a continuation run when the attachment arrives. Only in that continuation, call media_materialize exactly once with the returned async attachment artifactId and path="/workspace/artifacts/<home_id>/<home_id>_<request_id>_layout.png", then inspect that materialized image once. If the materialized file is a readable raster image, always call artifact_publish exactly once with that same path. Geometry drift, changed room functions, incompatible fixtures, default_object_counts mismatches, missing furniture, styling weaknesses, and hallucinated or illegible text must be listed precisely in warnings but must not suppress publication. Return status="completed" with both diagnosis and visualization_brief populated after publication. Only a missing, corrupt, empty, or technically unreadable image may remain unpublished and return status="failed". Do not call any provider API or request another key.'
            : 'Return one JSON object only. It must validate exactly against the embedded contracts. Use the exact field names and enum values. Do not use Markdown fences.',
      request,
    };

    return [
      {
        type: 'user.message',
        // ZooWork's current gateway returns HTTP 502 when a session containing a
        // system.message is followed by user.message. Keep the same authority
        // boundary in one structured user event until that gateway behavior is fixed.
        content: JSON.stringify(runtimeEnvelope),
        idempotency_key: `${request.request_id}:user`,
      },
    ];
  }

  private buildRepairEvents(
    request: HomeTurnRequest,
    error: ContractValidationError,
    attempt: number,
  ): OutboundEvent[] {
    return [
      {
        type: 'user.message',
        content: JSON.stringify({
          runtime_contract: 'home-layout-v2',
          runtime_timestamp: new Date().toISOString(),
          repair: {
            failed_contract: error.contract,
            details: error.details,
            attempt,
          },
          contracts: runtimeContracts(request.operation),
          output_requirement:
            'Correct the previous response against both embedded schemas. Return one complete JSON object only, preserving supported facts and using schema-allowed nulls or empty arrays for unavailable outputs. Do not use tools, write files, or use Markdown fences.',
          request,
        }),
        idempotency_key: `${request.request_id}:repair:${attempt}`,
      },
    ];
  }

  private async postAndRead(
    sessionId: string,
    events: OutboundEvent[],
    requirePublishedArtifact = false,
  ): Promise<RawTurnResult> {
    const receipt = await this.client.postEvents(this.agentId, sessionId, events);
    const rejected = receipt.events.find((event) => event.accepted !== true);
    if (rejected) {
      throw new Error(`ZooWork rejected outbound event ${rejected.type ?? 'unknown'}`);
    }

    const acceptedTurn = receipt.events.find((event) => event.type === 'user.message');
    const postedSeq = typeof acceptedTurn?.seq === 'number' ? acceptedTurn.seq : undefined;
    if (postedSeq === undefined) {
      throw new Error('ZooWork accepted the user turn without returning its sequence');
    }

    const assistantBySeq = new Map<number, string>();
    const structuredCandidatesBySeq = new Map<number, string>();
    const toolCallsBySeq = new Map<number, AgentToolTrace>();
    let latestCursor: string | undefined;
    let targetRunId: string | undefined;
    let finalOutcome: 'succeeded' | 'failed' | 'aborted' | undefined;
    let timeoutInterruptSent = false;
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.turnTimeoutMs);
    const interruptTimedOutRun = async (): Promise<void> => {
      if (timeoutInterruptSent) return;
      timeoutInterruptSent = true;
      try {
        await this.client.postEvents(this.agentId, sessionId, [{
          type: 'user.interrupt',
          content: { reason: `Runtime timeout after ${this.turnTimeoutMs} ms` },
          idempotency_key: `runtime-timeout:${sessionId}:${postedSeq}`,
        }]);
      } catch {
        // Preserve the timeout as the primary error; a best-effort interrupt may
        // itself fail during the same transient outage.
      }
    };
    try {
      for (let reconnect = 0; reconnect <= this.maxStreamReconnects; reconnect += 1) {
        try {
          // Start from the durable session log on every attempt and select only
          // the run created by the user event we just posted. This avoids a stale
          // cursor making a later turn stop at an earlier run.finished event.
          for await (const event of this.client.streamEvents(this.agentId, sessionId, {
            signal: abortController.signal,
            ...(latestCursor ? { cursor: latestCursor } : {}),
          })) {
            latestCursor = event.cursor ?? latestCursor;
            if (event.seq <= postedSeq) continue;
            if (event.eventType === 'run.started') {
              targetRunId = event.runId;
            }
            const text = assistantText(event);
            if (text) assistantBySeq.set(event.seq, text);
            const call = toolCall(event);
            if (call) {
              const structuredCandidate = this.structuredCandidateFromTool(call);
              if (structuredCandidate) structuredCandidatesBySeq.set(event.seq, structuredCandidate);
              toolCallsBySeq.set(event.seq, {
                phase: call.phase,
                ...(call.toolCallId ? { toolCallId: call.toolCallId } : {}),
                ...(call.toolName ? { toolName: call.toolName } : {}),
                ...(call.isError !== undefined ? { isError: call.isError } : {}),
                ...(call.resultPreview ? { resultPreview: call.resultPreview } : {}),
              });
            }
            if (isRunFinished(event)) {
              const outcome = runOutcome(event);
              if (
                outcome !== 'succeeded'
                || (
                  this.hasCompleteJson(assistantBySeq, structuredCandidatesBySeq)
                  && (
                    !requirePublishedArtifact
                    || this.hasTerminalVisualizationTool(toolCallsBySeq)
                  )
                )
              ) {
                finalOutcome = outcome;
                targetRunId = event.runId ?? targetRunId;
                break;
              }
            }
          }
        } catch (error) {
          if (abortController.signal.aborted) {
            await interruptTimedOutRun();
            throw new HomeLayoutTurnTimeoutError(this.turnTimeoutMs);
          }
          if (
            error instanceof ZooworkError
            && error.status >= 400
            && error.status < 500
            && error.status !== 429
          ) throw error;
          if (reconnect === this.maxStreamReconnects) break;
        }
        if (finalOutcome !== undefined) break;
        if (reconnect < this.maxStreamReconnects) {
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 500 * (2 ** reconnect)));
        }
      }

      let durableReadFailures = 0;
      while (finalOutcome === undefined && !abortController.signal.aborted) {
        let durableEvents;
        try {
          durableEvents = await this.client.listAllEvents(this.agentId, sessionId, {
            types: ['run.started', 'run.finished', 'agent.assistant', 'agent.tool'],
          });
          durableReadFailures = 0;
        } catch (error) {
          if (abortController.signal.aborted) break;
          if (
            error instanceof ZooworkError
            && error.status >= 400
            && error.status < 500
            && error.status !== 429
          ) throw error;
          const delayMs = Math.min(8_000, 500 * (2 ** durableReadFailures));
          durableReadFailures += 1;
          await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
          continue;
        }
        for (const event of durableEvents) {
          if (event.seq <= postedSeq) continue;
          latestCursor = event.cursor ?? latestCursor;
          if (event.eventType === 'run.started') targetRunId = event.runId;
          const text = assistantText(event);
          if (text) assistantBySeq.set(event.seq, text);
          const call = toolCall(event);
          if (call) {
            const structuredCandidate = this.structuredCandidateFromTool(call);
            if (structuredCandidate) structuredCandidatesBySeq.set(event.seq, structuredCandidate);
            toolCallsBySeq.set(event.seq, {
              phase: call.phase,
              ...(call.toolCallId ? { toolCallId: call.toolCallId } : {}),
              ...(call.toolName ? { toolName: call.toolName } : {}),
              ...(call.isError !== undefined ? { isError: call.isError } : {}),
              ...(call.resultPreview ? { resultPreview: call.resultPreview } : {}),
            });
          }
          if (isRunFinished(event)) {
            const outcome = runOutcome(event);
            if (
              outcome !== 'succeeded'
              || (
                this.hasCompleteJson(assistantBySeq, structuredCandidatesBySeq)
                && (
                  !requirePublishedArtifact
                  || this.hasTerminalVisualizationTool(toolCallsBySeq)
                )
              )
            ) {
              finalOutcome = outcome;
              targetRunId = event.runId ?? targetRunId;
            }
          }
        }
        if (finalOutcome === undefined) {
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
        }
      }
      if (abortController.signal.aborted && finalOutcome === undefined) {
        await interruptTimedOutRun();
        throw new HomeLayoutTurnTimeoutError(this.turnTimeoutMs);
      }
    } finally {
      clearTimeout(timeout);
    }

    if (finalOutcome === undefined) {
      throw new Error('ZooWork event stream ended without run.finished');
    }

    const result: RawTurnResult = {
      text: this.bestStructuredText(assistantBySeq, structuredCandidatesBySeq),
      outcome: finalOutcome,
      toolCalls: [...toolCallsBySeq.entries()]
        .sort(([left], [right]) => left - right)
        .map(([, call]) => call),
    };
    if (latestCursor !== undefined) result.cursor = latestCursor;
    if (targetRunId !== undefined) result.runId = targetRunId;
    return result;
  }

  private assistantText(assistantBySeq: Map<number, string>): string {
    return [...assistantBySeq.entries()]
      .sort(([left], [right]) => left - right)
      .map(([, value]) => value)
      .join('');
  }

  private hasSuccessfulArtifactPublish(toolCallsBySeq: Map<number, AgentToolTrace>): boolean {
    return [...toolCallsBySeq.values()].some((call) => (
      call.phase === 'end'
      && call.toolName === 'artifact_publish'
      && call.isError !== true
    ));
  }

  private hasSuccessfulArtifactPublishTrace(toolCalls: AgentToolTrace[]): boolean {
    return toolCalls.some((call) => (
      call.phase === 'end'
      && call.toolName === 'artifact_publish'
      && call.isError !== true
    ));
  }

  private hasTerminalVisualizationTool(toolCallsBySeq: Map<number, AgentToolTrace>): boolean {
    return this.hasSuccessfulArtifactPublish(toolCallsBySeq)
      || [...toolCallsBySeq.values()].some((call) => (
        call.phase === 'end'
        && call.toolName === 'media_materialize'
      ));
  }

  private structuredCandidateFromTool(call: ReturnType<typeof toolCall>): string | undefined {
    if (!call || call.phase !== 'start') return undefined;
    const candidates: string[] = [];
    if (
      call.toolName === 'write'
      && typeof call.args?.path === 'string'
      && call.args.path.endsWith('/response.json')
      && typeof call.args.content === 'string'
    ) {
      candidates.push(call.args.content);
    }
    // Some managed-agent models occasionally place their final structured
    // response in sessions_yield.message instead of an assistant block. The
    // durable start event keeps that argument in full even when resultPreview
    // is truncated, so recover it without treating arbitrary tool prompts as
    // output candidates.
    if (call.toolName === 'sessions_yield' && typeof call.args?.message === 'string') {
      candidates.push(call.args.message);
    }
    for (const candidate of candidates) {
      try {
        extractJsonObject(candidate);
        return candidate;
      } catch {
        // Try the next supported structured-output carrier.
      }
    }
    return undefined;
  }

  private hasCompleteJson(
    assistantBySeq: Map<number, string>,
    structuredCandidatesBySeq: Map<number, string>,
  ): boolean {
    const candidates = [
      this.assistantText(assistantBySeq),
      ...[...structuredCandidatesBySeq.entries()]
        .sort(([left], [right]) => right - left)
        .map(([, value]) => value),
    ];
    return candidates.some((candidate) => {
      try {
        extractJsonObject(candidate);
        return true;
      } catch {
        return false;
      }
    });
  }

  private bestStructuredText(
    assistantBySeq: Map<number, string>,
    structuredCandidatesBySeq: Map<number, string>,
  ): string {
    const assistant = this.assistantText(assistantBySeq);
    const candidates = [
      ...[...assistantBySeq.entries()]
        .sort(([left], [right]) => right - left)
        .map(([, value]) => value),
      ...[...structuredCandidatesBySeq.entries()]
        .sort(([left], [right]) => right - left)
        .map(([, value]) => value),
      assistant,
    ];
    for (const candidate of candidates) {
      try {
        extractJsonObject(candidate);
        return candidate;
      } catch {
        // Try the next source. Large responses can be materialized by the Agent
        // through the write tool before its short final assistant message.
      }
    }
    return assistant;
  }

  private async artifactsForRun(
    sessionId: string,
    runId: string | undefined,
    toolCalls: AgentToolTrace[],
    requestId: string,
  ): Promise<AgentArtifact[]> {
    const publishedIds = new Set(
      toolCalls.flatMap((call) => {
        if (call.phase !== 'end' || call.toolName !== 'artifact_publish' || !call.resultPreview) return [];
        try {
          const parsed = JSON.parse(call.resultPreview) as { artifactId?: unknown; artifact_id?: unknown };
          const id = parsed.artifactId ?? parsed.artifact_id;
          return typeof id === 'string' ? [id] : [];
        } catch {
          return [];
        }
      }),
    );
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const page = await this.client.listArtifacts(this.agentId, { sessionId, limit: 100 });
      const matches = page.artifacts
        .filter((artifact) => (
          publishedIds.has(artifact.artifact_id)
          || artifact.run_id === runId
          || artifact.source_path?.includes(requestId)
          || artifact.file_name?.includes(requestId)
        ))
        .map((artifact) => ({
          artifactId: artifact.artifact_id,
          fileName: artifact.file_name ?? null,
          contentType: artifact.content_type ?? null,
          size: artifact.size ?? null,
          status: artifact.status ?? null,
          runId: artifact.run_id ?? null,
        }));
      if (matches.some((artifact) => artifact.status === 'ready')) return matches;
      if (attempt < 11) await new Promise((resolveDelay) => setTimeout(resolveDelay, 750));
    }
    return [];
  }

  async resolveArtifactUrl(artifactId: string): Promise<string> {
    const result = await this.client.downloadArtifact(this.agentId, artifactId);
    if (!result.url) throw new Error('ZooWork artifact is not ready for download');
    return result.url;
  }

  private assertResponseMatchesRequest(
    response: { request_id: string; home_id: string; operation: string },
    request: HomeTurnRequest,
  ): void {
    if (response.request_id !== request.request_id) {
      throw new ContractValidationError('HomeAgentResponse', 'request_id does not match request');
    }
    if (response.home_id !== request.home_id) {
      throw new ContractValidationError('HomeAgentResponse', 'home_id does not match request');
    }
    if (response.operation !== request.operation) {
      throw new ContractValidationError('HomeAgentResponse', 'operation does not match request');
    }
  }
}
