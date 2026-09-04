# Source-referenced generated rendering

Input: source image, confirmed room polygons, confirmed boundaries/openings, validated placements, locale.

Primary output: one label-free, source-referenced raster image published as a ZooWork Artifact.
Fallback strategy: `source_locked_svg_overlay`.

- Source geometry is immutable.
- The generated plan uses normalized polygons and the validated placement plan to guide room materials, furniture, and fixtures. It keeps all `excluded_regions` untouched.
- After user overrides, every object covered by `default_object_counts` should remain within its resolved room-specific min/max count; a mismatch is returned as a precise warning on the published candidate.
- The original source image must be supplied to `image_generate` when the exposed tool supports the `image` input.
- Labels are a separate UI layer and use locale-aware browser fonts.
- The base result uses ZooWork's injected `imageGenerationModel` and must require no external provider API key.
- The application displays the published raster as the primary design view while retaining the deterministic overlay as a fallback and geometry-verification view.
- Generated imagery can never mutate or confirm the Home Model.
- A readable materialized raster is always published even when inspection reports geometry, function, furniture, fixture-count, or text defects. Only a missing, corrupt, empty, or technically unreadable file may end without `artifact_publish`.
