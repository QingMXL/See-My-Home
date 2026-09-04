# Home Layout Agent — ZooWork Runtime

This project is the server-side Runtime for the private Home Layout Agent. It uses `@zoowork-ai/sdk` 0.5.0 and keeps the ZooWork organization key out of the browser.

## Architecture

```text
See My Home UI
  -> authenticated application backend
     -> `project.create` / `room_map.confirm` / `agent.generate`
     -> ZooWork Home Layout Agent + platform imageModel/imageGenerationModel
     -> published ZooWork artifact
     -> Home Model database
```

The UI only supplies controls and events. It uploads JPG, PNG, or PDF bytes to the application backend, which validates the file, stores it, and creates a time-limited HTTPS source URL. `project.create` gives that source to the Agent. The Agent performs visual parsing and returns the room map/Home Model. `room_map.confirm` applies user corrections. `agent.generate` makes the image inside ZooWork and publishes it as an artifact; the backend proxies that artifact to the UI.

ZooWork SDK 0.5.0 does not expose production-wired Session file staging. The application backend therefore supplies an Agent-reachable source URL, but it does not analyze or generate the image. ZooWork injects `imageModel`, `imageGenerationModel`, built-in skills, and their credentials into the Agent. `ZOOWORK_API_KEY` is the only key this Runtime uses; never expose it to Vite or browser JavaScript.

## Local setup

Requirements: Node.js 20 or newer and pnpm.

```bash
pnpm install
pnpm check
pnpm test
pnpm package:skills
```

Copy `.env.example` to `.env` or configure the same values in the server environment. Never expose `ZOOWORK_API_KEY` through a `NEXT_PUBLIC_*`, `VITE_*`, mobile, or browser environment variable.

For a hosted Agent to read a local upload, set a non-secret public origin:

```dotenv
HOME_LAYOUT_PUBLIC_BASE_URL=https://your-backend-or-temporary-tunnel.example
```

## Remote provisioning gates

1. Revoke any key that has appeared in chat, logs, source control, or browser code.
2. Store a new key in `ZOOWORK_API_KEY` locally.
3. Run the read-only model query:

   ```bash
   pnpm models
   ```

4. Set `ZOOWORK_MODEL_ID` to an exact returned `model` value.
5. Package the five Skills with `pnpm package:skills`.
6. Only for an approved private write run, set `ZOOWORK_ALLOW_REMOTE_WRITE=true` and run:

   ```bash
   pnpm provision
   ```

Provisioning creates or reuses one labeled Agent, starts it, waits on `desired_state`, uploads missing Skills with `personal` scope, attaches them unpinned, verifies eligibility, and writes non-secret IDs to `.runtime/agent-state.json`.

It does not create channels, schedules, public deployment, or a custom Environment.

## Private local test console

Run the private browser test console with:

```bash
pnpm test:local
```

Open `http://127.0.0.1:4317`. The server binds only to loopback, loads the ZooWork API key from
the local `.env`, and never sends it to browser JavaScript. Text-only turns generate a
`user_statement` evidence source automatically. Vision evidence from Image2 / Banana Pro can be
pasted as a JSON array matching `home-evidence.schema.json`.

The console keeps the current ZooWork Session and validated Home Model in memory per `home_id`.
Restarting the server or pressing **Reset home** starts fresh local state. It still calls the
private remote ZooWork Agent and therefore uses real model inference.

The website development proxy exposes the complete local flow:

- `POST /api/home-layout/upload`: raw-binary, local-origin-only upload.
- `POST /api/home-layout/events/project.create`: asks the Agent to inspect the uploaded source and return the room map.
- `POST /api/home-layout/events/agent.generate`: sends `room_map.confirm`, then asks the Agent to diagnose, generate, and publish the layout image.
- `GET /api/home-layout/artifacts/:artifact_id`: securely proxies a ZooWork-published result to the UI.

The original filename is URL-encoded in `X-Upload-File-Name`, and the upload `Content-Type` must be `image/jpeg`, `image/png`, or `application/pdf`. JPG and PNG are supplied as visual references during generation. A PDF is analyzed directly, but its first release render is reconstructed from extracted normalized geometry and is labeled conceptual rather than measured.

## Application integration

Persist these values in the application database for every conversation:

- ZooWork `agent_id`
- ZooWork `session_id`
- the last event `cursor`
- application `home_id`
- canonical Home Model and revision

Create one ZooWork Session per UI conversation. For each turn, call `runStructuredTurn()` with the persisted cursor and current Home Model. The Runtime posts one structured `user.message` envelope, reads assistant text with `assistantText()`, and stops only on `isRunFinished()`.

The response is rejected unless it validates against `agent-response.schema.json`. One repair turn is allowed by default; persistent invalid output fails closed.

## Units

- Canonical geometry: integer millimeters.
- Canonical area: square meters.
- UI length: centimeters below one meter, otherwise meters.
- US listing compatibility: optional derived `sq ft` secondary display only.
- Feet and inches are never canonical fields.
