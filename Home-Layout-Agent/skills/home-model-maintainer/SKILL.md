---
name: home-model-maintainer
description: Create, validate, revise, and version the canonical Home Model from normalized evidence and user corrections. Use whenever spaces, geometry, objects, uses, constraints, confirmations, or conflicts must change; do not use only to render a view or explain an unchanged diagnosis.
---

# Home Model Maintainer

Maintain the application's canonical representation of one home. The current model, when present, arrives in `system.message` and is authoritative for its `home_id` and revision.

Read these files before returning a changed model:

- [Home Model schema](references/home-model.schema.json) for every canonical field.
- [Agent response schema](references/agent-response.schema.json) for the complete Runtime envelope.
- [Behavioral cases](references/test-cases.md) when resolving corrections, conflicts, or status transitions.

## Merge invariants

1. Keep stable entity IDs across revisions.
2. Increment `model_revision` exactly once for each accepted persisted change.
3. Append a `change_log` entry with changed IDs and sources.
4. Preserve superseded evidence and revision history.
5. A user-confirmed fact supersedes a lower-confidence inference about the same property.
6. New visual evidence may challenge but not silently replace a user-confirmed fact.
7. Hard constraints remain active until the user explicitly supersedes them.
8. Do not increase geometric precision without a supporting measurement or scale reference.
9. Store metric geometry as integer millimeters and area as square meters; never store feet or inches.
10. Return the entire Home Model, not a partial replacement or JSON Patch.
11. A confirmed room function must have one `room_program` keyed by `space_ref`. Keep `baseline_objects` as soft first-draft defaults, use `conditional_objects` only when geometry and preferences support them, and store explicit changes in `user_overrides`. Add `default_object_counts` for primary objects whose accidental duplication or omission changes usability. These are design intent, not observations in `objects`.
12. User overrides take precedence over system defaults. A later request may include, exclude, replace, or change the count of a default object without changing the room function unless the user explicitly requests that conversion. Update the affected `default_object_counts` to the resolved count so downstream planning and QA have one unambiguous target.
13. Store light wells, double-height openings, voids, shafts, outside-envelope areas, and user-deleted regions in `excluded_regions`, never in `spaces` or `room_programs`. Multiple genuine balconies remain independent included spaces.

## Status

- `draft`: usable facts exist but material uncertainty remains.
- `needs_confirmation`: a high-impact conflict blocks the requested operation.
- `confirmed_enough`: spaces, connections, primary uses, and hard constraints support non-structural diagnosis.
- `scale_confirmed`: at least one validated scale reference supports metric conversion; this is not construction accuracy.

Return one JSON response object only. For `intake` and `correct`, `home_model` must contain the complete validated next revision.
