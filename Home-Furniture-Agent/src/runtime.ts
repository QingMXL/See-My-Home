import { readFileSync } from 'node:fs';
import {
  assistantText,
  createZooworkClient,
  isRunFinished,
  runOutcome,
  toolCall,
  ZooworkError,
  type OutboundEvent,
  type SessionEvent,
  type ZooworkClient,
} from '@zoowork-ai/sdk';
import type {
  AgentArtifact,
  AgentToolTrace,
  ConversationHandle,
  FurnitureAgentResponse,
  FurnitureTurnRequest,
  FurnitureTurnResult,
} from './contracts.js';
import { furnitureCategory } from './contracts.js';
import { requestSchemaPath, responseSchemaPath } from './paths.js';
import {
  assertFurnitureTurnRequest,
  assertResponseMatchesRequest,
  extractJsonObject,
  parseFurnitureAgentResponse,
} from './validation.js';

const REQUEST_SCHEMA = JSON.parse(readFileSync(requestSchemaPath, 'utf8')) as unknown;
const RESPONSE_SCHEMA = JSON.parse(readFileSync(responseSchemaPath, 'utf8')) as unknown;

export interface HomeFurnitureRuntimeOptions {
  agentId: string;
  apiKey?: string;
  baseUrl?: string;
  turnTimeoutMs?: number;
  maxStreamReconnects?: number;
}

export class HomeFurnitureTurnTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`ZooWork Home Furniture turn timed out after ${timeoutMs} ms`);
    this.name = 'HomeFurnitureTurnTimeoutError';
  }
}

interface RawTurnResult {
  text: string;
  outcome: 'succeeded' | 'failed' | 'aborted';
  toolCalls: AgentToolTrace[];
  cursor?: string;
  runId?: string;
}

export interface FurnitureTurnStart {
  postedSeq: number;
}

export type FurnitureTurnProgress = 'analyzing' | 'interpreting' | 'rendering' | 'publishing';

export type FurnitureTurnPoll =
  | { status: 'processing'; postedSeq: number; progress: FurnitureTurnProgress }
  | { status: 'completed'; result: FurnitureTurnResult };

export function orthographicProjectionQaPassed(
  request: FurnitureTurnRequest,
  response: FurnitureAgentResponse,
): boolean {
  return request.output_mode !== 'orthographic_sheet'
    || (response.qa.orthographic_projection_correct === true
      && response.qa.orthographic_visible_surfaces_correct === true);
}

export class HomeFurnitureRuntime {
  readonly agentId: string;
  readonly turnTimeoutMs: number;
  readonly maxStreamReconnects: number;
  private readonly client: ZooworkClient;

  constructor(client: ZooworkClient, agentId: string, turnTimeoutMs = 600_000, maxStreamReconnects = 5) {
    if (!agentId.trim()) throw new Error('agentId is required');
    this.client = client;
    this.agentId = agentId;
    this.turnTimeoutMs = turnTimeoutMs;
    this.maxStreamReconnects = maxStreamReconnects;
  }

  static fromEnvironment(options: HomeFurnitureRuntimeOptions): HomeFurnitureRuntime {
    const config: { apiKey?: string; baseUrl?: string } = {};
    if (options.apiKey !== undefined) config.apiKey = options.apiKey;
    if (options.baseUrl !== undefined) config.baseUrl = options.baseUrl;
    return new HomeFurnitureRuntime(
      createZooworkClient(config),
      options.agentId,
      options.turnTimeoutMs ?? 600_000,
      options.maxStreamReconnects ?? 5,
    );
  }

  async ensureRunning(): Promise<void> {
    const agent = await this.client.getAgent(this.agentId);
    if (agent.status?.desired_state === 'running') return;
    await this.client.startAgent(this.agentId);
    await this.client.waitUntilRunning(this.agentId, { timeoutMs: 60_000 });
  }

