---
name: table-design-spec
description: Use whenever See My Home asks to design or revise a table from a sketch, inspiration image, written description, dimensions, materials, or component controls. Covers dining tables, coffee tables, console tables, side tables, desks, bedside tables, nesting tables, bar tables, and other table-like furniture; produces a dimensionally consistent concept specification before rendering.
---

# Table design specification

Create a coherent, concept-level table definition before any image is generated.

Read `references/design-contract.md` before returning the specification.

## Workflow

1. Inspect the hand sketch when present and identify its topology, proportions, silhouette, and component placement.
2. Inspect the inspiration image when present and identify its form language, material, finish, edge character, and base language.
3. When both are present, apply `source_priority` as the relative evidence weight: move the concept closer to the higher-weight image and retain fewer cues from the lower-weight image. At equal weights, synthesize both. Never invent image-tool weighting parameters.
4. Treat only fields listed in `locked_controls` as hard UI constraints. Unlocked `design_controls` are fallbacks and yield to clear sketch or text evidence. Millimetres are canonical.
5. Resolve the table type, top shape, edge profile, base style, materials, finish, storage, and component notes. Preserve visible component count, placement, and hardware from a sketch unless an applicable locked control overrides it.
6. Return components with stable IDs, quantities, roles, and dimensions that do not exceed the overall envelope. For visible tops, drawers, shelves, supports, and other major parts, populate the available width, depth, and height needed by the concept drawing's CAD-like dimension band. Leave an unsupported axis absent instead of inventing fabrication detail.
7. Check width, depth, and height across the design summary, design specification, and every orthographic-view instruction.
8. Ask at most three questions, and only when a missing or conflicting answer materially changes the concept.

Do not generate an image in this skill. Do not claim that the concept is fabrication-ready, structurally certified, or safe for a stated load.
