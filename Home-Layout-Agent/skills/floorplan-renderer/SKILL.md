---
name: floorplan-renderer
description: Generate and publish the base See My Home colorized floor-plan image from the uploaded plan, confirmed polygons, room programs, and a validated placement plan. Use for agent.generate and agent.refine; preserve uploaded geometry, add realistic furniture and material finishes, and keep generated pixels label-free.
---

# Floorplan Renderer

The uploaded plan remains the visual geometry authority. Produce a compact render brief, generate one new source-referenced image with ZooWork's injected image-generation capability, inspect it, and publish it. The deterministic application renderer remains the fallback and validation reference.

Read [the render contract](references/render-contract.md) and [open-source adapter notes](references/open-source-adapters.md).

## Render contract

1. Use the original HTTPS `asset_ref` as the reference image when the exposed tool supports an input image. Never request the source from the user again and never request another provider key.
2. Freeze the uploaded footprint, exterior and interior walls, columns, doors, openings, windows, and every user-confirmed room function. Do not move, resize, add, or remove them.
3. Use the validated placement plan and every `room_program` to add realistic top-down furniture and fixtures. Treat `baseline_objects` as soft first-draft defaults, conditional objects as space-dependent, and explicit user instructions as highest priority. After overrides, render every `default_object_counts` object within its resolved min/max count.
4. Add restrained flooring, cabinetry, sanitary fixtures, lighting, and material finishes inside the confirmed rooms. Keep the plan orthographic and source-faithful; do not convert it into a perspective view.
5. Add no text, room labels, legends, numbers, dimensions, pseudo-text, or glyphs to generated pixels. The UI overlays localized HTML labels with real fonts.
6. Call `image_generate` exactly once with `action="generate"`, `prompt`, `quality="high"`, the request-specific PNG filename, the requested aspect ratio, and `image` only when supported. Omit `model` and `provider` so ZooWork uses the Agent-injected `imageGenerationModel`.
7. After the background task starts, call `sessions_yield` exactly once. The acknowledgement is not the completed image. Immediately end that run with a brief plain-text waiting sentence: do not yield repeatedly, do not call `image_generate` again, do not emit final JSON, and do not treat a missing `artifactId` in that same run as a blocker. ZooWork automatically starts a continuation run when the attachment arrives.
8. In the continuation run only, materialize the returned attachment once, inspect the materialized image once, and publish that same file once with `artifact_publish` when no blocker exists. Never launch a second generation in the continuation.
9. Inspect each confirmed room and count the primary objects covered by `default_object_counts`. Record geometry drift, changed room functions, incompatible fixtures, count mismatches, missing furniture, and newly generated text precisely in `warnings`, but do not suppress a readable generated image because of those quality findings.
10. Publish every materialized candidate that is a readable raster image, then return the required JSON with `status: completed` and any quality warnings. Withhold publication only when the file is missing, corrupt, empty, or technically unreadable. Do not add an artifact field to the response; the Runtime discovers published artifacts through the Session API.

Generated pixels never become evidence for the Home Model. The confirmed source geometry remains authoritative even when the generated image is displayed as the primary design result.
