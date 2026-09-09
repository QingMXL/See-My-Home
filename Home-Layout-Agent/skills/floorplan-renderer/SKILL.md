---
name: floorplan-renderer
description: Generate and publish the base See My Home colorized floor-plan image from the uploaded plan, confirmed polygons, room programs, and a validated placement plan. Use for agent.generate and agent.refine; preserve uploaded geometry, add realistic furniture and material finishes, and keep generated pixels label-free.
---

# Floorplan Renderer

The uploaded plan remains the visual geometry authority. When the Runtime supplies `src_layout_control_001`, it is the preferred generation reference: the image retains the original plan under deterministic furniture footprints, opening segments, circulation masks, and bathroom zones. Produce a compact render brief, generate one new source-referenced image with ZooWork's injected image-generation capability, inspect it, and publish it. The deterministic application renderer remains the fallback and validation reference.

Read [the render contract](references/render-contract.md) and [open-source adapter notes](references/open-source-adapters.md).

## Render contract

1. When `src_layout_control_001` exists, use its HTTPS `asset_ref` as the input image and use `src_floor_plan_001` as the geometry cross-check. Otherwise use the original source. Never request the source from the user again and never request another provider key.
2. Freeze the uploaded footprint, exterior and interior walls, columns, doors, openings, windows, and every user-confirmed room function. Do not move, resize, add, or remove them.
3. Use the validated placement plan, its shared scale, physical furniture dimensions, opening and continuous-circulation keep-out polygons, bathroom wet/dry zones, sofa/media relationship, and room material zones to add realistic top-down furniture and fixtures. The placement manifest is the sole resolved instance list. Each outlined control footprint represents exactly one object; `room_program` baselines and counts describe those same instances and never request another copy. Explicit user instructions remain highest priority. Never resize a bed, enlarge furniture beyond its planned footprint, close a door gap, or place cabinetry across an entrance or circulation path.
4. Convert the uniquely shaped control footprints into realistic objects and remove every colored guide, dashed path, zone tint, cyan opening stroke, and control outline from the final pixels. Render one television screen at the sofa-facing media target and keep the purple view axis unobstructed. In a full bathroom, keep exactly one vanity and one toilet in the dry zone and one shower or tub in the wet zone. In a kitchen, keep exactly one sink, one visibly recognizable cooktop, and one refrigerator along the planned work run.
5. Add restrained flooring, cabinetry, sanitary fixtures, lighting, and material finishes inside the confirmed rooms. Clip every finish to its room material-zone polygon and stop texture at the confirmed boundary; do not let entry, living, kitchen, bathroom, bedroom, or balcony finishes bleed into adjacent rooms. Keep the plan orthographic and source-faithful; do not convert it into a perspective view.
6. Add no text, room labels, legends, numbers, dimensions, pseudo-text, or glyphs to generated pixels. The UI overlays localized HTML labels with real fonts.
7. Call `image_generate` exactly once with `action="generate"`, `prompt`, `quality="high"`, the request-specific PNG filename, the requested aspect ratio, and `image` only when supported. Omit `model` and `provider` so ZooWork uses the Agent-injected `imageGenerationModel`.
8. After the background task starts, call `sessions_yield` exactly once. The acknowledgement is not the completed image. Immediately end that run with a brief plain-text waiting sentence: do not yield repeatedly, do not call `image_generate` again, do not emit final JSON, and do not treat a missing `artifactId` in that same run as a blocker. ZooWork automatically starts a continuation run when the attachment arrives.
9. In the continuation run only, materialize the returned attachment once, inspect the materialized image once, and publish that same file once with `artifact_publish` when no blocker exists. Never launch a second generation in the continuation.
10. Inspect each confirmed room and count the primary objects covered by `default_object_counts`. Record geometry drift, changed room functions, incompatible fixtures, count mismatches, missing furniture, and newly generated text precisely in `warnings`, but do not suppress a readable generated image because of those quality findings.
11. Publish every materialized candidate that is a readable raster image, then return the required JSON with `status: completed` and any quality warnings. Withhold publication only when the file is missing, corrupt, empty, or technically unreadable. Do not add an artifact field to the response; the Runtime discovers published artifacts through the Session API.

Generated pixels never become evidence for the Home Model. The confirmed source geometry remains authoritative even when the generated image is displayed as the primary design result.
