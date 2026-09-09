---
name: furniture-layout-planner
description: Convert confirmed room polygons, room functions, room programs, openings, and user priorities into a normalized furniture and fixture placement plan. Use after room confirmation and before validation or rendering; never alter walls, doors, windows, columns, or room polygons.
---

# Furniture Layout Planner

Produce room-appropriate first-pass furniture and fixture intent while treating the confirmed Home Model as immutable geometry.

Read [the placement contract](references/placement-contract.md) before planning.

## Planning order

1. Copy each confirmed `space_ref` and its polygon unchanged, then use `plan-scale-calibrator` to establish one shared plan scale.
2. Omit every `excluded_region`; it receives no furniture, fixtures, finishes, or room program.
3. Apply explicit user overrides first, then resolve the room program's `default_object_counts` to the final min/max target for this request.
4. Add the room program's remaining baseline objects as sensible defaults, not hard requirements.
5. Add conditional objects only when usable room depth and circulation allow them.
6. Select furniture from the metric dimension catalog before converting it to normalized source coordinates. Never size furniture as a percentage of its individual room. Keep the selected physical dimensions in the placement record.
7. Build door-opening, door-swing, entry-landing, and open-passage keep-out polygons before placing furniture. Then connect entry-to-opening and opening-to-room approach points with continuous 900 mm circulation corridors. No placement may intersect them.
8. Treat entry storage as optional. Use a shallow unit only when the protected 900 mm route remains continuous; otherwise omit it with a planning warning.
9. Derive a dry zone and a wet zone for every full bathroom from its entrance side. Put the vanity and toilet in the dry zone and the shower or tub in the deeper wet zone, keeping the door swing clear.
10. Orient primary pairs coherently: sofa toward television, bed with bedside access, kitchen sink/cooktop/refrigerator along a workable run.
11. Unless the user overrides it, keep exactly one bed per bedroom; exactly one toilet, one sink or vanity, and one shower or tub zone per full bathroom; and exactly one sink, one cooktop, and one refrigerator per kitchen.
12. Give repeated allowed objects stable unique placement IDs and return normalized placement intent for validation. Do not render or generate an image.

Never introduce a space function absent from the Home Model. Estimated door-reference dimensions may guide consistent planning but must never be presented as measured or construction-ready.
