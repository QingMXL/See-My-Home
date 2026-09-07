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
  FurnitureTurnRequest,
  FurnitureTurnResult,
} from './contracts.js';
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

export type FurnitureTurnPoll =
  | { status: 'processing'; postedSeq: number }
  | { status: 'completed'; result: FurnitureTurnResult };

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
    if (agent.status?.desired_state !== 'running') await this.client.startAgent(this.agentId);
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
    const raw = await this.readDurableTurn(conversation.sessionId, postedSeq);
    if (!raw) return { status: 'processing', postedSeq };
    return { status: 'completed', result: await this.resultFromRaw(conversation.sessionId, request, raw) };
  }

  private async resultFromRaw(
    sessionId: string,
    request: FurnitureTurnRequest,
    raw: RawTurnResult,
  ): Promise<FurnitureTurnResult> {
    if (raw.outcome !== 'succeeded') throw new Error(`ZooWork run ended with status ${raw.outcome}`);
    const response = parseFurnitureAgentResponse(raw.text);
    assertResponseMatchesRequest(response, request);
    const passedQa = (!request.sketch_asset_ref || response.qa.sketch_geometry_preserved)
      && (!request.inspiration_asset_ref || response.qa.inspiration_language_applied)
      && response.qa.dimensions_consistent
      && response.qa.function_plausible
      && response.qa.publishable;
    const generatedOrthographicCandidate = request.output_mode === 'orthographic_sheet'
      && response.status !== 'failed'
      && response.qa.function_plausible
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
    const filename = `${request.project_id}_${request.request_id}_${orthographic ? `orthographic-${view}` : 'table'}.png`;
    const sources = [
      request.sketch_asset_ref ? `Inspect sketch_asset_ref exactly once with image: ${request.sketch_asset_ref}` : '',
      request.inspiration_asset_ref ? `Inspect inspiration_asset_ref exactly once with image: ${request.inspiration_asset_ref}` : '',
      request.render_asset_ref ? `Inspect render_asset_ref exactly once with image: ${request.render_asset_ref}` : '',
    ].filter(Boolean).join(' ');
    const orthographicDimensions = request.confirmed_design_spec?.dimensions_mm;
    const orthographicInventory = request.confirmed_design_spec?.components
      .map((component) => `${component.quantity} × ${component.role}: ${component.name}`)
      .join('; ');
    const outputRequirement = orthographic
      ? [
          `Use table-concept-renderer in orthographic-sheet mode for the ${view} view. The confirmed design specification is immutable.`,
          sources,
          'Treat render_asset_ref as the sole visual authority. Do not inspect any image URL more than once.',
          `Generate one single full-object ${view} orthographic line view. Do not generate the other two views and do not make a three-panel sheet. Center the complete furniture with clear, even margins on every side.`,
          `The confirmed overall dimensions are width ${orthographicDimensions?.width} mm, depth ${orthographicDimensions?.depth} mm, and height ${orthographicDimensions?.height} mm. Preserve the ${view === 'front' ? 'width-to-height' : view === 'side' ? 'depth-to-height' : 'width-to-depth'} proportion recognizably; the application will typeset the exact values after generation.`,
          `Required component inventory: ${orthographicInventory || 'use confirmed_design_spec exactly'}. Every listed component that is visible from the ${view} direction must match render_asset_ref in count, placement, silhouette, open-or-closed state, and major curved details. Do not redesign, stylize, simplify, merge, add, or remove components.`,
          `This raster is the ${view} geometry layer for a CAD-like concept sheet. Use true orthographic projection with no perspective convergence and keep the whole object comfortably inside the canvas.`,
          'Use a pure white background with crisp solid-black technical outlines. No beige or grey background, room scene, material rendering, tonal fill, shading, shadows, decorative props, extra views, border, title block, written labels, dimension numbers, logos, or watermark.',
          `Call image_generate exactly once with action="generate", render_asset_ref as the supported source image input, quality="high", and filename="${filename}". Use only arguments exposed by the current tool schema; never invent model, provider, numeric image-weight, or control-strength fields.`,
          'After generation starts, call sessions_yield exactly once and end the waiting run.',
          `In the attachment continuation, call media_materialize exactly once for the returned artifactId with path="/workspace/artifacts/${request.project_id}/${filename}". Inspect the materialized image exactly once.`,
          `Publish only when the image contains one readable, complete ${view} orthographic view that recognizably matches the confirmed furniture. Fail when it is missing, cropped, perspective-only, materially different, contains multiple views, or loses visible major components. Minor raster proportion drift may be reported as a warning because the application adds the exact dimension labels without deforming the image.`,
          'Echo request.confirmed_design_spec exactly and without changing any value in response.design_spec. Set absent sketch and inspiration QA fields to true.',
          `For a readable single ${view} geometry layer, call artifact_publish exactly once and return status=completed with its artifact id. Treat dimensions_consistent as confirmation that the returned structured specification is unchanged; use warnings for minor raster proportion drift.`,
          `Write design_summary, questions, warnings, and other user-facing prose in ${request.locale === 'zh-CN' ? 'Simplified Chinese' : 'English'}. Do not expose internal QA reasoning as user guidance.`,
          'Return one compact JSON object matching response_schema without Markdown fences. This is concept-level only, not fabrication-ready engineering.',
        ]
      : [
          'Use table-design-spec, then table-concept-renderer in concept-render mode.',
          sources,
          'Do not call any image URL more than once for inspection.',
          'Treat only request.locked_controls as hard UI constraints. Unlocked design_controls are fallback suggestions; do not report a conflict merely because clear sketch or text evidence differs from an unlocked fallback.',
          'When dimensions_mm is locked, use it unchanged. Otherwise infer coherent dimensions from explicit text first, then the visual sources, and only then the fallback dimensions.',
          'Resolve a dimensionally coherent concept specification before generating.',
          request.sketch_asset_ref
            ? 'The sketch controls topology, component count and placement, proportions, and camera viewpoint according to source_priority. Match its viewing angle, elevation, visible faces, and framing; do not force a generic three-quarter view. Explicitly preserve every visible drawer, shelf, support, and handle unless a locked control overrides it.'
            : 'With no sketch, use a clean readable three-quarter product view unless the written brief clearly requests another viewpoint.',
          `Call image_generate exactly once with action="generate", a supported source image input when available, a clean isolated product-render prompt, quality="high", and filename="${filename}". Use only arguments exposed by the current tool schema; never invent provider, model, numeric image-weight, or control-strength fields.`,
          'Do not ask the image model for orthographic drawings, dimensions, text, labels, logos, or a drawing sheet.',
          'After generation starts, call sessions_yield exactly once and end the waiting run.',
          `In the attachment continuation, call media_materialize exactly once for the returned artifactId with path="/workspace/artifacts/${request.project_id}/${filename}". Inspect the materialized image exactly once.`,
          'If the raster is missing, corrupt, not recognizably the requested table, or materially contradicts the validated major components, do not publish it and return failed with qa.publishable=false.',
          'Otherwise call artifact_publish exactly once and return status=completed with its artifact id.',
          'Treat absent sketch or inspiration QA as satisfied when that source was not provided.',
          `Write every human-readable response field, including design_summary, questions, warnings, drawing_notes, material part/material/finish names, and component names, in ${request.locale === 'zh-CN' ? 'Simplified Chinese' : 'English'}. Keep schema keys, ids, enums, and numeric values unchanged.`,
          'Return one compact JSON object matching response_schema without Markdown fences. This is concept-level only, not fabrication-ready engineering.',
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
        if (outcome !== 'succeeded' || (this.hasJson(assistantBySeq) && this.hasTerminalTool(toolsBySeq))) {
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

  private async readDurableTurn(sessionId: string, postedSeq: number): Promise<RawTurnResult | null> {
    const events = await this.client.listAllEvents(this.agentId, sessionId, {
      types: ['run.started', 'run.finished', 'agent.assistant', 'agent.tool'],
    });
    const assistantBySeq = new Map<number, string>();
    const toolsBySeq = new Map<number, AgentToolTrace>();
    let runId: string | undefined;
    let outcome: RawTurnResult['outcome'] | undefined;

    for (const event of [...events].sort((left, right) => left.seq - right.seq)) {
      if (event.seq <= postedSeq) continue;
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
      if (!isRunFinished(event)) continue;
      const candidate = runOutcome(event);
      if (!candidate) continue;
      if (candidate !== 'succeeded' || (this.hasJson(assistantBySeq) && this.hasTerminalTool(toolsBySeq))) {
        outcome = candidate;
        runId = event.runId ?? runId;
        break;
      }
    }

    if (!outcome) return null;
    const result: RawTurnResult = {
      text: [...assistantBySeq.entries()].sort(([a], [b]) => a - b).map(([, text]) => text).join(''),
      outcome,
      toolCalls: [...toolsBySeq.entries()].sort(([a], [b]) => a - b).map(([, call]) => call),
    };
    if (runId !== undefined) result.runId = runId;
    return result;
  }

  private hasJson(messages: Map<number, string>): boolean {
    return [...messages.entries()].sort(([a], [b]) => b - a).some(([, candidate]) => {
      try { extractJsonObject(candidate); return true; }
      catch { return false; }
    });
  }

  private hasTerminalTool(tools: Map<number, AgentToolTrace>): boolean {
    return [...tools.values()].some((call) => call.phase === 'end'
      && (call.toolName === 'artifact_publish' || call.toolName === 'media_materialize'));
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
