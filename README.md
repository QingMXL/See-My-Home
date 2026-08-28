# See My Home — MVP

> **See what your home could become.**

Web SaaS MVP built from `See My Home — SaaS 产品 PRD（V1.0）.md` and the V1 UI mockups. Implements the P0 scope (See My Layout, See My Style, platform pages) plus the Make My Furniture flow.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm test         # unit tests (Vitest)
```

## What's implemented

| Area | Flow |
|---|---|
| Home | Hero, three template cards, how-it-works, recent designs |
| See My Layout | Upload (or sample plan) → AI room detection → confirm rooms via tag library → lifestyle tags → staged generation → furnished top-down plan with Design / Furniture / Circulation / Room Labels views, layout notes, key decisions, Save / Share / Download / Try a Style |
| See My Style | Room photo + room type → design template picker (6 templates with tags) → staged generation → hero render, design story, refinement loop with suggestions and version thumbnails |
| Make My Furniture | Sketch + inspiration + prompt → product render → refine material/size/legs/handles/shelves → "This is it" → dimensioned front/side/top drawings + basic specification |
| My Designs | Saved designs grouped by project, persisted in localStorage |

## Architecture notes

- **Agent layer is mocked**: `src/lib/agents.ts` simulates each Template's Agent (staged progress, canned results). Swap its internals for real HTTP calls to the Agent APIs without touching UI code (PRD §2).
- All result imagery is **parametric SVG** (`src/components/visuals/`) — the furnished floor plan, style renders, and furniture drawings react to the user's actual selections (room labels, lifestyle tags, template palette, materials).
- State: zustand store (`src/store/useDesignStore.ts`); only saved designs persist across reloads.
- Design tokens in `src/styles/tokens.css` (warm premium light theme per PRD §30).

## Not in this MVP

Real AI generation, auth/accounts, share links backend, pricing, Explore, CAD/BIM anything (PRD §34).
