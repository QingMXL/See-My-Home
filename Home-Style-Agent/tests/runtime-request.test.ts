import assert from 'node:assert/strict';
import test from 'node:test';
import type { SessionEvent, ZooworkClient } from '@zoowork-ai/sdk';
import { HomeStyleRuntime, StyleTurnContractError } from '../src/runtime.js';
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
  assert.match(payload.output_requirement, /resolve at least one major wall plane/);
  assert.match(payload.output_requirement, /generic construction downlights as editable/);
  assert.match(payload.output_requirement, /acrylic, cast resin, colored or smoked glass/);
  assert.match(payload.output_requirement, /single symbolic artwork or accessory/);
  assert.match(payload.output_requirement, /qa\.style_passed=false/);
  assert.match(payload.output_requirement, /final assistant text/);
  assert.match(payload.output_requirement, /Do not call sessions_yield or message/);
  assert.match(payload.output_requirement, /Never inspect or print environment variables or credentials/);
  assert.doesNotMatch(payload.output_requirement, /detected from source_asset_ref through --aspect-ratio/);
});

test('resumes generation when the preceding run stopped before Designer', async () => {
  let postedContent = '';
  const client = {
    postEvents: async (_agentId: string, _sessionId: string, events: Array<{ content?: unknown }>) => {
      postedContent = String(events[0]?.content ?? '');
      return { events: [{ type: 'user.message', accepted: true, seq: 9 }] };
    },
  } as unknown as ZooworkClient;
  const runtime = new HomeStyleRuntime(client, 'agt_test');
  const request: StyleTurnRequest = {
    contract_version: 'home-style-v1', request_id: 'req_generation_recovery', home_id: 'home_recovery',
    source_asset_ref: 'https://example.com/source.jpg',
    source_raster: {
      width_px: 1024, height_px: 768, aspect_ratio: '4:3', orientation: 'landscape',
      designer_size: '1024x768', designer_request_size: '768x1024', designer_request_aspect_ratio: '3:4',
    },
    room_type: 'home_office', style_id: 'maximal_luxe', style_profile: 'edited-glamour',
    renovation_scope: 'finishes_and_furnishing',
  };

  const result = await runtime.startGenerationRecovery(
    { agentId: 'agt_test', sessionId: 'session_test' }, request,
  );

  assert.deepEqual(result, { postedSeq: 9 });
  assert.match(postedContent, /stopped before invoking the Designer CLI/);
  assert.match(postedContent, /Invoke the Designer CLI exactly once/);
  assert.match(postedContent, /Do not call sessions_yield or message/);
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

test('reuses an already published artifact without publishing it twice', async () => {
  let postedContent = '';
  const client = {
    postEvents: async (_agentId: string, _sessionId: string, events: Array<{ content?: unknown }>) => {
      postedContent = String(events[0]?.content ?? '');
      return { events: [{ type: 'user.message', accepted: true, seq: 12 }] };
    },
  } as unknown as ZooworkClient;
  const runtime = new HomeStyleRuntime(client, 'agt_test');
  const request: StyleTurnRequest = {
    contract_version: 'home-style-v1', request_id: 'req_published', home_id: 'home_published',
    source_asset_ref: 'https://example.com/source.jpg',
    source_raster: {
      width_px: 1024, height_px: 768, aspect_ratio: '4:3', orientation: 'landscape',
      designer_size: '1536x1024', designer_request_size: '1024x1536', designer_request_aspect_ratio: '3:4',
    },
    room_type: 'home_office', style_id: 'maximal_luxe', style_profile: 'edited-glamour',
    renovation_scope: 'finishes_and_furnishing',
  };

  await runtime.startCompletionRecovery({ agentId: 'agt_test', sessionId: 'session_test' }, request, true);

  assert.match(postedContent, /already published/);
  assert.match(postedContent, /Do not call artifact_publish again/);
});

test('reads a valid failed contract from a sessions_yield tool result', async () => {
  const request: StyleTurnRequest = {
    contract_version: 'home-style-v1', request_id: 'req_tool_contract', home_id: 'home_tool_contract',
    source_asset_ref: 'https://example.com/source.jpg',
    source_raster: {
      width_px: 664, height_px: 462, aspect_ratio: '332:231', orientation: 'landscape',
      designer_size: '1536x1072', designer_request_size: '1072x1536', designer_request_aspect_ratio: '231:332',
    },
    room_type: 'primary_bedroom', style_id: 'california_modern', style_profile: 'sunlit-casual',
    renovation_scope: 'finishes_and_furnishing',
  };
  const response = {
    contract_version: 'home-style-v1', request_id: request.request_id, status: 'failed',
    style_id: request.style_id, knowledge_version: '0.2-production',
    qa: { structure_preserved: true, camera_preserved: true, style_passed: false, publishable: false },
    warnings: ['Result reads as another style.'],
  };
  const events: SessionEvent[] = [
    { seq: 11, eventType: 'run.started', payload: {}, runId: 'run_tool_contract' },
    {
      seq: 12, eventType: 'agent.tool', runId: 'run_tool_contract',
      payload: {
        phase: 'end', toolName: 'sessions_yield', toolCallId: 'tool_yield', isError: false,
        resultPreview: `Yielded — result follows. ${JSON.stringify(response)}`,
      },
    },
    { seq: 13, eventType: 'run.finished', payload: { status: 'succeeded' }, runId: 'run_tool_contract' },
  ];
  const client = { listAllEvents: async () => events } as unknown as ZooworkClient;
  const runtime = new HomeStyleRuntime(client, 'agt_test');

  const result = await runtime.pollStyleTurn(
    { agentId: 'agt_test', sessionId: 'session_test' }, request, 10,
  );

  assert.equal(result.status, 'completed');
  if (result.status === 'completed') assert.deepEqual(result.result.response, response);
});

test('classifies an empty pre-Designer turn as generation recovery', async () => {
  const request: StyleTurnRequest = {
    contract_version: 'home-style-v1', request_id: 'req_resume', home_id: 'home_resume',
    source_asset_ref: 'https://example.com/source.jpg',
    source_raster: {
      width_px: 1448, height_px: 1086, aspect_ratio: '4:3', orientation: 'landscape',
      designer_size: '1024x768', designer_request_size: '768x1024', designer_request_aspect_ratio: '3:4',
    },
    room_type: 'home_office', style_id: 'maximal_luxe', style_profile: 'edited-glamour',
    renovation_scope: 'finishes_and_furnishing',
  };
  const events: SessionEvent[] = [
    { seq: 21, eventType: 'run.started', payload: {}, runId: 'run_resume' },
    {
      seq: 22, eventType: 'agent.tool', runId: 'run_resume',
      payload: { phase: 'end', toolName: 'exec', toolCallId: 'tool_mkdir', isError: false, resultPreview: '[exec completed: exitCode=0]\n(no output)' },
    },
    { seq: 23, eventType: 'agent.assistant', payload: { message: { role: 'assistant', content: [] } }, runId: 'run_resume' },
    { seq: 24, eventType: 'run.finished', payload: { status: 'succeeded' }, runId: 'run_resume' },
  ];
  const client = { listAllEvents: async () => events } as unknown as ZooworkClient;
  const runtime = new HomeStyleRuntime(client, 'agt_test');

  await assert.rejects(
    runtime.pollStyleTurn({ agentId: 'agt_test', sessionId: 'session_test' }, request, 20),
    (error: unknown) => error instanceof StyleTurnContractError
      && error.recoveryMode === 'resume_generation'
      && error.artifactPublished === false,
  );
});

test('classifies a completed Designer command without JSON as completion recovery', async () => {
  const request: StyleTurnRequest = {
    contract_version: 'home-style-v1', request_id: 'req_finalize', home_id: 'home_finalize',
    source_asset_ref: 'https://example.com/source.jpg',
    source_raster: {
      width_px: 1448, height_px: 1086, aspect_ratio: '4:3', orientation: 'landscape',
      designer_size: '1024x768', designer_request_size: '768x1024', designer_request_aspect_ratio: '3:4',
    },
    room_type: 'home_office', style_id: 'maximal_luxe', style_profile: 'edited-glamour',
    renovation_scope: 'finishes_and_furnishing',
  };
  const events: SessionEvent[] = [
    { seq: 31, eventType: 'run.started', payload: {}, runId: 'run_finalize' },
    {
      seq: 32, eventType: 'agent.tool', runId: 'run_finalize',
      payload: {
        phase: 'start', toolName: 'exec', toolCallId: 'tool_designer',
        args: { command: 'python /skills/designer/image_generation_cli.py --model gpt-image-2' },
      },
    },
    {
      seq: 33, eventType: 'agent.tool', runId: 'run_finalize',
      payload: {
        phase: 'end', toolName: 'exec', toolCallId: 'tool_designer', isError: false,
        resultPreview: '[exec completed: exitCode=0]\n/tmp/openclaw/designer/output.png',
      },
    },
    { seq: 34, eventType: 'run.finished', payload: { status: 'succeeded' }, runId: 'run_finalize' },
  ];
  const client = { listAllEvents: async () => events } as unknown as ZooworkClient;
  const runtime = new HomeStyleRuntime(client, 'agt_test');

  await assert.rejects(
    runtime.pollStyleTurn({ agentId: 'agt_test', sessionId: 'session_test' }, request, 30),
    (error: unknown) => error instanceof StyleTurnContractError
      && error.recoveryMode === 'finalize_existing'
      && error.artifactPublished === false,
  );
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
