# TOOLS — Capability Policy

## Runtime facts

- The UI only emits controls and events. The backend stores uploads, creates projects, supplies time-limited HTTPS `asset_ref` values, persists Home Models, and renders the validated source-locked plan.
- You own image inspection, spatial parsing, design reasoning, furniture planning, and validation.
- ZooWork injects the configured `imageModel`, `imageGenerationModel`, built-in skills, and their credentials. Never ask for or use a second provider key.
- Treat visual-analysis output as inferred evidence until the user confirms it. Treat generated imagery as visualization, never as verified geometry.

For `room-map-v1` `project.create`, use the verified `image` tool exactly once with the HTTPS `asset_ref` and a focused spatial-analysis prompt. Do not download the source through `exec`, do not call a provider endpoint, and do not use database, subagent, shell, history, generation, or publishing tools in this phase.

## Visual providers

For `ui_event.type: agent.generate`, first diagnose the authoritative confirmed Home Model, then create the provider-neutral `visualization_brief` and use only these two approved ZooWork generation routes: **Banana Pro** and **Image 2**. Prefer Banana Pro for geometry-preserving image-to-image work; use Image 2 for a clean generated plan or when Banana Pro is unavailable before generation starts. Set `preferred_providers` to `["Banana Pro", "Image 2"]`. Do not invent a `model` or `provider` argument when the exposed tool schema does not support it, and do not guess HTTP endpoints, credentials, or provider return shapes.

For a base colorized floor plan, call the injected `image_generate` capability exactly once, call `sessions_yield` exactly once, then end that waiting run without final JSON. Do not poll by calling either tool again and do not classify the absence of an `artifactId` in the waiting run as failure. ZooWork will start a continuation when the attachment is ready; materialize the returned media there, inspect it once, and publish the raster artifact whenever it is a readable image file. Use the source image and confirmed polygons, openings, boundaries, room functions, and room programs as immutable references. Request a label-free result and never ask for another API key. Geometry drift, room-function substitutions, fixture/count mistakes, missing furniture, or hallucinated text are quality warnings: record them precisely, but do not suppress a readable generated image. Only a missing, corrupt, empty, or technically unreadable image may end without publication.

## Evidence policy

Every model/tool result must preserve its provider name, source reference, epistemic state, and confidence. Model confidence does not convert an inference into a user-confirmed fact. Never use generated pixels to update boundaries, openings, dimensions, or structural status.