  async createConversation(projectId: string, conversationKey: string): Promise<ConversationHandle> {
    if (!projectId.trim() || !conversationKey.trim()) throw new Error('projectId and conversationKey are required');
    const session = await this.client.createSession(
      this.agentId,
      { metadata: { application: 'see-my-home', agent_key: 'home-furniture', project_id: projectId, conversation_key: conversationKey } },
      `home-furniture-session:${conversationKey}`,
    );
    return { agentId: this.agentId, sessionId: session.session_id };
  }

  async runFurnitureTurn(conversation: ConversationHandle, request: FurnitureTurnRequest): Promise<FurnitureTurnResult> {
    assertFurnitureTurnRequest(request);
    if (conversation.agentId !== this.agentId) throw new Error('conversation belongs to a different Agent');
    const raw = await this.postAndRead(conversation.sessionId, this.buildEvents(request), request.request_id);
    return this.resultFromRaw(conversation.sessionId, request, raw);
  }

  async startFurnitureTurn(conversation: ConversationHandle, request: FurnitureTurnRequest): Promise<FurnitureTurnStart> {
    assertFurnitureTurnRequest(request);
    if (conversation.agentId !== this.agentId) throw new Error('conversation belongs to a different Agent');
    return { postedSeq: await this.postTurnEvents(conversation.sessionId, this.buildEvents(request)) };
  }

  async pollFurnitureTurn(
    conversation: ConversationHandle,
    request: FurnitureTurnRequest,
    postedSeq: number,
  ): Promise<FurnitureTurnPoll> {
    assertFurnitureTurnRequest(request);
    if (conversation.agentId !== this.agentId) throw new Error('conversation belongs to a different Agent');
    if (!Number.isSafeInteger(postedSeq) || postedSeq < 0) throw new Error('postedSeq is invalid');
    const durable = await this.readDurableTurn(conversation.sessionId, postedSeq);
    if (!durable.result) return { status: 'processing', postedSeq, progress: durable.progress };
    return { status: 'completed', result: await this.resultFromRaw(conversation.sessionId, request, durable.result) };
  }

  private async resultFromRaw(
    sessionId: string,
    request: FurnitureTurnRequest,
    raw: RawTurnResult,
  ): Promise<FurnitureTurnResult> {
    if (raw.outcome !== 'succeeded') throw new Error(`ZooWork run ended with status ${raw.outcome}`);
    const response = parseFurnitureAgentResponse(raw.text);
    assertResponseMatchesRequest(response, request);
    const projectionQaPassed = orthographicProjectionQaPassed(request, response);
    const passedQa = (!request.sketch_asset_ref || response.qa.sketch_geometry_preserved)
      && (!request.inspiration_asset_ref || response.qa.inspiration_language_applied)
      && response.qa.dimensions_consistent
      && response.qa.function_plausible
      && response.qa.publishable
      && projectionQaPassed;
    const generatedOrthographicCandidate = request.output_mode === 'orthographic_sheet'
      && response.status !== 'failed'
      && response.qa.function_plausible
      && projectionQaPassed
      && raw.toolCalls.some((call) => call.phase === 'end' && call.toolName === 'image_generate' && !call.isError);
    const artifacts = (response.status === 'completed' && passedQa) || generatedOrthographicCandidate
      ? await this.artifactsForTurn(sessionId, raw.runId, raw.toolCalls, request.request_id)
      : [];
    const result: FurnitureTurnResult = {
      response,
      rawText: raw.text,
      runOutcome: raw.outcome,
      toolCalls: raw.toolCalls,
      artifacts,
    };
    if (raw.cursor !== undefined) result.cursor = raw.cursor;
    if (raw.runId !== undefined) result.runId = raw.runId;
    return result;
  }

  async resolveArtifactUrl(artifactId: string): Promise<string> {
    const receipt = await this.client.downloadArtifact(this.agentId, artifactId);
    if (!receipt.url) throw new Error('ZooWork artifact is not ready for download');
    return receipt.url;
  }

