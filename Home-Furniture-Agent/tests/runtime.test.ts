import assert from 'node:assert/strict';
import test from 'node:test';
import type { SessionEvent, ZooworkClient } from '@zoowork-ai/sdk';
import type { FurnitureAgentResponse, FurnitureTurnRequest } from '../src/contracts.js';
import { HomeFurnitureRuntime, orthographicProjectionQaPassed } from '../src/runtime.js';

const request: FurnitureTurnRequest = {
  contract_version: 'home-furniture-v1',
  output_mode: 'concept_render',
  request_id: 'req_async_001',
  project_id: 'furniture_async_001',
  locale: 'zh-CN',
  table_type: 'dining_table',
  description: '一张简洁的实木餐桌。',
  source_priority: { sketch: 0, inspiration: 0 },
  locked_controls: ['dimensions_mm'],
  design_controls: {
    dimensions_mm: { width: 1800, depth: 900, height: 750 },
    primary_material: 'White Oak',
    secondary_material: 'Blackened Steel',
    top_shape: 'rectangular',
    edge_profile: 'Soft Radius',
    base_style: 'Four Tapered Legs',
    finish: 'Matte Clear Oil',
    storage: 'No Storage',
  },
};

const response: FurnitureAgentResponse = {
  contract_version: 'home-furniture-v1',
  request_id: request.request_id,
  status: 'completed',
  table_type: 'dining_table',
  artifact_id: 'art_async_001',
  design_summary: '一张简洁的白橡木餐桌。',
  design_spec: {
    dimensions_mm: request.design_controls.dimensions_mm,
    top: { shape: 'rectangular', edge_profile: 'Soft Radius', thickness_mm: 32 },
    base: { style: 'Four Tapered Legs', support_count: 4, inset_mm: 80 },
    materials: [{ part: 'Top', material: 'White Oak', finish: 'Matte Clear Oil' }],
    components: [
      { id: 'top', name: 'Table top', role: 'top', quantity: 1 },
      { id: 'legs', name: 'Table legs', role: 'support', quantity: 4 },
    ],
    drawing_notes: ['Concept dimensions only.'],
  },
  questions: [],
  warnings: [],
  qa: {
    sketch_geometry_preserved: true,
    inspiration_language_applied: true,
    dimensions_consistent: true,
    function_plausible: true,
    publishable: true,
  },
};

test('starts a furniture turn and completes it through durable polling', async () => {
  let reads = 0;
  const fakeClient = {
    async postEvents() {
      return { events: [{ id: 'event_user', seq: 10, type: 'user.message', accepted: true }] };
    },
    async listAllEvents() {
      reads += 1;
      const started: SessionEvent = { seq: 11, eventType: 'run.started', payload: {}, runId: 'run_async' };
      if (reads === 1) return [started];
      return [
        started,
        {
          seq: 12,
          eventType: 'agent.tool',
          payload: {
            phase: 'end', toolName: 'artifact_publish', toolCallId: 'tool_publish', isError: false,
            resultPreview: JSON.stringify({ artifactId: 'art_async_001' }),
          },
          runId: 'run_async',
        },
        {
          seq: 13,
          eventType: 'agent.assistant',
          payload: { message: { role: 'assistant', content: [{ type: 'text', text: JSON.stringify(response) }] } },
          runId: 'run_async',
        },
        { seq: 14, eventType: 'run.finished', payload: { status: 'succeeded' }, runId: 'run_async' },
      ] satisfies SessionEvent[];
    },
    async getArtifact() {
      return {
        artifact_id: 'art_async_001',
        file_name: 'furniture_async_001_req_async_001_table.png',
        source_path: '/workspace/artifacts/furniture_async_001/furniture_async_001_req_async_001_table.png',
        content_type: 'image/png',
        size: 1024,
        status: 'ready',
        run_id: 'run_async',
      };
    },
  } as unknown as ZooworkClient;
  const runtime = new HomeFurnitureRuntime(fakeClient, 'agent_private_001');
  const conversation = { agentId: 'agent_private_001', sessionId: 'session_async' };

  const started = await runtime.startFurnitureTurn(conversation, request);
  const pending = await runtime.pollFurnitureTurn(conversation, request, started.postedSeq);
  const completed = await runtime.pollFurnitureTurn(conversation, request, started.postedSeq);

  assert.deepEqual(started, { postedSeq: 10 });
  assert.deepEqual(pending, { status: 'processing', postedSeq: 10, progress: 'analyzing' });
  assert.equal(completed.status, 'completed');
  if (completed.status === 'completed') {
    assert.equal(completed.result.response.request_id, request.request_id);
    assert.equal(completed.result.artifacts[0]?.artifactId, 'art_async_001');
  }
});

