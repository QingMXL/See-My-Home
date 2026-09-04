# UI ↔ Home Layout Agent event contract

The UI owns controls and visible state only. The application backend owns authentication, upload storage, project/session lookup, persistence, version lookup, and artifact proxying. The Agent owns all semantic and generative work.

## `project.create`

Triggered by the user's Upload / Project Brief / Continue action.

Input:

- `project_id`
- `locale`: `en-US` or `zh-CN`
- one or more sources with a time-limited HTTPS `asset_ref`
- optional natural-language project brief

Agent responsibility:

1. Inspect the source pixels or PDF with the platform visual capability.
2. Parse rooms, boundaries, openings, fixed fixtures, major objects, source text, relationships, and uncertainty.
3. Create the first canonical Home Model.
4. Return room labels and normalized source geometry for UI review through `home_model.spaces`.

## `room_map.confirm`

Triggered when the user confirms or edits room labels and living priorities.

Input:

- `project_id`
- authoritative label corrections keyed by stable space IDs
- optional normalized polygons retained from the source
- lifestyle/functional requirements and constraints

Agent responsibility:

1. Apply user corrections over lower-confidence visual inferences.
2. Preserve stable IDs and revision history.
3. Return the complete next Home Model revision.

## `agent.generate`

Triggered by the Generate control after the mode and parameters are selected.

Input:

- `project_id`
- `mode`: `layout`, `style`, or `furniture`
- the authoritative current Home Model
- mode-specific preferences

For `mode: layout`, the Home Layout Agent must:

1. Diagnose supported problems and opportunities.
2. Build a geometry-controlled visualization brief.
3. Generate the result with the platform `imageGenerationModel` capability.
4. Save the final image under `/workspace/outputs/<home_id>/`.
5. Publish the final image with `artifact_publish`.
6. Return the structured JSON response. The Runtime associates the artifact with the run and exposes it to the UI.

## `agent.refine`

Triggered by the text dialog on a completed Layout result. It is a new `user.message` in the same ZooWork Session, not a new Agent or provider call made by the UI.

Input:

- `project_id`
- the user's natural-language change request
- the authoritative current Home Model

The Agent preserves confirmed room functions, room programs, boundaries, openings, and hard constraints; updates only the permitted visual arrangement; runs the same no-text generation and quality-gate flow; and publishes one new request-specific artifact.

## Result actions

`compare`, `regenerate`, `lock`, and `export` are UI controls that emit new backend events. They do not implement design logic in the browser. Regeneration must preserve locked IDs and hard constraints. Export operates on a published artifact or a persisted Home Model revision.
