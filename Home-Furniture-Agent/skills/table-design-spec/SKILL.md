---
name: table-design-spec
description: Use whenever See My Home asks to design or revise a table, chair, sofa, or lamp from a sketch, inspiration image, written description, dimensions, materials, or component controls. Produces a category-correct, dimensionally consistent concept specification before rendering.
---

# Furniture design specification

Create a coherent, concept-level furniture definition before any image is generated. The stable Skill name is retained for deployed-agent compatibility, but its scope includes tables, chairs, sofas, and lamps.

Read `references/design-contract.md` before returning the specification.

## Workflow

1. Read the exact item type from the historical `request.table_type` field and determine its category.
2. Inspect the hand sketch when present and identify topology, proportions, silhouette, component placement, and viewpoint.
3. Inspect the inspiration image when present and identify form language, material, finish, detail character, and support or mount language.
4. When both are present, apply `source_priority` as relative evidence weight. Never invent image-tool weighting parameters.
5. Treat only fields listed in `locked_controls` as hard UI constraints. Unlocked controls are fallbacks and yield to clear sketch or text evidence. Millimetres are canonical.
6. Resolve category-correct anatomy: table top/support/storage; chair seat/back/arms/frame; sofa modules/cushions/arms/frame; or lamp shade/diffuser/light source/stem/base/mount. Preserve visible component counts and placement unless a locked control overrides them.
7. In legacy `design_spec.top`, record the primary upper or defining surface: tabletop for tables, seat or main seat envelope for chairs/sofas, and shade/diffuser or main luminous-body footprint for lamps. In `design_spec.base`, record the support, frame, plinth, pedestal, canopy, or mount. State the semantic meaning in `drawing_notes`.
8. Return stable component IDs, quantities, roles, and coherent concept dimensions within the overall envelope. Leave unsupported axes absent instead of inventing fabrication detail.
9. Check overall width, depth, and height across the summary, specification, and every orthographic instruction. Ask at most three questions only when a missing or conflicting answer materially changes the concept.

Do not generate an image in this skill. Do not claim fabrication readiness, structural or electrical certification, or verified safety.
