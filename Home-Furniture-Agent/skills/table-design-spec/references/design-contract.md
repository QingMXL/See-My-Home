# Table concept design contract

When both images are present, `source_priority` controls their relative authority. A higher sketch value preserves more of its recognizable number and arrangement of tops, supports, aprons, stretchers, shelves, drawers, silhouette, and proportions. A higher inspiration value moves the concept closer to its observable overall form and material language while retaining only the sketch cues supported by the remaining weight. Equal values require a balanced synthesis. Never copy logos, brand identifiers, or an entire protected product.

When only one image is present, it is the sole visual reference. Exact numeric controls always override apparent image scale because neither a freehand drawing nor a perspective photograph is measured evidence.

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
- Use the runtime-provided dimensions exactly.
- Keep every component within the overall envelope.
- Component quantities must match the described base and storage arrangement.
- A top thickness, leg section, apron, drawer, shelf, or stretcher not supported by input may be proposed, but must remain explicitly conceptual.
- The three application-rendered views all consume the same `design_spec.dimensions_mm`; never return separate conflicting view dimensions.

## Output boundary

This is a concept specification suitable for design review and preliminary supplier discussion. It is not a cut list, bill of materials, structural calculation, CNC file, joinery drawing, or manufacturing tolerance schedule.
