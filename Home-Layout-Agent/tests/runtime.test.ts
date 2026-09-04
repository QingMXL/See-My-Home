import test from 'node:test';
import assert from 'node:assert/strict';
import { ZooworkError, type SessionEvent, type ZooworkClient } from '@zoowork-ai/sdk';
import { HomeLayoutRuntime } from '../src/runtime.js';
import { validRequest, validResponse, validRoomMapResponse } from './fixtures.js';

test('posts one structured user event and stops streaming on run.finished', async () => {
  const postedTypes: string[] = [];
  let postedContent = '';
  const fakeClient = {
    async postEvents(
      _agentId: string,
      _sessionId: string,
      events: { type: string; content?: unknown }[],
    ) {
      postedTypes.push(...events.map((event) => event.type));
      postedContent = String(events[0]?.content ?? '');
      return {
        events: events.map((event, index) => ({
          id: `event_${index}`,
          seq: index,
          type: event.type,
          accepted: true,
        })),
      };
    },
    async *streamEvents(): AsyncGenerator<SessionEvent> {
      yield {
        seq: 1,
        eventType: 'run.started',
        payload: {},
        runId: 'run_001',
        cursor: 'pse1:1',
      };
      yield {
        seq: 2,
        eventType: 'agent.assistant',
        payload: {
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: JSON.stringify(validResponse()) }],
          },
        },
        runId: 'run_001',
        cursor: 'pse1:2',
      };
      yield {
        seq: 3,
        eventType: 'run.finished',
        payload: { status: 'succeeded' },
        runId: 'run_001',
        cursor: 'pse1:3',
      };
    },
    async listArtifacts() {
      return { artifacts: [], has_more: false };
    },
  } as unknown as ZooworkClient;

  const runtime = new HomeLayoutRuntime(fakeClient, 'agent_private_001');
  const result = await runtime.runStructuredTurn(
    {
      agentId: 'agent_private_001',
      sessionId: 'session_001',
    },
    validRequest(),
    null,
  );

  assert.deepEqual(postedTypes, ['user.message']);
  const envelope = JSON.parse(postedContent) as {
    runtime_contract: string;
    authoritative_state: { current_home_model: unknown };
    contracts: { agent_response_schema: unknown; home_model_schema: unknown };
    request: { request_id: string };
  };
  assert.equal(envelope.runtime_contract, 'home-layout-v2');
  assert.equal(envelope.authoritative_state.current_home_model, null);
  assert.ok(envelope.contracts.agent_response_schema);
  assert.ok(envelope.contracts.home_model_schema);
  assert.equal(envelope.request.request_id, 'req_demo_001');
  assert.equal(result.runOutcome, 'succeeded');
  assert.equal(result.cursor, 'pse1:3');
  assert.equal(result.response.request_id, 'req_demo_001');
});

test('uses the compact room-map contract for project.create', async () => {
  let postedContent = '';
  const verboseRoomMap = validRoomMapResponse();
  verboseRoomMap.summary = 'x'.repeat(1_300);
  verboseRoomMap.spaces[0]!.id = 'ROOM 1';
  verboseRoomMap.boundaries[0]!.separates_space_ids = ['ROOM 1'];
  const fakeClient = {
    async postEvents(_agentId: string, _sessionId: string, events: { content?: unknown }[]) {
      postedContent = String(events[0]?.content ?? '');
      return { events: [{ id: 'event_user', seq: 0, type: 'user.message', accepted: true }] };
    },
    async *streamEvents(): AsyncGenerator<SessionEvent> {
      yield { seq: 1, eventType: 'run.started', payload: {}, runId: 'run_map' };
      yield {
        seq: 2, eventType: 'agent.assistant', runId: 'run_map',
        payload: { message: { role: 'assistant', content: [{ type: 'text', text: JSON.stringify(verboseRoomMap) }] } },
      };
      yield { seq: 3, eventType: 'run.finished', payload: { status: 'succeeded' }, runId: 'run_map' };
    },
  } as unknown as ZooworkClient;
  const runtime = new HomeLayoutRuntime(fakeClient, 'agent_private_001');
  const result = await runtime.runRoomMapTurn(
    { agentId: 'agent_private_001', sessionId: 'session_room_map' },
    validRequest(),
    { type: 'project.create', project_id: 'home_demo_001' },
  );
  const envelope = JSON.parse(postedContent) as { runtime_contract: string; contracts: Record<string, unknown> };
  assert.equal(envelope.runtime_contract, 'room-map-v1');
  assert.ok(envelope.contracts.room_map_response_schema);
  assert.equal(result.response.spaces[0]?.id, 'room_1');
  assert.deepEqual(result.response.boundaries[0]?.separates_space_ids, ['room_1']);
  assert.equal(result.response.summary.length, 1_200);
});