  private buildEvents(request: FurnitureTurnRequest): OutboundEvent[] {
    const orthographic = request.output_mode === 'orthographic_sheet';
    const view = request.orthographic_view;
    const category = furnitureCategory(request.table_type);
    const filename = `${request.project_id}_${request.request_id}_${orthographic ? `orthographic-${view}` : request.table_type}.png`;
    const anatomyRequirement = category === 'chair'
      ? 'Preserve the chair seat, back, arms when present, frame, support count, upholstery boundaries, and any swivel or footrest mechanism.'
      : category === 'sofa'
        ? 'Preserve the sofa module count and arrangement, seat and back cushion count, arm profile, frame, upholstery seams, chaise position, and visible legs or plinth.'
        : category === 'lamp'
          ? 'Preserve the lamp shade or diffuser, number and placement of light heads, stem or arms, base or mount, canopy when present, and visible switch or cord details requested by the user.'
          : 'Preserve the table top, supports, apron, stretchers, shelves, drawers, hardware, and other specified major components.';
    const sources = [
      request.sketch_asset_ref ? `Inspect sketch_asset_ref exactly once with image: ${request.sketch_asset_ref}` : '',
      request.inspiration_asset_ref ? `Inspect inspiration_asset_ref exactly once with image: ${request.inspiration_asset_ref}` : '',
      request.render_asset_ref ? `Inspect render_asset_ref exactly once with image: ${request.render_asset_ref}` : '',
    ].filter(Boolean).join(' ');
    const orthographicDimensions = request.confirmed_design_spec?.dimensions_mm;
    const orthographicInventory = request.confirmed_design_spec?.components
      .map((component) => `${component.quantity} × ${component.role}: ${component.name}`)
      .join('; ');
    const viewSpecificProjectionRequirement = view === 'top'
      ? [
          'TOP PLAN IS STRICT: this is not a bird\'s-eye, elevated, three-quarter, transparent, or cutaway view. Place the virtual camera centered directly above the furniture with its optical axis exactly perpendicular to the floor and its principal horizontal plane parallel to the image plane. Use parallel orthographic projection only: no vanishing point, convergence, foreshortening, visible front/side face, visible thickness of the uppermost opaque surface, or underside.',
          'Draw only surfaces genuinely visible from directly above. Treat every opaque upper surface as an occluder: for a table this is usually the top; for seating it includes seat, back, arm, and cushion surfaces according to their real overlap; for a lamp it includes the shade, diffuser, canopy, or base according to height. Do not draw lower components through opaque upper components and do not use dashed hidden lines. A lower component may appear only where the confirmed render proves it physically projects beyond the upper silhouette and would truly be visible from directly above.',
          'Before publishing the top plan, compare it with the confirmed render and the front/side implications in confirmed_design_spec. Reject it if the plan outline is skewed, if parallel axes converge, if hidden structure shows through an opaque surface, or if a lower component protrudes without explicit visual evidence.',
        ].join(' ')
      : 'Use a strict orthographic elevation: the viewing axis is perpendicular to the requested front or side plane, parallel edges do not converge, and no adjacent top or side face is visible.';
    const lampSideRequirement = orthographic && category === 'lamp' && view === 'side'
      ? [
          'LAMP SIDE ELEVATION: a shallow floor lamp, table lamp, desk lamp, pendant, chandelier, or wall light can have a legitimately narrow depth-to-height silhouette. A rotationally symmetric lamp may also look nearly identical in front and side elevation. Neither condition is a failure by itself.',
          'Show the complete shade or diffuser, every visible light head, stem or arm, and the complete base, canopy, or wall mount. Keep the true confirmed depth-to-height proportion, center the lamp, use roughly 70-80% of the canvas height, and use sufficiently dark, solid line weights so the narrow silhouette remains readable. For a wall sconce, the side view must show its true projection away from the mounting plane.',
          'If the complete lamp is recognizable, the projection is orthographic, required components are present, and linework is readable, publish it even when its side silhouette is narrow or resembles the front elevation.',
        ].join(' ')
      : '';
    const automaticRetryRequirement = orthographic && request.description?.includes('AUTOMATIC ORTHOGRAPHIC RETRY')
      ? 'This is a targeted automatic retry. Generate a genuinely fresh raster. Increase useful canvas occupancy, strengthen the visible outer contour, retain readable internal edges, and verify that no extremity or required component is cropped or missing before publishing.'
      : '';
    const outputRequirement = orthographic
      ? [
          `Use table-concept-renderer in orthographic-sheet mode for the ${view} view of this ${category}. The confirmed design specification is immutable. The historical request.table_type field identifies the exact furniture item type: ${request.table_type}.`,
          sources,
          'Treat render_asset_ref as the sole visual authority. Do not inspect any image URL more than once.',
          `Generate one single full-object ${view} orthographic line view. Do not generate the other two views and do not make a three-panel sheet. Center the complete furniture with clear, even margins on every side.`,
          `The confirmed overall dimensions are width ${orthographicDimensions?.width} mm, depth ${orthographicDimensions?.depth} mm, and height ${orthographicDimensions?.height} mm. Preserve the ${view === 'front' ? 'width-to-height' : view === 'side' ? 'depth-to-height' : 'width-to-depth'} proportion recognizably; the application will typeset the exact values after generation.`,
          `Required component inventory: ${orthographicInventory || 'use confirmed_design_spec exactly'}. Every listed component that is visible from the ${view} direction must match render_asset_ref in count, placement, silhouette, open-or-closed state, and major curved details. Do not redesign, stylize, simplify, merge, add, or remove components.`,
          anatomyRequirement,
          lampSideRequirement,
          automaticRetryRequirement,
          `This raster is the ${view} geometry layer for a standard furniture shop-drawing sheet. Use true orthographic projection with no perspective convergence and keep the whole object comfortably inside the canvas.`,
          viewSpecificProjectionRequirement,
          'Use a pure white background and clean, uniform black-and-white technical linework. Draw the product\'s visible outer silhouette noticeably heavier than internal component edges. Keep internal edges medium weight and reserve very thin strokes for any unavoidable construction detail. No beige or grey background, room scene, material rendering, tonal fill, shading, shadows, decorative props, extra views, border, title block, written labels, dimension numbers, logos, or watermark.',
          `Call image_generate exactly once with action="generate", render_asset_ref as the supported source image input, quality="high", and filename="${filename}". Use only arguments exposed by the current tool schema; never invent model, provider, numeric image-weight, or control-strength fields.`,
          'After generation starts, call sessions_yield exactly once and end the waiting run.',
          `In the attachment continuation, call media_materialize exactly once for the returned artifactId with path="/workspace/artifacts/${request.project_id}/${filename}". Inspect the materialized image exactly once.`,
          `Publish only when the image contains one readable, complete ${view} orthographic view that recognizably matches the confirmed furniture and uses the required heavy-outline/thinner-detail hierarchy. Fail when it is missing, cropped, perspective-only, materially different, contains multiple views, loses visible major components, introduces shading or material texture, renders hidden surfaces as visible, or renders all lines as faint construction strokes. A naturally narrow lamp elevation or a rotationally symmetric lamp whose front and side elevations resemble one another is not, by itself, a failure. Minor raster proportion drift may be reported as a warning only after projection and visible-surface correctness pass.`,
          'Echo request.confirmed_design_spec exactly and without changing any value in response.design_spec. Set absent sketch and inspiration QA fields to true.',
          `After inspecting the materialized image, set qa.orthographic_projection_correct=true only when it is a true ${view} orthographic projection with no perspective or adjacent-face leakage. Set qa.orthographic_visible_surfaces_correct=true only when the image contains only surfaces visible from the requested direction and obeys the top-surface occlusion rule. If either is false, do not call artifact_publish; return failed or needs_confirmation with qa.publishable=false.`,
          `For a readable single ${view} geometry layer that passes both orthographic QA fields, call artifact_publish exactly once and return status=completed with its artifact id. Treat dimensions_consistent as confirmation that the returned structured specification is unchanged; use warnings for minor raster proportion drift.`,
          `Write design_summary, questions, warnings, and other user-facing prose in ${request.locale === 'zh-CN' ? 'Simplified Chinese' : 'English'}. Do not expose internal QA reasoning as user guidance.`,
          'Return one compact JSON object matching response_schema without Markdown fences. This is concept-level only, not fabrication-ready engineering.',
        ]
      : [
          `Use table-design-spec and table-concept-renderer in concept-render mode for the requested ${category}. The historical request.table_type field identifies the exact furniture item type: ${request.table_type}. Execute directly and avoid narrating intermediate work.`,
          sources,
          'Inspect each provided source image exactly once before generation. Resolve one coherent specification using the authority and locked-control rules already supplied in this request.',
          request.sketch_asset_ref ? 'Preserve the sketch viewpoint, topology, proportions, component count, and placement according to source_priority.' : 'Use a clean readable three-quarter product view unless the written brief requests another viewpoint.',
          anatomyRequirement,
          `Generate only the requested ${request.table_type}; do not add companion furniture, people, décor, a room setting, text, dimensions, labels, logos, or watermarks.`,
          `Call image_generate exactly once with action="generate", the provided visual source input when available, a clean isolated product-render prompt, quality="high", and filename="${filename}".`,
          'After generation starts, call sessions_yield exactly once and end the waiting run.',
          `In the attachment continuation, call media_materialize exactly once for the returned artifactId with path="/workspace/artifacts/${request.project_id}/${filename}", then publish it exactly once. Do not call image to inspect the generated concept render a second time.`,
          `Return one compact response_schema JSON object without Markdown fences. Use ${request.locale === 'zh-CN' ? 'Simplified Chinese' : 'English'} for human-readable fields, and never claim fabrication readiness.`,
        ];
    return [{
      type: 'user.message',
      idempotency_key: `${request.request_id}:furniture`,
      content: JSON.stringify({
        runtime_contract: 'home-furniture-v1',
        runtime_timestamp: new Date().toISOString(),
        source_authority: {
          primary: orthographic ? 'confirmed_render' : request.sketch_asset_ref && request.inspiration_asset_ref
            ? request.source_priority.sketch === request.source_priority.inspiration
              ? 'balanced'
              : request.source_priority.sketch > request.source_priority.inspiration ? 'sketch' : 'inspiration'
            : request.sketch_asset_ref ? 'sketch' : request.inspiration_asset_ref ? 'inspiration' : 'text',
          priority: request.source_priority,
          rule: orthographic
            ? 'The confirmed render and confirmed_design_spec are immutable authorities for the orthographic sheet.'
            : 'Move the design closer to the higher-weight image and retain proportionally fewer cues from the lower-weight image. Equal weights require a balanced synthesis. Only fields named in request.locked_controls are hard UI constraints; all other design_controls are fallbacks and must yield to clear sketch or text evidence. Numeric priority is design-decision guidance, not an image-tool parameter.',
        },
        contracts: { request_schema: REQUEST_SCHEMA, response_schema: RESPONSE_SCHEMA },
        request,
        output_requirement: outputRequirement.filter(Boolean).join(' '),
      }),
    }];
  }

