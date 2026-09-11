import assert from 'node:assert/strict';
import test from 'node:test';
import type { ZooworkClient } from '@zoowork-ai/sdk';
import { HomeStyleRuntime } from '../src/runtime.js';
import type { StyleTurnRequest } from '../src/contracts.js';

test('sends authoritative raster geometry and an explicit Designer size', async () => {
  let postedContent = '';
  const client = {
    postEvents: async (_agentId: string, _sessionId: string, events: Array<{ type: string; content?: unknown }>) => {
      postedContent = String(events[0]?.content ?? '');
      return { events: [{ type: 'user.message', accepted: true, seq: 7 }] };
    },
  } as unknown as ZooworkClient;
  const runtime = new HomeStyleRuntime(client, 'agt_test');
  const request: StyleTurnRequest = {
    contract_version: 'home-style-v1',
    request_id: 'req_test',
    home_id: 'home_test',
    source_asset_ref: 'https://example.com/source.jpg',
    source_raster: {
      width_px: 678,
      height_px: 452,
      aspect_ratio: '3:2',
      orientation: 'landscape',
      designer_size: '1536x1024',
      designer_request_size: '1024x1536',
      designer_request_aspect_ratio: '2:3',
    },
    room_type: 'living_room',
    style_id: 'modern_east',
    style_profile: 'quiet-poise',
    renovation_scope: 'finishes_and_furnishing',
  };

  assert.deepEqual(await runtime.startStyleTurn({ agentId: 'agt_test', sessionId: 'session_test' }, request), { postedSeq: 7 });
  const payload = JSON.parse(postedContent) as { request: StyleTurnRequest; output_requirement: string };
  assert.deepEqual(payload.request.source_raster, request.source_raster);
  assert.match(payload.output_requirement, /server measured the source raster as 678x452/);
  assert.match(payload.output_requirement, /--size "1024x1536"/);
  assert.match(payload.output_requirement, /--aspect-ratio "2:3"/);
  assert.match(payload.output_requirement, /Never inspect or print environment variables or credentials/);
  assert.doesNotMatch(payload.output_requirement, /detected from source_asset_ref through --aspect-ratio/);
});

test('recovers a completed generation without invoking Designer again', async () => {
  let postedContent = '';
  const client = {
    postEvents: async (_agentId: string, _sessionId: string, events: Array<{ content?: unknown }>) => {
      postedContent = String(events[0]?.content ?? '');
      return { events: [{ type: 'user.message', accepted: true, seq: 11 }] };
    },
  } as unknown as ZooworkClient;
  const runtime = new HomeStyleRuntime(client, 'agt_test');
  const request: StyleTurnRequest = {
    contract_version: 'home-style-v1',
    request_id: 'req_recovery',
    home_id: 'home_recovery',
    source_asset_ref: 'https://example.com/source.jpg',
    source_raster: {
      width_px: 678,
      height_px: 452,
      aspect_ratio: '3:2',
      orientation: 'landscape',
      designer_size: '1536x1024',
      designer_request_size: '1024x1536',
      designer_request_aspect_ratio: '2:3',
    },
    room_type: 'home_office',
    style_id: 'modern_east',
    style_profile: 'sculptural-luxe',
    renovation_scope: 'finishes_and_furnishing',
  };

  const result = await runtime.startCompletionRecovery({ agentId: 'agt_test', sessionId: 'session_test' }, request);

  assert.deepEqual(result, { postedSeq: 11 });
  assert.match(postedContent, /Do not generate another image/);
  assert.match(postedContent, /artifact_publish exactly once/);
  assert.match(postedContent, new RegExp(request.source_raster.designer_size));
});

test('routes each preset to its own Skill and keeps reference transfer preset-free', async () => {
  const posted: string[] = [];
  const client = {
    postEvents: async (_agentId: string, _sessionId: string, events: Array<{ type: string; content?: unknown }>) => {
      posted.push(String(events[0]?.content ?? ''));
      return { events: [{ type: 'user.message', accepted: true, seq: posted.length }] };
    },
  } as unknown as ZooworkClient;
  const runtime = new HomeStyleRuntime(client, 'agt_test');
  const base: StyleTurnRequest = {
    contract_version: 'home-style-v1',
    request_id: 'req_route',
    home_id: 'home_route',
    source_asset_ref: 'https://example.com/source.jpg',
    source_raster: {
      width_px: 678,
      height_px: 452,
      aspect_ratio: '3:2',
      orientation: 'landscape',
      designer_size: '1536x1024',
      designer_request_size: '1024x1536',
      designer_request_aspect_ratio: '2:3',
    },
    room_type: 'living_room',
    style_id: 'california_modern',
    style_profile: 'sunlit-casual',
    renovation_scope: 'finishes_and_furnishing',
  };

  await runtime.startStyleTurn({ agentId: 'agt_test', sessionId: 'session_test' }, base);
  await runtime.startStyleTurn({ agentId: 'agt_test', sessionId: 'session_test' }, {
    ...base,
    request_id: 'req_reference',
    style_id: 'custom_reference',
    style_profile: 'reference-led',
    style_reference_asset_ref: 'https://example.com/reference.jpg',
  });

  const california = JSON.parse(posted[0]!) as { selected_knowledge: { skill_name: string }; output_requirement: string };
  const reference = JSON.parse(posted[1]!) as { selected_knowledge: { skill_name: null }; output_requirement: string };
  assert.equal(california.selected_knowledge.skill_name, 'california-modern-style');
  assert.match(california.output_requirement, /immediately recognizable/);
  assert.equal(reference.selected_knowledge.skill_name, null);
  assert.match(reference.output_requirement, /Do not read or mix any preset aesthetic Skill/);
});
