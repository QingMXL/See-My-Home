---
name: table-concept-renderer
description: Use after a See My Home table concept specification is complete and the user requests a furniture render. Generates one weighted-reference table product image, preserves validated dimensions and components, follows the requested sketch-versus-inspiration similarity balance, inspects the result, and publishes the readable artifact for home-furniture-v1.
---

# Table concept renderer

Read `references/visualization-contract.md` before calling any visual generation or publication tool.

## Execution

1. Start from the validated table design specification, not from an improvised prompt.
2. When both images exist, reflect `source_priority` in the prompt and specification: stay closer to the higher-weight image and retain proportionally fewer cues from the lower-weight image. At equal weights, synthesize both.
3. When only one image exists, use it as the sole visual reference. Do not reproduce logos or copy a branded product wholesale.
4. Build one English product-render prompt that states the table type, exact overall dimensions, component arrangement, materials, finish, and prohibited changes.
5. Call the available ZooWork image-generation capability exactly once using only arguments exposed by the current tool schema. Do not invent model, provider, numeric image-weight, or control-strength arguments.
6. Call `sessions_yield` exactly once and end the waiting run. In ZooWork's attachment continuation, materialize the returned image, inspect it once, and compare it with the validated design specification.
7. Publish the raster only when it is readable, recognizably the requested table family, and consistent with the validated major components and proportions.
8. Return one compact JSON response matching the supplied response schema.

The application creates dimensioned front, side, and top line drawings from structured data. Do not ask the image model to draw dimensions, annotations, labels, diagrams, or orthographic sheets.
