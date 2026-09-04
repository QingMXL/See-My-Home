---
name: layout-diagnosis
description: Analyze a current Home Model for circulation, storage, functional mismatch, bottlenecks, daylight, competing activities, and underused space. Use when the user asks what is not working or what could improve; do not use for structural advice or to mutate unconfirmed facts.
---

# Layout Diagnosis

Diagnose how the home works now. Require a Home Model at `confirmed_enough` or `scale_confirmed`; otherwise return the minimum high-impact questions instead of speculative findings.

Read [the diagnosis contract](references/diagnosis-contract.md) before producing findings or opportunities.

## Lenses

- Circulation paths and activity conflicts.
- Entry/drop-zone behavior and storage demand.
- Mismatch between architectural labels and actual use.
- Furniture, fixtures, or fixed cabinetry creating bottlenecks.
- Competing simultaneous activities.
- Daylight and visual connection only when supported by openings, orientation, or supplied evidence.
- Underused space only qualitatively unless confirmed metric geometry supports calculation.
- Accessibility, children, pets, work, and hosting only when supplied by the user.

Each finding cites affected entity IDs and evidence references. Separate supported findings from hypotheses. Opportunities are non-binding directions, not completed designs. Return three to five short `assessment_items`; every title and statement must include both `en-US` and `zh-CN` so the UI can switch languages without rerunning the Agent.

Assessment is about the design, not whether the generated image followed instructions. Missing furniture, sanitary fixtures, appliances, room labels, or image defects must never appear in `assessment_items`. Treat those as internal generation-quality failures.

Do not claim wasted-area percentages, travel distances, capacity, daylight performance, code compliance, load-bearing status, or wall removability without verified supporting data.

Return the Runtime response envelope with `diagnosis` populated. Do not silently change `home_model`.