  private async postAndRead(sessionId: string, events: OutboundEvent[], requestId: string): Promise<RawTurnResult> {
    const postedSeq = await this.postTurnEvents(sessionId, events);

    const assistantBySeq = new Map<number, string>();
    const toolsBySeq = new Map<number, AgentToolTrace>();
    let cursor: string | undefined;
    let runId: string | undefined;
    let finalOutcome: RawTurnResult['outcome'] | undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.turnTimeoutMs);

    const ingest = (event: SessionEvent): void => {
      if (event.seq <= postedSeq) return;
      cursor = event.cursor ?? cursor;
      if (event.eventType === 'run.started') runId = event.runId;
      const text = assistantText(event);
      if (text) assistantBySeq.set(event.seq, text);
      const call = toolCall(event);
      if (call) {
        toolsBySeq.set(event.seq, {
          phase: call.phase,
          ...(call.toolName ? { toolName: call.toolName } : {}),
          ...(call.toolCallId ? { toolCallId: call.toolCallId } : {}),
          ...(call.isError !== undefined ? { isError: call.isError } : {}),
          ...(call.resultPreview ? { resultPreview: call.resultPreview } : {}),
        });
      }
      if (isRunFinished(event)) {
        const outcome = runOutcome(event);
        if (outcome !== 'succeeded' || this.hasJson(assistantBySeq)) {
          finalOutcome = outcome;
          runId = event.runId ?? runId;
        }
      }
    };

