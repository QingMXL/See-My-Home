# Furniture flow design QA

- source visual truth path: `/var/folders/vn/hhys4cq15dj9cnnlskknp5jm0000gn/T/codex-clipboard-5d6d7627-d628-4dcc-8489-fee7cb714b37.png`, interpreted with the user's approved follow-up changes
- source pixels: 1772 × 1860 px (conversation preview normalized to 1536 × 1612 px)
- implementation: local in-app browser at `/furniture`, `/furniture/render`, and `/furniture/drawings`
- implementation screenshot evidence: Codex CUA captures for browser tabs 7–9 in this task; this browser surface did not provide filesystem screenshot export
- viewport: 1404 × 791 CSS px, device scale factor 1; implementation pixels 1404 × 791 px
- state: Chinese, light theme; empty input, real local error handling, completed-render QA fixture, and completed single-sheet drawings fixture
- density normalization: source and implementation were compared at CSS presentation size. The source is a tall full-page capture, so matching header and card regions were compared rather than browser chrome or total page height.

## Full-view comparison evidence

The source screenshot and current browser-rendered implementation were inspected in the same QA pass. The approved workflow changes are present: step 1 remains a single centered intake card; step 2 uses three aligned work cards with the render dominant; step 3 gives the generated orthographic sheet substantially more width than the specification card. The existing typography, warm neutral palette, card radii, borders, and three-step progress treatment remain consistent with the product.

In the current render fixture, the left card contains only completed input, the middle card contains the effect image with material swatches and the “就是它了” action at its lower-right, and the right card contains material, text revision, advanced options, and one regeneration action. The obsolete supplemental-reference upload and left-card confirmation footer are absent.

## Focused region comparison evidence

- Input: with zero uploads, the source-balance control remains visible in a disabled grey state. Its labels remain 80% / 20% as the default preference. The implemented state logic was also checked for one source (locked 100% / 0%) and two sources (enabled 5-point adjustment).
- Upload cards: each populated card exposes a dedicated `X` icon button with a localized accessible label. Deletion clears its source and invalidates dependent render/drawing state.
- Render decision row: material swatches remain left-aligned and “就是它了” is anchored on the right inside the effect-image card. The middle card retains visual priority and all three cards use one stage height.
- Refinement: the supplemental reference-image control is gone. Color/material, free-text revision, collapsed advanced controls, and “应用调整并重新生成” remain.
- Drawings: the layout contains one large landscape raster frame for the Agent-produced front/side/top sheet and a shorter balanced specification column. The only image export action downloads the one generated raster; PDF printing is removed.
- Loading: the generation overlay remains a body-level modal and is visible within the viewport for both effect rendering and orthographic generation.

## Required fidelity surfaces

- Fonts and typography: existing product font families and tokenized sizes are unchanged. Headings, labels, helper text, and buttons remain legible with no observed clipping or unintended wrapping.
- Spacing and layout rhythm: intake spacing remains calm; the render stage preserves its wide center track; the drawings grid is now approximately 3:1 and both cards stretch to a shared row height.
- Colors and visual tokens: existing surface, line, ink, and error tokens are reused. The disabled balance control uses reduced opacity and a neutral track while the enabled control retains the sketch-to-inspiration color cue.
- Image quality and asset fidelity: generated effect and orthographic images use `object-fit: contain`, preserve aspect ratio, and are not reconstructed with CSS or SVG. The QA fixture tested image framing only; production pixels come from ZooWork.
- Copy and content: actions are concise and distinct: “应用调整并重新生成” revises the render, while “就是它了” confirms it and starts orthographic generation. The drawings page clearly states that the output is concept-level.
- Icons and accessibility: removal and download use the project's installed icon library. File controls, range, buttons, details, labels, status text, and modal state remain semantic and keyboard reachable.
- Responsiveness: the stage collapses from three columns to two and then one; drawings collapse to one column below 800 px. No desktop overflow or hidden persistent action was observed.

## Comparison history

1. The earlier implementation hid the ratio control unless both images were uploaded. The revised browser capture shows the control permanently present; disabled and single-source states no longer shift the intake layout.
2. The earlier step-2 layout duplicated the confirmation decision in the left card and retained a supplemental reference uploader. Both were removed. The revised completed-render capture shows one confirmation action in the center card and one revision action in the right card.
3. The earlier drawings view used three generic SVGs and a relatively narrow view card. It now reserves the dominant track for one generated raster and uses a compact specification column, matching the updated product requirement.

## Findings

No actionable P0, P1, or P2 visual findings remain.

P3 test gap: browser layout verification used a realistic raster fixture because ZooWork generation is asynchronous and variable. Contract, runtime, store, and endpoint tests cover the production path; actual generated-image similarity must still be judged per user result.

## Primary interactions tested

- Entered a text-only brief and verified Generate becomes available.
- Verified the disabled zero-image balance control in the real input state.
- Started a real local ZooWork request and observed the error state from the former 60-second local-only timeout; the local development timeout was then raised to match the 15-minute generation window.
- Inspected the completed three-card render fixture, including both distinct actions and collapsed advanced controls.
- Inspected the completed single-sheet drawings fixture, download action, specification copy action, and return-to-render action.
- Checked browser-accessible labels and the absence of the removed controls.

All unit tests, TypeScript checks, production build, lint, browser rendering, and visible route states passed. Existing lint warnings are limited to two pre-existing Fast Refresh warnings outside this feature.

final result: passed
