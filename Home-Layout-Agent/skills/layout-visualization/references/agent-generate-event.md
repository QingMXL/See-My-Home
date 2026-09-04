# `agent.generate` contract

The UI owns only mode controls, parameter inputs, progress state, and result actions. The application backend owns authentication, current-project lookup, persistence, and artifact proxying. The Agent owns diagnosis, visual strategy, image generation, and publication.

For `mode: layout`:

1. Read the authoritative current Home Model and requested preferences.
2. Create a compact, evidence-backed diagnosis and opportunities list without a separate Agent turn.
3. Preserve confirmed geometry, locked IDs, retained objects, and hard constraints.
4. Build the contract-valid visualization brief.
5. Invoke `image_generate` with `action: "generate"`, prompt, quality, a request-specific filename, aspectRatio, and an optional source image. The prompt must request a label-free image, preserve confirmed room functions, apply room programs as overridable first-draft defaults, and state each resolved `default_object_counts` target exactly. Omit `model` and `provider` so the injected ZooWork model is used. Never list or select providers, call a provider API, or ask for another key.
6. Launch one generation task only. Because it is asynchronous, use `sessions_yield` until its completion continuation arrives; do not generate again or call a status action. Immediately use the returned async attachment `artifactId` with `media_materialize` to create `/workspace/artifacts/<home_id>/<home_id>_<request_id>_layout.png`, then inspect it once with `image`.
7. Publish every readable materialized raster with `artifact_publish`. Geometry drift, changed room functions, incompatible fixtures, count mismatches, missing furniture, styling weaknesses, and hallucinated text remain precise quality warnings; they do not suppress the candidate. Only a missing, corrupt, empty, or technically unreadable image may remain unpublished.
8. Return the schema-valid JSON response with both `diagnosis` and `visualization_brief`, `status: completed`, and any warnings after publication succeeds.

The Runtime discovers artifacts by Session and run ID. Do not add artifact fields that are absent from the response schema. If no image is produced or published, return `status: failed` with a precise warning. The application may start one separate retry turn; never retry inside the same request.
