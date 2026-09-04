# See My Home

See My Home is a bilingual residential-design application with one shared UI and
three independently versioned Agent domains.

## Repository map

```text
See-My-Home-Web/       Current React/Vite application
Home-Layout-Agent/     Floor-plan analysis and colorized layout generation
Home-Style-Agent/      Room-photo restyling with the Modern East knowledge base
Home-Furniture-Agent/  Reserved boundary for the separately developed Furniture Agent
api/                   Vercel server adapters, isolated by Agent namespace
agent-release.json     Compatible Agent release set used by the UI
docs/                  Integration and deployment documentation
```

Home Layout and Home Style are connected to real ZooWork managed Agents. Furniture
currently remains a UI demonstration until its independently developed Runtime is
merged into `Home-Furniture-Agent/`; the repository does not claim otherwise.

## Isolation model

- Each Agent has its own directory, package version, Runtime contract, API namespace,
  Agent-ID environment variable, Skills, schemas, and tests.
- The browser calls same-origin `/api/home-layout/*` and `/api/home-style/*` routes.
  It never receives the ZooWork API key and never calls ZooWork directly.
- User uploads and generated images use private Vercel Blob storage. ZooWork receives
  only short-lived signed read URLs.
- `agent-release.json` pins the compatible release set. Do not update Production to
  an Agent's moving “latest” definition.

Read [Agent integration and release policy](docs/AGENT-INTEGRATION.md) before merging
concurrent Agent versions.

## Local verification

The repository uses pnpm workspaces and Node.js 20 or newer.

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

Run the existing local ZooWork Runtimes when testing the Vite UI locally:

```bash
pnpm --dir Home-Layout-Agent test:local
pnpm --dir Home-Style-Agent runtime
pnpm dev
```

Local secrets belong in each Agent's ignored `.env` file. Never commit credentials.

## Vercel

The repository contains a production Vite build and isolated Node Functions in
`vercel.json`. Before deploying, connect a private Vercel Blob store and configure
the values shown in `.env.example` as Vercel environment variables. Deployment is
intentionally left to the repository owner.
