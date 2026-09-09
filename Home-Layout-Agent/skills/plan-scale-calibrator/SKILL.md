---
name: plan-scale-calibrator
description: Establish one shared metric planning scale from a confirmed floor plan before furniture placement. Use after room-map parsing when door segments or explicit dimensions are available; treat an 850 mm door as an estimated fallback, never as a verified measurement.
---

# Plan Scale Calibrator

Create one scale for the complete source plan without adding another model call.

Read [the scale contract](references/scale-contract.md) before using a door or dimension as a reference.

## Priority

1. Use an explicit user-confirmed measurement when available.
2. Otherwise use a legible printed dimension tied to visible endpoints.
3. Otherwise use the highest-confidence visible single-door opening segment as an estimated 850 mm reference.
4. If no reliable segment exists, keep scale `unknown` and use one consistent relative door-unit fallback for the entire plan.

Never certify inferred scale as measured. Use the same calibrated x/y conversion for every room, furniture item, fixture, appliance, clearance, and keep-out zone.