    try {
      for (let attempt = 0; attempt <= this.maxStreamReconnects && finalOutcome === undefined; attempt += 1) {
        try {
          for await (const event of this.client.streamEvents(this.agentId, sessionId, {
            ...(cursor ? { cursor } : {}),
            signal: controller.signal,
          })) {
            ingest(event);
            if (finalOutcome !== undefined) break;
          }
        } catch (error) {
          if (error instanceof ZooworkError && error.status >= 400 && error.status < 500 && error.status !== 429) throw error;
        }
        if (controller.signal.aborted || finalOutcome !== undefined) break;
        await new Promise((resolve) => setTimeout(resolve, Math.min(500 * (2 ** attempt), 5_000)));
      }

      while (!controller.signal.aborted && finalOutcome === undefined) {
        const history = await this.client.listAllEvents(this.agentId, sessionId, {
          types: ['run.started', 'run.finished', 'agent.assistant', 'agent.tool'],
        });
        for (const event of history) ingest(event);
        if (finalOutcome === undefined) await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }

    if (finalOutcome === undefined) {
      try {
        await this.client.postEvents(this.agentId, sessionId, [{
          type: 'user.interrupt',
          idempotency_key: `${requestId}:timeout`,
        }]);
      } catch {
        // Preserve timeout as the primary failure.
      }
      throw new HomeFurnitureTurnTimeoutError(this.turnTimeoutMs);
    }

    const result: RawTurnResult = {
      text: [...assistantBySeq.entries()].sort(([a], [b]) => a - b).map(([, text]) => text).join(''),
      outcome: finalOutcome,
      toolCalls: [...toolsBySeq.entries()].sort(([a], [b]) => a - b).map(([, call]) => call),
    };
    if (cursor !== undefined) result.cursor = cursor;
    if (runId !== undefined) result.runId = runId;
    return result;
  }

