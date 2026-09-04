import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import { HomeLayoutRuntime } from '../src/runtime.js';
import type { HomeTurnRequest, UiAgentEvent } from '../src/contracts.js';

async function main(): Promise<void> {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) loadEnvFile(envPath);
  const runtime = HomeLayoutRuntime.fromEnvironment({ agentId: process.env.ZOOWORK_AGENT_ID ?? '', turnTimeoutMs: 300_000 });
  await runtime.ensureRunning();
  const homeId = 'home_intake_smoke';
  const request: HomeTurnRequest = {
    schema_version: '1.0', request_id: `req_intake_smoke_${Date.now()}`, home_id: homeId, operation: 'intake', locale: 'en-US',
    user_message: 'Inspect this public-domain apartment plan and build the initial room map.',
    evidence: [{
      source_id: 'src_floorplan_smoke', kind: 'floor_plan', label: 'Public-domain apartment plan',
      asset_ref: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Apartment.png', facts: [],
    }],
  };
  const event: UiAgentEvent = { type: 'project.create', project_id: homeId };
  const conversation = await runtime.createConversation(homeId, `intake_smoke_${Date.now()}`);
  const result = await runtime.runStructuredTurn(conversation, request, null, event);
  process.stdout.write(`${JSON.stringify({
    session_id: conversation.sessionId,
    status: result.response.status,
    spaces: Array.isArray(result.response.home_model?.spaces) ? result.response.home_model.spaces.map((space) => ({ id: space.id, label: space.label })) : [],
    tools: result.toolCalls.map((call) => ({ phase: call.phase, name: call.toolName, error: call.isError })),
    warnings: result.response.warnings,
  }, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
