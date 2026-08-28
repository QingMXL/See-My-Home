# See My Home — MVP

**English** | [中文](./README.zh-CN.md)

> **See what your home could become.**

A web SaaS MVP that helps homeowners *see the future* before they renovate — explore your layout, visualize your style, or turn a furniture idea into something real. Built with Vite + React + TypeScript.

The UI ships with an **EN / 中文 language toggle** (English by default) — use the switch in the top navigation.

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
| Make My Furniture | Sketch + inspiration + prompt → product render → refine material / size / legs / handles / shelves → "This is it" → dimensioned front/side/top drawings + basic specification |
| My Designs | Saved designs grouped by project, persisted in localStorage |
| Platform | EN/中文 toggle (persisted), consistent route transitions, scroll restore |

## Architecture notes

- **Agent layer is mocked**: `src/lib/agents.ts` simulates each template's Agent (staged progress, canned results keyed for i18n). Swap its internals for real HTTP calls to the Agent APIs without touching UI code.
- All result imagery is **parametric SVG** (`src/components/visuals/`) — the furnished floor plan, style renders, and furniture drawings react to the user's actual selections (room labels, lifestyle tags, template palette, materials).
- **i18n**: lightweight key-based dictionary in `src/i18n/` — UI strings, generated content (layout notes, design stories, agent replies), and tag labels are all translated; state always stores canonical English values.
- State: zustand store (`src/store/useDesignStore.ts`); only saved designs persist across reloads.
- Design tokens in `src/styles/tokens.css` (warm premium light theme).

## Not in this MVP

Real AI generation, auth/accounts, share-link backend, pricing, Explore, CAD/BIM tooling.
