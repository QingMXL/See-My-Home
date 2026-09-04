# Visualization brief contract

The Runtime response `visualization_brief` contains:

- `based_on_model_revision`
- `mode`
- `fidelity_status`: `faithful_to_confirmed_geometry`, `conceptual_not_measured`, or `insufficient_geometry`
- `selected_entity_refs`
- `frozen_elements`
- `allowed_changes`
- `positive_prompt`
- `negative_prompt`
- `preferred_providers`

`preferred_providers` is an ordered routing preference for the application backend. For Home Layout output it must be exactly `["Banana Pro", "Image 2"]`. Prefer Banana Pro for geometry-preserving image-to-image generation and Image 2 for clean-plan generation or pre-generation fallback. This field is routing guidance, not permission to invent unsupported tool parameters.

For plan output, the positive prompt must enumerate each confirmed space's soft `baseline_objects`, geometry-supported `conditional_objects`, explicit `user_overrides`, and resolved `default_object_counts`. It must state the exact allowed count for every count-controlled primary object, room by room. The negative prompt must prohibit added or removed walls, moved openings, invented dimensions, room-function substitutions, incompatible or count-violating primary fixtures, perspective distortion, cropping of the exterior boundary, and newly invented labels, numbers, pseudo-text, or glyphs. Request a label-free result. Exact source annotations may remain unchanged when removing them would damage confirmed geometry; the UI adds localized room-name labels after generation.

Baseline and conditional objects guide a sensible first draft; they are not hard user constraints. Explicit user instructions and `user_overrides` take precedence and update the resolved count target. Count mismatches and missing soft baseline objects are generation-quality warnings on the published candidate, not reasons to suppress a readable image.

For conceptual perspective, preserve known openings, fixed objects, and spatial relationships while explicitly allowing non-measured camera interpretation. Do not describe the result as a verified reconstruction.
