import assert from 'node:assert/strict';
import test from 'node:test';
import type { SessionEvent, ZooworkClient } from '@zoowork-ai/sdk';
import type { FurnitureAgentResponse, FurnitureTurnRequest } from '../src/contracts.js';
import { HomeFurnitureRuntime } from '../src/runtime.js';

const request: FurnitureTurnRequest = {
  contract_version: 'home-furniture-v1',
  request_id: 'req_async_001',
  project_id: 'furniture_async_001',
  locale: 'zh-CN',
  table_type: 'dining_table',
  description: '一张简洁的实木餐桌。',
  source_priority: { sketch: 0, inspiration: 0 },
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
    async listArtifacts() {
      return {
        artifacts: [{
          artifact_id: 'art_async_001',
          file_name: 'furniture_async_001_req_async_001_table.png',
          source_path: '/workspace/artifacts/furniture_async_001/furniture_async_001_req_async_001_table.png',
          content_type: 'image/png',
          size: 1024,
          status: 'ready',
          run_id: 'run_async',
        }],
        has_more: false,
      };
    },
  } as unknown as ZooworkClient;
  const runtime = new HomeFurnitureRuntime(fakeClient, 'agent_private_001');
  const conversation = { agentId: 'agent_private_001', sessionId: 'session_async' };

  const started = await runtime.startFurnitureTurn(conversation, request);
  const pending = await runtime.pollFurnitureTurn(conversation, request, started.postedSeq);
  const completed = await runtime.pollFurnitureTurn(conversation, request, started.postedSeq);

  assert.deepEqual(started, { postedSeq: 10 });
  assert.deepEqual(pending, { status: 'processing', postedSeq: 10 });
  assert.equal(completed.status, 'completed');
  if (completed.status === 'completed') {
    assert.equal(completed.result.response.request_id, request.request_id);
    assert.equal(completed.result.artifacts[0]?.artifactId, 'art_async_001');
  }
});
