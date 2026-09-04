# Home Furniture Agent

ZooWork managed-Agent runtime for `home-furniture-v1`. Version 1 designs tables
from a hand sketch, one inspiration image, text, or any supported combination.
When both images are present, the UI sends an adjustable sketch-versus-inspiration
weight (80/20 by default) that controls which reference the concept should resemble more.

The Agent publishes one concept render plus a validated JSON specification. The
web application derives front, side, and top line drawings from the same canonical
millimetre dimensions. These are concept views, not fabrication-ready shop drawings.

## Local setup

Copy `.env.example` to the ignored `.env`, then fill `ZOOWORK_API_KEY`. The model ID
must be selected from the SDK's `listModels()` result. Provisioning is deliberately
guarded and mutates ZooWork only when `ZOOWORK_ALLOW_REMOTE_WRITE=true`.

```bash
pnpm install
pnpm check
pnpm test
pnpm package:skills
pnpm models
```

After an explicitly approved provisioning run, copy the returned Agent ID to
`ZOOWORK_FURNITURE_AGENT_ID`. For local image-input testing, the hosted Agent also
needs a public HTTPS origin in `HOME_FURNITURE_PUBLIC_BASE_URL`; text-only testing
does not require that source-image tunnel.

```bash
pnpm runtime
```

The Vite application proxies `/api/home-furniture/*` to the local runtime on port
4319. Production uses the isolated Vercel adapter in `api/home-furniture.ts` and
private Vercel Blob URLs.

The Agent persona, Skills, JSON schemas, SDK runtime, provisioning code, and tests
are all contained in this directory. Public integration rules live in
[`docs/AGENT-INTEGRATION.md`](../docs/AGENT-INTEGRATION.md).
