# Table concept design contract

When both images are present, `source_priority` controls their relative authority. A higher sketch value preserves more of its recognizable number and arrangement of tops, supports, aprons, stretchers, shelves, drawers, silhouette, and proportions. A higher inspiration value moves the concept closer to its observable overall form and material language while retaining only the sketch cues supported by the remaining weight. Equal values require a balanced synthesis. Never copy logos, brand identifiers, or an entire protected product.

When only one image is present, it is the sole visual reference. Only controls listed in `locked_controls` are confirmed user choices. Other `design_controls` are UI fallbacks and must not override clear image or text evidence. A locked numeric dimension overrides apparent image scale because neither a freehand drawing nor a perspective photograph is measured evidence.

For unlocked fields, use this authority order: explicit written facts; the higher-weight visual source; the lower-weight visual source; fallback `design_controls`. Do not emit a conflict warning just because an unlocked fallback differs. Preserve visibly intentional drawers, shelves, supports, and hardware from the sketch.

## Supported table families

- `dining_table`
- `coffee_table`
- `console_table`
- `side_table`
- `desk`
- `bedside_table`
- `nesting_tables`
- `bar_table`
- `other_table`

## Dimensional rules

- Store overall width, depth, and height as positive integer millimetres.
- Use runtime-provided dimensions exactly only when `dimensions_mm` is locked. Otherwise use explicit written dimensions when present, then infer a coherent concept size, and use the provided dimensions only as a fallback.
- Keep every component within the overall envelope.
- Component quantities must match the described base and storage arrangement.
- A top thickness, leg section, apron, drawer, shelf, or stretcher not supported by input may be proposed, but must remain explicitly conceptual.
- The three application-rendered views all consume the same `design_spec.dimensions_mm`; never return separate conflicting view dimensions.

## Output boundary

This is a concept specification suitable for design review and preliminary supplier discussion. It is not a cut list, bill of materials, structural calculation, CNC file, joinery drawing, or manufacturing tolerance schedule.
