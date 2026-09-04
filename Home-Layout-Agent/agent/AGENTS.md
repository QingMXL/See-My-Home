# AGENTS — Runtime and Routing Contract

## Objective

Own the semantic work behind the See My Home layout flow: parse an uploaded plan into a compact Room Map, maintain the confirmed Home Model, plan furniture, validate the plan, and specify a source-locked render. The UI is only a control, event, and state surface; the application Runtime commits user edits and renders the deterministic plan.

The application owns durable project state and asset delivery. Each turn arrives as a structured JSON envelope with `runtime_contract`, `ui_event`, `runtime_timestamp`, `authoritative_state`, `contracts`, `output_requirement`, and `request`. Treat `authoritative_state.current_home_model` as the authoritative current revision. Route by `ui_event.type`, then use `request.operation` for the response schema. The embedded schemas are exact; follow field names, required fields, enums, and `additionalProperties` literally. Never recover another home's state from conversation history.

## Routing

- `runtime_contract: room-map-v1` with `ui_event.type: project.create`: use `room-map-parser`, call the verified ZooWork `image` tool exactly once, and return the compact Room Map response. Do not build a Home Model or diagnose in this phase.
- `ui_event.type: room_map.confirm`: normally does not reach the Agent. The Runtime commits user-confirmed labels, normalized polygons, boundary status, and living priorities into the Home Model.
- `ui_event.type: room_map.confirm`: use `home-model-maintainer` to commit the edited normalized polygons and room functions. User-edited geometry supersedes the inferred polygon.
- `ui_event.type: agent.generate` / `operation: visualize`: use `furniture-layout-planner`, then `layout-validator`, then `floorplan-renderer`. Return diagnosis and a source-referenced render brief, call the injected `image_generate` capability once, call `sessions_yield` once and end the waiting run without final JSON, then materialize, inspect, and publish one usable raster artifact in ZooWork's automatic attachment continuation. The application Runtime keeps the confirmed geometry and validated placement plan as the fallback and validation authority.
- Use `material-stylizer` for an explicit optional style/concept request. Both the base colorized plan and optional concepts use the injected `image_generate` model without another provider key. Generated imagery is never the geometry authority.

## Universal invariants

1. Every material spatial claim has a stable ID, source references, epistemic state, and confidence.
2. On `project.create`, an `asset_ref` is a time-limited HTTPS source supplied by the application backend. Inspect it with the platform visual capability. Do not request or invent a provider API key.
3. Do not invent metric geometry. Without confirmed scale, keep `geometry.metric` null and preserve normalized source geometry.
4. Metric coordinates are integer millimeters in `local_plan_2d`; area is square meters. Do not store feet or inches. A US listing square-foot equivalent is derived display data only.
5. User corrections supersede lower-confidence claims without erasing the revision trail.
6. Generated imagery cannot create or confirm structural facts.
7. Hard constraints survive every revision until the user explicitly changes them.
8. Record material conflicts instead of silently resolving them. Ask no more than three questions, prioritizing geometry, hard constraints, and diagnosis impact.
9. Never infer load-bearing status, wall removability, code compliance, or construction feasibility from images or model output.
10. Use `en-US` by default and `zh-CN` when requested. JSON field names and enum values remain English in both locales.
11. The platform-injected `imageModel` and `imageGenerationModel` are the only visual providers. Never call Google, OpenAI, or another provider API directly and never ask the user for a second key.
12. For base `agent.generate`, task completion requires structured diagnosis, a validated source-referenced layout brief, and one published image artifact whenever image generation returns a readable raster. Quality defects belong in `warnings` and never suppress that artifact. Only a missing, corrupt, empty, or technically unreadable result may end without publication.
13. Keep `excluded_regions` outside furnishing, finish, room-program, and assessment scope. Multiple genuine balconies remain valid independent spaces; light wells, double-height openings, voids, shafts, outside-envelope areas, and user-deleted regions are exclusions.
14. After explicit user overrides, `default_object_counts` is the image-QA target. Missing or duplicated count-controlled objects and missing soft baseline objects are warnings attached to the published candidate, not publication blockers.
15. Banana Pro and Image 2 are the only approved image-generation routes. Prefer Banana Pro for source-referenced geometry preservation and Image 2 for clean-plan generation or pre-generation fallback. Never request another key or invent unsupported model-selection parameters.

## Required response envelope

For `home-layout-v2`, return one object conforming to `home-model-maintainer/references/agent-response.schema.json`:

- Echo `request_id`, `home_id`, `operation`, and `locale` exactly.
- On `visualize`, populate both `diagnosis` and `visualization_brief` so the single generation run carries the final design reasoning and image brief. Set `home_model` to null because the Runtime-supplied model is authoritative.
- Put the natural-language answer in `message`.
- Use `questions` for at most three focused questions and `warnings` for real fidelity or safety limitations.
- Do not wrap JSON in Markdown.

For `room-map-v1`, return the embedded Room Map schema instead of this envelope.
