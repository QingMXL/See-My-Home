# Furniture flow design QA

- source visual truth path: `/var/folders/vn/hhys4cq15dj9cnnlskknp5jm0000gn/T/codex-clipboard-5d6d7627-d628-4dcc-8489-fee7cb714b37.png`
- source pixels: 1772 × 1860 px (the conversation preview was normalized to 1536 × 1612 px)
- implementation: local browser render at `/furniture`, `/furniture/render`, and `/furniture/drawings`
- implementation screenshot evidence: Codex CUA browser captures in this task (the desktop browser surface does not expose a filesystem screenshot path)
- implementation viewport: 1404 × 791 CSS px
- implementation pixels: 1404 × 791 px
- device scale factor: 1
- state: Chinese, light theme, desktop; input, completed render fixture, generating overlay, and completed drawings
- density normalization: source and implementation were judged at CSS-size presentation; the old source is a taller full-page capture, so comparisons used matching header and card regions rather than browser height.

## Full-view comparison evidence

The source screenshot and the browser-rendered implementation were opened and compared in the same QA pass. The implementation keeps the existing product header, typography, warm neutral palette, thin borders, card radius, and three-step progress indicator. It intentionally changes the approved workflow: step 1 is a centered single intake card; step 2 is a balanced three-card workspace with the render as the dominant middle region; step 3 removes all intake/refinement cards and shows only orthographic views plus specifications.

At desktop width, all three step-2 cards share one stage height. The left and right card bodies scroll internally while their primary actions stay in fixed footer rows. The render uses `object-fit: contain` and the center card remains the widest visual region. The generating overlay is portaled to the document body and appeared in the upper-center of the viewport in the browser capture.

## Focused region comparison evidence

- Input: the two image inputs, conditional source-balance slider, description, and Generate action were inspected together. The slider is absent until both image sources exist.
- Refinement: color/material swatches, replacement reference image, free-text revision, collapsed advanced controls, and Generate Again were inspected. The former nine-select wall and yellow warning cards are no longer visible by default.
- Drawings: the three views use the same 1200 × 1200 × 450 mm test specification, and the specification card repeats those values.
- Loading: Generate Again was activated against a non-returning local test endpoint; the modal overlay remained visible above the viewport content and locked background scrolling.

## Required fidelity surfaces

- Fonts and typography: existing site families and tokenized sizes are preserved; headings, field labels, helper text, and buttons keep a clear hierarchy without clipped text.
- Spacing and layout rhythm: the intake card is centered; the render card is the dominant track; step-2 cards align; card padding, gaps, radii, and dividers reuse product tokens.
- Colors and visual tokens: existing ink, surface, warm-surface, line, and semantic error colors are reused. Material controls use restrained real material color swatches.
- Image quality and asset fidelity: uploaded and generated raster images retain aspect ratio. The browser QA used the repository's real furniture marketing image as a layout fixture; production output remains the Agent-provided image.
- Copy and content: Chinese labels describe actions directly. Technical warnings and design details are collapsed under “设计说明”; advanced controls are collapsed under “高级调整”.
- Responsiveness and accessibility: cards collapse to two columns and then one column at existing breakpoints; all controls are semantic buttons, inputs, selects, details, or fieldsets; the active step exposes `aria-current`; the generating layer is an accessible modal dialog.

## Comparison history

1. Initial browser pass found a P2 content issue: a text-only request showed “草图 0% / 灵感 0%” in the input summary. Fixed by rendering source percentages only when at least one image source contributes. The post-fix browser capture shows the brief without the meaningless ratio.
2. Initial source review identified the P1 viewport issue already reported by the user: generation progress could appear below the visible work area. Fixed by portaling the overlay to `document.body`, using fixed positioning and viewport-aware top padding. The post-fix generating-state capture shows the full progress panel above the fold.
3. Initial source review identified the P1 density issue already reported by the user: nine controls plus warning cards dominated the right column. Fixed by keeping only material/color, reference image, and revision text visible; detailed controls and output notes are collapsed. The post-fix completed-render capture has no remaining dense warning stack.

## Findings

No actionable P0, P1, or P2 visual findings remain.

P3 test gap: the completed-render layout was checked with a realistic local furniture image fixture rather than spending a live Agent image generation. Production imagery still comes through the unchanged typed Agent response contract.

## Primary interactions tested

- Entered a text-only furniture brief and verified the Generate action becomes available.
- Opened the completed render stage and verified all three work areas.
- Activated Generate Again and verified the persistent generating overlay.
- Opened the independent drawings stage.
- Used “返回调整效果图” to return from drawings to the render workspace.

Build, lint, unit tests, browser rendering, route transitions, and the primary UI states passed. No console-visible application error appeared during the verified UI flow; the intentionally non-returning local endpoint was stopped after the overlay check.

final result: passed
