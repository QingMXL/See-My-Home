# Home Style Agent — Local and ZooWork Runtime

The browser never talks to ZooWork directly. The development path is:

```text
See-My-Home-Web :5173
  -> /api/home-style/*
  -> Vite proxy
  -> Home-Style-Agent :4318
  -> ZooWork Home Style Agent
```

## Configuration

Edit `.env` locally. Never paste `ZOOWORK_API_KEY` into chat, source control, browser code, or a `VITE_*` variable.

```dotenv
ZOOWORK_API_KEY=
ZOOWORK_MODEL_ID=
ZOOWORK_STYLE_AGENT_ID=
ZOOWORK_ALLOW_REMOTE_WRITE=false
HOME_STYLE_PUBLIC_BASE_URL=
HOME_STYLE_TEST_PORT=4318
```

`HOME_STYLE_PUBLIC_BASE_URL` must be an HTTPS origin that routes `/api/site/style/source/*` back to this Runtime. A hosted ZooWork Agent cannot fetch `localhost`.

## Local-only checks

```bash
pnpm check
pnpm test
pnpm package:skills
```

The generated archive is `dist/skills/modern-east-style.zip`. Its top-level directory is `modern-east-style/`, matching the `name` in `SKILL.md`. The archive contains only the production prompt components and sanitized schema; research images and provenance are excluded.

## Remote provisioning — only after explicit approval

1. Save the API key in `.env` yourself.
2. Run `pnpm models`. This is read-only and identifies valid model IDs.
3. Put one exact returned ID in `ZOOWORK_MODEL_ID`.
4. Keep `ZOOWORK_ALLOW_REMOTE_WRITE=false` until a private provisioning run is explicitly approved.
5. For that one run, set it to `true` and run `pnpm provision`.
6. Copy the returned `agent_id` into `ZOOWORK_STYLE_AGENT_ID`, then set the write guard back to `false`.

Provisioning follows the official order: resolve/create one labeled Agent, start it and wait on `desired_state`, upload or resolve the `org` Skill, attach it pinned to the published version, verify `eligible`, and store the non-secret IDs in `.runtime/agent-state.json`.

No public channel, schedule, Environment, or deployment is created.

## Run the integrated UI locally

Start the Style Runtime:

```bash
pnpm runtime
```

Then start `See-My-Home-Web`. Its Vite proxy maps `/api/home-style` to this Runtime. The existing `/api/home-layout` mapping remains separate.

Uploaded photos are stored under `.runtime/uploads/` and served through a random access token. Generated ZooWork artifacts are proxied to the browser; signed artifact URLs are not persisted in the UI.