test('completes a successful confirmation response even when no image was generated', async () => {
  const confirmationResponse: FurnitureAgentResponse = {
    ...response,
    status: 'needs_confirmation',
    artifact_id: undefined,
    design_summary: 'The uploaded sketch is not a table, so no render was generated.',
    questions: ['Please upload a table sketch or confirm that the sketch should be ignored.'],
    qa: { ...response.qa, function_plausible: false, publishable: false },
  };
  const fakeClient = {
    async listAllEvents() {
      return [
        { seq: 11, eventType: 'run.started', payload: {}, runId: 'run_confirmation' },
        {
          seq: 12,
          eventType: 'agent.tool',
          payload: { phase: 'end', toolName: 'image', toolCallId: 'tool_inspect', isError: false },
          runId: 'run_confirmation',
        },
        {
          seq: 13,
          eventType: 'agent.assistant',
          payload: { message: { role: 'assistant', content: [{ type: 'text', text: JSON.stringify(confirmationResponse) }] } },
          runId: 'run_confirmation',
        },
        { seq: 14, eventType: 'run.finished', payload: { status: 'succeeded' }, runId: 'run_confirmation' },
      ] satisfies SessionEvent[];
    },
  } as unknown as ZooworkClient;
  const runtime = new HomeFurnitureRuntime(fakeClient, 'agent_private_001');

  const completed = await runtime.pollFurnitureTurn(
    { agentId: 'agent_private_001', sessionId: 'session_confirmation' },
    request,
    10,
  );

  assert.equal(completed.status, 'completed');
  if (completed.status === 'completed') {
    assert.equal(completed.result.response.status, 'needs_confirmation');
    assert.deepEqual(completed.result.artifacts, []);
  }
});

test('reports durable concept-render progress from ZooWork tool events', async () => {
  let reads = 0;
  const fakeClient = {
    async listAllEvents() {
      reads += 1;
      const events: SessionEvent[] = [
        { seq: 11, eventType: 'run.started', payload: {}, runId: 'run_progress' },
        {
          seq: 12,
          eventType: 'agent.assistant',
          payload: { message: { role: 'assistant', content: [{ type: 'text', text: 'Resolving the specification.' }] } },
          runId: 'run_progress',
        },
      ];
      if (reads >= 2) events.push({
        seq: 13,
        eventType: 'agent.tool',
        payload: { phase: 'start', toolName: 'image_generate', toolCallId: 'tool_generate' },
        runId: 'run_progress',
      });
      if (reads >= 3) events.push({
        seq: 14,
        eventType: 'agent.tool',
        payload: { phase: 'start', toolName: 'media_materialize', toolCallId: 'tool_materialize' },
        runId: 'run_progress',
      });
      return events;
    },
  } as unknown as ZooworkClient;
  const runtime = new HomeFurnitureRuntime(fakeClient, 'agent_private_001');
  const conversation = { agentId: 'agent_private_001', sessionId: 'session_progress' };

  assert.equal((await runtime.pollFurnitureTurn(conversation, request, 10)).status, 'processing');
  assert.deepEqual(await runtime.pollFurnitureTurn(conversation, request, 10), {
    status: 'processing', postedSeq: 10, progress: 'rendering',
  });
  assert.deepEqual(await runtime.pollFurnitureTurn(conversation, request, 10), {
    status: 'processing', postedSeq: 10, progress: 'publishing',
  });
});

