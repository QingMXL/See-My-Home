# Table concept design contract

The sketch is the primary form authority when present. Preserve its recognizable number and arrangement of tops, supports, aprons, stretchers, shelves, drawers, and other major components. Exact numeric controls override apparent sketch scale because a freehand drawing is not measured evidence.

The inspiration image is secondary. Borrow observable design language without copying logos, brand identifiers, or an entire protected product. When there is no sketch, the inspiration image may become the primary visual reference, but explicit text and dimensions still control function and size.

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
