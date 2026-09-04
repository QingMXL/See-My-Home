---
name: table-design-spec
description: Use whenever See My Home asks to design or revise a table from a sketch, inspiration image, written description, dimensions, materials, or component controls. Covers dining tables, coffee tables, console tables, side tables, desks, bedside tables, nesting tables, bar tables, and other table-like furniture; produces a dimensionally consistent concept specification before rendering.
---

# Table design specification

Create a coherent, concept-level table definition before any image is generated.

Read `references/design-contract.md` before returning the specification.

## Workflow

1. Inspect the hand sketch when present and treat it as the primary source for topology, proportions, silhouette, and component placement.
2. Inspect the inspiration image when present and use it only for secondary aesthetic cues such as material, finish, edge character, and base language.
3. Apply explicit numeric dimensions as hard constraints. Millimetres are canonical even when the UI also displays inches.
4. Resolve the table type, top shape, edge profile, base style, materials, finish, storage, and component notes.
5. Return components with stable IDs, quantities, roles, and dimensions that do not exceed the overall envelope.
6. Check width, depth, and height across the design summary, design specification, and every orthographic-view instruction.
7. Ask at most three questions, and only when a missing or conflicting answer materially changes the concept.

Do not generate an image in this skill. Do not claim that the concept is fabrication-ready, structurally certified, or safe for a stated load.