test('recovers structured room-map JSON carried in sessions_yield.message', async () => {
  const roomMap = validRoomMapResponse();
  const fakeClient = {
    async postEvents() {
      return { events: [{ id: 'event_user', seq: 0, type: 'user.message', accepted: true }] };
    },
    async *streamEvents(): AsyncGenerator<SessionEvent> {
      yield { seq: 1, eventType: 'run.started', payload: {}, runId: 'run_room_map_yield' };
      yield {
        seq: 2,
        eventType: 'agent.tool',
        payload: {
          phase: 'start',
          toolName: 'sessions_yield',
          toolCallId: 'tool_yield_room_map',
          args: { message: JSON.stringify(roomMap) },
        },
        runId: 'run_room_map_yield',
      };
      yield {
        seq: 3,
        eventType: 'agent.tool',
        payload: {
          phase: 'end',
          toolName: 'sessions_yield',
          toolCallId: 'tool_yield_room_map',
          isError: false,
          resultPreview: 'Yielded — result preview truncated.',
        },
        runId: 'run_room_map_yield',
      };
      yield { seq: 4, eventType: 'run.finished', payload: { status: 'succeeded' }, runId: 'run_room_map_yield' };
    },
  } as unknown as ZooworkClient;

  const runtime = new HomeLayoutRuntime(fakeClient, 'agent_private_001', 0, 0);
  const result = await runtime.runRoomMapTurn(
    { agentId: 'agent_private_001', sessionId: 'session_room_map_yield' },
    validRequest(),
    { type: 'project.create', project_id: 'home_demo_001' },
  );

  assert.equal(result.response.spaces[0]?.suggested_function_code, 'living_room');
});

test('recovers a durable run.finished when the SSE stream closes early', async () => {
  const assistantEvent: SessionEvent = {
    seq: 12,
    eventType: 'agent.assistant',
    payload: {
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: JSON.stringify(validResponse()) }],
      },
    },
    runId: 'run_recovered',
  };
  const fakeClient = {
    async postEvents() {
      return {
        events: [{ id: 'event_user', seq: 10, type: 'user.message', accepted: true }],
      };
    },
    async *streamEvents(): AsyncGenerator<SessionEvent> {
      yield {
        seq: 11,
        eventType: 'run.started',
        payload: {},
        runId: 'run_recovered',
      };
      yield assistantEvent;
    },
    async listAllEvents() {
      return [
        {
          seq: 11,
          eventType: 'run.started',
          payload: {},
          runId: 'run_recovered',
        },
        assistantEvent,
        {
          seq: 13,
          eventType: 'run.finished',
          payload: { status: 'succeeded' },
          runId: 'run_recovered',
        },
      ] satisfies SessionEvent[];
    },
    async listArtifacts() {
      return { artifacts: [], has_more: false };
    },
  } as unknown as ZooworkClient;

  const runtime = new HomeLayoutRuntime(fakeClient, 'agent_private_001', 0, 0);
  const result = await runtime.runStructuredTurn(
    { agentId: 'agent_private_001', sessionId: 'session_recovery' },
    validRequest(),
    null,
  );

  assert.equal(result.runOutcome, 'succeeded');
  assert.equal(result.response.request_id, 'req_demo_001');
});

test('resumes SSE with its cursor and falls back to durable events after transient 503s', async () => {
  const streamCursors: Array<string | undefined> = [];
  const assistantEvent: SessionEvent = {
    seq: 12,
    eventType: 'agent.assistant',
    payload: {
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: JSON.stringify(validResponse()) }],
      },
    },
    runId: 'run_503_recovered',
  };
  const fakeClient = {
    async postEvents() {
      return {
        events: [{ id: 'event_user', seq: 10, type: 'user.message', accepted: true }],
      };
    },
    async *streamEvents(
      _agentId: string,
      _sessionId: string,
      options: { cursor?: string },
    ): AsyncGenerator<SessionEvent> {
      streamCursors.push(options.cursor);
      if (!options.cursor) {
        yield {
          seq: 11,
          eventType: 'run.started',
          payload: {},
          runId: 'run_503_recovered',
          cursor: 'pse1:11',
        };
      }
      throw new ZooworkError(503, 'events stream HTTP 503');
    },
    async listAllEvents() {
      return [
        {
          seq: 11,
          eventType: 'run.started',
          payload: {},
          runId: 'run_503_recovered',
        },
        assistantEvent,
        {
          seq: 13,
          eventType: 'run.finished',
          payload: { status: 'succeeded' },
          runId: 'run_503_recovered',
        },
      ] satisfies SessionEvent[];
    },
    async listArtifacts() {
      return { artifacts: [], has_more: false };
    },
  } as unknown as ZooworkClient;

  const runtime = new HomeLayoutRuntime(fakeClient, 'agent_private_001', 0, 1);
  const result = await runtime.runStructuredTurn(
    { agentId: 'agent_private_001', sessionId: 'session_503_recovery' },
    validRequest(),
    null,
  );

  assert.deepEqual(streamCursors, [undefined, 'pse1:11']);
  assert.equal(result.runOutcome, 'succeeded');
  assert.equal(result.response.request_id, 'req_demo_001');
});

