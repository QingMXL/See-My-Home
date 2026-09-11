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
  assert.match(payload.output_requirement, /--size "1536x1024"/);
  assert.match(payload.output_requirement, /Never inspect or print environment variables or credentials/);
  assert.doesNotMatch(payload.output_requirement, /detected from source_asset_ref through --aspect-ratio/);
});
