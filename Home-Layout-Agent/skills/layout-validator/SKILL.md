---
name: layout-validator
description: Validate a proposed residential placement plan against confirmed source geometry, room functions, openings, room programs, and user constraints. Use after furniture planning and before rendering; reject geometry drift, cross-room fixtures, duplicate primary fixtures, blocked openings, and unsupported room references.
---

# Layout Validator

Validate structure first, function second, and presentation last.

Read [the validation gates](references/validation-gates.md).

## Required gates

1. Geometry identity: every confirmed polygon, wall, opening, window, and column remains unchanged.
2. Referential integrity: every placement and assessment reference names an existing confirmed space.
3. Function integrity: objects belong to the confirmed room function; a closet never receives bathroom fixtures.
4. Count integrity: after explicit overrides, count every object named in `default_object_counts` per room and reject any value below `min_count` or above `max_count`.
5. Primary fixture sanity: no duplicated beds, toilets, sinks, vanities, shower/tub zones, kitchen sinks, cooktops, refrigerators, sofas, TVs/media walls, dining tables, or desks unless the resolved count explicitly allows it.
6. Relationship sanity: seating faces its media target; kitchen work elements form a coherent run; door swings and openings are not knowingly blocked.
7. Exclusion integrity: no placement, finish, room program, or assessment target may reference an `excluded_region`.
8. Output safety: room labels are not baked into generated pixels.

Return concise blocking issues and warnings. The Runtime may render only when no blocking issue exists. Without confirmed scale, describe clearances qualitatively.