  private async postTurnEvents(sessionId: string, events: OutboundEvent[]): Promise<number> {
    const receipt = await this.client.postEvents(this.agentId, sessionId, events);
    const rejected = receipt.events.find((event) => event.accepted !== true);
    if (rejected) throw new Error(`ZooWork rejected outbound event ${rejected.type ?? 'unknown'}`);
    const posted = receipt.events.find((event) => event.type === 'user.message');
    if (typeof posted?.seq !== 'number') {
      throw new Error('ZooWork accepted the user turn without returning its sequence');
    }
    return posted.seq;
  }

  private async readDurableTurn(
    sessionId: string,
    postedSeq: number,
  ): Promise<{ result: RawTurnResult | null; progress: FurnitureTurnProgress }> {
    const events = await this.client.listAllEvents(this.agentId, sessionId, {
      types: ['run.started', 'run.finished', 'agent.assistant', 'agent.tool'],
    });
    const assistantBySeq = new Map<number, string>();
    const toolsBySeq = new Map<number, AgentToolTrace>();
    let runId: string | undefined;
    let outcome: RawTurnResult['outcome'] | undefined;
    let progress: FurnitureTurnProgress = 'analyzing';

    for (const event of [...events].sort((left, right) => left.seq - right.seq)) {
      if (event.seq <= postedSeq) continue;
      if (event.eventType === 'run.started') runId = event.runId;
      const text = assistantText(event);
      if (text) {
        assistantBySeq.set(event.seq, text);
        if (progress === 'analyzing') progress = 'interpreting';
      }
      const call = toolCall(event);
      if (call) {
        toolsBySeq.set(event.seq, {
          phase: call.phase,
          ...(call.toolName ? { toolName: call.toolName } : {}),
          ...(call.toolCallId ? { toolCallId: call.toolCallId } : {}),
          ...(call.isError !== undefined ? { isError: call.isError } : {}),
          ...(call.resultPreview ? { resultPreview: call.resultPreview } : {}),
        });
        if (call.toolName === 'image_generate') progress = 'rendering';
        if (call.toolName === 'media_materialize' || call.toolName === 'artifact_publish') progress = 'publishing';
      }
      if (!isRunFinished(event)) continue;
      const candidate = runOutcome(event);
      if (!candidate) continue;
      if (candidate !== 'succeeded' || this.hasJson(assistantBySeq)) {
        outcome = candidate;
        runId = event.runId ?? runId;
        break;
      }
    }

    if (!outcome) return { result: null, progress };
    const result: RawTurnResult = {
      text: [...assistantBySeq.entries()].sort(([a], [b]) => a - b).map(([, text]) => text).join(''),
      outcome,
      toolCalls: [...toolsBySeq.entries()].sort(([a], [b]) => a - b).map(([, call]) => call),
    };
    if (runId !== undefined) result.runId = runId;
    return { result, progress };
  }

