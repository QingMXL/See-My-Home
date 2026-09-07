---
name: table-concept-renderer
description: Use whenever See My Home requests either a table product render or a confirmed table's concept orthographic sheet. Generates one weighted-reference product image for concept_render, or one three-panel front/side/top line-art image for orthographic_sheet, then inspects and publishes the readable artifact for home-furniture-v1.
---

# Table concept renderer

Read `references/visualization-contract.md` before calling any visual generation or publication tool.

## Execution

1. Read `request.output_mode` first. Start from the validated table design specification, not from an improvised prompt.
2. For `orthographic_sheet`, use `render_asset_ref` as the sole visual source and `confirmed_design_spec` as immutable structured truth. Skip the weighted-reference rules below and follow the orthographic section in the visualization contract.
3. For `concept_render`, when both images exist, reflect `source_priority` in the prompt and specification: stay closer to the higher-weight image and retain proportionally fewer cues from the lower-weight image. At equal weights, synthesize both.
4. For `concept_render`, when only one image exists, use it as the sole visual reference. Do not reproduce logos or copy a branded product wholesale.
5. Build one English image prompt for the requested mode. A product-render prompt states the dimensions, components, materials, finish, camera viewpoint, and prohibited changes. An orthographic prompt requests one pure black-on-white landscape raster with exactly three equal-width, consistent line-art panels: front, side, and top, with clear margins for application-rendered annotations.
6. Call the available ZooWork image-generation capability exactly once using only arguments exposed by the current tool schema. Do not invent model, provider, numeric image-weight, or control-strength arguments.
7. Call `sessions_yield` exactly once and end the waiting run. In ZooWork's attachment continuation, materialize the returned image, inspect it once, and compare it with the applicable visual source and specification.
8. For concept renders, publish only when the raster is readable and passes the mode checks. For an orthographic sheet, publish any readable three-panel front/side/top geometry layer that recognizably matches the confirmed component inventory. Missing views, perspective-only output, corrupt output, or materially different furniture still fail. Raster proportion drift alone does not fail the orthographic artifact: record it in `warnings`, because the application normalizes the three panels to the confirmed ratios before adding dimension rails.
9. Return one compact JSON response matching the supplied response schema. For `orthographic_sheet`, echo `confirmed_design_spec` unchanged in `response.design_spec`.

For `concept_render`, do not ask the image model for drawings. For `orthographic_sheet`, create one three-panel geometry layer without generated text, dimension numbers, a title block, or manufacturing claims. The final PNG is required to carry CAD-like dimension lines for overall width/depth/height plus confirmed top, base, and major-component measurements. The application normalizes each panel and renders those exact values from `confirmed_design_spec`, so aim for the corresponding ratios and keep clear margins around every view. Set `qa.dimensions_consistent=true` when the structured specification is echoed unchanged; use warnings, rather than failure, for correctable raster ratio drift.
