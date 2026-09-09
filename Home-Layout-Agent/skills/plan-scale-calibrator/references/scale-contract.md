# Shared plan-scale contract

Output fields:

- `status`: `unknown`, `estimated`, or `confirmed`.
- `basis`: `door_reference`, `printed_dimension`, `user_measurement`, or `unknown`.
- `reference_entity_ref`: stable opening or measurement ID, or null. When several single-door segments support an estimated scale, the numeric scale comes from their outlier-filtered median while this field names the highest-confidence supporting opening.
- `reference_length_mm`: the physical length used for calibration, or null.
- `millimeters_per_source_x_unit` and `millimeters_per_source_y_unit`: axis-aware conversions for normalized source coordinates.
- `source_aspect_ratio`: the source image width divided by height when known.
- `confidence`: evidence confidence, capped below confirmed confidence for a default door reference.

An inferred single-door reference uses 850 mm only as a planning estimate. It must remain `estimated`, even when the door segment is visually clear. The estimate controls relative furniture consistency and collision buffers; it is not a construction measurement.
