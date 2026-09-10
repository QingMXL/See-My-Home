# Furniture flow design QA

- source drawing reference: `/var/folders/vn/hhys4cq15dj9cnnlskknp5jm0000gn/T/codex-clipboard-39f6b832-7b19-4bc5-82b9-1deb8093f37a.png`
- source pixels: 1448 × 1086
- failed production drawing captured before this fix: `/tmp/furniture-production-1.png`
- implementation drawing fixture: `/tmp/furniture-shop-drawing-vector-font-qa.png`
- implementation pixels: 3840 × 2160
- browser verification: Codex in-app browser tab 16 at the local `/furniture` route
- browser state: English, light theme, empty intake

## Comparison

The source image is used only as layout, typography, and line-weight direction. Its sample measurements are not treated as product data. The implementation uses the confirmed furniture specification for all final numbers.

The failed production artifact confirmed that the dimensions were present in the SVG source but the Vercel runtime rendered every font glyph as a tofu box. The compositor no longer sends SVG `<text>` to Sharp. It now loads the bundled Liberation Sans font and converts every view title, number, and unit into SVG outline paths before rasterization, so the output cannot depend on an installed system font.

The generated sheet follows the reference hierarchy: a large front elevation in the upper-left, a side elevation in the upper-right, and a top view below. It uses a pure white 4K landscape canvas, a fine perimeter border, clear black object lines, thinner extension and dimension lines, filled arrowheads, readable 68 px primary dimensions, 62 px view labels, lowercase `mm` units, and a bottom-right unit note. Width, depth, height, and confirmed top thickness are visibly present in the rendered QA fixture with real numerals rather than placeholder boxes.

The three geometry panels use one scale derived from the confirmed dimensions. This keeps front/top widths, front/side heights, and side/top depths visually coordinated. The fixture intentionally used simple stand-in geometry to validate composition; production geometry continues to come from three independent ZooWork Agent image-generation turns based on the confirmed render.

## Top-view projection hardening

The latest production sheet at `/tmp/furniture-latest-orthographic.png` exposed a top-plan failure: lower supports and legs were shown through or outside an opaque tabletop even though the front and side elevations did not support that projection. The top-specific generation contract now requires a camera axis perpendicular to the tabletop, a tabletop plane parallel to the image plane, parallel projection without adjacent-face leakage, and visible surfaces only. Opaque upper surfaces must hide the apron, base, stretchers, shelves, drawers, and legs below them; dashed hidden structure is not allowed in this concept plan.

Every orthographic response must now explicitly pass both projection correctness and visible-surface correctness. Missing or false flags prevent the generated artifact from entering the final compositor and trigger the existing targeted retry path. Minor raster ratio drift is accepted only after those two gates pass.

## UI and interaction checks

- The English intake starts with an empty value and a localized example placeholder.
- Furniture prompt and refinement drafts are no longer persisted across reloads; completed Agent output remains persisted.
- The render summary falls back to the immutable request context after a reload.
- The refine card and all nested grid, fieldset, details, list, and select elements are width-constrained.
- The refine body allows vertical scrolling only. Material choices reflow to the available width instead of creating horizontal overflow.
- The middle render card remains the dominant desktop column; the existing two-column and one-column breakpoints remain intact.

## Accessibility and fidelity

- Existing semantic labels, native controls, focus behavior, and keyboard interaction are unchanged.
- Long English helper text can wrap; select controls remain within their card.
- No new fake UI assets or placeholder product imagery were introduced.
- The final drawing is still explicitly concept-level, not a fabrication-ready CAD file.

## Verification

- Web tests: 56 passed.
- Furniture Agent tests: 18 passed.
- API and all Agent TypeScript checks: passed.
- Production web build: passed.
- 4K raster composition was regenerated with the bundled-font path renderer and visually inspected against both the reference and the failed production artifact.
- The font-independent SVG regression asserts that no `<text>` or `font-family` dependency remains and that every published label contains non-empty vector path data.

No actionable P0, P1, or P2 findings remain. Actual product-line fidelity still depends on the ZooWork image model and is guarded by the stricter single-view publishing checks.

final result: passed

