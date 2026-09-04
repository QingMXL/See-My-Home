---
name: home-layout-intake
description: Normalize additional home evidence into traceable spatial claims after a Room Map exists. Use for later photos, measurements, and user statements; initial project.create plan parsing belongs to room-map-parser, and rendering belongs to layout-visualization.
---

# Home Layout Intake

Turn application-supplied follow-up sources into a mergeable evidence ledger. Initial `project.create` floor-plan parsing is intentionally handled by `room-map-parser` so the UI receives a small confirmation payload first. The application does not pre-analyze pixels and does not supply a visual-provider key.

Before processing input, read:

- [Home Turn Request schema](references/home-evidence.schema.json) for the exact request contract.
- [Intake contract](references/intake-contract.md) when assigning epistemic states, confidence, conflicts, or questions.
- [UI-Agent event contract](references/ui-agent-events.md) for the `project.create` and `room_map.confirm` ownership boundary.

## Workflow

1. Inventory every source by stable `source_id`, kind, and asset reference.
2. For a visual source, use the verified ZooWork `image` tool with `{ image: asset_ref, prompt: <analysis instructions> }`. Record the platform visual model when observable, and extract room labels, boundaries, doors, windows, fixed fixtures, major objects, text, and source-normalized polygons when supported. Never fetch the image through a provider API.
3. Convert evidence into atomic claims. Preserve source wording for measurements and explicit constraints.
4. Keep `observed`, `inferred`, and `user_confirmed` distinct. A vision-model room label remains inferred until the user confirms or edits it; its source-space polygon remains visual evidence rather than measured geometry.
5. Preserve image-space geometry as `image_normalized_0_1`.
6. Create metric geometry only when scale is confirmed. Store coordinates as integer millimeters.
7. Record competing claims as conflicts. Ask at most three questions only when answers change geometry, hard constraints, or high-impact diagnosis.
8. Hand the evidence ledger to `home-model-maintainer`; do not diagnose or generate imagery here.

Reject unsupported or malformed evidence rather than filling missing fields with plausible values.
