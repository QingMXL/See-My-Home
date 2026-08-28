<div align="center">

# See My Home

**看见家的未来 · See what your home could become**

[**English**](README.md) · [中文](README.zh-CN.md)

![Vite](https://img.shields.io/badge/Vite-7-646cff) ![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![Tests](https://img.shields.io/badge/Vitest-29%20passing-6da13f) ![Status](https://img.shields.io/badge/status-demo-3ec1a6)

<img src="docs/home.png" alt="See My Home — home page" width="100%">

</div>

---

## Overview

**See My Home** is a web SaaS demo that helps homeowners *see the future* before they renovate. Instead of exposing AI tools, it asks one question — *"What would you like to see?"* — and packages the answers as three guided templates:

1. **See My Layout** — turn a black-and-white floor plan into a furnished, easy-to-understand home layout
2. **See My Style** — upload a real room and see it through a completely different design lens
3. **Make My Furniture** — turn a sketch or inspiration image into a realistic custom furniture design

Every flow runs end-to-end in the browser: staged AI-style generation, tag-based confirmation, refinement loops, and a unified **My Designs** space organized by home. The UI ships with an **EN / 中文 toggle** in the top navigation (English by default).

The agent layer is fully mocked behind a clean API boundary (`src/lib/agents.ts`) — swap its internals for real Agent API calls without touching a single UI component.

<div align="center">
<img src="docs/style-input.png" alt="See My Style — choose a design template" width="100%">
</div>

## Features

- 🏠 **See My Layout** — upload (or use the sample plan) → AI room detection → confirm room uses from a tag library → lifestyle tags ("Anything special we should design around?") → staged generation → a furnished top-down plan with **Design / Furniture / Circulation / Room Labels** views, tailored layout notes, and key decisions
- 🎨 **See My Style** — room photo + room type → six design templates with style tags → hero render + short design story → refinement loop with quick suggestions, agent replies, and version thumbnails (Original / Current / Refinements)
- 🪑 **Make My Furniture** — sketch + inspiration + prompt → product-grade render → refine material / size / legs / handles / shelves → *"This is it"* → dimensioned front/side/top drawings + basic specification
- 🗂️ **My Designs** — saved designs grouped by project, persisted in `localStorage`
- 🌐 **Bilingual UI** — every string, generated note, design story, and tag label switches between English and 中文; the choice persists across sessions
- ✨ **Parametric SVG imagery** — floor plans, renders, and drawings are drawn in code and react to your actual selections (room labels, lifestyle tags, template palettes, materials); downloads export real SVG files
- 🧭 **Consistent UX** — uniform route transitions, scroll restore, staged progress instead of spinners, reduced-motion support

## Project structure

```
see-my-home/
├── src/
│   ├── pages/             # One folder per surface (home, layout-flow, style-flow, furniture, designs)
│   ├── components/
│   │   ├── layout/        # Site chrome: header, breadcrumbs, stepper
│   │   ├── ui/            # Buttons, tags, generating overlay
│   │   └── visuals/       # Parametric SVG: furnished plan, room scenes, furniture render & drawings
│   ├── lib/agents.ts      # Mocked Agent API layer (swap for real HTTP calls)
│   ├── i18n/              # EN/中文 dictionary + language context
│   ├── store/             # zustand store (saved designs persist)
│   ├── data/              # Room tags, lifestyle tags, style templates
│   └── styles/            # Design tokens + global styles
└── docs/                  # Screenshots
```

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm test         # unit tests (Vitest, 29 passing)
npm run build    # production build (~100 kB gzipped)
```

## Not in this demo

Real AI generation, auth/accounts, share-link backend, pricing, Explore, CAD/BIM tooling — the product architecture allows each to be added as an independent agent behind the existing API boundary.