test('interrupts the remote run when the local turn timeout expires', async () => {
  const postedTypes: string[] = [];
  const fakeClient = {
    async postEvents(_agentId: string, _sessionId: string, events: { type: string }[]) {
      postedTypes.push(...events.map((event) => event.type));
      return {
        events: events.map((event, index) => ({
          id: `event_${index}`,
          seq: event.type === 'user.message' ? 10 : 11,
          type: event.type,
          accepted: true,
        })),
      };
    },
    async *streamEvents(
      _agentId: string,
      _sessionId: string,
      options: { signal?: AbortSignal },
    ): AsyncGenerator<SessionEvent> {
      await new Promise<void>((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      });
    },
  } as unknown as ZooworkClient;
  const runtime = new HomeLayoutRuntime(fakeClient, 'agent_private_001', 0, 0, 10);

  await assert.rejects(
    () => runtime.runStructuredTurn(
      { agentId: 'agent_private_001', sessionId: 'session_timeout' },
      validRequest(),
      null,
    ),
    /timed out/,
  );
  assert.deepEqual(postedTypes, ['user.message', 'user.interrupt']);
});

test('accepts a complete structured response materialized by the Agent write tool', async () => {
  const fakeClient = {
    async postEvents() {
      return {
        events: [{ id: 'event_user', seq: 0, type: 'user.message', accepted: true }],
      };
    },
    async *streamEvents(): AsyncGenerator<SessionEvent> {
      yield {
        seq: 1,
        eventType: 'run.started',
        payload: {},
        runId: 'run_materialized',
      };
      yield {
        seq: 2,
        eventType: 'agent.tool',
        payload: {
          phase: 'start',
          toolName: 'write',
          toolCallId: 'tool_write_response',
          args: {
            path: '/workspace/response.json',
            content: JSON.stringify(validResponse()),
          },
        },
        runId: 'run_materialized',
      };
      yield {
        seq: 3,
        eventType: 'agent.assistant',
        payload: {
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'The complete JSON was materialized above.' }],
          },
        },
        runId: 'run_materialized',
      };
      yield {
        seq: 4,
        eventType: 'run.finished',
        payload: { status: 'succeeded' },
        runId: 'run_materialized',
      };
    },
    async listArtifacts() {
      return { artifacts: [], has_more: false };
    },
  } as unknown as ZooworkClient;

  const runtime = new HomeLayoutRuntime(fakeClient, 'agent_private_001', 0, 0);
  const result = await runtime.runStructuredTurn(
    { agentId: 'agent_private_001', sessionId: 'session_materialized' },
    validRequest(),
    null,
  );

  assert.equal(result.runOutcome, 'succeeded');
  assert.equal(result.response.request_id, 'req_demo_001');
  assert.match(result.rawText, /"schema_version":"1.0"/);
});

