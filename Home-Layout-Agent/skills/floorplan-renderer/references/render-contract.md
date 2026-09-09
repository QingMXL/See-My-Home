# Source-referenced generated rendering

Input: source image, optional deterministic control image, confirmed room polygons, confirmed boundaries/openings, validated placements, circulation keep-outs, bathroom wet/dry zones, locale.

Primary output: one label-free, source-referenced raster image published as a ZooWork Artifact.
Fallback strategy: `source_locked_control_overlay` when rasterization succeeds, otherwise the original source plus structured placement plan.

- Source geometry is immutable.
- The generated plan uses normalized polygons and the validated placement plan to guide room materials, furniture, and fixtures. It keeps all `excluded_regions` untouched.
- After user overrides, every object covered by `default_object_counts` should remain within its resolved room-specific min/max count; a mismatch is returned as a precise warning on the published candidate.
- The deterministic control image must be supplied to `image_generate` when available and when the exposed tool supports the `image` input. It retains the source plan underneath its guides; the original remains the geometry cross-check.
- Every control footprint maps to exactly one final object. Control colors and strokes are instructions, not final styling, and must disappear from the generated pixels.
- Labels are a separate UI layer and use locale-aware browser fonts.
- The base result uses ZooWork's injected `imageGenerationModel` and must require no external provider API key.
- The application displays the published raster as the primary design view while retaining the deterministic overlay as a fallback and geometry-verification view.
- Generated imagery can never mutate or confirm the Home Model.
- A readable materialized raster is always published even when inspection reports geometry, function, furniture, fixture-count, or text defects. Only a missing, corrupt, empty, or technically unreadable file may end without `artifact_publish`.
