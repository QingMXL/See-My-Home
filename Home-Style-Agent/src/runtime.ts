import { readFileSync } from 'node:fs';
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
  AgentArtifact,
  AgentToolTrace,
  ConversationHandle,
  StyleAgentResponse,
  StyleTurnRequest,
  StyleTurnResult,
} from './contracts.js';
import { responseSchemaPath } from './paths.js';
import { assertStyleTurnRequest, parseStyleAgentResponse } from './validation.js';

const RESPONSE_SCHEMA = JSON.parse(readFileSync(responseSchemaPath, 'utf8')) as unknown;
export const MODERN_EAST_KNOWLEDGE_VERSION = '0.1-research';

export interface HomeStyleRuntimeOptions {
  agentId: string;
  apiKey?: string;
  baseUrl?: string;
  turnTimeoutMs?: number;
  maxStreamReconnects?: number;
}

export class HomeStyleTurnTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`ZooWork Home Style turn timed out after ${timeoutMs} ms`);
    this.name = 'HomeStyleTurnTimeoutError';
  }
}

interface RawTurnResult {
  text: string;
  outcome: 'succeeded' | 'failed' | 'aborted';
  toolCalls: AgentToolTrace[];
  cursor?: string;
  runId?: string;
}

export interface StyleTurnStart {
  postedSeq: number;
}

export type StyleTurnPoll =
  | { status: 'processing'; postedSeq: number }
  | { status: 'completed'; result: StyleTurnResult };

export class HomeStyleRuntime {
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

