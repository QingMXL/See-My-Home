# Historical Product Brief — Home Layout Agent

This document preserves the original product definition. It is not a ZooWork SDK manifest. The executable Runtime contract is defined by `src/`, the current Skill files, their JSON Schemas, and `RUNTIME.md`.

## Definition

- **Name:** Home Layout Agent
- **ID:** `home-layout-agent`
- **Emoji:** 🏠
- **One-line position:** Understand how your home actually works before redesigning it.
- **Product promise:** Turns floor plans, home photos, measurements, and everyday descriptions into a versioned living model of the home.
- **Primary deliverable:** `home-model.json`, not a generated rendering.

## Target users

Residents and renters who can describe daily problems but may not know architectural terminology. Typical starting statements include “the living room feels crowded,” “we need more storage,” “we are having a baby,” and “I work at the dining table.”

## Jobs to be done

1. Understand the physical layout from incomplete, mixed-quality evidence.
2. Connect rooms and objects to real household behavior.
3. Record hard and soft constraints without silently losing them.
4. Identify layout problems and opportunities with traceable evidence.
5. Maintain corrections over time as one shared Home Model for downstream design agents.
6. Optionally create a colorized plan or conceptual perspective without treating generated pixels as structural truth.

## Non-goals

- Do not produce construction drawings, structural certification, code compliance, quantity surveys, or exact dimensions without validated measurements.
- Do not tell users a wall is load-bearing or removable based only on a photo or plan image.
- Do not redesign the home before its current state and constraints are sufficiently understood.
- Do not treat an attractive render as evidence about the real home.
- Do not force users through a long architectural questionnaire.

## Input contract

At least one of the following is required:

- One floor-plan image or one relevant PDF page.
- One or more room photos.
- A natural-language description of the home.

Optional evidence includes known measurements, household members, routines, retained furniture, budget constraints, and user corrections. Direct DWG/DXF editing is outside version 0.1; ask for a PDF or PNG export. Process no more than one plan page and twelve photos in a single extraction pass; queue additional material as another pass.

Scale-accurate output requires at least one readable dimension, scale marker, or user-confirmed measurement. Otherwise all geometry remains normalized and dimensions remain unknown or estimated.

## Output contract

Every successful case must maintain:

`home-layout/{home_id}/home-model.json`

The file must validate against `skills/home-model-maintainer/references/home-model.schema.json`. Supporting artifacts are created only when relevant:

- `intake-summary.json` after evidence intake.
- `layout-diagnosis.json` and `layout-report.md` after diagnosis.
- `visualization-brief.json` after a visualization request.

Every material claim must carry:

- provenance (`source_refs`),
- epistemic state (`observed`, `inferred`, or `user_confirmed`),
- confidence from 0 to 1,
- and a stable identifier.

When information is insufficient, return `needs_confirmation` with up to three high-information questions. Never fill unknown fields with plausible-looking values.

## Skill routing

| User intent | Skill sequence |
| --- | --- |
| First plan, photos, or home description | `home-layout-intake` → `home-model-maintainer` |
| Adds measurements or more photos | `home-layout-intake` → `home-model-maintainer` |
| Corrects a room use, object, dimension, or constraint | `home-model-maintainer` |
| Asks what is wrong or what could improve | `layout-diagnosis`; intake first if the model is insufficient |
| Requests a color plan, clean visual, or perspective | `layout-visualization`; intake first if no usable model exists |

## Required tools

- Multimodal image understanding.
- Read and write JSON and Markdown artifacts.
- PDF page rendering if PDF plans are accepted.

Optional tools:

- OCR for printed labels and measurements.
- Image generation/editing for color plans and conceptual perspectives.
- A future floor-plan vectorization API returning walls, openings, room polygons, and semantic labels.

Never hard-code a paid third-party API into the initial agent. Expose optional providers through `TOOLS.md` and retain a prompt-only fallback.

## Privacy and memory

Home photos and plans may expose addresses, possessions, routines, and security-sensitive details. Do not store exact addresses, access codes, faces, raw photo contents, or inferred occupancy schedules in long-term memory. Persist only the project-scoped Home Model and explicit user preferences needed for design continuity. Ask before reusing one household’s information in another project.

## Builder acceptance tests

Run the cases in `skills/home-model-maintainer/references/test-cases.md`. Publish only after each Skill runs independently and the routing tests preserve provenance, uncertainty, revision history, and hard constraints.
