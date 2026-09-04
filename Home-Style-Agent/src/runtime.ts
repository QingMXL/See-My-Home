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
import { assertStyleTurnRequest, extractJsonObject, parseStyleAgentResponse } from './validation.js';

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
      ? await this.artifactsForTurn(conversation.sessionId, raw.runId, raw.toolCalls, request.request_id)
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
          'Use the modern-east-style Skill and no other aesthetic style.',
          'Inspect source_asset_ref once with the available ZooWork visual tool before composing the edit prompt.',
          'Treat the visible room envelope, walls, columns, beams, doors, windows, openings, ceiling outline and height, fixed service locations, camera position, lens perspective, and crop as immutable. User preferences never override these constraints.',
          'Change only the furnishing and finish categories permitted by renovation_scope. Keep the result a believable American residence at the source room scale.',
          'Build the English image-edit prompt from the Skill schema and room component. Do not include research sources, firm names, designer names, or unsupported weighting syntax.',
          `Call image_generate exactly once with action="generate", the source image when the current tool schema supports its image input, the compiled prompt, quality="high", filename="${filename}", and the source aspect ratio when the tool exposes it. Omit any model or provider field not present in the current tool schema.`,
          'Do not call image_generate list/status and do not start a second generation attempt.',
          'After generation starts, call sessions_yield exactly once, end that run with a brief waiting sentence, and wait for ZooWork to start the continuation run.',
          `In the continuation, call media_materialize exactly once for the returned attachment artifactId with path="/workspace/artifacts/${request.home_id}/${filename}". Inspect the materialized image once and compare it with the original structural anchors.`,
          'If the raster is missing, corrupt, or any immutable structure or camera geometry changed, do not publish it. Return status="failed", qa.publishable=false, and precise warnings.',
          'If structure and camera are preserved and the style avoids all forbidden patterns, call artifact_publish exactly once. Return status="completed" and use the returned artifact id.',
          'Return one compact JSON object matching response_schema. Do not use Markdown fences and do not request another API key.',
        ].join(' '),
      }),
    }];
  }

  private async postAndRead(sessionId: string, events: OutboundEvent[], requestId: string): Promise<RawTurnResult> {
    const receipt = await this.client.postEvents(this.agentId, sessionId, events);
    const rejected = receipt.events.find((event) => event.accepted !== true);
    if (rejected) throw new Error(`ZooWork rejected outbound event ${rejected.type ?? 'unknown'}`);
    const posted = receipt.events.find((event) => event.type === 'user.message');
    const postedSeq = typeof posted?.seq === 'number' ? posted.seq : undefined;
    if (postedSeq === undefined) throw new Error('ZooWork accepted the user turn without returning its sequence');

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

  private hasJson(messages: Map<number, string>): boolean {
    const candidates = [...messages.entries()].sort(([a], [b]) => b - a).map(([, text]) => text);
    return candidates.some((candidate) => {
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
