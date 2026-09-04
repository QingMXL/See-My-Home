---
name: layout-visualization
description: Generate and publish a geometry-controlled colorized plan, Visual Home Model, or conceptual perspective for agent.generate. Use whenever the UI requests visual output; never use generated imagery to confirm or mutate home geometry.
---

# Layout Visualization

Diagnose the current confirmed Home Model, create a visualization brief, execute it with ZooWork's platform image-generation capability, and publish the final image artifact in one Agent run. Read [the visualization contract](references/visualization-contract.md), [the generation event contract](references/agent-generate-event.md), and the layout-diagnosis contract before producing it.

## Modes

- `colorized_plan`: preserve plan geometry while styling rooms, materials, and confirmed objects. Keep generated pixels free of text; the UI overlays room labels.
- `visual_home_model`: communicate spaces, relationships, constraints, actual uses, and uncertainty.
- `conceptual_perspective`: describe one room or spatial connection; label it conceptual unless scale and camera geometry are validated.

## Execution

1. Produce a compact diagnosis from supported facts in the authoritative Home Model, then build the provider-neutral `visualization_brief` from it. Do not run a separate diagnosis turn.
2. Build the prompt from every confirmed `room_program`. Treat `baseline_objects` as soft first-draft defaults, include a `conditional_object` only when visible geometry and user preferences support its condition, then apply `user_overrides` and the current request with highest priority. Resolve and state every `default_object_counts` target exactly, room by room. Set `preferred_providers` to `["Banana Pro", "Image 2"]`: prefer Banana Pro for source-referenced image-to-image work and Image 2 for clean-plan generation or pre-generation fallback. Use only tool arguments exposed in the current ZooWork run. Do not call a provider HTTP API or ask for another key.
3. Use the original source `asset_ref` when the selected tool supports it. Always encode frozen geometry and prohibited changes in the generation request.
4. `image_generate` is asynchronous. Launch exactly one generation task, then use `sessions_yield` to await its completion continuation. A status response or resumed continuation must never launch a duplicate generation.
5. The completion continuation supplies an async attachment `artifactId`. Immediately call `media_materialize` once with that ID and `/workspace/artifacts/<home_id>/<home_id>_<request_id>_layout.png`, then inspect the materialized image once with `image`.
6. Treat geometry drift, a changed room function, incompatible fixtures, `default_object_counts` mismatches, missing furniture, and hallucinated/illegible text as quality warnings. Publish the candidate whenever the materialized file is a readable raster. Never turn a render defect into design advice.
7. Return the required JSON response with `status: completed` after publication, including precise quality warnings. Only a missing, corrupt, empty, or technically unreadable file may remain unpublished. The Runtime discovers published artifacts from the Session; do not add undeclared fields to the response.

The brief must be independently executable and contain both positive and negative prompts. Include every supported frozen element by stable entity reference, list the permitted changes, and include `preferred_providers` in priority order. Provider choice does not change preservation rules.

## Preservation

1. Freeze confirmed boundaries, openings, fixed fixtures, retained objects, and hard constraints.
2. Never add, remove, or move frozen geometry for visual appeal.
3. Never invent dimensions or room labels.
4. Request a label-free generated image and never add text. Treat newly invented labels, numbers, pseudo-text, or illegible glyphs as blockers. Exact source annotations may remain when removing them would damage confirmed geometry; the UI owns localized room-name overlays.
5. Mark a perspective `conceptual_not_measured` unless scale and camera geometry are sufficient.
6. A generated result cannot become evidence for the Home Model.
7. For a source PDF without a raster reference image, mark the output `conceptual_not_measured` even when normalized room polygons are present.

Return one Runtime response envelope with both `diagnosis` and `visualization_brief` populated.
