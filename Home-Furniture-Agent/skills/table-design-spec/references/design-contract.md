# Furniture concept design contract

When both images are present, `source_priority` controls relative authority. A higher sketch value preserves more recognizable topology, silhouette, proportions, component count and arrangement, and viewpoint. A higher inspiration value moves closer to observable form, material, finish, and detail language. Equal values require balanced synthesis. Never copy logos, brand identifiers, or a protected product wholesale.

When only one image is present, it is the sole visual reference. Only controls listed in `locked_controls` are confirmed user choices. Other controls are UI fallbacks and must not override clear image or text evidence. A locked numeric dimension overrides apparent image scale because sketches and perspective photos are not measured evidence.

For unlocked fields use this authority order: explicit written facts; higher-weight visual source; lower-weight visual source; fallback controls. Preserve visibly intentional components and hardware.

## Supported item families

- Tables: `dining_table`, `coffee_table`, `console_table`, `side_table`, `desk`, `bedside_table`, `nesting_tables`, `bar_table`, `other_table`.
- Chairs: `dining_chair`, `armchair`, `lounge_chair`, `office_chair`, `stool`, `bench`, `other_chair`.
- Sofas: `sofa`, `loveseat`, `sectional_sofa`, `chaise_lounge`, `sofa_bed`, `ottoman`, `other_sofa`.
- Lamps: `table_lamp`, `floor_lamp`, `desk_lamp`, `pendant_light`, `chandelier`, `wall_sconce`, `other_lamp`.

## Category rules

- Chairs: keep seat/back relationship, arm presence, support count, ergonomic plausibility at concept level, upholstery boundaries, and swivel/cantilever/footrest mechanisms.
- Sofas: keep module arrangement and handedness, seat/back cushion count, arm profile, upholstery seams, chaise or bed mechanism, and feet/plinth.
- Lamps: keep head count, shade/diffuser geometry, luminous element placement, stem/arms, base/canopy/wall mount, and requested switch or cord. Treat electrical details as visual concepts only.
- Tables: keep top, support count and placement, apron/stretchers, storage, and hardware.

## Dimensional rules

- Store overall width, depth, and height as positive integer millimetres.
- Use runtime dimensions exactly only when `dimensions_mm` is locked. Otherwise use explicit written dimensions, infer a coherent category-appropriate concept size, then use provided dimensions as fallback.
- Keep components within the overall envelope; quantities match requested anatomy.
- The three views consume the same `design_spec.dimensions_mm`; never return conflicting view dimensions.
- Use `design_spec.top.thickness_mm` for the main upper or defining surface thickness. The application annotates it only for tables.

This is for design review and preliminary supplier discussion. It is not a cut list, bill of materials, structural or electrical calculation, CNC file, joinery drawing, wiring diagram, or manufacturing tolerance schedule.
