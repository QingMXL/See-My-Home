---
name: furniture-layout-planner
description: Convert confirmed room polygons, room functions, room programs, openings, and user priorities into a normalized furniture and fixture placement plan. Use after room confirmation and before validation or rendering; never alter walls, doors, windows, columns, or room polygons.
---

# Furniture Layout Planner

Produce room-appropriate first-pass furniture and fixture intent while treating the confirmed Home Model as immutable geometry.

Read [the placement contract](references/placement-contract.md) before planning.

## Planning order

1. Copy each confirmed `space_ref` and its polygon unchanged.
2. Omit every `excluded_region`; it receives no furniture, fixtures, finishes, or room program.
3. Apply explicit user overrides first, then resolve the room program's `default_object_counts` to the final min/max target for this request.
4. Add the room program's remaining baseline objects as sensible defaults, not hard requirements.
5. Add conditional objects only when usable room depth and circulation allow them.
6. Orient primary pairs coherently: sofa toward television, bed with bedside access, kitchen sink/cooktop/refrigerator along a workable run.
7. Unless the user overrides it, keep exactly one bed per bedroom; exactly one toilet, one sink or vanity, and one shower or tub zone per full bathroom; and exactly one sink, one cooktop, and one refrigerator per kitchen.
8. Give repeated allowed objects stable unique placement IDs and return normalized placement intent for validation. Do not render or generate an image.

Never introduce a space function absent from the Home Model. Never infer metric clearance without confirmed scale.