test('builds a compact sketch-led concept request without post-generation reinspection', async () => {
  let postedContent = '';
  const fakeClient = {
    async postEvents(_agentId: string, _sessionId: string, events: { content?: string }[]) {
      postedContent = events[0]?.content ?? '';
      return { events: [{ id: 'event_concept', seq: 20, type: 'user.message', accepted: true }] };
    },
  } as unknown as ZooworkClient;
  const runtime = new HomeFurnitureRuntime(fakeClient, 'agent_private_001');
  await runtime.startFurnitureTurn(
    { agentId: 'agent_private_001', sessionId: 'session_concept' },
    { ...request, sketch_asset_ref: 'https://example.com/sketch.png', source_priority: { sketch: 1, inspiration: 0 } },
  );

  const posted = JSON.parse(postedContent) as { output_requirement: string };
  assert.match(posted.output_requirement, /Preserve the sketch viewpoint, topology, proportions, component count, and placement/i);
  assert.match(posted.output_requirement, /quality="high"/i);
  assert.match(posted.output_requirement, /Do not call image to inspect the generated concept render a second time/i);
});

test('builds a strict single-view black-and-white orthographic request', async () => {
  let postedContent = '';
  const fakeClient = {
    async postEvents(_agentId: string, _sessionId: string, events: { content?: string }[]) {
      postedContent = events[0]?.content ?? '';
      return { events: [{ id: 'event_ortho', seq: 20, type: 'user.message', accepted: true }] };
    },
  } as unknown as ZooworkClient;
  const runtime = new HomeFurnitureRuntime(fakeClient, 'agent_private_001');
  const orthographicRequest: FurnitureTurnRequest = {
    ...request,
    output_mode: 'orthographic_sheet',
    orthographic_view: 'front',
    render_asset_ref: 'https://example.com/confirmed.png',
    confirmed_design_spec: response.design_spec,
    description: response.design_summary,
    source_priority: { sketch: 0, inspiration: 0 },
    locked_controls: [],
  };

  await runtime.startFurnitureTurn({ agentId: 'agent_private_001', sessionId: 'session_ortho' }, orthographicRequest);

  assert.match(postedContent, /visible outer silhouette noticeably heavier than internal component edges/i);
  assert.match(postedContent, /standard furniture shop-drawing sheet/i);
  assert.match(postedContent, /width 1800 mm, depth 900 mm, and height 750 mm/i);
  assert.match(postedContent, /single full-object front orthographic line view/i);
  assert.match(postedContent, /do not make a three-panel sheet/i);
  assert.match(postedContent, /Write design_summary, questions, warnings.*Simplified Chinese/i);
});

test('builds a strict directly-overhead visible-surfaces-only top plan request', async () => {
  let postedContent = '';
  const fakeClient = {
    async postEvents(_agentId: string, _sessionId: string, events: { content?: string }[]) {
      postedContent = events[0]?.content ?? '';
      return { events: [{ id: 'event_top', seq: 30, type: 'user.message', accepted: true }] };
    },
  } as unknown as ZooworkClient;
  const runtime = new HomeFurnitureRuntime(fakeClient, 'agent_private_001');
  const topRequest: FurnitureTurnRequest = {
    ...request,
    output_mode: 'orthographic_sheet',
    orthographic_view: 'top',
    render_asset_ref: 'https://example.com/confirmed.png',
    confirmed_design_spec: response.design_spec,
    description: response.design_summary,
    source_priority: { sketch: 0, inspiration: 0 },
    locked_controls: [],
  };

  await runtime.startFurnitureTurn({ agentId: 'agent_private_001', sessionId: 'session_top' }, topRequest);

  assert.match(postedContent, /TOP PLAN IS STRICT/i);
  assert.match(postedContent, /optical axis exactly perpendicular to the tabletop/i);
  assert.match(postedContent, /tabletop plane parallel to the image plane/i);
  assert.match(postedContent, /Do not draw legs, apron, base, stretcher, shelf, drawers.*through it/i);
  assert.match(postedContent, /do not use dashed hidden lines/i);
  assert.match(postedContent, /orthographic_projection_correct=true/i);
  assert.match(postedContent, /orthographic_visible_surfaces_correct=true/i);
});

