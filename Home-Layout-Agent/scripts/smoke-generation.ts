import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import { HomeLayoutRuntime } from '../src/runtime.js';
import type { HomeTurnRequest, UiAgentEvent } from '../src/contracts.js';
import { validHomeModel } from '../tests/fixtures.js';

async function main(): Promise<void> {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) loadEnvFile(envPath);
  const agentId = process.env.ZOOWORK_AGENT_ID ?? '';
  const runtime = HomeLayoutRuntime.fromEnvironment({ agentId, turnTimeoutMs: 300_000 });
  await runtime.ensureRunning();
  const model = validHomeModel();
  model.home_id = 'home_visual_smoke';
  model.status = 'confirmed_enough';
  model.spaces = [
    {
      id: 'space_living_smoke', floor_ref: 'floor_main_001', label: 'Living Room', architectural_type: 'living_room', actual_uses: ['relaxing', 'hosting'],
      geometry: { metric: null, source_geometries: [{ source_ref: 'src_user_001', coordinate_space: 'image_normalized_0_1', kind: 'polygon', coordinates: [[0.05, 0.05], [0.62, 0.05], [0.62, 0.95], [0.05, 0.95]], confidence: 1 }] },
      area_m2: null, state: 'user_confirmed', confidence: 1, source_refs: ['src_user_001'],
    },
    {
      id: 'space_kitchen_smoke', floor_ref: 'floor_main_001', label: 'Kitchen', architectural_type: 'kitchen', actual_uses: ['cooking'],
      geometry: { metric: null, source_geometries: [{ source_ref: 'src_user_001', coordinate_space: 'image_normalized_0_1', kind: 'polygon', coordinates: [[0.62, 0.05], [0.95, 0.05], [0.95, 0.55], [0.62, 0.55]], confidence: 1 }] },
      area_m2: null, state: 'user_confirmed', confidence: 1, source_refs: ['src_user_001'],
    },
  ];
  const request: HomeTurnRequest = {
    schema_version: '1.0', request_id: `req_visual_smoke_${Date.now()}`, home_id: model.home_id, operation: 'visualize', locale: 'en-US', evidence: [],
    user_message: 'Generate a clean colorized two-room residential layout image and publish it as an artifact.',
    visualization_request: { mode: 'colorized_plan', selected_entity_refs: ['space_living_smoke', 'space_kitchen_smoke'], style_direction: 'Warm neutral editorial plan, clear labels and furniture zoning.' },
  };
  const event: UiAgentEvent = { type: 'agent.generate', project_id: model.home_id, mode: 'layout' };
  const conversation = await runtime.createConversation(model.home_id, `smoke_${Date.now()}`);
  const result = await runtime.runStructuredTurn(conversation, request, model, event);
  process.stdout.write(`${JSON.stringify({
    session_id: conversation.sessionId,
    run_id: result.runId ?? null,
    status: result.response.status,
    tools: result.toolCalls.map((call) => ({ phase: call.phase, name: call.toolName, error: call.isError })),
    artifacts: result.artifacts,
    warnings: result.response.warnings,
  }, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
