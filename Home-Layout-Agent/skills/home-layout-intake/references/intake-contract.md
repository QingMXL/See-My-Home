# Intake decision contract

## Epistemic states

- `observed`: directly present in supplied extracted text, a supplied measurement, or supplied vision geometry.
- `inferred`: a reasonable interpretation such as probable room type, adjacency, or activity pattern.
- `user_confirmed`: explicitly stated or corrected by the user.

Provider confidence describes the model output, not truth. Preserve it without upgrading the epistemic state.

## Geometry

- Raw detector geometry remains in `image_normalized_0_1` with coordinates between 0 and 1.
- Metric geometry uses `local_plan_2d`, integer millimeters, origin at the floor envelope's lower-left, x right, y up.
- If no validated scale exists, `geometry.metric` is `null`.
- Areas are stored only in square meters. Square feet are a derived US-listing display value and never canonical data.

## Conflicts and questions

A conflict names the competing claim IDs and explains the downstream impact. Do not resolve conflicts by provider confidence alone.

Ask no more than three questions. Prefer, in order:

1. Scale or a known measurement needed for metric geometry.
2. A hard constraint or retained object that changes feasible layouts.
3. Actual room use or simultaneous activity that changes diagnosis.

Unknown information that does not block the requested operation remains unknown.