  private hasJson(messages: Map<number, string>): boolean {
    return [...messages.entries()].sort(([a], [b]) => b - a).some(([, candidate]) => {
      try { extractJsonObject(candidate); return true; }
      catch { return false; }
    });
  }

  private async artifactsForTurn(
    sessionId: string,
    runId: string | undefined,
    toolCalls: AgentToolTrace[],
    requestId: string,
  ): Promise<AgentArtifact[]> {
    const publishedIds = new Set(toolCalls.flatMap((call) => {
      if (call.phase !== 'end' || call.toolName !== 'artifact_publish' || !call.resultPreview) return [];
      try {
        const parsed = JSON.parse(call.resultPreview) as { artifactId?: unknown; artifact_id?: unknown };
        const id = parsed.artifactId ?? parsed.artifact_id;
        return typeof id === 'string' ? [id] : [];
      } catch { return []; }
    }));
    if (publishedIds.size > 0) {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const matches = (await Promise.all([...publishedIds].map((artifactId) => (
          this.client.getArtifact(this.agentId, artifactId)
        )))).map((artifact) => ({
          artifactId: artifact.artifact_id,
          fileName: artifact.file_name ?? null,
          contentType: artifact.content_type ?? null,
          size: artifact.size ?? null,
          status: artifact.status ?? null,
          runId: artifact.run_id ?? null,
        }));
        if (matches.some((artifact) => artifact.status === 'ready')) return matches;
        if (attempt < 11) await new Promise((resolve) => setTimeout(resolve, 750));
      }
      return [];
    }

    // Compatibility fallback for older runs whose artifact_publish preview omitted the id.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const page = await this.client.listArtifacts(this.agentId, { sessionId, limit: 100 });
      const matches = page.artifacts.filter((artifact) => (
        publishedIds.has(artifact.artifact_id)
        || artifact.run_id === runId
        || artifact.source_path?.includes(requestId)
        || artifact.file_name?.includes(requestId)
      )).map((artifact) => ({
        artifactId: artifact.artifact_id,
        fileName: artifact.file_name ?? null,
        contentType: artifact.content_type ?? null,
        size: artifact.size ?? null,
        status: artifact.status ?? null,
        runId: artifact.run_id ?? null,
      }));
      if (matches.some((artifact) => artifact.status === 'ready')) return matches;
      if (attempt < 11) await new Promise((resolve) => setTimeout(resolve, 750));
    }
    return [];
  }
}
