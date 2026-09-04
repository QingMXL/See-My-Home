# Validation gates

Blocking:

- Any source polygon, wall, opening, window, or column was moved, removed, or invented.
- A placement references a missing space.
- A confirmed room function is replaced.
- Primary fixtures belong to another room type.
- Any room's resolved `default_object_counts` is violated after applying explicit user overrides.
- A primary bed, toilet, sink/vanity, shower/tub zone, kitchen sink, cooktop, refrigerator, sofa, TV/media wall, dining table, or desk is duplicated without a resolved count that permits it.
- A known door/opening is blocked.
- A placement or assessment references an `excluded_region`.

Warnings:

- A soft baseline object without a count rule is omitted because the polygon is too small or uncertain.
- Circulation or adjacency may be weak but can be improved without structural changes.
- Scale is unknown, so metric clearance cannot be certified.

Assessment items may cover circulation, functional gaps, adjacency, privacy, daylight, storage demand, activity conflict, and underused space. They must never mention rooms absent from the Home Model or treat render defects as design findings.
