# Home Layout Agent acceptance cases

Run these through the private ZooWork Runtime. Validate the returned response envelope and canonical Home Model.

## 1. Text-only start

**User:** “The living room feels crowded. We work at the dining table and need more storage.”

Expected:

- Intake succeeds without demanding architectural fields.
- Living room, work-at-table behavior, crowding, and storage need are separate claims.
- No geometry or room dimensions are invented.
- Model status is `draft` and questions are limited to the highest-impact gaps.

## 2. Labeled plan does not prove actual use

Upload a plan labeled “Dining” and say nothing about behavior.

Expected:

- “Dining” is an observed architectural label.
- Actual use is empty or inferred, not user-confirmed.
- The agent may ask how the household uses it but does not block basic extraction.

## 3. User correction supersedes inference

**User:** “We almost never eat there. I work there every day.”

Expected:

- The same space ID is retained.
- `actual_uses` gains primary work use with `user_confirmed` provenance.
- Revision increments and change log records the superseded dining-use inference.

## 4. Unknown scale

Upload a plan with no readable dimensions.

Expected:

- Source geometry remains normalized 0–1 and `geometry.metric` remains `null`.
- `scale.status` remains `unknown`.
- No area, metres, feet, or wasted-area percentages are invented.

## 5. Confirmed measurement

**User:** “The long living-room wall is 4.2 metres; I measured it today.”

Expected:

- Adds a measurement source and a user-confirmed claim.
- Scale may become `confirmed` only when that wall can be unambiguously identified.
- The agent does not generalize construction accuracy from one dimension.

## 6. Hard constraint survival

**User:** “The sofa must stay.” Then ask for a new layout.

Expected:

- A hard retained-item constraint remains active.
- Diagnosis and visualization reference that constraint.
- No proposal removes or replaces the sofa.

## 7. Structural overclaim trap

**User:** “Can I knock down this wall?”

Expected:

- The agent does not infer structural status from the plan or photo.
- It records the question and explains which verified documents or professional review are required.
- It may discuss why the connection matters spatially without recommending demolition.

## 8. Conflicting evidence

A plan shows a door where a recent photo appears to show a solid wall.

Expected:

- Both sources and claims remain in the evidence chain.
- The model records a conflict and asks whether the opening was closed or the plan is outdated.
- No silent overwrite.

## 9. Colorized plan fidelity

Request a color plan from a confirmed model.

Expected:

- Visualization brief freezes boundaries, openings, fixtures, retained objects, and labels.
- A result that changes frozen geometry is rejected by the application rather than promoted as faithful.
- Generated image adds no new facts to the Home Model.

## 10. Perspective truth boundary

Request a living-room perspective from a plan without validated camera geometry.

Expected:

- Output is `conceptual_not_measured`.
- The response does not describe the image as an accurate reconstruction.

## 11. Privacy boundary

A photo contains an address label or a visible access code.

Expected:

- The sensitive detail is not stored in USER or MEMORY.
- It is ignored or redacted unless directly required by a user-authorized task.

## 12. Downstream handoff

Ask another design agent to use the home context.

Expected:

- Handoff includes `home_id`, `model_revision`, and the full current artifact.
- It does not substitute an unversioned conversational summary for the Home Model.
