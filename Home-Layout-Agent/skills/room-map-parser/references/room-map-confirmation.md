# Room-map confirmation contract

The room map is a visual proposal for human review, not measured architectural geometry.

## Identity and function

- `space.id` identifies a region and must not change when its label changes.
- `suggested_function` is the Agent's inference from visible evidence.
- The UI may present a translated label, but it sends a canonical function value keyed by `space.id`.
- Confirmation must distinguish `current_use` from `target_use`. If the user drops a new function onto a furnished room, do not assume whether they corrected the current use or requested a conversion.
- `planning_status` is separate from function. More than one balcony is valid; do not infer an error from repeated room functions.
- Light wells, double-height openings, open/raised voids, service shafts, and outside-envelope regions are `excluded`, not balconies or ordinary rooms. The UI may let the user delete a mistaken room; preserve its polygon as an excluded render mask even when its visible room chip is removed.

## Geometry

- Use source-normalized polygons in image coordinates: origin at top-left, x to the right, y downward.
- Boundaries express visible separation only. They do not imply that a wall is structural or removable.
- Low-confidence boundaries remain editable and must not be silently promoted to confirmed geometry.
- If a space has no defensible polygon, omit it from `spaces` and report the unresolved region instead of returning an empty polygon.
- A dwelling envelope is not a room polygon. When interior partitions or clear functional zones are visible, return one polygon per defensible space rather than one bounding rectangle around the home.
- Room polygons should cover the visible usable spaces with minimal gaps and no material overlaps. Shared walls should produce aligned or near-aligned polygon edges so the UI can snap edits cleanly.
- Keep all corners needed to follow the source geometry. Do not simplify an L-shaped or recessed room into a rectangle that crosses walls.
- A user edit may add or remove polygon vertices. User-edited topology supersedes the inferred topology once confirmed.
- When the asset cannot be inspected, return no spaces. A zero-confidence full-frame rectangle is misleading and must never be used as a fallback room.

## UI handoff

The UI overlays each polygon on the uploaded image. The user selects a region on the left, adjusts its boundary nodes when needed, and chooses its function from chips on the right. The UI returns confirmed assignments and boundary edits; it performs no semantic inference.