test('requires explicit projection and visible-surface QA for every orthographic artifact', () => {
  const topRequest: FurnitureTurnRequest = {
    ...request,
    output_mode: 'orthographic_sheet',
    orthographic_view: 'top',
    render_asset_ref: 'https://example.com/confirmed.png',
    confirmed_design_spec: response.design_spec,
    source_priority: { sketch: 0, inspiration: 0 },
  };
  assert.equal(orthographicProjectionQaPassed(topRequest, response), false);
  assert.equal(orthographicProjectionQaPassed(topRequest, {
    ...response,
    qa: {
      ...response.qa,
      orthographic_projection_correct: true,
      orthographic_visible_surfaces_correct: false,
    },
  }), false);
  assert.equal(orthographicProjectionQaPassed(topRequest, {
    ...response,
    qa: {
      ...response.qa,
      orthographic_projection_correct: true,
      orthographic_visible_surfaces_correct: true,
    },
  }), true);
});

test('keeps a readable orthographic candidate when only its raster proportions drift slightly', async () => {
  const orthographicRequest: FurnitureTurnRequest = {
    ...request,
    output_mode: 'orthographic_sheet',
    orthographic_view: 'front',
    render_asset_ref: 'https://example.com/confirmed.png',
    confirmed_design_spec: response.design_spec,
    description: response.design_summary,
    source_priority: { sketch: 0, inspiration: 0 },
    locked_controls: [],
  };
  const orthographicResponse: FurnitureAgentResponse = {
    ...response,
    status: 'needs_confirmation',
    design_spec: response.design_spec,
    warnings: ['The raster proportions drift slightly; the application will preserve the image and add exact labels.'],
    qa: {
      ...response.qa,
      dimensions_consistent: false,
      publishable: false,
      orthographic_projection_correct: true,
      orthographic_visible_surfaces_correct: true,
    },
  };
  const fakeClient = {
    async listAllEvents() {
      return [
        { seq: 21, eventType: 'run.started', payload: {}, runId: 'run_ratio' },
        {
          seq: 22,
          eventType: 'agent.tool',
          payload: { phase: 'end', toolName: 'image_generate', toolCallId: 'tool_image', isError: false },
          runId: 'run_ratio',
        },
        {
          seq: 23,
          eventType: 'agent.tool',
          payload: { phase: 'end', toolName: 'media_materialize', toolCallId: 'tool_media', isError: false },
          runId: 'run_ratio',
        },
        {
          seq: 24,
          eventType: 'agent.assistant',
          payload: { message: { role: 'assistant', content: [{ type: 'text', text: JSON.stringify(orthographicResponse) }] } },
          runId: 'run_ratio',
        },
        { seq: 25, eventType: 'run.finished', payload: { status: 'succeeded' }, runId: 'run_ratio' },
      ] satisfies SessionEvent[];
    },
    async listArtifacts() {
      return {
        artifacts: [{
          artifact_id: 'art_ratio',
          file_name: 'furniture_async_001_req_async_001_orthographic.png',
          source_path: '/workspace/artifacts/furniture_async_001/furniture_async_001_req_async_001_orthographic.png',
          content_type: 'image/png',
          size: 2048,
          status: 'ready',
          run_id: 'run_ratio',
        }],
        has_more: false,
      };
    },
  } as unknown as ZooworkClient;
  const runtime = new HomeFurnitureRuntime(fakeClient, 'agent_private_001');
  const completed = await runtime.pollFurnitureTurn(
    { agentId: 'agent_private_001', sessionId: 'session_ratio' },
    orthographicRequest,
    20,
  );

  assert.equal(completed.status, 'completed');
  if (completed.status === 'completed') {
    assert.equal(completed.result.artifacts[0]?.artifactId, 'art_ratio');
  }
});
