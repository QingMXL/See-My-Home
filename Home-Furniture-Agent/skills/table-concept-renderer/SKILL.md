---
name: table-concept-renderer
description: Use whenever See My Home requests a product render or confirmed orthographic view for a table, chair, sofa, or lamp. Generates one weighted-reference concept image or one strict front, side, or top line-art layer for home-furniture-v1.
---

# Furniture concept renderer

The stable Skill name is retained for deployed-agent compatibility, but this renderer covers all supported furniture categories.

Read `references/visualization-contract.md` before calling any visual generation or publication tool.

## Execution

1. Read `request.output_mode` and the exact item in historical `request.table_type`. Start from the validated design specification, not an improvised prompt.
2. For `orthographic_sheet`, use `render_asset_ref` as the sole visual source and `confirmed_design_spec` as immutable structured truth. Skip weighted-reference rules and follow the orthographic contract.
3. For `concept_render`, reflect `source_priority` in the natural-language prompt and specification. When only one image exists, use it as the sole visual reference. Do not invent numeric image-tool weights.
4. Build one English image prompt. Include exact furniture category, dimensions, component inventory, materials, finish, camera viewpoint, category anatomy, and prohibited changes.
5. Category anatomy is mandatory: chairs retain seat/back/arms/frame/supports and mechanisms; sofas retain module handedness, cushion count, arms, seams, frame and base; lamps retain shade/diffuser, head count, stem/arms, light source and base/mount/canopy; tables retain top/supports/apron/storage/hardware.
6. For an orthographic prompt request only `request.orthographic_view`, one pure black-on-white full-object line-art raster with clear margins. Require a heavier visible outer contour and thinner internal lines. A top plan uses a camera axis perpendicular to the floor, no adjacent faces, and only surfaces genuinely visible from directly above; opaque upper parts occlude lower parts.
7. Call the available image-generation capability exactly once using only current tool-schema arguments. Then call `sessions_yield` exactly once. In the attachment continuation, materialize the returned image once.
8. For `concept_render`, publish the successfully materialized image without a second `image` inspection. For orthographic output, inspect once and publish only a readable, complete requested view matching the confirmed inventory. Cropping, multiple views, perspective, corrupt output, missing or added major components, a different furniture category, shading, material texture, hidden structure, or uniformly faint construction strokes fail.
9. Return one compact JSON response matching the supplied schema. For `orthographic_sheet`, echo `confirmed_design_spec` unchanged, set both orthographic QA fields explicitly, and publish only when both are true.

The application composes three independent orthographic layers into one 4K PNG and adds deterministic overall dimensions. It adds the main upper-surface thickness only for table types. This remains concept-level output and is not a fabrication, structural, or electrical engineering drawing.