  static fromEnvironment(options: HomeStyleRuntimeOptions): HomeStyleRuntime {
    const config: { apiKey?: string; baseUrl?: string } = {};
    if (options.apiKey !== undefined) config.apiKey = options.apiKey;
    if (options.baseUrl !== undefined) config.baseUrl = options.baseUrl;
    return new HomeStyleRuntime(
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

  async createConversation(homeId: string, conversationKey: string): Promise<ConversationHandle> {
    if (!homeId.trim() || !conversationKey.trim()) throw new Error('homeId and conversationKey are required');
    const session = await this.client.createSession(
      this.agentId,
      { metadata: { application: 'see-my-home', agent_key: 'home-style', home_id: homeId, conversation_key: conversationKey } },
      `home-style-session:${conversationKey}`,
    );
    return { agentId: this.agentId, sessionId: session.session_id };
  }

  async runStyleTurn(conversation: ConversationHandle, request: StyleTurnRequest): Promise<StyleTurnResult> {
    assertStyleTurnRequest(request);
    if (conversation.agentId !== this.agentId) throw new Error('conversation belongs to a different Agent');
    const raw = await this.postAndRead(conversation.sessionId, this.buildEvents(request), request.request_id);
    return this.styleResult(conversation.sessionId, request, raw);
  }

  async startStyleTurn(conversation: ConversationHandle, request: StyleTurnRequest): Promise<StyleTurnStart> {
    assertStyleTurnRequest(request);
    if (conversation.agentId !== this.agentId) throw new Error('conversation belongs to a different Agent');
    const postedSeq = await this.postTurnEvents(conversation.sessionId, this.buildEvents(request));
    return { postedSeq };
  }

  async pollStyleTurn(
    conversation: ConversationHandle,
    request: StyleTurnRequest,
    postedSeq: number,
  ): Promise<StyleTurnPoll> {
    assertStyleTurnRequest(request);
    if (conversation.agentId !== this.agentId) throw new Error('conversation belongs to a different Agent');
    if (!Number.isSafeInteger(postedSeq) || postedSeq < 0) throw new Error('postedSeq is invalid');
    const raw = await this.readDurableTurn(conversation.sessionId, postedSeq);
    if (!raw) return { status: 'processing', postedSeq };
    return { status: 'completed', result: await this.styleResult(conversation.sessionId, request, raw) };
  }

  private async styleResult(
    sessionId: string,
    request: StyleTurnRequest,
    raw: RawTurnResult,
  ): Promise<StyleTurnResult> {
    if (raw.outcome !== 'succeeded') throw new Error(`ZooWork run ended with status ${raw.outcome}`);
    const response = parseStyleAgentResponse(raw.text);
    if (response.request_id !== request.request_id) throw new Error('Style response request_id does not match request');
    if (response.style_id !== request.style_id) throw new Error('Style response style_id does not match request');
    if (response.knowledge_version !== MODERN_EAST_KNOWLEDGE_VERSION) {
      throw new Error('Style response knowledge_version does not match the deployed catalog');
    }
    const passedQa = response.qa.structure_preserved
      && response.qa.camera_preserved
      && response.qa.style_passed
      && response.qa.publishable;
    const artifacts = response.status === 'completed' && passedQa
      ? await this.artifactsForTurn(sessionId, raw.runId, raw.toolCalls, request.request_id)
      : [];
    const result: StyleTurnResult = {
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

  private buildEvents(request: StyleTurnRequest): OutboundEvent[] {
    const filename = `${request.home_id}_${request.request_id}_style.png`;
    const hasStyleReference = Boolean(request.style_reference_asset_ref);
    const aestheticSourceInstruction = hasStyleReference
      ? 'Read the modern-east-style Skill for residential quality, structural safety, and negative constraints. Treat style_reference_asset_ref as the user-selected primary aesthetic evidence for colors, material character, furniture language, styling density, and lighting only; do not copy its room architecture, layout, camera, text, artwork, or identifiable objects.'
      : 'Read and use the modern-east-style Skill as the only aesthetic source.';
    const inspectInstruction = hasStyleReference
      ? 'Inspect source_asset_ref and style_reference_asset_ref once each with the available ZooWork visual tool before composing the edit prompt. Record which visual facts belong to structure versus style.'
      : 'Inspect source_asset_ref once with the available ZooWork visual tool before composing the edit prompt.';
    const designerImagesInstruction = hasStyleReference
      ? 'Pass exactly two images through the Designer --images argument in this order: source_asset_ref first as the immutable room and style_reference_asset_ref second as aesthetic reference only. Pass the exact aspect ratio detected from source_asset_ref through --aspect-ratio, request one image, and use the highest practical output quality supported by the selected Designer model. Run inline in this session; do not spawn a subagent and do not call sessions_yield.'
      : 'Pass source_asset_ref once through the Designer --images argument, pass the exact aspect ratio detected from the source through --aspect-ratio, request one image, and use the highest practical output quality supported by the selected Designer model. Run inline in this session; do not spawn a subagent and do not call sessions_yield.';
    return [{
      type: 'user.message',
      idempotency_key: `${request.request_id}:style`,
      content: JSON.stringify({
        runtime_contract: 'home-style-v1',
        runtime_timestamp: new Date().toISOString(),
        selected_knowledge: {
          style_id: request.style_id,
          skill_name: 'modern-east-style',
          knowledge_version: MODERN_EAST_KNOWLEDGE_VERSION,
        },
        contracts: { response_schema: RESPONSE_SCHEMA },
        request,
        output_requirement: [
          `${aestheticSourceInstruction} Also read the Designer Skill and only the references it requires for the current image-edit model-routing decision.`,
          inspectInstruction,
          'Treat the visible room envelope, walls, columns, beams, doors, windows, openings, ceiling outline and height, fixed service locations, camera position, lens perspective, and crop as immutable. User preferences never override these constraints.',
          'Change only the furnishing and finish categories permitted by renovation_scope. Keep the result a believable American residence at the source room scale.',
          'Build the English image-edit prompt from the Skill schema and room component. Do not include research sources, firm names, designer names, or unsupported weighting syntax.',
          'The See My Home UI click is explicit authorization to generate one image now. Do not ask the user to choose a model, do not write Designer preferences, and do not pause for confirmation.',
          'Use the Designer Skill existing-image workflow and its image_generation_cli.py. Do not call the generic image_generate tool. For this constraint-heavy edit, prioritize the Designer routing rule for strongest instruction fidelity and source adherence over lowest cost.',
          designerImagesInstruction,
          `Capture the single output path printed by the Designer CLI and copy it to "/workspace/artifacts/${request.home_id}/${filename}". An empty output path or failed command is a failed response.`,
          'Inspect the copied output image once and compare it with the original at the level of crop, camera position, perspective, wall and ceiling boundaries, columns, beams, window and door count, opening size and position, and fixed service locations.',
          'If the raster is missing, corrupt, or any immutable structure or camera geometry changed, do not publish it. Return status="failed", qa.publishable=false, and precise warnings.',
          'If structure and camera are preserved and the style avoids all forbidden patterns, call artifact_publish exactly once. Return status="completed" and use the returned artifact id.',
          'Return one compact JSON object matching response_schema immediately after the publish-or-withhold decision. Keep style_summary under 700 characters and every warning under 280 characters. Do not use Markdown fences, append an artifact link or filename after the JSON, or request another API key.',
        ].join(' '),
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

    const ingest = (event: Parameters<typeof assistantText>[0]): void => {
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
        finalOutcome = outcome;
        runId = event.runId ?? runId;
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
      throw new HomeStyleTurnTimeoutError(this.turnTimeoutMs);
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
    let cursor: string | undefined;
    let runId: string | undefined;
    let finalOutcome: RawTurnResult['outcome'] | undefined;

    for (const event of [...events].sort((left, right) => left.seq - right.seq)) {
      if (event.seq <= postedSeq) continue;
      cursor = event.cursor ?? cursor;
      if (event.eventType === 'run.started') runId = event.runId;
      const message = assistantText(event);
      if (message) assistantBySeq.set(event.seq, message);
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
      const outcome = runOutcome(event);
      if (!outcome) continue;
      finalOutcome = outcome;
      runId = event.runId ?? runId;
      break;
    }

    if (!finalOutcome) return null;
    const result: RawTurnResult = {
      text: [...assistantBySeq.entries()].sort(([a], [b]) => a - b).map(([, text]) => text).join(''),
      outcome: finalOutcome,
      toolCalls: [...toolsBySeq.entries()].sort(([a], [b]) => a - b).map(([, call]) => call),
    };
    if (cursor !== undefined) result.cursor = cursor;
    if (runId !== undefined) result.runId = runId;
    return result;
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