test('waits for the image attachment continuation before completing a visualize turn', async () => {
  const request = validRequest();
  request.operation = 'visualize';
  request.visualization_request = {
    mode: 'colorized_plan',
    selected_entity_refs: [],
  };
  const visualization = {
    ...validResponse(),
    operation: 'visualize' as const,
    home_model: null,
    message: 'The published layout is ready.',
    diagnosis: {
      based_on_model_revision: 1,
      finding_refs: [],
      opportunity_refs: [],
      summary: 'The layout keeps a clear circulation path.',
      assessment_items: [],
    },
    visualization_brief: {
      based_on_model_revision: 1,
      mode: 'colorized_plan' as const,
      fidelity_status: 'faithful_to_confirmed_geometry' as const,
      selected_entity_refs: [],
      frozen_elements: [],
      allowed_changes: ['Furniture and finishes only.'],
      positive_prompt: 'Create a source-faithful furnished plan.',
      negative_prompt: 'Do not move walls or add text.',
      preferred_providers: [],
    },
  };
  const premature = {
    ...visualization,
    message: 'The image callback has not arrived yet.',
    status: 'failed' as const,
  };
  const fakeClient = {
    async postEvents() {
      return {
        events: [{ id: 'event_user', seq: 0, type: 'user.message', accepted: true }],
      };
    },
    async *streamEvents(): AsyncGenerator<SessionEvent> {
      yield { seq: 1, eventType: 'run.started', payload: {}, runId: 'run_waiting' };
      yield {
        seq: 2,
        eventType: 'agent.assistant',
        payload: { message: { role: 'assistant', content: [{ type: 'text', text: JSON.stringify(premature) }] } },
        runId: 'run_waiting',
      };
      yield { seq: 3, eventType: 'run.finished', payload: { status: 'succeeded' }, runId: 'run_waiting' };
      yield { seq: 4, eventType: 'run.started', payload: {}, runId: 'run_continuation' };
      yield {
        seq: 5,
        eventType: 'agent.tool',
        payload: {
          phase: 'end',
          toolName: 'artifact_publish',
          toolCallId: 'tool_publish',
          isError: false,
          resultPreview: JSON.stringify({ artifactId: 'art_layout_001' }),
        },
        runId: 'run_continuation',
      };
      yield {
        seq: 6,
        eventType: 'agent.assistant',
        payload: { message: { role: 'assistant', content: [{ type: 'text', text: JSON.stringify(visualization) }] } },
        runId: 'run_continuation',
      };
      yield { seq: 7, eventType: 'run.finished', payload: { status: 'succeeded' }, runId: 'run_continuation' };
    },
    async listArtifacts() {
      return {
        artifacts: [{
          artifact_id: 'art_layout_001',
          file_name: 'home_demo_001_req_demo_001_layout.png',
          source_path: '/workspace/artifacts/home_demo_001/home_demo_001_req_demo_001_layout.png',
          content_type: 'image/png',
          size: 1024,
          status: 'ready',
          run_id: 'run_continuation',
        }],
        has_more: false,
      };
    },
  } as unknown as ZooworkClient;

  const runtime = new HomeLayoutRuntime(fakeClient, 'agent_private_001', 0, 0);
  const result = await runtime.runStructuredTurn(
    { agentId: 'agent_private_001', sessionId: 'session_visualize' },
    request,
    null,
  );

  assert.equal(result.runId, 'run_continuation');
  assert.equal(result.response.message, 'The published layout is ready.');
  assert.equal(result.artifacts[0]?.artifactId, 'art_layout_001');
});

test('completes a reviewed visualize failure after materialization without waiting for publication', async () => {
  const request = validRequest();
  request.operation = 'visualize';
  request.visualization_request = {
    mode: 'colorized_plan',
    selected_entity_refs: [],
  };
  const rejected = {
    ...validResponse(),
    operation: 'visualize' as const,
    status: 'failed' as const,
    home_model: null,
    message: 'The generated plan failed image quality review.',
    diagnosis: {
      based_on_model_revision: 1,
      finding_refs: [],
      opportunity_refs: [],
      summary: 'No design assessment was published from the rejected image.',
      assessment_items: [],
    },
    visualization_brief: {
      based_on_model_revision: 1,
      mode: 'colorized_plan' as const,
      fidelity_status: 'faithful_to_confirmed_geometry' as const,
      selected_entity_refs: [],
      frozen_elements: [],
      allowed_changes: ['Furniture and finishes only.'],
      positive_prompt: 'Create a source-faithful furnished plan.',
      negative_prompt: 'Do not duplicate primary fixtures.',
      preferred_providers: [],
    },
    warnings: ['Primary Bedroom contains 2 beds; expected exactly 1.'],
  };
  let artifactReads = 0;
  const fakeClient = {
    async postEvents() {
      return { events: [{ id: 'event_user', seq: 0, type: 'user.message', accepted: true }] };
    },
    async *streamEvents(): AsyncGenerator<SessionEvent> {
      yield { seq: 1, eventType: 'run.started', payload: {}, runId: 'run_rejected' };
      yield {
        seq: 2,
        eventType: 'agent.tool',
        payload: {
          phase: 'end', toolName: 'media_materialize', toolCallId: 'tool_materialize', isError: false,
          resultPreview: JSON.stringify({ path: '/workspace/artifacts/home_demo_001/rejected.png' }),
        },
        runId: 'run_rejected',
      };
      yield {
        seq: 3,
        eventType: 'agent.assistant',
        payload: { message: { role: 'assistant', content: [{ type: 'text', text: JSON.stringify(rejected) }] } },
        runId: 'run_rejected',
      };
      yield { seq: 4, eventType: 'run.finished', payload: { status: 'succeeded' }, runId: 'run_rejected' };
    },
    async listArtifacts() {
      artifactReads += 1;
      return { artifacts: [], has_more: false };
    },
  } as unknown as ZooworkClient;

  const runtime = new HomeLayoutRuntime(fakeClient, 'agent_private_001', 0, 0);
  const result = await runtime.runStructuredTurn(
    { agentId: 'agent_private_001', sessionId: 'session_rejected' },
    request,
    null,
  );

  assert.equal(result.response.status, 'failed');
  assert.deepEqual(result.artifacts, []);
  assert.equal(artifactReads, 0);
});
